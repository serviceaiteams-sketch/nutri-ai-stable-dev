const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Seasonal food availability database
const SEASONAL_FOODS = {
  spring: ['asparagus', 'peas', 'artichokes', 'strawberries', 'spinach', 'radishes'],
  summer: ['tomatoes', 'corn', 'zucchini', 'berries', 'peaches', 'cucumber'],
  fall: ['pumpkin', 'squash', 'apples', 'sweet potato', 'brussels sprouts', 'cranberries'],
  winter: ['citrus', 'cabbage', 'kale', 'pomegranate', 'root vegetables', 'persimmons']
};

// Regional food database (can be enhanced with geolocation)
const REGIONAL_FOODS = {
  'north_america': ['quinoa', 'salmon', 'blueberries', 'avocado', 'turkey', 'maple syrup'],
  'europe': ['olive oil', 'feta cheese', 'lentils', 'sardines', 'yogurt', 'dark leafy greens'],
  'asia': ['tofu', 'seaweed', 'green tea', 'rice', 'miso', 'shiitake mushrooms'],
  'south_asia': ['turmeric', 'lentils', 'yogurt', 'spinach', 'ghee', 'ginger'],
  'mediterranean': ['olive oil', 'fish', 'nuts', 'whole grains', 'legumes', 'fresh herbs']
};

// Macro targets for different goals
const MACRO_TARGETS = {
  weight_loss: { protein: 0.30, carbs: 0.35, fat: 0.35 },
  muscle_gain: { protein: 0.35, carbs: 0.45, fat: 0.20 },
  maintenance: { protein: 0.25, carbs: 0.45, fat: 0.30 },
  endurance: { protein: 0.20, carbs: 0.55, fat: 0.25 }
};

// Generate adaptive meal plan
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      planType = 'weekly', 
      dietaryPreferences = [], 
      location = 'north_america', 
      goal = 'maintenance',
      calorieTarget = 2000,
      mealsPerDay = 3,
      snacksPerDay = 2,
      mood = 'neutral',
      activityLevel = 'moderate', // low | moderate | high
      calorieIntakeToday = 0,
      healthConditions = [], // e.g., ['diabetes','hypertension','lactose_intolerance']
      cuisinePreference = '', // New cuisine preference
      foodSourceRestriction = 'non_vegetarian', // New food source restriction
      dietaryPattern = '' // New dietary pattern
    } = req.body;

    // Get user's meal history for pattern analysis
    const mealHistory = await getAll(
      `SELECT * FROM meals WHERE user_id = ? 
       AND created_at >= date('now', '-30 days') 
       ORDER BY created_at DESC`,
      [userId]
    );

    // Get user's allergens
    const userAllergens = await getAll(
      'SELECT allergen_name FROM user_allergens WHERE user_id = ?',
      [userId]
    );

    const currentSeason = getCurrentSeason();
    const userPatterns = analyzeUserPatterns(mealHistory);

    // Adjust calorie target based on intake and activity
    const adjustedCalorieTarget = adjustCalorieTarget({ base: calorieTarget, intake: calorieIntakeToday, activityLevel });

    // Build constraints from inputs
    const constraints = buildConstraints({
      mood, activityLevel, healthConditions, 
      dietaryPreferences, cuisinePreference, // Keep for now as dietaryPreferences is renamed but used elsewhere.
      foodSourceRestriction, dietaryPattern
    });

    // Generate meal plan
    const mealPlan = await generateAdaptiveMealPlan({
      userId,
      planType,
      dietaryPreferences, // Keep this line
      location,
      goal,
      calorieTarget: adjustedCalorieTarget,
      mealsPerDay,
      snacksPerDay,
      currentSeason,
      userPatterns,
      allergens: userAllergens.map(a => a.allergen_name),
      constraints,
      mood,
      activityLevel,
      healthConditions,
      cuisinePreference // Add cuisine preference
    });

    // Generate shopping list
    const shoppingList = generateShoppingList(mealPlan, location);

    const planData = {
      meals: mealPlan,
      shoppingList,
      metadata: {
        generated: new Date(),
        calorieTarget: adjustedCalorieTarget,
        goal,
        location,
        season: currentSeason,
        adaptations: userPatterns,
        constraints,
        mood,
        activityLevel,
        healthConditions,
        foodSourceRestriction, // Add to metadata
        dietaryPattern, // Add to metadata
        cuisinePreference // Add to metadata
      }
    };

    const result = await runQuery(
      `INSERT INTO dynamic_meal_plans 
       (user_id, plan_type, plan_data, dietary_preferences, location_data, seasonality_data, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
      [
        userId, 
        planType, 
        JSON.stringify(planData),
        JSON.stringify(foodSourceRestriction), // This should be foodSourceRestriction
        JSON.stringify({ location, preferences: getLocationPreferences(location) }),
        JSON.stringify({ season: currentSeason, seasonal_foods: SEASONAL_FOODS[currentSeason] })
      ]
    );

    await runQuery(
      `INSERT INTO shopping_lists 
       (user_id, meal_plan_id, list_data, location_optimized, estimated_cost, currency) 
       VALUES (?, ?, ?, 1, ?, 'USD')`,
      [userId, result.id, JSON.stringify(shoppingList), shoppingList.estimatedCost]
    );

    res.json({
      success: true,
      mealPlanId: result.id,
      mealPlan: planData,
      shoppingList,
      adaptations: userPatterns,
      constraints,
      recommendations: generatePlanRecommendations(userPatterns, mealPlan)
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Update meal plan based on user deviations
router.post('/adapt/:planId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.params;
    const { deviations, feedback } = req.body;

    // Get current meal plan
    const currentPlan = await getRow(
      'SELECT * FROM dynamic_meal_plans WHERE id = ? AND user_id = ?',
      [planId, userId]
    );

    if (!currentPlan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    const planData = JSON.parse(currentPlan.plan_data);
    
    // Analyze deviations
    const adaptationInsights = analyzeDeviations(deviations, feedback);
    
    // Update adaptation history
    const currentAdaptations = currentPlan.adaptation_history ? 
      JSON.parse(currentPlan.adaptation_history) : [];
    
    currentAdaptations.push({
      timestamp: new Date(),
      deviations,
      feedback,
      insights: adaptationInsights
    });

    // Generate adapted meal plan
    const adaptedPlan = adaptMealPlan(planData, adaptationInsights);

    // Update shopping list
    const updatedShoppingList = generateShoppingList(adaptedPlan.meals, JSON.parse(currentPlan.location_data).location);

    // Update database
    await runQuery(
      `UPDATE dynamic_meal_plans 
       SET plan_data = ?, adaptation_history = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [JSON.stringify(adaptedPlan), JSON.stringify(currentAdaptations), planId]
    );

    // Update shopping list
    await runQuery(
      `UPDATE shopping_lists 
       SET list_data = ?, estimated_cost = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE meal_plan_id = ?`,
      [JSON.stringify(updatedShoppingList), updatedShoppingList.estimatedCost, planId]
    );

    res.json({
      success: true,
      adaptedPlan,
      updatedShoppingList,
      adaptationInsights,
      nextRecommendations: generateAdaptationRecommendations(adaptationInsights)
    });

  } catch (error) {
    console.error('Error adapting meal plan:', error);
    res.status(500).json({ error: 'Failed to adapt meal plan' });
  }
});

