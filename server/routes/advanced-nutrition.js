const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Micronutrient daily requirements (RDA values)
const MICRONUTRIENT_RDA = {
  vitamin_a: 900, // mcg
  vitamin_c: 90, // mg
  vitamin_d: 20, // mcg
  vitamin_e: 15, // mg
  vitamin_k: 120, // mcg
  thiamine_b1: 1.2, // mg
  riboflavin_b2: 1.3, // mg
  niacin_b3: 16, // mg
  pantothenic_acid_b5: 5, // mg
  pyridoxine_b6: 1.7, // mg
  biotin_b7: 30, // mcg
  folate_b9: 400, // mcg
  cobalamin_b12: 2.4, // mcg
  calcium: 1000, // mg
  iron: 8, // mg
  magnesium: 400, // mg
  phosphorus: 700, // mg
  potassium: 3500, // mg
  sodium: 2300, // mg (upper limit)
  zinc: 11, // mg
  copper: 900, // mcg
  manganese: 2.3, // mg
  selenium: 55, // mcg
  iodine: 150, // mcg
  chromium: 35, // mcg
  molybdenum: 45 // mcg
};

// Common allergens database
const COMMON_ALLERGENS = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans',
  'sesame', 'mustard', 'celery', 'lupin', 'sulphites', 'molluscs'
];

