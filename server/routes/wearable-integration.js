const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Enhanced Wearable Data Sync with Real-time Activity Tracking
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      deviceType, 
      steps, 
      caloriesBurned, 
      activeMinutes, 
      heartRate, 
      sleepData,
      workoutSessions,
      timestamp 
    } = req.body;

    // Validate required fields
    if (!deviceType || !steps || !caloriesBurned) {
      return res.status(400).json({ 
        error: 'Device type, steps, and calories burned are required' 
      });
    }

    // Store the wearable data
    const syncId = await runQuery(
      `INSERT INTO wearable_sync (
        user_id, device_type, steps, calories_burned, active_minutes,
        heart_rate_avg, sleep_data, workout_sessions, sync_timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        deviceType, 
        steps, 
        caloriesBurned, 
        activeMinutes || 0,
        heartRate ? JSON.stringify(heartRate) : null,
        sleepData ? JSON.stringify(sleepData) : null,
        workoutSessions ? JSON.stringify(workoutSessions) : null,
        timestamp || new Date().toISOString()
      ]
    );

    // Calculate dynamic workout recommendations based on activity
    const recommendations = await generateDynamicWorkoutRecommendations(userId, {
      steps,
      caloriesBurned,
      activeMinutes,
      workoutSessions
    });

    // Update user's daily energy expenditure
    await updateDailyEnergyBalance(userId, caloriesBurned);

    res.json({
      success: true,
      syncId: syncId.lastID,
      recommendations,
      message: 'Wearable data synced successfully'
    });

  } catch (error) {
    console.error('Error syncing wearable data:', error);
    res.status(500).json({ error: 'Failed to sync wearable data' });
  }
});

// Get Real-time Activity Summary
router.get('/activity-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'today' } = req.query;

    let dateFilter = '';
    let params = [userId];

    switch (period) {
      case 'today':
        dateFilter = 'AND DATE(sync_timestamp) = DATE("now")';
        break;
      case 'week':
        dateFilter = 'AND sync_timestamp >= datetime("now", "-7 days")';
        break;
      case 'month':
        dateFilter = 'AND sync_timestamp >= datetime("now", "-30 days")';
        break;
    }

    const summary = await getRow(
      `SELECT 
        COUNT(*) as sync_count,
        MAX(steps) as max_steps,
        AVG(steps) as avg_steps,
        SUM(calories_burned) as total_calories_burned,
        AVG(calories_burned) as avg_calories_burned,
        SUM(active_minutes) as total_active_minutes,
        AVG(active_minutes) as avg_active_minutes
      FROM wearable_sync 
      WHERE user_id = ? ${dateFilter}`,
      params
    );

    // Get latest sync data
    const latestSync = await getRow(
      `SELECT * FROM wearable_sync 
       WHERE user_id = ? 
       ORDER BY sync_timestamp DESC 
       LIMIT 1`,
      [userId]
    );

    // Calculate activity trends
    const trends = await calculateActivityTrends(userId, period);

    // Generate personalized insights
    const insights = await generateActivityInsights(userId, summary, latestSync);

    res.json({
      summary: {
        ...summary,
        current_steps: latestSync?.steps || 0,
        current_calories_burned: latestSync?.calories_burned || 0,
        last_sync: latestSync?.sync_timestamp || null
      },
      trends,
      insights,
      period
    });

  } catch (error) {
    console.error('Error fetching activity summary:', error);
    res.status(500).json({ error: 'Failed to fetch activity summary' });
  }
});

// Dynamic Workout Adjustment based on Real-time Activity
router.post('/adjust-workout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentActivity, plannedWorkout } = req.body;

    // Get today's activity data
    const todayActivity = await getRow(
      `SELECT * FROM wearable_sync 
       WHERE user_id = ? 
       AND DATE(sync_timestamp) = DATE("now")
       ORDER BY sync_timestamp DESC 
       LIMIT 1`,
      [userId]
    );

    if (!todayActivity) {
      return res.status(404).json({ 
        error: 'No activity data found for today' 
      });
    }

    // Calculate energy balance
    const energyBalance = await calculateEnergyBalance(userId, todayActivity);

    // Adjust workout based on current activity level
    const adjustedWorkout = await adjustWorkoutPlan(
      plannedWorkout,
      todayActivity,
      energyBalance
    );

    // Log the adjustment
    await runQuery(
      `INSERT INTO workout_adjustments (
        user_id, original_workout, adjusted_workout, activity_data, 
        energy_balance, adjustment_reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(plannedWorkout),
        JSON.stringify(adjustedWorkout),
        JSON.stringify(todayActivity),
        energyBalance.deficit || energyBalance.surplus,
        adjustedWorkout.adjustmentReason
      ]
    );

    res.json({
      originalWorkout: plannedWorkout,
      adjustedWorkout,
      energyBalance,
      activityData: todayActivity,
      message: 'Workout plan adjusted based on real-time activity'
    });

  } catch (error) {
    console.error('Error adjusting workout:', error);
    res.status(500).json({ error: 'Failed to adjust workout plan' });
  }
});