// Get current active meal plan
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const currentPlan = await getRow(
      `SELECT dmp.*, sl.list_data as shopping_list 
       FROM dynamic_meal_plans dmp 
       LEFT JOIN shopping_lists sl ON dmp.id = sl.meal_plan_id 
       WHERE dmp.user_id = ? AND dmp.status = 'active' 
       ORDER BY dmp.created_at DESC LIMIT 1`,
      [userId]
    );

    if (!currentPlan) {
      return res.json({ 
        hasPlan: false, 
        message: 'No active meal plan found',
        suggestion: 'Generate a new meal plan to get started'
      });
    }

    const planData = JSON.parse(currentPlan.plan_data);
    const shoppingList = currentPlan.shopping_list ? JSON.parse(currentPlan.shopping_list) : null;

    res.json({
      hasPlan: true,
      mealPlan: planData,
      shoppingList,
      planId: currentPlan.id,
      lastUpdated: currentPlan.updated_at,
      adaptationHistory: currentPlan.adaptation_history ? 
        JSON.parse(currentPlan.adaptation_history) : []
    });

  } catch (error) {
    console.error('Error fetching current meal plan:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan' });
  }
});

// Get optimized shopping list
router.get('/shopping-list/:planId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.params;
    const { location, marketType = 'supermarket' } = req.query;

    const shoppingList = await getRow(
      `SELECT sl.*, dmp.location_data 
       FROM shopping_lists sl 
       JOIN dynamic_meal_plans dmp ON sl.meal_plan_id = dmp.id 
       WHERE sl.meal_plan_id = ? AND dmp.user_id = ?`,
      [planId, userId]
    );

    if (!shoppingList) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const listData = JSON.parse(shoppingList.list_data);
    const locationData = JSON.parse(shoppingList.location_data);

    // Optimize for location and market type
    const optimizedList = optimizeShoppingList(listData, location || locationData.location, marketType);

    res.json({
      shoppingList: optimizedList,
      estimatedCost: shoppingList.estimated_cost,
      currency: shoppingList.currency,
      marketOptimizations: getMarketOptimizations(marketType),
      lastUpdated: shoppingList.updated_at
    });

  } catch (error) {
    console.error('Error fetching shopping list:', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

// Helper functions
function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function analyzeUserPatterns(mealHistory) {
  if (mealHistory.length === 0) {
    return {
      preferredMealTimes: ['08:00', '13:00', '19:00'],
      favoriteIngredients: [],
      avoidedIngredients: [],
      macroPreferences: MACRO_TARGETS.maintenance
    };
  }

  // Analyze meal timing patterns
  const mealTimes = mealHistory.map(meal => {
    const time = new Date(meal.created_at).toTimeString().slice(0, 5);
    return time;
  });

  // Analyze ingredient preferences
  const ingredientFrequency = {};
  mealHistory.forEach(meal => {
    if (meal.food_items) {
      try {
        const foodItems = JSON.parse(meal.food_items);
        foodItems.forEach(item => {
          ingredientFrequency[item.name] = (ingredientFrequency[item.name] || 0) + 1;
        });
      } catch (e) {
        // Handle parsing errors gracefully
      }
    }
  });

  const favoriteIngredients = Object.entries(ingredientFrequency)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([ingredient]) => ingredient);

  return {
    preferredMealTimes: getMostCommonTimes(mealTimes),
    favoriteIngredients,
    avoidedIngredients: [],
    macroPreferences: calculatePreferredMacros(mealHistory),
    mealFrequency: mealHistory.length / 30 // meals per day average
  };
}

function getMostCommonTimes(times) {
  const timeFreq = {};
  times.forEach(time => {
    const hour = parseInt(time.split(':')[0]);
    const bucket = Math.floor(hour / 2) * 2; // 2-hour buckets
    timeFreq[bucket] = (timeFreq[bucket] || 0) + 1;
  });

  const commonHours = Object.entries(timeFreq)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour.padStart(2, '0')}:00`);

  return commonHours.length > 0 ? commonHours : ['08:00', '13:00', '19:00'];
}

function calculatePreferredMacros(mealHistory) {
  // Calculate average macro distribution from meal history
  let totalProtein = 0, totalCarbs = 0, totalFat = 0, count = 0;

  mealHistory.forEach(meal => {
    if (meal.protein && meal.carbs && meal.fat) {
      totalProtein += meal.protein;
      totalCarbs += meal.carbs;
      totalFat += meal.fat;
      count++;
    }
  });

  if (count === 0) return MACRO_TARGETS.maintenance;

  const avgProtein = totalProtein / count;
  const avgCarbs = totalCarbs / count;
  const avgFat = totalFat / count;
  const total = avgProtein + avgCarbs + avgFat;

  return {
    protein: avgProtein / total,
    carbs: avgCarbs / total,
    fat: avgFat / total
  };
}

function adjustCalorieTarget({ base, intake, activityLevel }) {
  let target = base || 2000;
  // Increase or decrease target based on activity
  if (activityLevel === 'high') target += 200;
  if (activityLevel === 'low') target -= 150;
  // Ensure remaining calories are not negative
  const remaining = Math.max(target - (intake || 0), Math.min(1200, target * 0.5));
  return Math.round(remaining);
}

function buildConstraints({ mood, activityLevel, healthConditions, dietaryPreferences, cuisinePreference, foodSourceRestriction, dietaryPattern }) {
  const tags = new Set();
  const avoid = new Set();

  // Health conditions
  (healthConditions || []).forEach(c => {
    const key = String(c).toLowerCase();
    if (key.includes('diab')) tags.add('low_gi');
    if (key.includes('hyper') || key.includes('bp')) tags.add('low_sodium');
    if (key.includes('chol')) tags.add('heart_healthy');
    if (key.includes('gluten')) tags.add('gluten_free');
    if (key.includes('lactose')) tags.add('dairy_free');
    if (key.includes('kidney')) tags.add('low_potassium');
  });

  // Mood support
  const moodKey = String(mood || '').toLowerCase();
  if (moodKey.includes('stress') || moodKey.includes('anx')) { tags.add('magnesium_rich'); tags.add('omega3'); }
  if (moodKey.includes('tired') || moodKey.includes('fatigue')) { tags.add('iron_rich'); tags.add('b12_rich'); }
  if (moodKey.includes('sad') || moodKey.includes('low')) { tags.add('tryptophan'); tags.add('b_vitamins'); }

  // Dietary preferences (normalize and match exact tokens)
  (dietaryPreferences || []).forEach(p => {
    const pref = String(p).toLowerCase().replace(/[-\s]/g, '_');
    if (pref === 'mediterranean') { tags.add('heart_healthy'); tags.add('omega3'); }
  });

  // Food Source Restrictions
  const foodSource = String(foodSourceRestriction || '').toLowerCase().replace(/[-\s]/g, '_');
  if (foodSource === 'vegan') { tags.add('vegan'); avoid.add('animal'); }
  if (foodSource === 'vegetarian') { tags.add('vegetarian'); avoid.add('red_meat'); avoid.add('poultry'); avoid.add('fish'); }
  if (foodSource === 'lacto_vegetarian') { tags.add('vegetarian'); avoid.add('meat'); avoid.add('poultry'); avoid.add('fish'); avoid.add('eggs'); }
  if (foodSource === 'ovo_vegetarian') { tags.add('vegetarian'); avoid.add('meat'); avoid.add('poultry'); avoid.add('fish'); avoid.add('dairy'); }
  if (foodSource === 'pescatarian') { tags.add('vegetarian'); tags.add('fish_based'); avoid.add('meat'); avoid.add('poultry'); }
  if (foodSource === 'non_vegetarian') { tags.add('varied_diet'); }
  if (foodSource === 'halal') { tags.add('halal_certified'); avoid.add('pork'); avoid.add('alcohol'); }
  if (foodSource === 'kosher') { tags.add('kosher_certified'); avoid.add('pork'); avoid.add('shellfish'); avoid.add('meat_dairy_combo'); }
  if (foodSource === 'jain') { tags.add('jain_friendly'); avoid.add('meat'); avoid.add('eggs'); avoid.add('root_vegetables'); avoid.add('honey'); }
  if (foodSource === 'raw_vegan') { tags.add('vegan'); tags.add('raw_food'); avoid.add('cooked_food'); avoid.add('animal'); }

  // Dietary Patterns
  const pattern = String(dietaryPattern || '').toLowerCase().replace(/[-\s]/g, '_');
  if (pattern === 'keto') { tags.add('low_carb'); tags.add('high_fat'); tags.add('moderate_protein'); }
  if (pattern === 'atkins') { tags.add('low_carb'); }
  if (pattern === 'paleo') { tags.add('paleo'); avoid.add('grains'); avoid.add('legumes'); avoid.add('dairy'); avoid.add('processed_foods'); }
  if (pattern === 'whole30') { tags.add('whole_food'); avoid.add('sugar'); avoid.add('alcohol'); avoid.add('grains'); avoid.add('legumes'); avoid.add('dairy'); }
  if (pattern === 'mediterranean_diet') { tags.add('heart_healthy'); tags.add('plant_rich'); tags.add('olive_oil'); tags.add('fish_based'); }
  if (pattern === 'intermittent_fasting') { tags.add('flexible_eating_window'); }
  if (pattern === 'flexitarian') { tags.add('plant_focused'); }

  // Cuisine Preference
  const cuisine = String(cuisinePreference || '').toLowerCase().replace(/[-\s]/g, '_');
  if (cuisine === 'italian') { tags.add('pasta_based'); tags.add('tomato_based'); tags.add('mediterranean_style'); }
  if (cuisine === 'chinese') { tags.add('stir_fry'); tags.add('rice_based'); tags.add('soy_based'); }
  if (cuisine === 'indian') { tags.add('spicy'); tags.add('vegetarian_friendly'); tags.add('turmeric_rich'); }
  if (cuisine === 'mexican') { tags.add('beans_based'); tags.add('corn_based'); tags.add('spicy'); }
  if (cuisine === 'japanese') { tags.add('sushi'); tags.add('fish_based'); tags.add('umami'); }
  if (cuisine === 'french') { tags.add('rich_sauces'); tags.add('butter_based'); tags.add('wine_pairing'); }
  if (cuisine === 'thai') { tags.add('thai_spicy'); tags.add('coconut_milk'); tags.add('lemongrass'); }
  if (cuisine === 'mediterranean') { tags.add('heart_healthy'); tags.add('omega3'); }
  if (cuisine === 'american') { tags.add('comfort_food'); tags.add('diverse_dishes'); }
  if (cuisine === 'spanish') { tags.add('tapas'); tags.add('saffron_infused'); tags.add('olive_oil'); }

  // Activity-based
  if (activityLevel === 'high') tags.add('high_energy');
  if (activityLevel === 'low') tags.add('light');

  return { include: Array.from(tags), avoid: Array.from(avoid) };
}

async function generateAdaptiveMealPlan(params) {
  const { 
    planType, calorieTarget, mealsPerDay, snacksPerDay, 
    currentSeason, userPatterns, allergens, location, goal,
    constraints = {}, mood = 'neutral', activityLevel = 'moderate', healthConditions = [], cuisinePreference = ''
  } = params;

  // Adjust macro targets with activity level
  let macroTargets = MACRO_TARGETS[goal] || MACRO_TARGETS.maintenance;
  if (activityLevel === 'high') macroTargets = MACRO_TARGETS.endurance;
  if (activityLevel === 'low') macroTargets = MACRO_TARGETS.weight_loss;

  const days = planType === 'weekly' ? 7 : planType === 'monthly' ? 30 : 1;
  const plan = [];

  for (let day = 0; day < days; day++) {
    const dayPlan = {
      day: day + 1,
      date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: [],
      snacks: [],
      dailyNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      context: { mood, activityLevel, constraints }
    };

    // Distribute calories
    const caloriesPerMeal = calorieTarget / (mealsPerDay + snacksPerDay * 0.5);

    for (let mealIndex = 0; mealIndex < mealsPerDay; mealIndex++) {
      const meal = generateMeal({
        mealType: getMealType(mealIndex),
        calories: caloriesPerMeal,
        macroTargets,
        seasonalFoods: SEASONAL_FOODS[currentSeason],
        regionalFoods: REGIONAL_FOODS[location],
        allergens,
        userPreferences: userPatterns.favoriteIngredients,
        constraints,
        cuisinePreference
      });

      dayPlan.meals.push(meal);
      dayPlan.dailyNutrition.calories += meal.nutrition.calories;
      dayPlan.dailyNutrition.protein += meal.nutrition.protein;
      dayPlan.dailyNutrition.carbs += meal.nutrition.carbs;
      dayPlan.dailyNutrition.fat += meal.nutrition.fat;
    }

    for (let snackIndex = 0; snackIndex < snacksPerDay; snackIndex++) {
      const snack = generateSnack({
        calories: caloriesPerMeal * 0.5,
        seasonalFoods: SEASONAL_FOODS[currentSeason],
        allergens,
        userPreferences: userPatterns.favoriteIngredients,
        constraints,
        cuisinePreference
      });

      dayPlan.snacks.push(snack);
      dayPlan.dailyNutrition.calories += snack.nutrition.calories;
      dayPlan.dailyNutrition.protein += snack.nutrition.protein;
      dayPlan.dailyNutrition.carbs += snack.nutrition.carbs;
      dayPlan.dailyNutrition.fat += snack.nutrition.fat;
    }

    plan.push(dayPlan);
  }

  return plan;
}

function getMealType(index) {
  const types = ['breakfast', 'lunch', 'dinner'];
  return types[index] || 'meal';
}

async function generateMeal({ mealType, calories, macroTargets, seasonalFoods, regionalFoods, allergens, userPreferences, constraints = {}, cuisinePreference = '' }) {
  // Start building the WHERE clause
  let whereClauses = [];
  let params = [];

  // Filter by mealType (mapped to tags in recipes)
  if (mealType === 'breakfast') whereClauses.push("INSTR(tags, 'breakfast') > 0");
  if (mealType === 'lunch') whereClauses.push("INSTR(tags, 'lunch') > 0");
  if (mealType === 'dinner') whereClauses.push("INSTR(tags, 'dinner') > 0");

  // Filter by cuisine preference first (highest priority)
  if (cuisinePreference && cuisinePreference.toLowerCase() === 'indian') {
    whereClauses.push("cuisine = 'indian'");
  }

  // Apply general constraints (include tags)
  if (constraints.include && constraints.include.length > 0) {
    constraints.include.forEach(tag => {
      whereClauses.push(`INSTR(tags, ?) > 0`);
      params.push(tag);
    });
  }

  // Apply avoid constraints (avoid tags/ingredients)
  if (constraints.avoid && constraints.avoid.length > 0) {
    constraints.avoid.forEach(avoidItem => {
      whereClauses.push(`NOT (INSTR(LOWER(tags), LOWER(?)) > 0 OR INSTR(LOWER(ingredients), LOWER(?)) > 0)`);
      params.push(avoidItem, avoidItem); // Check both tags and ingredients for avoidance
    });
  }

  // Filter by calories (within a range around the target)
  const minCalories = calories * 0.8; // 80% of target
  const maxCalories = calories * 1.2; // 120% of target
  whereClauses.push(`calories BETWEEN ? AND ?`);
  params.push(minCalories, maxCalories);

  // Filter by allergens
  if (allergens && allergens.length > 0) {
    allergens.forEach(allergen => {
      whereClauses.push(`NOT (INSTR(LOWER(ingredients), LOWER(?)) > 0)`);
      params.push(allergen);
    });
  }

  // Prioritize user preferences (favorite ingredients) - complex in SQL, might be better post-query
  // For now, simple inclusion if possible
  if (userPreferences && userPreferences.length > 0) {
    const userPrefClause = userPreferences.map(pref => `INSTR(LOWER(ingredients), LOWER(?)) > 0`).join(' OR ');
    if (userPrefClause) {
      whereClauses.push(`(${userPrefClause})`);
      userPreferences.forEach(pref => params.push(pref));
    }
  }

  let sql = `SELECT * FROM recipes`;
  if (whereClauses.length > 0) {
    sql += ` WHERE ` + whereClauses.join(` AND `);
  }
  sql += ` ORDER BY RANDOM() LIMIT 1`; // Select one random recipe that matches

  console.log('🔍 Recipe search SQL:', sql);
  console.log('🔍 Recipe search params:', params);
  console.log('🔍 Cuisine preference:', cuisinePreference);
  console.log('🔍 Constraints:', constraints);

  const selectedRecipe = await getRow(sql, params);

  if (!selectedRecipe) {
    console.warn(`No recipe found for mealType: ${mealType}, constraints: ${JSON.stringify(constraints)}, calories: ${calories}`);
    console.log(`🍽️ Using fallback meals for ${cuisinePreference} cuisine`);
    
    // Check if recipes table exists and has data
    try {
      const recipeCount = await getRow("SELECT COUNT(*) as count FROM recipes");
      console.log(`📊 Total recipes in database: ${recipeCount?.count || 0}`);
      
      const indianRecipeCount = await getRow("SELECT COUNT(*) as count FROM recipes WHERE cuisine = 'indian'");
      console.log(`🇮🇳 Indian recipes in database: ${indianRecipeCount?.count || 0}`);
    } catch (dbError) {
      console.error('Database error checking recipes:', dbError);
    }
    
    // Fallback to a generic meal if no specific recipe is found
    // This section keeps the spirit of the original mealTemplates
    // Create cuisine-appropriate fallback meal templates
    const genericMealTemplates = {
      breakfast: {
        indian: [
          { name: 'Masala Dosa with Coconut Chutney', protein: 8, carbs: 45, fat: 12, calories: 320, tags: ['vegetarian','gluten_free','spicy','indian_cuisine'] },
          { name: 'Idli with Sambar', protein: 12, carbs: 38, fat: 8, calories: 280, tags: ['vegetarian','gluten_free','spicy','indian_cuisine'] },
          { name: 'Upma with Vegetables', protein: 10, carbs: 42, fat: 6, calories: 260, tags: ['vegetarian','gluten_free','indian_cuisine'] },
          { name: 'Poha with Peanuts', protein: 8, carbs: 40, fat: 10, calories: 280, tags: ['vegetarian','gluten_free','indian_cuisine'] }
        ],
        general: [
          { name: 'Oatmeal with Berries', protein: 5, carbs: 30, fat: 3, calories: 180, tags: ['vegetarian','vegan','gluten_free','heart_healthy','high_fiber','low_gi'] },
          { name: 'Scrambled Eggs with Spinach', protein: 15, carbs: 3, fat: 10, calories: 160, tags: ['vegetarian','keto','high_protein'] },
          { name: 'Greek Yogurt with Nuts', protein: 18, carbs: 12, fat: 8, calories: 200, tags: ['vegetarian','high_protein','probiotic'] }
        ]
      },
      lunch: {
        indian: [
          { name: 'Dal Khichdi with Raita', protein: 16, carbs: 52, fat: 8, calories: 360, tags: ['vegetarian','gluten_free','indian_cuisine','comfort_food'] },
          { name: 'Rajma Chawal', protein: 18, carbs: 58, fat: 10, calories: 400, tags: ['vegetarian','gluten_free','indian_cuisine','protein_rich'] },
          { name: 'Mixed Vegetable Curry with Roti', protein: 12, carbs: 48, fat: 14, calories: 360, tags: ['vegetarian','indian_cuisine','balanced'] },
          { name: 'Chana Masala with Brown Rice', protein: 14, carbs: 54, fat: 8, calories: 340, tags: ['vegetarian','gluten_free','indian_cuisine','fiber_rich'] }
        ],
        general: [
          { name: 'Chicken Salad Sandwich', protein: 25, carbs: 30, fat: 15, calories: 380, tags: ['non_vegetarian','high_protein','quick'] },
          { name: 'Lentil Soup with Whole Grain Bread', protein: 18, carbs: 40, fat: 5, calories: 300, tags: ['vegetarian','vegan','high_fiber','heart_healthy'] },
          { name: 'Quinoa Salad with Roasted Vegetables', protein: 10, carbs: 45, fat: 8, calories: 320, tags: ['vegetarian','vegan','gluten_free','heart_healthy'] }
        ]
      },
      dinner: {
        indian: [
          { name: 'Palak Paneer with Jeera Rice', protein: 22, carbs: 48, fat: 16, calories: 420, tags: ['vegetarian','indian_cuisine','iron_rich','balanced'] },
          { name: 'Baingan Bharta with Roti', protein: 14, carbs: 52, fat: 12, calories: 380, tags: ['vegetarian','indian_cuisine','fiber_rich'] },
          { name: 'Mushroom Masala with Brown Rice', protein: 16, carbs: 50, fat: 10, calories: 360, tags: ['vegetarian','gluten_free','indian_cuisine'] },
          { name: 'Mixed Dal with Jeera Rice', protein: 18, carbs: 54, fat: 8, calories: 360, tags: ['vegetarian','gluten_free','indian_cuisine','protein_rich'] }
        ],
        general: [
          { name: 'Baked Chicken Breast with Quinoa and Broccoli', protein: 40, carbs: 40, fat: 10, calories: 450, tags: ['non_vegetarian','high_protein','healthy'] },
          { name: 'Vegetable Curry with Brown Rice', protein: 15, carbs: 60, fat: 12, calories: 400, tags: ['vegetarian','vegan','gluten_free','heart_healthy'] },
          { name: 'Beef Stir-fry with Mixed Vegetables', protein: 35, carbs: 30, fat: 20, calories: 500, tags: ['non_vegetarian','high_protein','quick'] }
        ]
      }
    };
    
    // Select appropriate cuisine template based on preference
    const cuisineType = cuisinePreference && cuisinePreference.toLowerCase() === 'indian' ? 'indian' : 'general';
    const fallbackOptions = genericMealTemplates[mealType]?.[cuisineType] || genericMealTemplates[mealType]?.general || genericMealTemplates.lunch.general;
    const genericMeal = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
    return {
      name: genericMeal.name,
      cuisine: cuisineType === 'indian' ? 'indian' : 'general',
      prepTime: 20,
      cookTime: 30,
      servings: 1,
      nutrition: {
        calories: genericMeal.calories,
        protein: genericMeal.protein,
        carbs: genericMeal.carbs,
        fat: genericMeal.fat
      },
      ingredients: [], // Placeholder
      instructions: [], // Placeholder
      tags: genericMeal.tags,
      image_url: '',
      source_url: '',
      mealType,
      seasonalIngredients: seasonalFoods.slice(0, 2),
      regionalIngredients: regionalFoods.slice(0, 2),
      allergenFree: !allergens.some(allergen => 
        genericMeal.name.toLowerCase().includes(allergen.toLowerCase())
      ),
      recipe: generateRecipe(genericMeal.name),
      difficulty: ['easy', 'medium'][Math.floor(Math.random() * 2)]
    };
  }

  const seasonalIngredients = seasonalFoods.slice(0, 2);
  const regionalIngredients = regionalFoods.slice(0, 2);

  return {
    name: selectedRecipe.name,
    description: selectedRecipe.description,
    cuisine: selectedRecipe.cuisine,
    prepTime: selectedRecipe.prep_time,
    cookTime: selectedRecipe.cook_time,
    servings: selectedRecipe.servings,
    nutrition: {
      calories: selectedRecipe.calories,
      protein: selectedRecipe.protein,
      carbs: selectedRecipe.carbs,
      fat: selectedRecipe.fat
    },
    ingredients: JSON.parse(selectedRecipe.ingredients),
    instructions: JSON.parse(selectedRecipe.instructions),
    tags: JSON.parse(selectedRecipe.tags),
    image_url: selectedRecipe.image_url,
    source_url: selectedRecipe.source_url,
    mealType,
    seasonalIngredients,
    regionalIngredients,
    allergenFree: !allergens.some(allergen => 
      selectedRecipe.ingredients.toLowerCase().includes(allergen.toLowerCase()) ||
      selectedRecipe.name.toLowerCase().includes(allergen.toLowerCase())
    ),
    recipe: generateRecipe(selectedRecipe.name),
    difficulty: ['easy', 'medium'][Math.floor(Math.random() * 2)]
  };
}

function filterTemplatesByConstraints(templates, constraints) {
  const include = new Set(constraints?.include || []);
  const avoid = new Set((constraints?.avoid || []).map(s => String(s).toLowerCase()));
  if (include.size === 0 && avoid.size === 0) return templates;

  return templates.filter(t => {
    const tags = new Set((t.tags || []).map(s => String(s).toLowerCase()));
    // Must include all include tags if present
    let ok = true;
    include.forEach(req => { if (!tags.has(String(req).toLowerCase())) ok = false; });
    if (!ok && include.size > 0) return false;
    // Basic avoid filter keywords in name
    for (const a of avoid) { if (t.name.toLowerCase().includes(a)) return false; }
    return true;
  });
}

async function generateSnack({ calories, seasonalFoods, allergens, userPreferences, constraints = {}, cuisinePreference = '' }) {
  let whereClauses = ["INSTR(tags, 'snack') > 0"];
  let params = [];

  // Filter by cuisine preference first (highest priority)
  if (cuisinePreference && cuisinePreference.toLowerCase() === 'indian') {
    whereClauses.push("cuisine = 'indian'");
  }

  // Apply general constraints (include tags)
  if (constraints.include && constraints.include.length > 0) {
    constraints.include.forEach(tag => {
      whereClauses.push(`INSTR(tags, ?) > 0`);
      params.push(tag);
    });
  }

  // Apply avoid constraints (avoid tags/ingredients)
  if (constraints.avoid && constraints.avoid.length > 0) {
    constraints.avoid.forEach(avoidItem => {
      whereClauses.push(`NOT (INSTR(LOWER(tags), LOWER(?)) > 0 OR INSTR(LOWER(ingredients), LOWER(?)) > 0)`);
      params.push(avoidItem, avoidItem);
    });
  }

  // Filter by calories
  const minCalories = calories * 0.8;
  const maxCalories = calories * 1.2;
  whereClauses.push(`calories BETWEEN ? AND ?`);
  params.push(minCalories, maxCalories);

  // Filter by allergens
  if (allergens && allergens.length > 0) {
    allergens.forEach(allergen => {
      whereClauses.push(`NOT (INSTR(LOWER(ingredients), LOWER(?)) > 0)`);
      params.push(allergen);
    });
  }

  // Prioritize user preferences
  if (userPreferences && userPreferences.length > 0) {
    const userPrefClause = userPreferences.map(pref => `INSTR(LOWER(ingredients), LOWER(?)) > 0`).join(' OR ');
    if (userPrefClause) {
      whereClauses.push(`(${userPrefClause})`);
      userPreferences.forEach(pref => params.push(pref));
    }
  }

  let sql = `SELECT * FROM recipes`;
  if (whereClauses.length > 0) {
    sql += ` WHERE ` + whereClauses.join(` AND `);
  }
  sql += ` ORDER BY RANDOM() LIMIT 1`;

  const selectedSnack = await getRow(sql, params);

  if (!selectedSnack) {
    console.warn(`No snack recipe found for constraints: ${JSON.stringify(constraints)}, calories: ${calories}`);
    console.log(`🍿 Using fallback snacks for ${cuisinePreference} cuisine`);
    
    // Check if recipes table exists and has data
    try {
      const snackRecipeCount = await getRow("SELECT COUNT(*) as count FROM recipes WHERE INSTR(tags, 'snack') > 0");
      console.log(`📊 Total snack recipes in database: ${snackRecipeCount?.count || 0}`);
      
      const indianSnackCount = await getRow("SELECT COUNT(*) as count FROM recipes WHERE cuisine = 'indian' AND INSTR(tags, 'snack') > 0");
      console.log(`🇮🇳 Indian snack recipes in database: ${indianSnackCount?.count || 0}`);
    } catch (dbError) {
      console.error('Database error checking snack recipes:', dbError);
    }
    
    // Fallback to cuisine-appropriate generic snacks if no specific recipe is found
    const genericSnackOptions = {
      indian: [
        { name: 'Murmura Chivda', protein: 4, carbs: 22, fat: 8, calories: 160, tags: ['vegetarian','indian_cuisine','crunchy'] },
        { name: 'Roasted Chana Dal', protein: 8, carbs: 18, fat: 6, calories: 150, tags: ['vegetarian','indian_cuisine','protein_rich'] },
        { name: 'Mixed Nuts with Raisins', protein: 6, carbs: 12, fat: 14, calories: 180, tags: ['vegetarian','indian_cuisine','energy_rich'] },
        { name: 'Fresh Fruit Chaat', protein: 2, carbs: 20, fat: 1, calories: 100, tags: ['vegetarian','indian_cuisine','vitamin_rich'] }
      ],
      general: [
        { name: 'Mixed nuts', protein: 6, carbs: 8, fat: 14, calories: 170, tags: ['magnesium_rich','heart_healthy'] },
        { name: 'Apple with almond butter', protein: 4, carbs: 25, fat: 8, calories: 190, tags: ['low_sodium','low_gi'] },
        { name: 'Greek yogurt', protein: 15, carbs: 12, fat: 0, calories: 100, tags: ['b12_rich'] },
        { name: 'Carrot sticks with hummus', protein: 6, carbs: 18, fat: 7, calories: 160, tags: ['vegetarian','low_sodium'] }
      ]
    };
    
    // Select appropriate cuisine template based on preference
    const cuisineType = cuisinePreference && cuisinePreference.toLowerCase() === 'indian' ? 'indian' : 'general';
    const snackOptions = genericSnackOptions[cuisineType] || genericSnackOptions.general;
    const genericSnack = snackOptions[Math.floor(Math.random() * snackOptions.length)];
    return {
      name: genericSnack.name,
      cuisine: cuisineType === 'indian' ? 'indian' : 'general',
      prepTime: 5,
      cookTime: 0,
      servings: 1,
      nutrition: {
        calories: genericSnack.calories,
        protein: genericSnack.protein,
        carbs: genericSnack.carbs,
        fat: genericSnack.fat
      },
      ingredients: [],
      instructions: [],
      tags: genericSnack.tags,
      image_url: '',
      source_url: '',
      seasonalModification: seasonalFoods[0],
      allergenFree: !allergens.some(allergen => 
        genericSnack.name.toLowerCase().includes(allergen.toLowerCase())
      )
    };
  }

  return {
    name: selectedSnack.name,
    description: selectedSnack.description,
    cuisine: selectedSnack.cuisine,
    prepTime: selectedSnack.prep_time,
    cookTime: selectedSnack.cook_time,
    servings: selectedSnack.servings,
    nutrition: {
      calories: selectedSnack.calories,
      protein: selectedSnack.protein,
      carbs: selectedSnack.carbs,
      fat: selectedSnack.fat
    },
    ingredients: JSON.parse(selectedSnack.ingredients),
    instructions: JSON.parse(selectedSnack.instructions),
    tags: JSON.parse(selectedSnack.tags),
    image_url: selectedSnack.image_url,
    source_url: selectedSnack.source_url,
    seasonalModification: seasonalFoods[0],
    allergenFree: !allergens.some(allergen => 
      selectedSnack.ingredients.toLowerCase().includes(allergen.toLowerCase()) ||
      selectedSnack.name.toLowerCase().includes(allergen.toLowerCase())
    )
  };
}

function generateRecipe(mealName) {
  // This function is now mostly decorative as full recipe data comes from DB
  // Can be removed or repurposed if needed.
  return {
    ingredients: [`Ingredients for ${mealName} from database`],
    instructions: [`Instructions for ${mealName} from database`],
    tips: []
  };
}

function generateShoppingList(mealPlan, location) {
  const items = {};
  const categories = {
    produce: [],
    proteins: [],
    grains: [],
    dairy: [],
    pantry: [],
    frozen: []
  };

  // Extract ingredients from meal plan
  mealPlan.forEach(day => {
    [...day.meals, ...day.snacks].forEach(item => {
      if (item.ingredients) {
        item.ingredients.forEach(ingredient => {
          items[ingredient.name] = (items[ingredient.name] || 0) + ingredient.quantity;
        });
      }
    });
  });

  // Categorize items
  Object.entries(items).forEach(([item, quantity]) => {
    const category = categorizeItem(item);
    categories[category].push({
      name: item,
      quantity,
      estimatedPrice: getEstimatedPrice(item, location),
      alternatives: getAlternatives(item, location)
    });
  });

  const totalCost = Object.values(categories)
    .flat()
    .reduce((sum, item) => sum + (item.estimatedPrice * item.quantity), 0);

  return {
    categories,
    totalItems: Object.keys(items).length,
    estimatedCost: Math.round(totalCost * 100) / 100,
    location,
    generatedAt: new Date().toISOString(),
    marketRecommendations: getMarketRecommendations(location)
  };
}

function categorizeItem(item) {
  const categories = {
    produce: ['tomatoes', 'lettuce', 'onions', 'carrots', 'apples', 'berries', 'cucumber', 'spinach', 'avocado', 'pineapple', 'lemon', 'green beans'],
    proteins: ['chicken', 'fish', 'beef', 'eggs', 'tofu', 'turkey', 'salmon', 'pork', 'tuna', 'crab', 'rabbit', 'guanciale', 'pancetta'],
    grains: ['rice', 'quinoa', 'oats', 'bread', 'spaghetti', 'naan', 'tortillas', 'baguette', 'arborio', 'bomba'],
    dairy: ['milk', 'yogurt', 'cheese', 'pecorino', 'gruyere'],
    pantry: ['oil', 'spices', 'nuts', 'almond butter', 'hummus', 'soy sauce', 'sesame oil', 'achiote paste', 'miso', 'green curry paste', 'fish sauce', 'palm sugar', 'saffron', 'broth', 'tomato puree'],
    frozen: ['frozen vegetables', 'frozen fruits']
  };

  for (const [category, categoryItems] of Object.entries(categories)) {
    if (categoryItems.some(categoryItem => item.toLowerCase().includes(categoryItem))) {
      return category;
    }
  }
  return 'pantry';
}

function getEstimatedPrice(item, location) {
  // Simplified pricing - would be enhanced with real market data APIs
  const basePrices = {
    'north_america': { base: 3.50, multiplier: 1.0 },
    'europe': { base: 3.80, multiplier: 1.1 },
    'asia': { base: 2.20, multiplier: 0.7 },
    'south_asia': { base: 1.80, multiplier: 0.6 }
  };

  const locationData = basePrices[location] || basePrices['north_america'];
  return Math.round((locationData.base + Math.random() * 2) * locationData.multiplier * 100) / 100;
}

function getAlternatives(item, location) {
  // Location-based alternatives
  const alternatives = {
    'quinoa': ['rice', 'bulgur', 'couscous'],
    'avocado': ['olive oil', 'nuts', 'seeds'],
    'salmon': ['mackerel', 'sardines', 'tuna']
  };

  return alternatives[item] || [];
}

function getLocationPreferences(location) {
  const preferences = {
    'north_america': { currency: 'USD', measurement: 'imperial', markets: ['supermarket', 'farmers_market'] },
    'europe': { currency: 'EUR', measurement: 'metric', markets: ['supermarket', 'local_market'] },
    'asia': { currency: 'USD', measurement: 'metric', markets: ['wet_market', 'supermarket'] },
    'south_asia': { currency: 'INR', measurement: 'metric', markets: ['local_market', 'supermarket'] }
  };

  return preferences[location] || preferences['north_america'];
}

function getMarketRecommendations(location) {
  return [
    'Visit farmers markets for fresh seasonal produce',
    'Buy proteins in bulk for better prices',
    'Check for sales on pantry staples'
  ];
}

function analyzeDeviations(deviations, feedback) {
  const insights = {
    commonDeviations: [],
    preferenceShifts: [],
    timeAdjustments: [],
    portionAdjustments: []
  };

  deviations.forEach(deviation => {
    if (deviation.type === 'meal_skip') {
      insights.commonDeviations.push(`Frequently skips ${deviation.mealType}`);
    }
    if (deviation.type === 'substitution') {
      insights.preferenceShifts.push(`Prefers ${deviation.substitute} over ${deviation.original}`);
    }
    if (deviation.type === 'time_change') {
      insights.timeAdjustments.push(`Eats ${deviation.mealType} at ${deviation.actualTime} instead of ${deviation.plannedTime}`);
    }
  });

  return insights;
}

function adaptMealPlan(planData, adaptationInsights) {
  // Create adapted version based on insights
  const adaptedPlan = JSON.parse(JSON.stringify(planData));
  
  // Apply adaptations based on insights
  adaptationInsights.commonDeviations.forEach(deviation => {
    // Adjust meal plan based on common deviations
  });

  return adaptedPlan;
}

function generatePlanRecommendations(userPatterns, mealPlan) {
  const recommendations = [];

  if (userPatterns.favoriteIngredients.length > 0) {
    recommendations.push({
      type: 'personalization',
      message: `Your meal plan includes your favorite ingredients: ${userPatterns.favoriteIngredients.slice(0, 3).join(', ')}`
    });
  }

  recommendations.push({
    type: 'nutrition',
    message: 'Your meal plan is optimized for balanced macro and micronutrient intake'
  });

  return recommendations;
}

function generateAdaptationRecommendations(insights) {
  const recommendations = [];

  if (insights.commonDeviations.length > 0) {
    recommendations.push({
      type: 'behavior',
      message: 'Consider adjusting meal timing or preparation methods to reduce deviations'
    });
  }

  return recommendations;
}

function optimizeShoppingList(listData, location, marketType) {
  // Optimize shopping list based on market type and location
  const optimized = JSON.parse(JSON.stringify(listData));

  // Add market-specific optimizations
  if (marketType === 'farmers_market') {
    // Prioritize seasonal and local produce
    optimized.categories.produce.forEach(item => {
      item.recommended = true;
      item.tip = 'Best quality at farmers market';
    });
  }

  return optimized;
}

function getMarketOptimizations(marketType) {
  const optimizations = {
    'supermarket': ['Shop perimeter first for fresh items', 'Check unit prices for best deals'],
    'farmers_market': ['Arrive early for best selection', 'Bring cash for smaller vendors'],
    'local_market': ['Compare prices between vendors', 'Ask about seasonal specialties']
  };

  return optimizations[marketType] || optimizations['supermarket'];
}

module.exports = router; 