// Enhanced food micronutrient database (per 100g)
const FOOD_MICRONUTRIENTS = {
  // Fruits
  'orange': { vitamin_c: 53.2, folate_b9: 40, calcium: 40, potassium: 181 },
  'apple': { vitamin_c: 4.6, vitamin_k: 2.2, potassium: 107, fiber: 2.4 },
  'banana': { vitamin_c: 8.7, vitamin_b6: 0.4, potassium: 358, magnesium: 27 },
  'strawberry': { vitamin_c: 58.8, folate_b9: 24, manganese: 0.4, potassium: 153 },
  'blueberry': { vitamin_c: 9.7, vitamin_k: 19.3, manganese: 0.3, fiber: 2.4 },
  'mango': { vitamin_a: 54, vitamin_c: 36.4, vitamin_e: 0.9, potassium: 168 },
  'pineapple': { vitamin_c: 47.8, vitamin_b6: 0.1, manganese: 0.9, potassium: 109 },
  'grape': { vitamin_c: 3.2, vitamin_k: 14.6, potassium: 191, fiber: 0.9 },
  
  // Vegetables
  'spinach': { vitamin_a: 469, vitamin_c: 28.1, vitamin_k: 483, folate_b9: 194, iron: 2.7, magnesium: 79, calcium: 99 },
  'broccoli': { vitamin_c: 89.2, vitamin_k: 101.6, folate_b9: 63, calcium: 47, potassium: 316, fiber: 2.6 },
  'carrot': { vitamin_a: 835, vitamin_c: 5.9, vitamin_k: 13.2, potassium: 320, fiber: 2.8 },
  'tomato': { vitamin_c: 13.7, vitamin_a: 833, vitamin_k: 7.9, potassium: 237, folate_b9: 15 },
  'bell pepper': { vitamin_c: 127.7, vitamin_a: 157, vitamin_e: 0.37, potassium: 211, folate_b9: 46 },
  'onion': { vitamin_c: 7.4, vitamin_b6: 0.1, folate_b9: 19, potassium: 146, fiber: 1.7 },
  'garlic': { vitamin_c: 31.2, vitamin_b6: 1.2, manganese: 1.7, selenium: 14.2 },
  'potato': { vitamin_c: 19.7, vitamin_b6: 0.3, potassium: 421, magnesium: 23, fiber: 2.2 },
  'sweet potato': { vitamin_a: 709, vitamin_c: 2.4, potassium: 337, manganese: 0.3, fiber: 3.0 },
  'cauliflower': { vitamin_c: 48.2, vitamin_k: 15.5, folate_b9: 57, potassium: 299, fiber: 2.0 },
  'cabbage': { vitamin_c: 36.6, vitamin_k: 76, folate_b9: 43, potassium: 170, fiber: 2.5 },
  'lettuce': { vitamin_a: 166, vitamin_c: 9.2, vitamin_k: 102.5, folate_b9: 38, potassium: 194 },
  'cucumber': { vitamin_c: 2.8, vitamin_k: 16.4, potassium: 147, magnesium: 13, fiber: 0.5 },
  'celery': { vitamin_c: 3.1, vitamin_k: 29.3, potassium: 260, folate_b9: 36, fiber: 1.6 },
  'asparagus': { vitamin_c: 5.6, vitamin_k: 41.6, folate_b9: 52, potassium: 202, fiber: 2.1 },
  'mushroom': { vitamin_d: 0.2, vitamin_b2: 0.4, vitamin_b3: 3.6, selenium: 9.3, potassium: 318 },
  'corn': { vitamin_c: 6.8, vitamin_b1: 0.2, folate_b9: 42, magnesium: 37, fiber: 2.7 },
  'peas': { vitamin_c: 40, vitamin_k: 24.8, folate_b9: 65, iron: 1.5, magnesium: 33, fiber: 5.7 },
  
  // Proteins
  'salmon': { vitamin_d: 11, vitamin_b12: 4.8, vitamin_b6: 0.9, selenium: 22.5, phosphorus: 200, omega3: 2260 },
  'tuna': { vitamin_d: 5.7, vitamin_b12: 2.2, vitamin_b6: 0.9, selenium: 36.5, phosphorus: 278, omega3: 1290 },
  'chicken breast': { vitamin_b3: 13.7, vitamin_b6: 0.6, selenium: 22.2, phosphorus: 200, zinc: 1.0 },
  'beef': { iron: 2.6, zinc: 6.3, vitamin_b12: 1.4, selenium: 14.2, phosphorus: 198, vitamin_b6: 0.4 },
  'pork': { vitamin_b1: 0.9, vitamin_b6: 0.6, phosphorus: 198, selenium: 36.5, zinc: 2.4 },
  'lamb': { iron: 1.6, zinc: 4.4, vitamin_b12: 2.3, selenium: 21.4, phosphorus: 188 },
  'turkey': { vitamin_b3: 6.3, vitamin_b6: 0.7, selenium: 27.6, phosphorus: 173, zinc: 2.5 },
  'eggs': { vitamin_d: 2.0, vitamin_b12: 0.6, vitamin_b2: 0.5, selenium: 15.4, phosphorus: 99, iron: 1.8 },
  
  // Dairy
  'milk': { vitamin_d: 1.2, vitamin_b12: 0.5, vitamin_b2: 0.2, calcium: 113, phosphorus: 84, potassium: 143 },
  'yogurt': { calcium: 121, vitamin_b12: 0.5, vitamin_b2: 0.3, phosphorus: 95, potassium: 155 },
  'cheese': { calcium: 721, vitamin_b12: 1.1, vitamin_a: 1002, phosphorus: 387, zinc: 2.9 },
  'cottage cheese': { calcium: 83, vitamin_b12: 0.4, phosphorus: 159, selenium: 9.7, zinc: 0.4 },
  
  // Grains
  'quinoa': { iron: 4.6, magnesium: 197, phosphorus: 457, manganese: 2.0, fiber: 7.0, folate_b9: 184 },
  'brown rice': { vitamin_b1: 0.4, vitamin_b6: 0.5, magnesium: 143, phosphorus: 333, manganese: 3.7, fiber: 3.5 },
  'oats': { iron: 4.7, magnesium: 177, phosphorus: 523, zinc: 4.0, fiber: 10.6, vitamin_b1: 0.5 },
  'whole wheat bread': { iron: 3.6, magnesium: 58, phosphorus: 153, zinc: 1.8, fiber: 7.0, vitamin_b1: 0.3 },
  'pasta': { iron: 1.8, magnesium: 18, phosphorus: 58, zinc: 0.5, fiber: 2.5, vitamin_b1: 0.1 },
  
  // Nuts and Seeds
  'almonds': { vitamin_e: 25.6, magnesium: 270, calcium: 269, iron: 3.9, zinc: 3.1, fiber: 12.5 },
  'walnuts': { vitamin_e: 0.7, magnesium: 158, phosphorus: 346, manganese: 3.4, omega3: 9080, fiber: 6.7 },
  'cashews': { magnesium: 292, phosphorus: 593, zinc: 5.6, iron: 6.7, vitamin_k: 34.1, fiber: 3.3 },
  'pistachios': { vitamin_b6: 1.7, phosphorus: 490, potassium: 1025, magnesium: 121, fiber: 10.6 },
  'sunflower seeds': { vitamin_e: 35.2, vitamin_b1: 1.5, magnesium: 325, phosphorus: 660, selenium: 53.0, fiber: 8.6 },
  'chia seeds': { calcium: 631, iron: 7.7, magnesium: 335, phosphorus: 860, omega3: 17800, fiber: 34.4 },
  'flax seeds': { magnesium: 392, phosphorus: 642, manganese: 2.5, omega3: 22800, fiber: 27.3, vitamin_b1: 1.6 },
  
  // Legumes
  'lentils': { iron: 6.5, folate_b9: 181, magnesium: 47, phosphorus: 180, potassium: 369, fiber: 7.9 },
  'chickpeas': { iron: 4.3, folate_b9: 172, magnesium: 48, phosphorus: 168, potassium: 291, fiber: 7.6 },
  'black beans': { iron: 2.1, folate_b9: 149, magnesium: 60, phosphorus: 140, potassium: 355, fiber: 8.7 },
  'kidney beans': { iron: 2.9, folate_b9: 130, magnesium: 45, phosphorus: 138, potassium: 405, fiber: 6.4 },
  'pinto beans': { iron: 2.3, folate_b9: 172, magnesium: 50, phosphorus: 147, potassium: 436, fiber: 9.0 },
  
  // Herbs and Spices
  'basil': { vitamin_a: 5275, vitamin_c: 18.0, vitamin_k: 414.8, calcium: 177, iron: 3.2, magnesium: 64 },
  'oregano': { vitamin_a: 1007, vitamin_c: 2.3, vitamin_k: 621.7, calcium: 1579, iron: 36.8, magnesium: 147 },
  'thyme': { vitamin_a: 4751, vitamin_c: 160.1, vitamin_k: 1714.5, calcium: 1890, iron: 123.6, magnesium: 220 },
  'rosemary': { vitamin_a: 2922, vitamin_c: 21.8, vitamin_k: 1714.5, calcium: 317, iron: 6.7, magnesium: 91 },
  'turmeric': { vitamin_c: 0.7, vitamin_e: 4.4, vitamin_k: 13.4, calcium: 21, iron: 41.4, magnesium: 193 },
  'ginger': { vitamin_c: 5.0, vitamin_b6: 0.2, magnesium: 43, potassium: 415, manganese: 0.2, fiber: 2.0 },
  
  // Common Indian Foods
  'rice': { vitamin_b1: 0.1, vitamin_b6: 0.1, magnesium: 12, phosphorus: 43, manganese: 0.4, fiber: 0.4 },
  'dal': { iron: 2.5, folate_b9: 100, magnesium: 45, phosphorus: 150, potassium: 300, fiber: 8.0 },
  'roti': { iron: 1.2, magnesium: 25, phosphorus: 100, zinc: 0.8, fiber: 2.5, vitamin_b1: 0.1 },
  'paratha': { iron: 1.5, magnesium: 30, phosphorus: 120, zinc: 1.0, fiber: 3.0, vitamin_b1: 0.15 },
  'thepla': { iron: 2.0, magnesium: 35, phosphorus: 140, zinc: 1.2, fiber: 3.5, vitamin_b1: 0.2 },
  'idli': { iron: 1.8, magnesium: 28, phosphorus: 95, zinc: 0.9, fiber: 2.8, vitamin_b1: 0.15 },
  'dosa': { iron: 1.5, magnesium: 25, phosphorus: 85, zinc: 0.8, fiber: 2.5, vitamin_b1: 0.12 },
  'vada': { iron: 2.2, magnesium: 32, phosphorus: 110, zinc: 1.1, fiber: 3.2, vitamin_b1: 0.18 },
  'sambar': { iron: 2.8, folate_b9: 85, magnesium: 38, phosphorus: 125, potassium: 280, fiber: 6.8 },
  'rasam': { vitamin_c: 15.0, vitamin_a: 450, iron: 1.8, magnesium: 22, potassium: 180, fiber: 2.5 },
  'curd': { calcium: 110, vitamin_b12: 0.4, vitamin_b2: 0.2, phosphorus: 85, potassium: 150 },
  'ghee': { vitamin_a: 3069, vitamin_e: 2.8, vitamin_k: 8.6, saturated_fat: 62.8 },
  'pickle': { vitamin_c: 8.0, vitamin_a: 200, iron: 1.2, magnesium: 15, potassium: 120, fiber: 1.8 },
  'chutney': { vitamin_c: 12.0, vitamin_a: 350, iron: 1.5, magnesium: 18, potassium: 140, fiber: 2.0 }
};

