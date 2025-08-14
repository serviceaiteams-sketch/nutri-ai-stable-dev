const express = require('express');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Log a new meal
router.post('/log', authenticateToken, [
  body('meal_type').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('image_url').optional(),
  body('food_items').isArray().notEmpty(),
  body('food_items.*.name').notEmpty().withMessage('Food name is required')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Validation errors:', errors.array());
      return res.status(400).json({ 
        error: 'Invalid meal data. Please try again.',
        details: errors.array() 
      });
    }

    const {
      meal_type,
      image_url,
      food_items,
      total_nutrition,
      date
    } = req.body;

    const userId = req.user.id;

    console.log('Logging meal for user:', userId);
    console.log('Food items:', food_items);

    // Calculate total nutrition if not provided
    const calculatedNutrition = total_nutrition || calculateTotalNutrition(food_items);

    console.log('Calculated nutrition:', calculatedNutrition);

    // Determine created_at based on optional provided date (YYYY-MM-DD),
    // store in SQLite-friendly format 'YYYY-MM-DD HH:MM:SS'
    const formatSqlDateTime = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    };

    let createdAt = null;
    if (date) {
      // Normalize to local midday to avoid timezone edge cases
      const d = new Date(`${date}T12:00:00`);
      createdAt = formatSqlDateTime(d);
    } else {
      createdAt = formatSqlDateTime(new Date());
    }

    // Insert meal
    const mealResult = await runQuery(
      `INSERT INTO meals (user_id, meal_type, image_url, total_calories, total_protein, 
       total_carbs, total_fat, total_sugar, total_sodium, total_fiber, is_healthy, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, meal_type, image_url, calculatedNutrition.calories, calculatedNutrition.protein,
        calculatedNutrition.carbs, calculatedNutrition.fat, calculatedNutrition.sugar,
        calculatedNutrition.sodium, calculatedNutrition.fiber, calculatedNutrition.is_healthy || true,
        createdAt
      ]
    );

    // Insert food items
    for (const food of food_items) {
      console.log('Inserting food item:', food);
      
      // Ensure numeric values
      const quantity = Number(food.quantity) || 1;
      const calories = Number(food.calories) || 0;
      const protein = Number(food.protein) || 0;
      const carbs = Number(food.carbs) || 0;
      const fat = Number(food.fat) || 0;
      const sugar = Number(food.sugar) || 0;
      const sodium = Number(food.sodium) || 0;
      const fiber = Number(food.fiber) || 0;
      const confidence_score = Number(food.confidence_score) || 0.9;
      
      await runQuery(
        `INSERT INTO food_items (meal_id, food_name, quantity, unit, calories, protein, 
         carbs, fat, sugar, sodium, fiber, confidence_score, is_healthy) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mealResult.id, food.name, quantity, food.unit || 'serving',
          calories, protein, carbs, fat, sugar, sodium, fiber, confidence_score, food.is_healthy || true
        ]
      );
    }

    // Get the complete meal data
    const meal = await getRow(
      'SELECT * FROM meals WHERE id = ?',
      [mealResult.id]
    );

    const foodItems = await getAll(
      'SELECT * FROM food_items WHERE meal_id = ?',
      [mealResult.id]
    );

    res.status(201).json({
      message: 'Meal logged successfully',
      meal: {
        ...meal,
        food_items: foodItems
      }
    });

  } catch (error) {
    console.error('Meal logging error:', error);
    res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Get user's meals for a specific date (timezone-safe)
router.get('/daily/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    // Compare using a half-open interval [date, date+1) to avoid timezone issues
    const meals = await getAll(
      `SELECT m.* FROM meals m
       WHERE m.user_id = ? 
         AND datetime(m.created_at) >= datetime(?, 'start of day')
         AND datetime(m.created_at) < datetime(?, 'start of day', '+1 day')
       ORDER BY m.created_at DESC`,
      [userId, date, date]
    );

    // Get food items for each meal
    const mealsWithFoodItems = await Promise.all(
      meals.map(async (meal) => {
        const foodItems = await getAll(
          'SELECT * FROM food_items WHERE meal_id = ?',
          [meal.id]
        );
        return {
          ...meal,
          food_items: foodItems
        };
      })
    );

    res.json({
      meals: mealsWithFoodItems
    });

  } catch (error) {
    console.error('Get daily meals error:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Get user's meals for a date range
router.get('/range', authenticateToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const userId = req.user.id;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'Start date and end date required' });
    }

    const meals = await getAll(
      `SELECT m.*, 
              GROUP_CONCAT(fi.food_name || ' (' || fi.quantity || ' ' || fi.unit || ')') as food_summary
       FROM meals m
       LEFT JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? 
         AND datetime(m.created_at) >= datetime(?, 'start of day')
         AND datetime(m.created_at) < datetime(?, 'start of day', '+1 day')
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [userId, start_date, end_date]
    );

    res.json({ meals });

  } catch (error) {
    console.error('Get meals range error:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});

// Get nutrition summary for a date
router.get('/summary/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const userId = req.user.id;

    const summary = await getRow(
      `SELECT 
        SUM(total_calories) as total_calories,
        SUM(total_protein) as total_protein,
        SUM(total_carbs) as total_carbs,
        SUM(total_fat) as total_fat,
        SUM(total_sugar) as total_sugar,
        SUM(total_sodium) as total_sodium,
        SUM(total_fiber) as total_fiber,
        COUNT(*) as meal_count
       FROM meals 
       WHERE user_id = ? 
         AND datetime(created_at) >= datetime(?, 'start of day')
         AND datetime(created_at) < datetime(?, 'start of day', '+1 day')`,
      [userId, date, date]
    );

    // Get user's nutrition goals
    const goals = await getRow(
      'SELECT * FROM nutrition_goals WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    // Calculate percentages
    const percentages = {};
    if (goals) {
      percentages.calories = summary.total_calories ? (summary.total_calories / goals.daily_calories) * 100 : 0;
      percentages.protein = summary.total_protein ? (summary.total_protein / goals.daily_protein) * 100 : 0;
      percentages.carbs = summary.total_carbs ? (summary.total_carbs / goals.daily_carbs) * 100 : 0;
      percentages.fat = summary.total_fat ? (summary.total_fat / goals.daily_fat) * 100 : 0;
    }

    res.json({
      summary,
      goals,
      percentages
    });

  } catch (error) {
    console.error('Get nutrition summary error:', error);
    res.status(500).json({ error: 'Failed to fetch nutrition summary' });
  }
});

// Get weekly nutrition summary
router.get('/weekly-summary', authenticateToken, async (req, res) => {
  try {
    const { week_start } = req.query;
    const userId = req.user.id;

    if (!week_start) {
      return res.status(400).json({ error: 'Week start date required' });
    }

    const weeklyData = await getAll(
      `SELECT 
        DATE(created_at) as date,
        SUM(total_calories) as daily_calories,
        SUM(total_protein) as daily_protein,
        SUM(total_carbs) as daily_carbs,
        SUM(total_fat) as daily_fat,
        SUM(total_sugar) as daily_sugar,
        SUM(total_sodium) as daily_sodium,
        SUM(total_fiber) as daily_fiber,
        COUNT(*) as meal_count
       FROM meals 
       WHERE user_id = ? AND DATE(created_at) >= ? AND DATE(created_at) < DATE(?, '+7 days')
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [userId, week_start, week_start]
    );

    // Calculate averages
    const averages = weeklyData.reduce((acc, day) => {
      Object.keys(acc).forEach(key => {
        if (key !== 'date' && key !== 'meal_count') {
          acc[key] += day[key] || 0;
        }
      });
      return acc;
    }, {
      daily_calories: 0, daily_protein: 0, daily_carbs: 0, daily_fat: 0,
      daily_sugar: 0, daily_sodium: 0, daily_fiber: 0
    });

    const daysCount = weeklyData.length;
    Object.keys(averages).forEach(key => {
      averages[key] = daysCount > 0 ? averages[key] / daysCount : 0;
    });

    res.json({
      weekly_data: weeklyData,
      averages
    });

  } catch (error) {
    console.error('Get weekly summary error:', error);
    res.status(500).json({ error: 'Failed to fetch weekly summary' });
  }
});