// Apple HealthKit Integration
router.post('/healthkit/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { healthKitData } = req.body;

    // Process HealthKit data
    const processedData = await processHealthKitData(healthKitData);

    // Store in database
    await runQuery(
      `INSERT INTO healthkit_sync (
        user_id, raw_data, processed_data, sync_timestamp
      ) VALUES (?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(healthKitData),
        JSON.stringify(processedData),
        new Date().toISOString()
      ]
    );

    // Generate recommendations based on HealthKit data
    const recommendations = await generateHealthKitRecommendations(userId, processedData);

    res.json({
      success: true,
      processedData,
      recommendations,
      message: 'HealthKit data synchronized successfully'
    });

  } catch (error) {
    console.error('Error syncing HealthKit data:', error);
    res.status(500).json({ error: 'Failed to sync HealthKit data' });
  }
});

// Google Fit Integration
router.post('/googlefit/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { googleFitData } = req.body;

    // Process Google Fit data
    const processedData = await processGoogleFitData(googleFitData);

    // Store in database
    await runQuery(
      `INSERT INTO googlefit_sync (
        user_id, raw_data, processed_data, sync_timestamp
      ) VALUES (?, ?, ?, ?)`,
      [
        userId,
        JSON.stringify(googleFitData),
        JSON.stringify(processedData),
        new Date().toISOString()
      ]
    );

    // Generate recommendations based on Google Fit data
    const recommendations = await generateGoogleFitRecommendations(userId, processedData);

    res.json({
      success: true,
      processedData,
      recommendations,
      message: 'Google Fit data synchronized successfully'
    });

  } catch (error) {
    console.error('Error syncing Google Fit data:', error);
    res.status(500).json({ error: 'Failed to sync Google Fit data' });
  }
});

// Helper Functions

async function generateDynamicWorkoutRecommendations(userId, activityData) {
  const { steps, caloriesBurned, activeMinutes, workoutSessions } = activityData;

  // Get user's fitness goals
  const userGoals = await getRow(
    'SELECT fitness_goals, activity_level FROM users WHERE id = ?',
    [userId]
  );

  const recommendations = [];

  // Analyze current activity level
  if (steps < 5000) {
    recommendations.push({
      type: 'cardio',
      activity: 'Brisk Walking',
      duration: 30,
      intensity: 'moderate',
      reason: 'Low step count - increase daily movement',
      caloriesBurn: 150
    });
  } else if (steps > 15000) {
    recommendations.push({
      type: 'recovery',
      activity: 'Gentle Stretching',
      duration: 20,
      intensity: 'low',
      reason: 'High activity day - focus on recovery',
      caloriesBurn: 50
    });
  }

  // Adjust based on calories burned
  if (caloriesBurned < 300) {
    recommendations.push({
      type: 'strength',
      activity: 'Bodyweight Exercises',
      duration: 25,
      intensity: 'moderate',
      reason: 'Increase calorie burn with strength training',
      caloriesBurn: 200
    });
  }

  // Consider active minutes
  if (activeMinutes < 30) {
    recommendations.push({
      type: 'hiit',
      activity: 'High-Intensity Interval Training',
      duration: 15,
      intensity: 'high',
      reason: 'Efficient workout for limited active time',
      caloriesBurn: 180
    });
  }

  return recommendations;
}

async function updateDailyEnergyBalance(userId, caloriesBurned) {
  // Get today's food intake
  const todayMeals = await getAll(
    `SELECT SUM(total_calories) as calories_consumed 
     FROM meals 
     WHERE user_id = ? AND DATE(created_at) = DATE("now")`,
    [userId]
  );

  const caloriesConsumed = todayMeals[0]?.calories_consumed || 0;
  const energyBalance = caloriesConsumed - caloriesBurned;

  // Update or insert daily energy balance
  await runQuery(
    `INSERT OR REPLACE INTO daily_energy_balance (
      user_id, date, calories_consumed, calories_burned, energy_balance
    ) VALUES (?, DATE("now"), ?, ?, ?)`,
    [userId, caloriesConsumed, caloriesBurned, energyBalance]
  );

  return energyBalance;
}

async function calculateActivityTrends(userId, period) {
  let query = '';
  let params = [userId];

  switch (period) {
    case 'week':
      query = `
        SELECT 
          DATE(sync_timestamp) as date,
          AVG(steps) as avg_steps,
          AVG(calories_burned) as avg_calories,
          AVG(active_minutes) as avg_active_minutes
        FROM wearable_sync 
        WHERE user_id = ? AND sync_timestamp >= datetime("now", "-7 days")
        GROUP BY DATE(sync_timestamp)
        ORDER BY date ASC
      `;
      break;
    case 'month':
      query = `
        SELECT 
          DATE(sync_timestamp) as date,
          AVG(steps) as avg_steps,
          AVG(calories_burned) as avg_calories,
          AVG(active_minutes) as avg_active_minutes
        FROM wearable_sync 
        WHERE user_id = ? AND sync_timestamp >= datetime("now", "-30 days")
        GROUP BY DATE(sync_timestamp)
        ORDER BY date ASC
      `;
      break;
    default:
      return [];
  }

  const trends = await getAll(query, params);

  // Calculate trend direction
  if (trends.length >= 2) {
    const first = trends[0];
    const last = trends[trends.length - 1];
    
    return {
      data: trends,
      stepstrend: last.avg_steps > first.avg_steps ? 'increasing' : 'decreasing',
      caloriesTrend: last.avg_calories > first.avg_calories ? 'increasing' : 'decreasing',
      activeMinutesTrend: last.avg_active_minutes > first.avg_active_minutes ? 'increasing' : 'decreasing'
    };
  }

  return { data: trends };
}

async function generateActivityInsights(userId, summary, latestSync) {
  const insights = [];

  if (summary.avg_steps < 8000) {
    insights.push({
      type: 'suggestion',
      category: 'activity',
      message: 'Consider increasing daily steps. Aim for 10,000 steps per day.',
      priority: 'medium'
    });
  }

  if (summary.total_active_minutes < 150) {
    insights.push({
      type: 'warning',
      category: 'health',
      message: 'Not meeting weekly active minutes goal. Current: ' + summary.total_active_minutes + ' minutes.',
      priority: 'high'
    });
  }

  if (latestSync && latestSync.calories_burned > 500) {
    insights.push({
      type: 'achievement',
      category: 'fitness',
      message: 'Great job! You burned ' + latestSync.calories_burned + ' calories today.',
      priority: 'low'
    });
  }

  return insights;
}

async function calculateEnergyBalance(userId, activityData) {
  // Get user's BMR and daily calorie goals
  const userProfile = await getRow(
    'SELECT age, gender, height, weight, activity_level FROM users WHERE id = ?',
    [userId]
  );

  // Calculate BMR using Mifflin-St Jeor equation
  let bmr;
  if (userProfile.gender === 'male') {
    bmr = (10 * userProfile.weight) + (6.25 * userProfile.height) - (5 * userProfile.age) + 5;
  } else {
    bmr = (10 * userProfile.weight) + (6.25 * userProfile.height) - (5 * userProfile.age) - 161;
  }

  // Calculate TDEE
  const activityMultiplier = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'active': 1.725,
    'very_active': 1.9
  };

  const tdee = bmr * (activityMultiplier[userProfile.activity_level] || 1.55);
  const totalCaloriesBurned = tdee + (activityData.calories_burned || 0);

  // Get today's food intake
  const todayMeals = await getRow(
    `SELECT SUM(total_calories) as calories_consumed 
     FROM meals 
     WHERE user_id = ? AND DATE(created_at) = DATE("now")`,
    [userId]
  );

  const caloriesConsumed = todayMeals?.calories_consumed || 0;
  const balance = caloriesConsumed - totalCaloriesBurned;

  return {
    bmr,
    tdee,
    totalCaloriesBurned,
    caloriesConsumed,
    balance,
    deficit: balance < 0 ? Math.abs(balance) : 0,
    surplus: balance > 0 ? balance : 0
  };
}

async function adjustWorkoutPlan(plannedWorkout, activityData, energyBalance) {
  const adjustedWorkout = { ...plannedWorkout };

  // If high activity day, reduce intensity
  if (activityData.steps > 15000 || activityData.calories_burned > 600) {
    adjustedWorkout.intensity = 'low';
    adjustedWorkout.duration = Math.max(15, plannedWorkout.duration - 15);
    adjustedWorkout.adjustmentReason = 'High activity day - reduced intensity for recovery';
  }
  // If low activity day, increase intensity
  else if (activityData.steps < 5000 || activityData.calories_burned < 200) {
    adjustedWorkout.intensity = 'high';
    adjustedWorkout.duration = plannedWorkout.duration + 10;
    adjustedWorkout.adjustmentReason = 'Low activity day - increased intensity to boost calorie burn';
  }
  // If calorie surplus, suggest cardio
  else if (energyBalance.surplus > 500) {
    adjustedWorkout.type = 'cardio';
    adjustedWorkout.duration = plannedWorkout.duration + 15;
    adjustedWorkout.adjustmentReason = 'Calorie surplus detected - added cardio to increase burn';
  }

  return adjustedWorkout;
}

async function processHealthKitData(healthKitData) {
  // Process various HealthKit data types
  const processed = {
    steps: healthKitData.steps || 0,
    caloriesActive: healthKitData.activeEnergyBurned || 0,
    caloriesResting: healthKitData.basalEnergyBurned || 0,
    heartRate: healthKitData.heartRate || {},
    workouts: healthKitData.workouts || [],
    sleep: healthKitData.sleepAnalysis || {},
    nutrition: healthKitData.dietaryData || {}
  };

  return processed;
}

async function processGoogleFitData(googleFitData) {
  // Process various Google Fit data types
  const processed = {
    steps: googleFitData.steps || 0,
    calories: googleFitData.calories || 0,
    distance: googleFitData.distance || 0,
    activeMinutes: googleFitData.activeMinutes || 0,
    heartRate: googleFitData.heartRate || {},
    workouts: googleFitData.activities || []
  };

  return processed;
}

async function generateHealthKitRecommendations(userId, processedData) {
  const recommendations = [];

  if (processedData.steps < 8000) {
    recommendations.push({
      type: 'activity',
      message: 'Increase daily steps to reach 10,000 step goal',
      action: 'Take short walks throughout the day'
    });
  }

  if (processedData.caloriesActive < 300) {
    recommendations.push({
      type: 'exercise',
      message: 'Low active calorie burn detected',
      action: 'Add 30 minutes of moderate exercise'
    });
  }

  return recommendations;
}

async function generateGoogleFitRecommendations(userId, processedData) {
  const recommendations = [];

  if (processedData.activeMinutes < 30) {
    recommendations.push({
      type: 'activity',
      message: 'Increase active minutes to meet daily goal',
      action: 'Add 15-20 minutes of physical activity'
    });
  }

  return recommendations;
}

module.exports = router; 