// Function to estimate micronutrients from food items
function estimateMicronutrientsFromFood(foodItems) {
  const micronutrients = {};
  
  // Initialize all micronutrients to 0
  Object.keys(MICRONUTRIENT_RDA).forEach(nutrient => {
    micronutrients[nutrient] = 0;
  });
  
  foodItems.forEach(food => {
    const foodName = food.name.toLowerCase();
    const quantity = food.quantity || 1;
    const unit = food.unit || 'piece';
    
    // Convert quantity to grams for calculation
    let grams = quantity;
    if (unit === 'piece' || unit === 'pieces') grams = quantity * 100; // Estimate 100g per piece
    else if (unit === 'cup' || unit === 'cups') grams = quantity * 240; // 1 cup = 240g
    else if (unit === 'tablespoon' || unit === 'tablespoons') grams = quantity * 15; // 1 tbsp = 15g
    else if (unit === 'teaspoon' || unit === 'teaspoons') grams = quantity * 5; // 1 tsp = 5g
    else if (unit === 'bowl' || unit === 'bowls') grams = quantity * 200; // 1 bowl = 200g
    else if (unit === 'plate' || unit === 'plates') grams = quantity * 300; // 1 plate = 300g
    else if (unit === 'serving' || unit === 'servings') grams = quantity * 150; // 1 serving = 150g
    
    // Find micronutrient data for this food
    let foodData = null;
    
    // Try exact match first
    if (FOOD_MICRONUTRIENTS[foodName]) {
      foodData = FOOD_MICRONUTRIENTS[foodName];
    } else {
      // Try partial matches
      for (const [key, value] of Object.entries(FOOD_MICRONUTRIENTS)) {
        if (foodName.includes(key) || key.includes(foodName)) {
          foodData = value;
          break;
        }
      }
    }
    
    if (foodData) {
      // Add micronutrients from this food
      Object.entries(foodData).forEach(([nutrient, value]) => {
        if (MICRONUTRIENT_RDA[nutrient]) {
          const amount = (value * grams) / 100; // Convert from per 100g to actual amount
          micronutrients[nutrient] += amount;
        }
      });
    }
  });
  
  return micronutrients;
}

