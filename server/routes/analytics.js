const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAll, getRow } = require('../config/database');

// Get comprehensive analytics dashboard data
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get nutrition data
    const nutritionData = await getNutritionAnalytics(userId, startDate);
    
    // Get health metrics data
    const healthData = await getHealthAnalytics(userId, startDate);
    
    // Get trends data
    const trendsData = await getTrendsData(userId, startDate);
    
    // Generate AI insights
    const insights = await generateInsights(nutritionData, healthData);
    
    // Get achievements
    const achievements = await getAchievements(userId, startDate);

    res.json({
      nutrition: nutritionData,
      health: healthData,
      trends: trendsData,
      insights: insights,
      achievements: achievements
    });

  } catch (error) {
    console.error('Analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to load analytics data' });
  }
});

// Get nutrition analytics
async function getNutritionAnalytics(userId, startDate) {
  try {
    // Get recent meals and their nutrition totals
    const meals = await getAll(
      `SELECT m.*, 
              SUM(fi.calories) as total_calories,
              SUM(fi.protein) as total_protein,
              SUM(fi.carbs) as total_carbs,
              SUM(fi.fat) as total_fat,
              SUM(fi.sugar) as total_sugar,
              SUM(fi.fiber) as total_fiber
       FROM meals m
       LEFT JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? AND m.created_at >= ?
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [userId, startDate.toISOString()]
    );

    // Calculate averages and trends
    const totalMeals = meals.length;
    if (totalMeals === 0) {
      return getDefaultNutritionData();
    }

    const totals = meals.reduce((acc, meal) => ({
      calories: acc.calories + (meal.total_calories || 0),
      protein: acc.protein + (meal.total_protein || 0),
      carbs: acc.carbs + (meal.total_carbs || 0),
      fat: acc.fat + (meal.total_fat || 0),
      sugar: acc.sugar + (meal.total_sugar || 0),
      fiber: acc.fiber + (meal.total_fiber || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, fiber: 0 });

    const averages = {
      calories: Math.round(totals.calories / totalMeals),
      protein: Math.round(totals.protein / totalMeals * 10) / 10,
      carbs: Math.round(totals.carbs / totalMeals * 10) / 10,
      fat: Math.round(totals.fat / totalMeals * 10) / 10,
      sugar: Math.round(totals.sugar / totalMeals * 10) / 10,
      fiber: Math.round(totals.fiber / totalMeals * 10) / 10
    };

    // Define targets (these could be personalized based on user profile)
    const targets = {
      calories: 2000,
      protein: 100,
      carbs: 250,
      fat: 70,
      sugar: 50,
      fiber: 30
    };

    // Calculate trends (simplified - in real app, compare with previous period)
    const trends = {
      calories: calculateTrend(averages.calories, targets.calories),
      protein: calculateTrend(averages.protein, targets.protein),
      carbs: calculateTrend(averages.carbs, targets.carbs),
      fat: calculateTrend(averages.fat, targets.fat),
      sugar: calculateTrend(averages.sugar, targets.sugar),
      fiber: calculateTrend(averages.fiber, targets.fiber)
    };

    return {
      calories: { current: averages.calories, target: targets.calories, ...trends.calories },
      protein: { current: averages.protein, target: targets.protein, ...trends.protein },
      carbs: { current: averages.carbs, target: targets.carbs, ...trends.carbs },
      fat: { current: averages.fat, target: targets.fat, ...trends.fat },
      sugar: { current: averages.sugar, target: targets.sugar, ...trends.sugar },
      fiber: { current: averages.fiber, target: targets.fiber, ...trends.fiber }
    };

  } catch (error) {
    console.error('Nutrition analytics error:', error);
    return getDefaultNutritionData();
  }
}

// Get health analytics
async function getHealthAnalytics(userId, startDate) {
  try {
    // Get user's health conditions
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // For now, return mock data - in real app, this would come from health tracking
    return {
      weight: { current: 70.5, target: 68, trend: 'down', change: -2.1 },
      bloodPressure: { current: '120/80', target: '120/80', trend: 'stable', change: 0 },
      bloodSugar: { current: 95, target: 90, trend: 'down', change: -3.2 },
      sleep: { current: 7.5, target: 8, trend: 'up', change: 6.7 },
      hydration: { current: 2.1, target: 2.5, trend: 'up', change: 12.5 },
      steps: { current: 8500, target: 10000, trend: 'up', change: 8.9 }
    };

  } catch (error) {
    console.error('Health analytics error:', error);
    return getDefaultHealthData();
  }
}

// Get trends data
async function getTrendsData(userId, startDate) {
  try {
    // Get daily nutrition data for the last 7 days
    const dailyNutrition = await getAll(
      `SELECT DATE(m.created_at) as day,
              SUM(fi.calories) as calories,
              SUM(fi.protein) as protein,
              SUM(fi.carbs) as carbs,
              SUM(fi.fat) as fat
       FROM meals m
       LEFT JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? AND m.created_at >= ?
       GROUP BY DATE(m.created_at)
       ORDER BY day DESC
       LIMIT 7`,
      [userId, startDate.toISOString()]
    );

    // Format data for charts
    const weeklyNutrition = dailyNutrition.map(day => ({
      day: new Date(day.day).toLocaleDateString('en-US', { weekday: 'short' }),
      calories: Math.round(day.calories || 0),
      protein: Math.round((day.protein || 0) * 10) / 10,
      carbs: Math.round((day.carbs || 0) * 10) / 10,
      fat: Math.round((day.fat || 0) * 10) / 10
    })).reverse();

    // Mock health metrics data
    const healthMetrics = [
      { day: 'Mon', weight: 70.8, bloodSugar: 98, sleep: 7.2, steps: 8200 },
      { day: 'Tue', weight: 70.6, bloodSugar: 95, sleep: 7.8, steps: 8900 },
      { day: 'Wed', weight: 70.4, bloodSugar: 93, sleep: 8.1, steps: 9200 },
      { day: 'Thu', weight: 70.3, bloodSugar: 94, sleep: 7.5, steps: 8700 },
      { day: 'Fri', weight: 70.2, bloodSugar: 92, sleep: 8.3, steps: 9500 },
      { day: 'Sat', weight: 70.1, bloodSugar: 96, sleep: 7.9, steps: 7800 },
      { day: 'Sun', weight: 70.5, bloodSugar: 95, sleep: 8.0, steps: 8500 }
    ];

    return {
      weeklyNutrition,
      healthMetrics
    };

  } catch (error) {
    console.error('Trends data error:', error);
    return getDefaultTrendsData();
  }
}

// Generate AI insights
async function generateInsights(nutritionData, healthData) {
  try {
    const insights = [];

    // Analyze nutrition data
    if (nutritionData.protein.current < nutritionData.protein.target * 0.8) {
      insights.push({
        type: 'warning',
        title: 'Protein Intake Below Target',
        description: 'Consider adding more protein-rich foods like lean meats, fish, or legumes',
        metric: 'protein'
      });
    } else if (nutritionData.protein.current > nutritionData.protein.target * 1.1) {
      insights.push({
        type: 'success',
        title: 'Excellent Protein Intake',
        description: 'You\'re exceeding your protein target - great for muscle maintenance',
        metric: 'protein'
      });
    }

    if (nutritionData.fiber.current < nutritionData.fiber.target * 0.7) {
      insights.push({
        type: 'warning',
        title: 'Low Fiber Intake',
        description: 'Add more fruits, vegetables, and whole grains to increase fiber',
        metric: 'fiber'
      });
    }

    if (nutritionData.sugar.current > nutritionData.sugar.target * 1.2) {
      insights.push({
        type: 'warning',
        title: 'High Sugar Consumption',
        description: 'Consider reducing added sugars in your diet',
        metric: 'sugar'
      });
    }

    // Analyze health data
    if (healthData.sleep.current < healthData.sleep.target) {
      insights.push({
        type: 'info',
        title: 'Sleep Optimization',
        description: 'Aim for 8 hours of quality sleep for better health outcomes',
        metric: 'sleep'
      });
    }

    if (healthData.steps.current < healthData.steps.target) {
      insights.push({
        type: 'info',
        title: 'Increase Physical Activity',
        description: 'Try to reach 10,000 steps daily for optimal health',
        metric: 'steps'
      });
    }

    // Add positive insights
    if (insights.length === 0) {
      insights.push({
        type: 'success',
        title: 'Great Progress!',
        description: 'You\'re maintaining excellent health and nutrition habits',
        metric: 'overall'
      });
    }

    return insights;

  } catch (error) {
    console.error('Insights generation error:', error);
    return getDefaultInsights();
  }
}

// Get achievements
async function getAchievements(userId, startDate) {
  try {
    // Get user's meal logging streak
    const meals = await getAll(
      `SELECT DATE(created_at) as meal_date
       FROM meals
       WHERE user_id = ? AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY meal_date DESC`,
      [userId, startDate.toISOString()]
    );

    const achievements = [
      {
        id: 1,
        title: '7-Day Streak',
        description: 'Logged meals for 7 consecutive days',
        earned: meals.length >= 7
      },
      {
        id: 2,
        title: 'Consistent Logger',
        description: 'Logged meals for 5 consecutive days',
        earned: meals.length >= 5
      },
      {
        id: 3,
        title: 'Health Conscious',
        description: 'Logged meals for 3 consecutive days',
        earned: meals.length >= 3
      },
      {
        id: 4,
        title: 'Getting Started',
        description: 'Logged your first meal',
        earned: meals.length >= 1
      }
    ];

    return achievements;

  } catch (error) {
    console.error('Achievements error:', error);
    return getDefaultAchievements();
  }
}

// Helper functions
function calculateTrend(current, target) {
  const percentage = ((current - target) / target) * 100;
  
  if (percentage > 10) {
    return { trend: 'up', change: Math.abs(percentage) };
  } else if (percentage < -10) {
    return { trend: 'down', change: Math.abs(percentage) };
  } else {
    return { trend: 'stable', change: 0 };
  }
}

function getDefaultNutritionData() {
  return {
    calories: { current: 0, target: 2000, trend: 'stable', change: 0 },
    protein: { current: 0, target: 100, trend: 'stable', change: 0 },
    carbs: { current: 0, target: 250, trend: 'stable', change: 0 },
    fat: { current: 0, target: 70, trend: 'stable', change: 0 },
    sugar: { current: 0, target: 50, trend: 'stable', change: 0 },
    fiber: { current: 0, target: 30, trend: 'stable', change: 0 }
  };
}

function getDefaultHealthData() {
  return {
    weight: { current: 0, target: 70, trend: 'stable', change: 0 },
    bloodPressure: { current: '120/80', target: '120/80', trend: 'stable', change: 0 },
    bloodSugar: { current: 95, target: 90, trend: 'stable', change: 0 },
    sleep: { current: 7, target: 8, trend: 'stable', change: 0 },
    hydration: { current: 2, target: 2.5, trend: 'stable', change: 0 },
    steps: { current: 8000, target: 10000, trend: 'stable', change: 0 }
  };
}

function getDefaultTrendsData() {
  return {
    weeklyNutrition: [],
    healthMetrics: []
  };
}

function getDefaultInsights() {
  return [
    {
      type: 'info',
      title: 'Start Your Journey',
      description: 'Begin logging your meals to get personalized insights',
      metric: 'overall'
    }
  ];
}

function getDefaultAchievements() {
  return [
    {
      id: 1,
      title: 'Getting Started',
      description: 'Log your first meal to begin tracking',
      earned: false
    }
  ];
}

module.exports = router;
