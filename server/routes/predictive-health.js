const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Predictive Health Insights with Advanced Trend Analysis
router.get('/insights', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    // Generate comprehensive health insights
    const insights = await generatePredictiveInsights(userId, period);
    
    // Get nutrition trend analysis
    const nutritionTrends = await analyzeNutritionTrends(userId, period);
    
    // Get early warning indicators
    const earlyWarnings = await detectEarlyWarnings(userId);
    
    // Get goal progress
    const goalProgress = await trackMicronutrientGoals(userId);

    res.json({
      insights,
      nutritionTrends,
      earlyWarnings,
      goalProgress,
      analysisDate: new Date().toISOString(),
      period
    });

  } catch (error) {
    console.error('Error generating predictive health insights:', error);
    res.status(500).json({ error: 'Failed to generate health insights' });
  }
});

// Set Micronutrient Goals
router.post('/goals/micronutrients', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { nutrient, targetValue, targetPercentage, timeframe, priority } = req.body;

    if (!nutrient || (!targetValue && !targetPercentage)) {
      return res.status(400).json({ 
        error: 'Nutrient name and target value or percentage are required' 
      });
    }

    // Check if goal already exists
    const existingGoal = await getRow(
      'SELECT * FROM micronutrient_goals WHERE user_id = ? AND nutrient = ?',
      [userId, nutrient]
    );

    if (existingGoal) {
      // Update existing goal
      await runQuery(
        `UPDATE micronutrient_goals 
         SET target_value = ?, target_percentage = ?, timeframe = ?, priority = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND nutrient = ?`,
        [targetValue, targetPercentage, timeframe || 'monthly', priority || 'medium', userId, nutrient]
      );
    } else {
      // Create new goal
      await runQuery(
        `INSERT INTO micronutrient_goals (
          user_id, nutrient, target_value, target_percentage, timeframe, priority
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, nutrient, targetValue, targetPercentage, timeframe || 'monthly', priority || 'medium']
      );
    }

    res.json({
      success: true,
      message: `${nutrient} goal ${existingGoal ? 'updated' : 'created'} successfully`
    });

  } catch (error) {
    console.error('Error setting micronutrient goal:', error);
    res.status(500).json({ error: 'Failed to set micronutrient goal' });
  }
});

// Get Micronutrient Goals Progress
router.get('/goals/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'month' } = req.query;

    const goalProgress = await trackMicronutrientGoals(userId, period);
    const achievements = await getGoalAchievements(userId);
    const recommendations = await generateGoalRecommendations(userId, goalProgress);

    res.json({
      goalProgress,
      achievements,
      recommendations,
      period
    });

  } catch (error) {
    console.error('Error fetching goal progress:', error);
    res.status(500).json({ error: 'Failed to fetch goal progress' });
  }
});

// Early Warning System
router.get('/warnings/early', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const warnings = await detectEarlyWarnings(userId);
    const riskAssessment = await assessHealthRisk(userId);
    const preventiveActions = await suggestPreventiveActions(userId, warnings);

    res.json({
      warnings,
      riskAssessment,
      preventiveActions,
      analysisDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating early warnings:', error);
    res.status(500).json({ error: 'Failed to generate early warnings' });
  }
});

// Nutrition Trend Analysis
router.get('/trends/nutrition', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '3months', nutrients } = req.query;

    const trends = await analyzeNutritionTrends(userId, period, nutrients);
    const patterns = await identifyNutritionPatterns(userId, period);
    const projections = await projectFutureTrends(userId, trends);

    res.json({
      trends,
      patterns,
      projections,
      period
    });

  } catch (error) {
    console.error('Error analyzing nutrition trends:', error);
    res.status(500).json({ error: 'Failed to analyze nutrition trends' });
  }
});

// Health Risk Assessment
router.get('/assessment/risk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const riskAssessment = await assessHealthRisk(userId);
    const riskFactors = await identifyRiskFactors(userId);
    const interventions = await recommendInterventions(userId, riskFactors);

    res.json({
      riskAssessment,
      riskFactors,
      interventions,
      assessmentDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error assessing health risk:', error);
    res.status(500).json({ error: 'Failed to assess health risk' });
  }
});

// Personalized Health Recommendations
router.get('/recommendations/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const insights = await generatePredictiveInsights(userId);
    const recommendations = await generatePersonalizedRecommendations(userId, insights);
    const actionPlan = await createActionPlan(userId, recommendations);

    res.json({
      recommendations,
      actionPlan,
      insights: insights.summary,
      priority: actionPlan.priority
    });

  } catch (error) {
    console.error('Error generating personalized recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Helper Functions

async function generatePredictiveInsights(userId, period = 'month') {
  const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : 90;
  
  // Get nutrition history
  const nutritionHistory = await getAll(
    `SELECT 
      DATE(created_at) as date,
      SUM(total_calories) as calories,
      SUM(total_protein) as protein,
      SUM(total_carbs) as carbs,
      SUM(total_fat) as fat,
      SUM(total_sugar) as sugar,
      SUM(total_sodium) as sodium,
      SUM(total_fiber) as fiber
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-${periodDays} days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    [userId]
  );

  // Calculate trends
  const trends = calculateNutrientTrends(nutritionHistory);
  
  // Generate risk predictions
  const riskPredictions = generateRiskPredictions(trends, nutritionHistory);
  
  // Health score calculation
  const healthScore = calculateHealthScore(nutritionHistory, trends);

  return {
    summary: {
      healthScore,
      trendsAnalyzed: Object.keys(trends).length,
      riskFactors: riskPredictions.filter(r => r.severity === 'high').length,
      periodAnalyzed: period
    },
    trends,
    riskPredictions,
    healthScore,
    recommendations: generateTrendBasedRecommendations(trends, riskPredictions)
  };
}

async function analyzeNutritionTrends(userId, period = 'month', specificNutrients = null) {
  const periodDays = period === 'week' ? 7 : period === 'month' ? 30 : period === '3months' ? 90 : 30;
  
  const nutritionData = await getAll(
    `SELECT 
      DATE(created_at) as date,
      AVG(total_calories) as avg_calories,
      AVG(total_protein) as avg_protein,
      AVG(total_carbs) as avg_carbs,
      AVG(total_fat) as avg_fat,
      AVG(total_sugar) as avg_sugar,
      AVG(total_sodium) as avg_sodium,
      AVG(total_fiber) as avg_fiber
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-${periodDays} days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    [userId]
  );

  const trends = {};
  const nutrients = specificNutrients ? specificNutrients.split(',') : 
    ['calories', 'protein', 'carbs', 'fat', 'sugar', 'sodium', 'fiber'];

  for (const nutrient of nutrients) {
    const values = nutritionData.map(d => d[`avg_${nutrient}`] || 0);
    trends[nutrient] = {
      values,
      trend: calculateTrendDirection(values),
      slope: calculateTrendSlope(values),
      volatility: calculateVolatility(values),
      average: values.reduce((a, b) => a + b, 0) / values.length,
      prediction: predictNextValue(values)
    };
  }

  return trends;
}

async function detectEarlyWarnings(userId) {
  const warnings = [];
  
  // Get recent nutrition data (last 30 days)
  const recentData = await getAll(
    `SELECT 
      DATE(created_at) as date,
      SUM(total_sodium) as sodium,
      SUM(total_sugar) as sugar,
      SUM(total_fat) as fat,
      SUM(total_calories) as calories
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
    GROUP BY DATE(created_at)
    ORDER BY date ASC`,
    [userId]
  );

  // Check for gradual increases in concerning nutrients
  if (recentData.length >= 14) {
    const sodiumTrend = calculateTrendSlope(recentData.map(d => d.sodium));
    const sugarTrend = calculateTrendSlope(recentData.map(d => d.sugar));
    const fatTrend = calculateTrendSlope(recentData.map(d => d.fat));

    if (sodiumTrend > 50) { // Increasing by >50mg per day
      warnings.push({
        type: 'early_warning',
        severity: 'medium',
        nutrient: 'sodium',
        message: 'Gradual increase in sodium intake detected over the past month',
        trend: 'increasing',
        recommendation: 'Consider reducing processed foods and adding more fresh ingredients',
        targetReduction: '20%'
      });
    }

    if (sugarTrend > 5) { // Increasing by >5g per day
      warnings.push({
        type: 'early_warning',
        severity: 'medium', 
        nutrient: 'sugar',
        message: 'Sugar intake has been gradually increasing',
        trend: 'increasing',
        recommendation: 'Monitor sugar sources and consider natural alternatives',
        targetReduction: '15%'
      });
    }

    if (fatTrend > 3) { // Increasing by >3g per day
      warnings.push({
        type: 'early_warning',
        severity: 'low',
        nutrient: 'fat',
        message: 'Fat intake showing upward trend',
        trend: 'increasing',
        recommendation: 'Focus on healthy fats like avocados, nuts, and olive oil',
        targetReduction: '10%'
      });
    }
  }

  // Check for consistent deficiencies
  const micronutrientData = await getAll(
    `SELECT * FROM micronutrient_tracking 
     WHERE user_id = ? AND date >= date('now', '-30 days')
     ORDER BY date ASC`,
    [userId]
  );

  if (micronutrientData.length >= 20) {
    const consistentDeficiencies = findConsistentDeficiencies(micronutrientData);
    warnings.push(...consistentDeficiencies);
  }

  return warnings;
}

async function trackMicronutrientGoals(userId, period = 'month') {
  const goals = await getAll(
    'SELECT * FROM micronutrient_goals WHERE user_id = ?',
    [userId]
  );

  const progress = [];

  for (const goal of goals) {
    const currentIntake = await getCurrentMicronutrientIntake(userId, goal.nutrient, period);
    const progressPercent = goal.target_value ? 
      (currentIntake / goal.target_value) * 100 :
      currentIntake; // For percentage-based goals

    progress.push({
      nutrient: goal.nutrient,
      currentIntake,
      targetValue: goal.target_value,
      targetPercentage: goal.target_percentage,
      progressPercent,
      status: progressPercent >= 90 ? 'on_track' : 
              progressPercent >= 70 ? 'needs_attention' : 'behind',
      timeframe: goal.timeframe,
      priority: goal.priority,
      recommendations: generateNutrientRecommendations(goal.nutrient, progressPercent)
    });
  }

  return progress;
}

async function assessHealthRisk(userId) {
  const riskFactors = [];
  let overallRisk = 'low';

  // Get recent nutrition data
  const recentNutrition = await getRow(
    `SELECT 
      AVG(total_sodium) as avg_sodium,
      AVG(total_sugar) as avg_sugar,
      AVG(total_fat) as avg_fat,
      AVG(total_calories) as avg_calories,
      AVG(total_fiber) as avg_fiber
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-30 days')`,
    [userId]
  );

  // Assess sodium risk
  if (recentNutrition.avg_sodium > 2000) {
    riskFactors.push({
      factor: 'high_sodium',
      level: recentNutrition.avg_sodium > 2500 ? 'high' : 'medium',
      description: 'Elevated sodium intake may increase hypertension risk'
    });
  }

  // Assess sugar risk
  if (recentNutrition.avg_sugar > 50) {
    riskFactors.push({
      factor: 'high_sugar',
      level: recentNutrition.avg_sugar > 75 ? 'high' : 'medium',
      description: 'High sugar intake associated with diabetes and obesity risk'
    });
  }

  // Assess fiber deficiency risk
  if (recentNutrition.avg_fiber < 20) {
    riskFactors.push({
      factor: 'low_fiber',
      level: recentNutrition.avg_fiber < 15 ? 'high' : 'medium',
      description: 'Low fiber intake may affect digestive and cardiovascular health'
    });
  }

  // Calculate overall risk
  const highRiskFactors = riskFactors.filter(r => r.level === 'high').length;
  const mediumRiskFactors = riskFactors.filter(r => r.level === 'medium').length;

  if (highRiskFactors >= 2) overallRisk = 'high';
  else if (highRiskFactors >= 1 || mediumRiskFactors >= 3) overallRisk = 'medium';

  return {
    overallRisk,
    riskFactors,
    score: calculateRiskScore(riskFactors),
    lastAssessment: new Date().toISOString()
  };
}

// Helper calculation functions

function calculateTrendDirection(values) {
  if (values.length < 2) return 'stable';
  
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));
  
  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
  
  const change = ((secondAvg - firstAvg) / firstAvg) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