// Get weekly micronutrient data for progress tracking
router.get('/micronutrients/weekly-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get the last 7 days of meal data
    const weeklyMeals = await getAll(
      `SELECT m.*, fi.name, fi.quantity, fi.unit, fi.calories, fi.protein, fi.carbs, fi.fat, fi.sugar, fi.sodium, fi.fiber
       FROM meals m
       JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? AND m.created_at >= date('now', '-7 days')
       ORDER BY m.created_at ASC`,
      [userId]
    );

    if (weeklyMeals.length === 0) {
      return res.json({
        weeklyData: [],
        message: 'No meal data available for weekly analysis'
      });
    }

    // Group meals by date
    const mealsByDate = {};
    weeklyMeals.forEach(meal => {
      const date = meal.created_at.split(' ')[0]; // Extract date part
      if (!mealsByDate[date]) {
        mealsByDate[date] = [];
      }
      mealsByDate[date].push({
        name: meal.name,
        quantity: meal.quantity,
        unit: meal.unit
      });
    });

    // Calculate daily micronutrients for each day
    const weeklyData = [];
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const dayName = days[6 - i];
      const foodItems = mealsByDate[date] || [];
      
      const dailyNutrients = estimateMicronutrientsFromFood(foodItems);
      
      weeklyData.push({
        day: dayName,
        date: date,
        nutrients: dailyNutrients,
        mealCount: foodItems.length
      });
    }

    // Calculate weekly totals and averages
    const weeklyTotals = {};
    const weeklyAverages = {};
    
    Object.keys(MICRONUTRIENT_RDA).forEach(nutrient => {
      const total = weeklyData.reduce((sum, day) => sum + (day.nutrients[nutrient] || 0), 0);
      weeklyTotals[nutrient] = total;
      weeklyAverages[nutrient] = total / 7;
    });

    // Identify weekly deficiencies
    const weeklyDeficiencies = [];
    Object.keys(MICRONUTRIENT_RDA).forEach(nutrient => {
      const weeklyRDA = MICRONUTRIENT_RDA[nutrient] * 7;
      const total = weeklyTotals[nutrient];
      const percentage = (total / weeklyRDA) * 100;

      if (percentage < 70) {
        const severity = percentage < 30 ? 'severe' : percentage < 50 ? 'moderate' : 'mild';
        weeklyDeficiencies.push({
          nutrient,
          total,
          weeklyRDA,
          percentage: Math.round(percentage),
          severity,
          deficit: Math.round((weeklyRDA - total) * 100) / 100
        });
      }
    });

    res.json({
      weeklyData,
      weeklyTotals,
      weeklyAverages,
      weeklyDeficiencies,
      totalMeals: weeklyMeals.length,
      averageMealsPerDay: (weeklyMeals.length / 7).toFixed(1),
      message: `Weekly analysis based on ${weeklyMeals.length} meals over 7 days`
    });

  } catch (error) {
    console.error('Error fetching weekly micronutrient data:', error);
    res.status(500).json({ error: 'Failed to fetch weekly micronutrient data' });
  }
});

