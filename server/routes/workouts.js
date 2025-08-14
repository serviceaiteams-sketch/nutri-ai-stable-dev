const express = require('express');
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get personalized workout recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    // Get user's nutrition data for the day
    const nutritionData = await getRow(
      `SELECT 
        SUM(total_calories) as total_calories,
        SUM(total_protein) as total_protein,
        SUM(total_carbs) as total_carbs,
        SUM(total_fat) as total_fat,
        SUM(total_sugar) as total_sugar,
        SUM(total_sodium) as total_sodium
       FROM meals 
       WHERE user_id = ? AND DATE(created_at) = ?`,
      [userId, date || new Date().toISOString().split('T')[0]]
    );

    // Get user profile for personalized recommendations
    const user = await getRow(
      'SELECT age, gender, weight, activity_level, health_goal FROM users WHERE id = ?',
      [userId]
    );

    // Get nutrition goals
    const goals = await getRow(
      'SELECT * FROM nutrition_goals WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    // Generate recommendations based on nutrition and user profile
    const recommendations = generateWorkoutRecommendations(nutritionData, user, goals);

    res.json({
      nutrition_data: nutritionData,
      user_profile: user,
      goals,
      recommendations
    });

  } catch (error) {
    console.error('Get workout recommendations error:', error);
    res.status(500).json({ error: 'Failed to get workout recommendations' });
  }
});

// Get weekly workout plan
router.get('/weekly-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { week_start } = req.query;

    if (!week_start) {
      return res.status(400).json({ error: 'Week start date required' });
    }

    // Get weekly nutrition summary
    const weeklyNutrition = await getAll(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_calories) as daily_calories,
        SUM(total_protein) as daily_protein,
        SUM(total_carbs) as daily_carbs,
        SUM(total_fat) as daily_fat,
        SUM(total_sugar) as daily_sugar
       FROM meals 
       WHERE user_id = ? AND DATE(created_at) >= ? AND DATE(created_at) < DATE(?, '+7 days')
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [userId, week_start, week_start]
    );

    // Get user profile
    const user = await getRow(
      'SELECT age, gender, weight, activity_level, health_goal FROM users WHERE id = ?',
      [userId]
    );

    // Generate weekly workout plan
    const weeklyPlan = generateWeeklyWorkoutPlan(weeklyNutrition, user);

    res.json({
      weekly_nutrition: weeklyNutrition,
      weekly_workout_plan: weeklyPlan
    });

  } catch (error) {
    console.error('Get weekly workout plan error:', error);
    res.status(500).json({ error: 'Failed to get weekly workout plan' });
  }
});

// Generate workout recommendations based on nutrition and user profile
function generateWorkoutRecommendations(nutritionData, user, goals) {
  const recommendations = [];
  const { total_calories = 0, total_protein = 0, total_carbs = 0, total_fat = 0, total_sugar = 0 } = nutritionData;
  const { age, gender, weight, activity_level, health_goal } = user;

  // Calculate calorie surplus/deficit
  const dailyCalorieGoal = goals?.daily_calories || 2000;
  const calorieDifference = total_calories - dailyCalorieGoal;

  // High calorie intake - recommend cardio
  if (calorieDifference > 300) {
    recommendations.push({
      type: 'cardio',
      title: 'Cardio Session',
      description: `You consumed ${Math.round(calorieDifference)} calories above your goal. A cardio session will help burn the excess calories.`,
      duration: 30,
      intensity: activity_level === 'active' ? 'high' : 'moderate',
      calories_burn: Math.min(calorieDifference * 0.8, 500),
      muscle_groups: 'full_body',
      priority: 'high'
    });
  }

  // High protein intake - recommend strength training
  if (total_protein > (goals?.daily_protein || 50)) {
    recommendations.push({
      type: 'strength',
      title: 'Strength Training',
      description: 'Your protein intake is high - perfect for muscle building. Focus on strength training to utilize the protein effectively.',
      duration: 45,
      intensity: 'moderate',
      calories_burn: 200,
      muscle_groups: 'upper_body,lower_body',
      priority: 'medium'
    });
  }

  // High sugar intake - recommend intense cardio
  if (total_sugar > 50) {
    recommendations.push({
      type: 'cardio',
      title: 'High-Intensity Cardio',
      description: 'Your sugar intake is high. An intense cardio session will help regulate blood sugar levels.',
      duration: 25,
      intensity: 'high',
      calories_burn: 300,
      muscle_groups: 'full_body',
      priority: 'high'
    });
  }

  // Low calorie intake - recommend light activity
  if (calorieDifference < -200) {
    recommendations.push({
      type: 'light',
      title: 'Light Activity',
      description: 'Your calorie intake is low. A light walk or gentle yoga session will help maintain energy levels.',
      duration: 20,
      intensity: 'low',
      calories_burn: 100,
      muscle_groups: 'full_body',
      priority: 'low'
    });
  }

  // Default recommendation if no specific conditions met
  if (recommendations.length === 0) {
    recommendations.push({
      type: 'mixed',
      title: 'Balanced Workout',
      description: 'Your nutrition looks balanced. A mixed workout will help maintain your fitness level.',
      duration: 30,
      intensity: 'moderate',
      calories_burn: 200,
      muscle_groups: 'full_body',
      priority: 'medium'
    });
  }

  // Adjust recommendations based on user profile
  recommendations.forEach(rec => {
    // Adjust for age
    if (age > 50) {
      rec.intensity = rec.intensity === 'high' ? 'moderate' : rec.intensity;
      rec.duration = Math.min(rec.duration, 30);
    }

    // Adjust for activity level
    if (activity_level === 'sedentary') {
      rec.intensity = 'low';
      rec.duration = Math.min(rec.duration, 20);
    }

    // Adjust for health goals
    if (health_goal === 'weight_loss') {
      rec.calories_burn = Math.round(rec.calories_burn * 1.2);
    }
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Log a new workout
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const {
      workout_type,
      title,
      description,
      duration,
      intensity,
      calories_burn,
      muscle_groups,
      exercises,
      date
    } = req.body;

    const userId = req.user.id;

    // Optional created_at from date (YYYY-MM-DD)
    let createdAtSql = null;
    if (date) {
      // Save midday time to avoid TZ edges
      createdAtSql = `${date} 12:00:00`;
    }

    // Insert workout (with optional created_at override)
    const workoutResult = await runQuery(
      `INSERT INTO workout_recommendations (user_id, recommendation_type, title, description,
       duration, intensity, calories_burn, muscle_groups, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))`,
      [
        userId, workout_type, title, description, duration, intensity,
        calories_burn || 0, muscle_groups ? muscle_groups.join(',') : '', createdAtSql
      ]
    );

    // Get the complete workout data
    const workout = await getRow(
      'SELECT * FROM workout_recommendations WHERE id = ?',
      [workoutResult.id]
    );

    res.status(201).json({
      message: 'Workout logged successfully',
      workout: {
        ...workout,
        // Normalize for client naming
        workout_type: workout.recommendation_type,
        muscle_groups: workout.muscle_groups ? workout.muscle_groups.split(',') : [],
        exercises: exercises || []
      }
    });

  } catch (error) {
    console.error('Workout logging error:', error);
    res.status(500).json({ error: 'Failed to log workout' });
  }
});

