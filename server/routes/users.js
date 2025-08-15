const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await getRow(
      `SELECT id, email, name, age, gender, height, weight, activity_level, 
       health_goal, dietary_preferences, allergies, medical_conditions, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('name').optional().notEmpty().trim(),
  body('age').optional().isInt({ min: 1, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('height').optional().isFloat({ min: 0 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('activity_level').optional().isIn(['sedentary', 'moderate', 'active']),
  body('health_goal').optional().isIn(['weight_loss', 'muscle_gain', 'maintenance', 'improve_health'])
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const updateFields = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] !== undefined && updateFields[key] !== null) {
        fields.push(`${key} = ?`);
        values.push(updateFields[key]);
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Add updated_at timestamp
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    
    await runQuery(query, values);

    // Get updated user data
    const updatedUser = await getRow(
      `SELECT id, email, name, age, gender, height, weight, activity_level, 
       health_goal, dietary_preferences, allergies, medical_conditions, created_at 
       FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser
    });

  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Calculate BMI and health metrics
router.get('/health-metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await getRow(
      'SELECT age, gender, height, weight FROM users WHERE id = ?',
      [userId]
    );

    if (!user || !user.height || !user.weight) {
      return res.status(400).json({ error: 'Height and weight required for health metrics' });
    }

    // Calculate BMI
    const heightInMeters = user.height / 100; // Convert cm to meters
    const bmi = user.weight / (heightInMeters * heightInMeters);

    // BMI categories
    let bmiCategory = '';
    if (bmi < 18.5) bmiCategory = 'Underweight';
    else if (bmi < 25) bmiCategory = 'Normal weight';
    else if (bmi < 30) bmiCategory = 'Overweight';
    else bmiCategory = 'Obese';

    // Calculate daily calorie needs (Harris-Benedict equation)
    let bmr = 0;
    if (user.gender === 'male') {
      bmr = 88.362 + (13.397 * user.weight) + (4.799 * user.height) - (5.677 * user.age);
    } else {
      bmr = 447.593 + (9.247 * user.weight) + (3.098 * user.height) - (4.330 * user.age);
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      moderate: 1.55,
      active: 1.725
    };

    const tdee = bmr * (activityMultipliers[user.activity_level] || 1.55);

    // Calculate ideal weight range
    const minIdealWeight = 18.5 * heightInMeters * heightInMeters;
    const maxIdealWeight = 24.9 * heightInMeters * heightInMeters;

    res.json({
      bmi: Math.round(bmi * 10) / 10,
      bmi_category: bmiCategory,
      daily_calorie_needs: Math.round(tdee),
      ideal_weight_range: {
        min: Math.round(minIdealWeight),
        max: Math.round(maxIdealWeight)
      },
      current_weight: user.weight,
      height: user.height,
      age: user.age,
      gender: user.gender
    });

  } catch (error) {
    console.error('Calculate health metrics error:', error);
    res.status(500).json({ error: 'Failed to calculate health metrics' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Get meal statistics
    const mealStats = await getRow(
      `SELECT 
        COUNT(*) as total_meals,
        COUNT(DISTINCT DATE(created_at)) as days_tracked,
        AVG(total_calories) as avg_calories,
        AVG(total_protein) as avg_protein,
        AVG(total_carbs) as avg_carbs,
        AVG(total_fat) as avg_fat,
        SUM(CASE WHEN is_healthy = 1 THEN 1 ELSE 0 END) as healthy_meals,
        SUM(CASE WHEN is_healthy = 0 THEN 1 ELSE 0 END) as unhealthy_meals
       FROM meals 
       WHERE user_id = ? AND created_at >= DATE('now', '-${days} days')`,
      [userId]
    );

    // Get workout statistics
    const workoutStats = await getRow(
      `SELECT 
        COUNT(*) as total_workouts,
        SUM(calories_burn) as total_calories_burned,
        AVG(duration) as avg_duration,
        COUNT(CASE WHEN intensity = 'high' THEN 1 END) as high_intensity_workouts,
        COUNT(CASE WHEN intensity = 'moderate' THEN 1 END) as moderate_intensity_workouts,
        COUNT(CASE WHEN intensity = 'low' THEN 1 END) as low_intensity_workouts
       FROM workout_recommendations 
       WHERE user_id = ? AND recommendation_type = 'completed' 
       AND created_at >= DATE('now', '-${days} days')`,
      [userId]
    );

    // Get health warnings count
    const warningStats = await getRow(
      `SELECT 
        COUNT(*) as total_warnings,
        COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity_warnings,
        COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity_warnings,
        COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity_warnings
       FROM health_warnings 
       WHERE user_id = ? AND is_active = 1 
       AND created_at >= DATE('now', '-${days} days')`,
      [userId]
    );

    // Calculate success rate
    const totalMeals = mealStats.total_meals || 0;
    const healthyMeals = mealStats.healthy_meals || 0;
    const successRate = totalMeals > 0 ? (healthyMeals / totalMeals) * 100 : 0;

    res.json({
      period_days: days,
      meal_statistics: mealStats,
      workout_statistics: workoutStats,
      warning_statistics: warningStats,
      success_rate: Math.round(successRate),
      tracking_consistency: mealStats.days_tracked || 0
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user statistics' });
  }
});

// Delete user account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all user data (cascade delete)
    await runQuery('DELETE FROM food_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ?)', [userId]);
    await runQuery('DELETE FROM meals WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM workout_recommendations WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM health_warnings WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM nutrition_goals WHERE user_id = ?', [userId]);
    await runQuery('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Account deleted successfully' });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Onboarding route
router.post('/onboarding', authenticateToken, async (req, res) => {
  try {
    const { goals, phone, age, currentWeight, targetWeight, weightUnit, medicalConditions, sleepTime, wakeTime, waterGoal, stepGoal } = req.body;
    const userId = req.user.id;

    // Simplified onboarding - just mark as completed
    const updateQuery = `
      UPDATE users 
      SET 
        onboarding_completed = 1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await runQuery(updateQuery, [userId]);

    // Save user goals (temporarily disabled due to database issues)
    // if (goals && goals.length > 0) {
    //   const goalsQuery = `
    //     INSERT INTO user_goals (user_id, goal_type, created_at)
    //     VALUES (?, ?, CURRENT_TIMESTAMP)
    //   `;
    //   
    //   for (const goal of goals) {
    //     await runQuery(goalsQuery, [userId, goal]);
    //   }
    // }

    // Save medical conditions (temporarily disabled due to database issues)
    // if (medicalConditions && medicalConditions.length > 0) {
    //   const conditionsQuery = `
    //     INSERT INTO user_medical_conditions (user_id, condition_type, created_at)
    //     VALUES (?, ?, CURRENT_TIMESTAMP)
    //   `;
    //   
    //   for (const condition of medicalConditions) {
    //     if (condition !== 'none') {
    //       await runQuery(conditionsQuery, [userId, condition]);
    //   }
    // }

    res.json({
      success: true,
      message: 'Onboarding completed successfully'
    });
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving onboarding data'
    });
  }
});

module.exports = router; 