// Get micronutrient deficiency analysis from meal tracking data
router.get('/micronutrients/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'weekly' } = req.query;

    let days = 7;
    if (period === 'monthly') days = 30;
    if (period === 'daily') days = 1;

    // Get recent meals with food items
    const recentMeals = await getAll(
      `SELECT m.*, fi.name, fi.quantity, fi.unit, fi.calories, fi.protein, fi.carbs, fi.fat, fi.sugar, fi.sodium, fi.fiber
       FROM meals m
       JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? AND m.created_at >= date('now', '-${days} days')
       ORDER BY m.created_at DESC`,
      [userId]
    );

    if (recentMeals.length === 0) {
      return res.json({
        deficiencies: [],
        averages: {},
        recommendations: [],
        totalNutrients: Object.keys(MICRONUTRIENT_RDA).length,
        message: 'No meal data available for analysis. Start tracking your meals to see micronutrient insights!'
      });
    }

    // Group food items by meal
    const mealsByDate = {};
    recentMeals.forEach(meal => {
      const date = meal.created_at.split(' ')[0]; // Extract date part
      if (!mealsByDate[date]) {
        mealsByDate[date] = [];
      }
      mealsByDate[date].push({
        name: meal.name,
        quantity: meal.quantity,
        unit: meal.unit
      });
    });

    // Calculate daily micronutrients
    const dailyMicronutrients = {};
    Object.entries(mealsByDate).forEach(([date, foodItems]) => {
      dailyMicronutrients[date] = estimateMicronutrientsFromFood(foodItems);
    });

    // Calculate averages across the period
    const averages = {};
    const nutrients = Object.keys(MICRONUTRIENT_RDA);
    
    nutrients.forEach(nutrient => {
      const total = Object.values(dailyMicronutrients).reduce((sum, day) => sum + (day[nutrient] || 0), 0);
      averages[nutrient] = total / Object.keys(dailyMicronutrients).length;
    });

    // Identify deficiencies
    const deficiencies = [];
    const recommendations = [];

    nutrients.forEach(nutrient => {
      const average = averages[nutrient];
      const rda = MICRONUTRIENT_RDA[nutrient];
      const percentage = (average / rda) * 100;

      if (percentage < 70) {
        const severity = percentage < 30 ? 'severe' : percentage < 50 ? 'moderate' : 'mild';
        
        deficiencies.push({
          nutrient,
          average: Math.round(average * 100) / 100,
          rda,
          percentage: Math.round(percentage),
          severity,
          deficit: Math.round((rda - average) * 100) / 100
        });

        // Generate recommendations
        const foodSources = getFoodSourcesForNutrient(nutrient);
        recommendations.push({
          nutrient,
          severity,
          foods: foodSources,
          supplements: getSupplementRecommendations(nutrient),
          localAlternatives: getLocalAlternatives(nutrient)
        });

        // Create alert if severe deficiency
        if (severity === 'severe') {
          createMicronutrientAlert(userId, nutrient, severity, rda - average).catch(console.error);
        }
      }
    });

    // Get top food sources for each nutrient
    const topFoodSources = {};
    nutrients.forEach(nutrient => {
      const sources = getFoodSourcesForNutrient(nutrient);
      topFoodSources[nutrient] = sources.slice(0, 3); // Top 3 sources
    });

    res.json({
      period,
      days,
      deficiencies,
      averages,
      recommendations,
      topFoodSources,
      totalNutrients: nutrients.length,
      deficientNutrients: deficiencies.length,
      analyzedMeals: Object.keys(mealsByDate).length,
      message: `Analyzed ${Object.keys(mealsByDate).length} meals over the last ${days} days`
    });

  } catch (error) {
    console.error('Error analyzing micronutrients:', error);
    res.status(500).json({ error: 'Failed to analyze micronutrients' });
  }
});