// Update a meal
router.put('/:mealId', authenticateToken, [
  body('meal_type').isIn(['breakfast', 'lunch', 'dinner', 'snack']),
  body('food_items').isArray().notEmpty()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { mealId } = req.params;
    const userId = req.user.id;
    const {
      meal_type,
      food_items,
      total_nutrition,
      notes
    } = req.body;

    // Check if meal belongs to user
    const existingMeal = await getRow(
      'SELECT id FROM meals WHERE id = ? AND user_id = ?',
      [mealId, userId]
    );

    if (!existingMeal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Calculate total nutrition if not provided
    const calculatedNutrition = total_nutrition || calculateTotalNutrition(food_items);

    // Update meal
    await runQuery(
      `UPDATE meals SET 
       meal_type = ?, 
       total_calories = ?, 
       total_protein = ?, 
       total_carbs = ?, 
       total_fat = ?, 
       total_sugar = ?, 
       total_sodium = ?, 
       total_fiber = ?,
       updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        meal_type, calculatedNutrition.calories, calculatedNutrition.protein,
        calculatedNutrition.carbs, calculatedNutrition.fat, calculatedNutrition.sugar,
        calculatedNutrition.sodium, calculatedNutrition.fiber, mealId
      ]
    );

    // Delete existing food items
    await runQuery('DELETE FROM food_items WHERE meal_id = ?', [mealId]);

    // Insert new food items
    for (const food of food_items) {
      await runQuery(
        `INSERT INTO food_items (meal_id, food_name, quantity, unit, calories, protein, 
         carbs, fat, sugar, sodium, fiber, confidence_score, is_healthy) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          mealId, food.name, food.quantity || 1, food.unit || 'serving',
          food.calories || 0, food.protein || 0, food.carbs || 0,
          food.fat || 0, food.sugar || 0, food.sodium || 0,
          food.fiber || 0, food.confidence_score || 0.9, food.is_healthy || true
        ]
      );
    }

    // Get the updated meal data
    const meal = await getRow(
      'SELECT * FROM meals WHERE id = ?',
      [mealId]
    );

    const foodItems = await getAll(
      'SELECT * FROM food_items WHERE meal_id = ?',
      [mealId]
    );

    res.json({
      message: 'Meal updated successfully',
      meal: {
        ...meal,
        food_items: foodItems
      }
    });

  } catch (error) {
    console.error('Update meal error:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});

// Delete a meal
router.delete('/:mealId', authenticateToken, async (req, res) => {
  try {
    const { mealId } = req.params;
    const userId = req.user.id;

    // Check if meal belongs to user
    const meal = await getRow(
      'SELECT id FROM meals WHERE id = ? AND user_id = ?',
      [mealId, userId]
    );

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Delete food items first
    await runQuery('DELETE FROM food_items WHERE meal_id = ?', [mealId]);
    
    // Delete meal
    await runQuery('DELETE FROM meals WHERE id = ?', [mealId]);

    res.json({ message: 'Meal deleted successfully' });

  } catch (error) {
    console.error('Delete meal error:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

// Helper function to calculate total nutrition
function calculateTotalNutrition(foodItems) {
  const total = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    fiber: 0
  };

  console.log('Calculating total nutrition from food items:', foodItems);

  foodItems.forEach(food => {
    console.log('Processing food item:', food);
    Object.keys(total).forEach(nutrient => {
      const value = Number(food[nutrient]) || 0;
      total[nutrient] += value;
      console.log(`Adding ${value} to ${nutrient}, total now: ${total[nutrient]}`);
    });
  });

  console.log('Final total nutrition:', total);
  return total;
}

module.exports = router; 