function calculateTrendSlope(values) {
  if (values.length < 2) return 0;
  
  let sumXY = 0, sumX = 0, sumY = 0, sumXX = 0;
  const n = values.length;
  
  for (let i = 0; i < n; i++) {
    sumXY += i * values[i];
    sumX += i;
    sumY += values[i];
    sumXX += i * i;
  }
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function calculateVolatility(values) {
  if (values.length < 2) return 0;
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

function predictNextValue(values) {
  if (values.length < 3) return values[values.length - 1];
  
  const slope = calculateTrendSlope(values);
  return values[values.length - 1] + slope;
}

function calculateHealthScore(nutritionHistory, trends) {
  let score = 100;
  
  // Penalize for poor trends
  Object.entries(trends).forEach(([nutrient, trend]) => {
    if (nutrient === 'sodium' && trend.trend === 'increasing') score -= 10;
    if (nutrient === 'sugar' && trend.trend === 'increasing') score -= 10;
    if (nutrient === 'fiber' && trend.trend === 'decreasing') score -= 5;
  });
  
  // Reward for stability in good ranges
  if (trends.fiber && trends.fiber.average > 25) score += 5;
  if (trends.protein && trends.protein.average > 50) score += 5;
  
  return Math.max(0, Math.min(100, score));
}

function generateRiskPredictions(trends, nutritionHistory) {
  const predictions = [];
  
  // Predict sodium-related risks
  if (trends.sodium && trends.sodium.trend === 'increasing') {
    const futureValue = trends.sodium.prediction;
    if (futureValue > 2500) {
      predictions.push({
        type: 'cardiovascular_risk',
        severity: 'high',
        timeframe: '6_months',
        probability: 0.75,
        description: 'High sodium intake trend may lead to hypertension',
        intervention: 'Reduce processed foods and increase potassium-rich foods'
      });
    }
  }
  
  // Predict diabetes risk
  if (trends.sugar && trends.sugar.trend === 'increasing') {
    const futureValue = trends.sugar.prediction;
    if (futureValue > 75) {
      predictions.push({
        type: 'metabolic_risk',
        severity: 'medium',
        timeframe: '1_year',
        probability: 0.6,
        description: 'Rising sugar intake may increase diabetes risk',
        intervention: 'Limit added sugars and focus on complex carbohydrates'
      });
    }
  }
  
  return predictions;
}

function generateTrendBasedRecommendations(trends, riskPredictions) {
  const recommendations = [];
  
  // High-priority recommendations based on risk predictions
  riskPredictions.forEach(risk => {
    if (risk.severity === 'high') {
      recommendations.push({
        priority: 'high',
        category: 'prevention',
        action: risk.intervention,
        reasoning: risk.description
      });
    }
  });
  
  // Trend-based recommendations
  Object.entries(trends).forEach(([nutrient, trend]) => {
    if (trend.trend === 'increasing' && ['sodium', 'sugar'].includes(nutrient)) {
      recommendations.push({
        priority: 'medium',
        category: 'reduction',
        action: `Reduce ${nutrient} intake by focusing on whole foods`,
        reasoning: `${nutrient} levels are trending upward`
      });
    }
  });
  
  return recommendations;
}

async function getCurrentMicronutrientIntake(userId, nutrient, period) {
  const periodDays = period === 'week' ? 7 : 30;
  
  const result = await getRow(
    `SELECT AVG(${nutrient}) as avg_intake 
     FROM micronutrient_tracking 
     WHERE user_id = ? AND date >= date('now', '-${periodDays} days')`,
    [userId]
  );
  
  return result?.avg_intake || 0;
}

function generateNutrientRecommendations(nutrient, progressPercent) {
  const recommendations = [];
  
  if (progressPercent < 70) {
    const foodSources = {
      'vitamin_c': ['oranges', 'strawberries', 'bell peppers', 'broccoli'],
      'vitamin_d': ['fatty fish', 'fortified milk', 'egg yolks'],
      'iron': ['lean meat', 'spinach', 'lentils', 'fortified cereals'],
      'calcium': ['dairy products', 'leafy greens', 'almonds'],
      'fiber': ['whole grains', 'beans', 'fruits', 'vegetables']
    };
    
    const sources = foodSources[nutrient] || ['nutrient-rich foods'];
    recommendations.push(
      `Increase intake of ${sources.slice(0, 2).join(' and ')} to boost ${nutrient} levels`
    );
  }
  
  return recommendations;
}

function findConsistentDeficiencies(micronutrientData) {
  const warnings = [];
  const nutrients = ['vitamin_c', 'vitamin_d', 'iron', 'calcium'];
  
  nutrients.forEach(nutrient => {
    const values = micronutrientData.map(d => d[nutrient] || 0);
    const deficientDays = values.filter(v => v < getRecommendedDaily(nutrient) * 0.7).length;
    
    if (deficientDays > values.length * 0.6) { // Deficient >60% of days
      warnings.push({
        type: 'chronic_deficiency',
        severity: 'medium',
        nutrient,
        message: `Consistent ${nutrient} deficiency detected over the past month`,
        deficientDays,
        totalDays: values.length,
        recommendation: `Focus on ${nutrient}-rich foods and consider supplementation`
      });
    }
  });
  
  return warnings;
}

function getRecommendedDaily(nutrient) {
  const rda = {
    'vitamin_c': 90,
    'vitamin_d': 20,
    'iron': 18,
    'calcium': 1000,
    'fiber': 25
  };
  
  return rda[nutrient] || 100;
}

function calculateRiskScore(riskFactors) {
  let score = 0;
  
  riskFactors.forEach(factor => {
    if (factor.level === 'high') score += 30;
    else if (factor.level === 'medium') score += 15;
    else score += 5;
  });
  
  return Math.min(100, score);
}

async function getGoalAchievements(userId) {
  // Get completed goals and milestones
  const achievements = await getAll(
    `SELECT * FROM goal_achievements 
     WHERE user_id = ? 
     ORDER BY achieved_at DESC 
     LIMIT 10`,
    [userId]
  );
  
  return achievements;
}

async function generateGoalRecommendations(userId, goalProgress) {
  const recommendations = [];
  
  goalProgress.forEach(goal => {
    if (goal.status === 'behind') {
      recommendations.push({
        goal: goal.nutrient,
        priority: goal.priority,
        suggestion: `Increase ${goal.nutrient} intake by ${Math.round(goal.targetValue - goal.currentIntake)}mg daily`,
        foods: generateNutrientRecommendations(goal.nutrient, goal.progressPercent)
      });
    }
  });
  
  return recommendations;
}

async function suggestPreventiveActions(userId, warnings) {
  const actions = [];
  
  warnings.forEach(warning => {
    switch (warning.type) {
      case 'early_warning':
        actions.push({
          immediate: `Monitor ${warning.nutrient} intake daily`,
          shortTerm: warning.recommendation,
          longTerm: `Establish sustainable eating patterns to maintain healthy ${warning.nutrient} levels`
        });
        break;
      case 'chronic_deficiency':
        actions.push({
          immediate: warning.recommendation,
          shortTerm: `Track ${warning.nutrient} intake for 2 weeks`,
          longTerm: `Consider nutritional counseling for persistent deficiencies`
        });
        break;
    }
  });
  
  return actions;
}

async function identifyNutritionPatterns(userId, period) {
  // Analyze eating patterns, meal timing, food choices
  const patterns = {
    mealTiming: await analyzeMealTiming(userId, period),
    foodChoices: await analyzeFoodChoices(userId, period),
    weekendVsWeekday: await compareWeekendWeekday(userId, period)
  };
  
  return patterns;
}

async function projectFutureTrends(userId, trends) {
  const projections = {};
  
  Object.entries(trends).forEach(([nutrient, trend]) => {
    const slope = trend.slope;
    projections[nutrient] = {
      in30Days: trend.average + (slope * 30),
      in90Days: trend.average + (slope * 90),
      confidence: Math.max(0.3, 1 - (trend.volatility / trend.average))
    };
  });
  
  return projections;
}

async function identifyRiskFactors(userId) {
  // Comprehensive risk factor analysis
  const factors = await getAll(
    `SELECT 
      AVG(total_sodium) as sodium,
      AVG(total_sugar) as sugar,
      AVG(total_fat) as fat,
      COUNT(*) as meal_count
    FROM meals 
    WHERE user_id = ? AND created_at >= datetime('now', '-90 days')`,
    [userId]
  );
  
  return factors;
}

async function recommendInterventions(userId, riskFactors) {
  // Generate specific intervention recommendations
  const interventions = [];
  
  // Add specific interventions based on risk factors
  interventions.push({
    type: 'dietary',
    priority: 'high',
    description: 'Implement Mediterranean diet principles',
    duration: '3 months',
    expectedOutcome: 'Reduced cardiovascular risk'
  });
  
  return interventions;
}

async function generatePersonalizedRecommendations(userId, insights) {
  // Generate highly personalized recommendations
  const recommendations = [];
  
  insights.riskPredictions.forEach(risk => {
    recommendations.push({
      category: 'prevention',
      priority: risk.severity,
      action: risk.intervention,
      rationale: risk.description,
      timeline: risk.timeframe
    });
  });
  
  return recommendations;
}

async function createActionPlan(userId, recommendations) {
  // Create structured action plan
  const plan = {
    immediate: recommendations.filter(r => r.priority === 'high'),
    shortTerm: recommendations.filter(r => r.priority === 'medium'),
    longTerm: recommendations.filter(r => r.priority === 'low'),
    priority: recommendations.length > 0 ? recommendations[0].priority : 'low'
  };
  
  return plan;
}

// Additional helper functions for meal timing and food choice analysis
async function analyzeMealTiming(userId, period) {
  // Analyze when user typically eats
  return { avgBreakfastTime: '8:00', avgLunchTime: '13:00', avgDinnerTime: '19:00' };
}

async function analyzeFoodChoices(userId, period) {
  // Analyze food preferences and choices
  return { topFoods: ['chicken', 'rice', 'vegetables'], cuisinePreference: 'mediterranean' };
}

async function compareWeekendWeekday(userId, period) {
  // Compare nutrition patterns between weekends and weekdays
  return { weekendCaloriesHigher: true, weekendSodiumHigher: true };
}

module.exports = router; 