// Add user allergens
router.post('/allergens/add', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergenName, severity, notes } = req.body;

    // Check if allergen already exists
    const existingAllergen = await getRow(
      'SELECT * FROM user_allergens WHERE user_id = ? AND allergen_name = ?',
      [userId, allergenName]
    );

    if (existingAllergen) {
      return res.status(400).json({ error: 'Allergen already exists' });
    }

    await runQuery(
      'INSERT INTO user_allergens (user_id, allergen_name, severity, notes) VALUES (?, ?, ?, ?)',
      [userId, allergenName, severity, notes]
    );

    res.json({ success: true, message: 'Allergen added successfully' });
  } catch (error) {
    console.error('Error adding allergen:', error);
    res.status(500).json({ error: 'Failed to add allergen' });
  }
});

// Get user allergens
router.get('/allergens', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const allergens = await getAll(
      'SELECT * FROM user_allergens WHERE user_id = ? ORDER BY severity DESC, allergen_name',
      [userId]
    );

    res.json({ allergens });
  } catch (error) {
    console.error('Error fetching allergens:', error);
    res.status(500).json({ error: 'Failed to fetch allergens' });
  }
});

// AI-powered allergen detection from food photo
router.post('/allergens/detect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { foodItems, mealId } = req.body;

    // Get user's allergens
    const userAllergens = await getAll(
      'SELECT * FROM user_allergens WHERE user_id = ?',
      [userId]
    );

    if (userAllergens.length === 0) {
      return res.json({ 
        detectedAllergens: [], 
        warnings: [],
        safe: true,
        message: 'No allergens configured for detection'
      });
    }

    const detectedAllergens = [];
    const warnings = [];

    // AI-powered allergen detection simulation
    foodItems.forEach(food => {
      const foodName = food.name.toLowerCase();
      
      userAllergens.forEach(allergen => {
        const allergenName = allergen.allergen_name.toLowerCase();
        
        // Direct ingredient matching
        if (foodName.includes(allergenName)) {
          detectedAllergens.push({
            allergen: allergen.allergen_name,
            food: food.name,
            confidence: 0.95,
            severity: allergen.severity,
            type: 'direct_ingredient'
          });
        }
        
        // Hidden allergen detection using AI patterns
        const hiddenAllergens = detectHiddenAllergens(foodName, allergenName);
        detectedAllergens.push(...hiddenAllergens.map(ha => ({
          ...ha,
          severity: allergen.severity
        })));
      });
    });

    // Generate warnings based on severity
    detectedAllergens.forEach(detection => {
      const warningLevel = detection.severity === 'severe' ? 'DANGER' : 
                          detection.severity === 'moderate' ? 'WARNING' : 'CAUTION';
      
      warnings.push({
        level: warningLevel,
        message: `${warningLevel}: ${detection.allergen} detected in ${detection.food}`,
        confidence: detection.confidence,
        recommendation: getAllergenRecommendation(detection)
      });
    });

    // Store detection results
    if (detectedAllergens.length > 0) {
      await runQuery(
        'INSERT INTO allergen_detections (user_id, meal_id, detected_allergens, confidence_score, warning_triggered) VALUES (?, ?, ?, ?, ?)',
        [userId, mealId, JSON.stringify(detectedAllergens), 
         Math.max(...detectedAllergens.map(d => d.confidence)), warnings.length > 0]
      );
    }

    res.json({
      detectedAllergens,
      warnings,
      safe: detectedAllergens.length === 0,
      totalChecked: foodItems.length,
      userAllergenCount: userAllergens.length
    });

  } catch (error) {
    console.error('Error detecting allergens:', error);
    res.status(500).json({ error: 'Failed to detect allergens' });
  }
});

// Helper functions
function getFoodSourcesForNutrient(nutrient) {
  const sources = [];
  for (const [food, nutrients] of Object.entries(FOOD_MICRONUTRIENTS)) {
    if (nutrients[nutrient] && nutrients[nutrient] > 0) {
      sources.push({
        food: food.charAt(0).toUpperCase() + food.slice(1),
        amount: Math.round(nutrients[nutrient] * 100) / 100,
        serving: '100g',
        category: getFoodCategory(food)
      });
    }
  }
  return sources.sort((a, b) => b.amount - a.amount).slice(0, 8);
}