// Get user's workout history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let query = 'SELECT * FROM workout_recommendations WHERE user_id = ?';
    let params = [userId];

    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY created_at DESC';

    const workouts = await getAll(query, params);

    res.json({
      workouts: workouts.map(workout => ({
        ...workout,
        // Normalize naming used by frontend
        workout_type: workout.recommendation_type,
        muscle_groups: workout.muscle_groups ? workout.muscle_groups.split(',') : [],
        exercises: []
      }))
    });

  } catch (error) {
    console.error('Get workout history error:', error);
    res.status(500).json({ error: 'Failed to get workout history' });
  }
});

// Update a workout
router.put('/:workoutId', authenticateToken, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user.id;
    const {
      workout_type,
      title,
      description,
      duration,
      intensity,
      calories_burn,
      muscle_groups,
      exercises
    } = req.body;

    // Check if workout belongs to user
    const existingWorkout = await getRow(
      'SELECT id FROM workout_recommendations WHERE id = ? AND user_id = ?',
      [workoutId, userId]
    );

    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Update workout
    await runQuery(
      `UPDATE workout_recommendations SET 
       recommendation_type = ?, title = ?, description = ?, duration = ?, 
       intensity = ?, calories_burn = ?, muscle_groups = ?
       WHERE id = ?`,
      [
        workout_type, title, description, duration, intensity, 
        calories_burn || 0, muscle_groups ? muscle_groups.join(',') : '', workoutId
      ]
    );

    // Get the updated workout data
    const workout = await getRow(
      'SELECT * FROM workout_recommendations WHERE id = ?',
      [workoutId]
    );

    res.json({
      message: 'Workout updated successfully',
      workout: {
        ...workout,
        muscle_groups: workout.muscle_groups ? workout.muscle_groups.split(',') : [],
        exercises: exercises || []
      }
    });

  } catch (error) {
    console.error('Update workout error:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// Delete a workout
router.delete('/:workoutId', authenticateToken, async (req, res) => {
  try {
    const { workoutId } = req.params;
    const userId = req.user.id;

    // Check if workout belongs to user
    const workout = await getRow(
      'SELECT id FROM workout_recommendations WHERE id = ? AND user_id = ?',
      [workoutId, userId]
    );

    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    // Delete workout
    await runQuery('DELETE FROM workout_recommendations WHERE id = ?', [workoutId]);

    res.json({ message: 'Workout deleted successfully' });

  } catch (error) {
    console.error('Delete workout error:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// Generate weekly workout plan
function generateWeeklyWorkoutPlan(weeklyNutrition, user) {
  const plan = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  weeklyNutrition.forEach((day, index) => {
    if (index < 7) { // Ensure we don't exceed 7 days
      const dayRecommendations = generateWorkoutRecommendations(day, user);
      plan.push({
        day: days[index],
        date: day.date,
        nutrition: day,
        workouts: dayRecommendations.slice(0, 2) // Limit to 2 workouts per day
      });
    }
  });

  return plan;
}

module.exports = router; 