function getFoodCategory(food) {
  if (['orange', 'apple', 'banana', 'strawberry', 'blueberry', 'mango', 'pineapple', 'grape'].includes(food)) return 'Fruits';
  if (['spinach', 'broccoli', 'carrot', 'tomato', 'bell pepper', 'onion', 'garlic', 'potato', 'sweet potato', 'cauliflower', 'cabbage', 'lettuce', 'cucumber', 'celery', 'asparagus', 'mushroom', 'corn', 'peas'].includes(food)) return 'Vegetables';
  if (['salmon', 'tuna', 'chicken breast', 'beef', 'pork', 'lamb', 'turkey', 'eggs'].includes(food)) return 'Proteins';
  if (['milk', 'yogurt', 'cheese', 'cottage cheese'].includes(food)) return 'Dairy';
  if (['quinoa', 'brown rice', 'oats', 'whole wheat bread', 'pasta'].includes(food)) return 'Grains';
  if (['almonds', 'walnuts', 'cashews', 'pistachios', 'sunflower seeds', 'chia seeds', 'flax seeds'].includes(food)) return 'Nuts & Seeds';
  if (['lentils', 'chickpeas', 'black beans', 'kidney beans', 'pinto beans'].includes(food)) return 'Legumes';
  if (['basil', 'oregano', 'thyme', 'rosemary', 'turmeric', 'ginger'].includes(food)) return 'Herbs & Spices';
  if (['rice', 'dal', 'roti', 'paratha', 'thepla', 'idli', 'dosa', 'vada', 'sambar', 'rasam', 'curd', 'ghee', 'pickle', 'chutney'].includes(food)) return 'Indian Foods';
  return 'Other';
}

function getSupplementRecommendations(nutrient) {
  const supplements = {
    vitamin_a: ['Vitamin A (Retinol)', 'Beta-Carotene', 'Cod liver oil'],
    vitamin_c: ['Vitamin C (Ascorbic Acid)', 'Ester-C', 'Buffered Vitamin C'],
    vitamin_d: ['Vitamin D3 (Cholecalciferol)', 'Vitamin D2 (Ergocalciferol)', 'Cod liver oil'],
    vitamin_e: ['Vitamin E (Alpha-Tocopherol)', 'Mixed Tocopherols', 'Natural Vitamin E'],
    vitamin_k: ['Vitamin K1 (Phylloquinone)', 'Vitamin K2 (Menaquinone)', 'MK-7'],
    thiamine_b1: ['Thiamine (B1)', 'Benfotiamine', 'B-Complex'],
    riboflavin_b2: ['Riboflavin (B2)', 'Riboflavin 5-Phosphate', 'B-Complex'],
    niacin_b3: ['Niacin (B3)', 'Niacinamide', 'Inositol Hexanicotinate'],
    pyridoxine_b6: ['Pyridoxine (B6)', 'Pyridoxal 5-Phosphate', 'B-Complex'],
    cobalamin_b12: ['Methylcobalamin (B12)', 'Cyanocobalamin', 'B-Complex'],
    folate_b9: ['Folate (B9)', '5-MTHF', 'Folic Acid'],
    calcium: ['Calcium Citrate', 'Calcium Carbonate', 'Calcium with D3'],
    iron: ['Ferrous Sulfate', 'Iron Bisglycinate', 'Iron with Vitamin C'],
    magnesium: ['Magnesium Glycinate', 'Magnesium Oxide', 'Magnesium Citrate'],
    zinc: ['Zinc Picolinate', 'Zinc Gluconate', 'Zinc with Copper'],
    selenium: ['Selenium Methionine', 'Selenium Yeast', 'Selenium Complex']
  };
  return supplements[nutrient] || [`${nutrient.replace('_', ' ').toUpperCase()} supplement`];
}

function getLocalAlternatives(nutrient) {
  // Enhanced local alternatives based on Indian context
  const localFoods = {
    vitamin_c: ['Amla (Indian Gooseberry)', 'Guava', 'Papaya', 'Lemon', 'Mango', 'Oranges', 'Tomatoes'],
    vitamin_a: ['Carrots', 'Pumpkin', 'Mango', 'Papaya', 'Sweet Potato', 'Spinach', 'Drumstick Leaves'],
    vitamin_d: ['Eggs', 'Mushrooms', 'Ghee', 'Fish', 'Sunlight exposure'],
    vitamin_e: ['Almonds', 'Sunflower Seeds', 'Ghee', 'Mustard Oil', 'Groundnuts'],
    vitamin_k: ['Spinach', 'Mustard Greens', 'Fenugreek Leaves', 'Drumstick Leaves', 'Cabbage'],
    iron: ['Jaggery', 'Dates', 'Ragi (Finger Millet)', 'Bajra (Pearl Millet)', 'Spinach', 'Lentils', 'Sesame Seeds'],
    calcium: ['Sesame Seeds', 'Drumstick Leaves', 'Fenugreek Leaves', 'Ragi', 'Milk', 'Curd', 'Cheese'],
    magnesium: ['Ragi', 'Bajra', 'Almonds', 'Cashews', 'Spinach', 'Banana', 'Dark Chocolate'],
    zinc: ['Pumpkin Seeds', 'Sesame Seeds', 'Cashews', 'Almonds', 'Lentils', 'Chickpeas'],
    folate_b9: ['Lentils', 'Chickpeas', 'Spinach', 'Fenugreek Leaves', 'Amla', 'Oranges'],
    vitamin_b12: ['Milk', 'Curd', 'Cheese', 'Eggs', 'Fish', 'Meat'],
    potassium: ['Banana', 'Potato', 'Sweet Potato', 'Spinach', 'Coconut Water', 'Oranges'],
    fiber: ['Whole Grains', 'Lentils', 'Vegetables', 'Fruits', 'Nuts', 'Seeds']
  };
  return localFoods[nutrient] || [`Local ${nutrient.replace('_', ' ')} sources`];
}

function getNutrientImportance(nutrient) {
  const importance = {
    vitamin_d: 'Critical for bone health, immune function, and mood regulation',
    vitamin_b12: 'Essential for nerve function, red blood cell formation, and energy production',
    iron: 'Vital for oxygen transport, energy levels, and cognitive function',
    calcium: 'Crucial for bone strength, muscle function, and nerve transmission',
    magnesium: 'Important for muscle relaxation, sleep quality, and stress management',
    zinc: 'Essential for immune function, wound healing, and protein synthesis',
    vitamin_c: 'Critical for immune system, collagen production, and antioxidant protection',
    vitamin_a: 'Important for vision, skin health, and immune function',
    folate_b9: 'Essential for DNA synthesis, red blood cell formation, and pregnancy health',
    omega3: 'Critical for brain health, heart health, and inflammation control'
  };
  return importance[nutrient] || 'Important for overall health and wellness';
}

function detectHiddenAllergens(foodName, allergenName) {
  const hiddenPatterns = {
    milk: ['dairy', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein', 'lactose'],
    wheat: ['flour', 'bread', 'pasta', 'cereal', 'gluten', 'semolina'],
    eggs: ['mayonnaise', 'meringue', 'custard', 'albumin'],
    soy: ['tofu', 'tempeh', 'soy sauce', 'miso', 'lecithin'],
    nuts: ['almond', 'walnut', 'cashew', 'pistachio', 'hazelnut', 'pecan']
  };

  const patterns = hiddenPatterns[allergenName] || [];
  const detected = [];

  patterns.forEach(pattern => {
    if (foodName.includes(pattern)) {
      detected.push({
        allergen: allergenName,
        food: foodName,
        confidence: 0.8,
        type: 'hidden_ingredient',
        detectedPattern: pattern
      });
    }
  });

  return detected;
}

function getAllergenRecommendation(detection) {
  const recommendations = {
    severe: 'AVOID COMPLETELY - Seek immediate medical attention if consumed',
    moderate: 'Avoid consumption - Consider alternative options',
    mild: 'Use caution - Monitor for any reactions'
  };
  return recommendations[detection.severity] || 'Exercise caution';
}

async function createMicronutrientAlert(userId, nutrient, severity, deficit) {
  const alertMessage = `Severe ${nutrient} deficiency detected. You're getting ${Math.round(deficit)} units below recommended daily allowance.`;
  
  const recommendedFoods = getFoodSourcesForNutrient(nutrient);
  const supplements = getSupplementRecommendations(nutrient);
  const localAlternatives = getLocalAlternatives(nutrient);

  await runQuery(
    `INSERT INTO micronutrient_alerts 
     (user_id, nutrient_name, deficiency_level, alert_message, recommended_foods, supplement_suggestions, local_alternatives) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, nutrient, severity, alertMessage, 
     JSON.stringify(recommendedFoods), JSON.stringify(supplements), JSON.stringify(localAlternatives)]
  );
}

module.exports = router; 