const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Enhanced Meal Planning with Recipe Generation and Shopping Lists

// Meal Planning Routes

// Generate personalized meal plan
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7, dietaryPreferences = [], healthGoals = [] } = req.body;

    // Get user's nutrition goals and preferences
    const userProfile = await getRow(`
      SELECT * FROM users WHERE id = ?
    `, [userId]);

    const nutritionGoals = await getRow(`
      SELECT * FROM nutrition_goals WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1
    `, [userId]);

    // Get recent meal history for pattern analysis
    const recentMeals = await getAll(`
      SELECT * FROM meals WHERE user_id = ? 
      AND created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC
    `, [userId]);

    // Generate meal plan based on user data
    const mealPlan = generateMealPlan({
      userProfile,
      nutritionGoals,
      recentMeals,
      days,
      dietaryPreferences,
      healthGoals
    });

    // Store meal plan
    await runQuery(`
      INSERT INTO meal_plans (user_id, plan_data, days, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [userId, JSON.stringify(mealPlan), days]);

    // Generate shopping list if requested
    const shoppingList = await generateDetailedShoppingList(mealPlan, req.body.location, req.body.budgetRange || 'medium');

    // Calculate nutritional summary
    const nutritionalSummary = calculateMealPlanNutrition(mealPlan);

    res.json({
      success: true,
      mealPlan,
      shoppingList,
      nutritionalSummary,
      estimatedCost: shoppingList?.totalCost || 0,
      message: 'Enhanced meal plan with recipes and shopping list generated successfully'
    });
  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate meal plan'
    });
  }
});

// Generate shopping list from meal plan
router.post('/shopping-list', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealPlanId } = req.body;

    // Get meal plan
    const mealPlan = await getRow(`
      SELECT * FROM meal_plans WHERE id = ? AND user_id = ?
    `, [mealPlanId, userId]);

    if (!mealPlan) {
      return res.status(404).json({
        success: false,
        message: 'Meal plan not found'
      });
    }

    const planData = JSON.parse(mealPlan.plan_data);
    const shoppingList = generateShoppingList(planData);

    res.json({
      success: true,
      shoppingList,
      message: 'Shopping list generated successfully'
    });
  } catch (error) {
    console.error('Error generating shopping list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate shopping list'
    });
  }
});

// Get recipe details
router.get('/recipe/:recipeId', authenticateToken, async (req, res) => {
  try {
    const { recipeId } = req.params;
    
    // Mock recipe database - in real implementation, this would be a comprehensive recipe database
    const recipe = getRecipeById(recipeId);
    
    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      recipe,
      message: 'Recipe retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching recipe:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recipe'
    });
  }
});

// Helper function to generate meal plan
function generateMealPlan({ userProfile, nutritionGoals, recentMeals, days, dietaryPreferences, healthGoals }) {
  const mealPlan = {
    days: [],
    totalNutrition: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    }
  };

  const dailyCalories = nutritionGoals?.daily_calories || 2000;
  const dailyProtein = nutritionGoals?.daily_protein || 150;
  const dailyCarbs = nutritionGoals?.daily_carbs || 250;
  const dailyFat = nutritionGoals?.daily_fat || 65;

  // Recipe database with nutritional information
  const recipes = {
    breakfast: [
      {
        id: 'b1',
        name: 'Protein Oatmeal Bowl',
        calories: 350,
        protein: 25,
        carbs: 45,
        fat: 12,
        fiber: 8,
        ingredients: ['oats', 'protein powder', 'berries', 'nuts'],
        instructions: 'Cook oats, add protein powder, top with berries and nuts',
        prepTime: 10,
        difficulty: 'easy'
      },
      {
        id: 'b2',
        name: 'Greek Yogurt Parfait',
        calories: 280,
        protein: 20,
        carbs: 30,
        fat: 8,
        fiber: 5,
        ingredients: ['greek yogurt', 'honey', 'granola', 'fruits'],
        instructions: 'Layer yogurt, honey, granola, and fruits',
        prepTime: 5,
        difficulty: 'easy'
      }
    ],
    lunch: [
      {
        id: 'l1',
        name: 'Quinoa Buddha Bowl',
        calories: 420,
        protein: 18,
        carbs: 55,
        fat: 15,
        fiber: 12,
        ingredients: ['quinoa', 'chickpeas', 'vegetables', 'tahini'],
        instructions: 'Cook quinoa, add roasted vegetables and chickpeas, drizzle with tahini',
        prepTime: 25,
        difficulty: 'medium'
      },
      {
        id: 'l2',
        name: 'Grilled Chicken Salad',
        calories: 380,
        protein: 35,
        carbs: 20,
        fat: 18,
        fiber: 8,
        ingredients: ['chicken breast', 'mixed greens', 'olive oil', 'vegetables'],
        instructions: 'Grill chicken, assemble salad with greens and vegetables',
        prepTime: 20,
        difficulty: 'medium'
      }
    ],
    dinner: [
      {
        id: 'd1',
        name: 'Salmon with Roasted Vegetables',
        calories: 450,
        protein: 32,
        carbs: 25,
        fat: 22,
        fiber: 10,
        ingredients: ['salmon', 'broccoli', 'sweet potato', 'olive oil'],
        instructions: 'Roast salmon and vegetables with herbs and olive oil',
        prepTime: 30,
        difficulty: 'medium'
      },
      {
        id: 'd2',
        name: 'Lentil Curry',
        calories: 380,
        protein: 16,
        carbs: 60,
        fat: 8,
        fiber: 18,
        ingredients: ['lentils', 'coconut milk', 'spices', 'rice'],
        instructions: 'Cook lentils with coconut milk and spices, serve with rice',
        prepTime: 35,
        difficulty: 'medium'
      }
    ],
    snacks: [
      {
        id: 's1',
        name: 'Protein Smoothie',
        calories: 200,
        protein: 20,
        carbs: 25,
        fat: 5,
        fiber: 6,
        ingredients: ['protein powder', 'banana', 'almond milk', 'spinach'],
        instructions: 'Blend all ingredients until smooth',
        prepTime: 5,
        difficulty: 'easy'
      },
      {
        id: 's2',
        name: 'Hummus with Vegetables',
        calories: 150,
        protein: 6,
        carbs: 20,
        fat: 8,
        fiber: 8,
        ingredients: ['hummus', 'carrots', 'cucumber', 'bell peppers'],
        instructions: 'Serve hummus with fresh vegetables',
        prepTime: 5,
        difficulty: 'easy'
      }
    ]
  };

  // Generate meal plan for specified days
  for (let day = 1; day <= days; day++) {
    const dayPlan = {
      day: day,
      date: new Date(Date.now() + (day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      meals: {
        breakfast: recipes.breakfast[Math.floor(Math.random() * recipes.breakfast.length)],
        lunch: recipes.lunch[Math.floor(Math.random() * recipes.lunch.length)],
        dinner: recipes.dinner[Math.floor(Math.random() * recipes.dinner.length)],
        snack: recipes.snacks[Math.floor(Math.random() * recipes.snacks.length)]
      }
    };

    // Calculate daily nutrition
    const dailyNutrition = Object.values(dayPlan.meals).reduce((acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      acc.fiber += meal.fiber;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

    dayPlan.nutrition = dailyNutrition;
    mealPlan.days.push(dayPlan);

    // Add to total nutrition
    mealPlan.totalNutrition.calories += dailyNutrition.calories;
    mealPlan.totalNutrition.protein += dailyNutrition.protein;
    mealPlan.totalNutrition.carbs += dailyNutrition.carbs;
    mealPlan.totalNutrition.fat += dailyNutrition.fat;
    mealPlan.totalNutrition.fiber += dailyNutrition.fiber;
  }

  return mealPlan;
}

// Helper function to generate shopping list
function generateShoppingList(mealPlan) {
  const ingredients = new Map();

  mealPlan.days.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      meal.ingredients.forEach(ingredient => {
        if (ingredients.has(ingredient)) {
          ingredients.set(ingredient, ingredients.get(ingredient) + 1);
        } else {
          ingredients.set(ingredient, 1);
        }
      });
    });
  });

  const shoppingList = {
    categories: {
      proteins: [],
      vegetables: [],
      grains: [],
      dairy: [],
      fruits: [],
      pantry: []
    },
    totalItems: 0
  };

  // Categorize ingredients
  ingredients.forEach((quantity, ingredient) => {
    const item = { name: ingredient, quantity, unit: 'servings' };
    
    if (['chicken', 'salmon', 'protein powder', 'lentils', 'chickpeas'].includes(ingredient)) {
      shoppingList.categories.proteins.push(item);
    } else if (['broccoli', 'carrots', 'cucumber', 'bell peppers', 'spinach', 'vegetables'].includes(ingredient)) {
      shoppingList.categories.vegetables.push(item);
    } else if (['oats', 'quinoa', 'rice', 'granola'].includes(ingredient)) {
      shoppingList.categories.grains.push(item);
    } else if (['greek yogurt', 'almond milk', 'coconut milk'].includes(ingredient)) {
      shoppingList.categories.dairy.push(item);
    } else if (['berries', 'fruits', 'banana'].includes(ingredient)) {
      shoppingList.categories.fruits.push(item);
    } else {
      shoppingList.categories.pantry.push(item);
    }
    
    shoppingList.totalItems += quantity;
  });

  return shoppingList;
}

// Helper function to get recipe by ID
function getRecipeById(recipeId) {
  const allRecipes = {
    'b1': {
      id: 'b1',
      name: 'Protein Oatmeal Bowl',
      calories: 350,
      protein: 25,
      carbs: 45,
      fat: 12,
      fiber: 8,
      ingredients: ['oats', 'protein powder', 'berries', 'nuts'],
      instructions: 'Cook oats, add protein powder, top with berries and nuts',
      prepTime: 10,
      difficulty: 'easy',
      image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400'
    },
    'l1': {
      id: 'l1',
      name: 'Quinoa Buddha Bowl',
      calories: 420,
      protein: 18,
      carbs: 55,
      fat: 15,
      fiber: 12,
      ingredients: ['quinoa', 'chickpeas', 'vegetables', 'tahini'],
      instructions: 'Cook quinoa, add roasted vegetables and chickpeas, drizzle with tahini',
      prepTime: 25,
      difficulty: 'medium',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'
    }
  };

  return allRecipes[recipeId];
}

// Enhanced helper functions for comprehensive meal planning

async function generateDetailedShoppingList(mealPlan, location = null, budgetRange = 'medium') {
  const shoppingList = {
    categories: {
      proteins: [],
      vegetables: [],
      fruits: [],
      grains: [],
      dairy: [],
      pantry: [],
      spices: []
    },
    totalItems: 0,
    totalCost: 0,
    budgetBreakdown: {},
    localStores: []
  };

  // Process each day's meals
  mealPlan.days.forEach(day => {
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
      if (day[mealType] && day[mealType].ingredients) {
        day[mealType].ingredients.forEach(ingredient => {
          const category = categorizeIngredient(ingredient);
          const item = {
            name: ingredient,
            quantity: calculateQuantity(ingredient, mealPlan.days.length),
            unit: getIngredientUnit(ingredient),
            estimatedCost: estimateIngredientCost(ingredient, budgetRange, location),
            alternatives: getIngredientAlternatives(ingredient, budgetRange),
            localAvailability: checkLocalAvailability(ingredient, location)
          };
          
          shoppingList.categories[category].push(item);
          shoppingList.totalCost += item.estimatedCost;
        });
      }
    });
  });

  // Remove duplicates and consolidate quantities
  Object.keys(shoppingList.categories).forEach(category => {
    shoppingList.categories[category] = consolidateIngredients(shoppingList.categories[category]);
  });

  shoppingList.totalItems = Object.values(shoppingList.categories)
    .reduce((total, items) => total + items.length, 0);

  // Add budget breakdown
  shoppingList.budgetBreakdown = calculateBudgetBreakdown(shoppingList.categories);

  // Add local store recommendations
  if (location) {
    shoppingList.localStores = getLocalStoreRecommendations(location, budgetRange);
  }

  return shoppingList;
}

function calculateMealPlanNutrition(mealPlan) {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  };

  const dailyAverages = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  };

  const varietyScore = calculateVarietyScore(mealPlan);
  const balanceScore = calculateNutritionalBalance(mealPlan);

  mealPlan.days.forEach(day => {
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
      if (day[mealType]) {
        const meal = day[mealType];
        totals.calories += meal.calories || 0;
        totals.protein += meal.protein || 0;
        totals.carbs += meal.carbs || 0;
        totals.fat += meal.fat || 0;
        totals.fiber += meal.fiber || 0;
        totals.sugar += meal.sugar || 0;
        totals.sodium += meal.sodium || 0;
      }
    });
  });

  // Calculate daily averages
  const dayCount = mealPlan.days.length;
  Object.keys(dailyAverages).forEach(nutrient => {
    dailyAverages[nutrient] = Math.round(totals[nutrient] / dayCount);
  });

  return {
    totals,
    dailyAverages,
    varietyScore,
    balanceScore,
    healthScore: (varietyScore + balanceScore) / 2,
    recommendations: generateNutritionalRecommendations(dailyAverages)
  };
}

// Helper functions for shopping list generation
function categorizeIngredient(ingredient) {
  const categories = {
    proteins: ['chicken', 'beef', 'fish', 'eggs', 'tofu', 'beans', 'lentils', 'chickpeas'],
    vegetables: ['spinach', 'broccoli', 'carrots', 'onions', 'peppers', 'tomatoes', 'lettuce'],
    fruits: ['apples', 'bananas', 'berries', 'oranges', 'grapes'],
    grains: ['rice', 'quinoa', 'bread', 'pasta', 'oats'],
    dairy: ['milk', 'cheese', 'yogurt', 'butter'],
    pantry: ['oil', 'vinegar', 'flour', 'sugar'],
    spices: ['salt', 'pepper', 'garlic', 'herbs']
  };

  for (const [category, items] of Object.entries(categories)) {
    if (items.some(item => ingredient.toLowerCase().includes(item))) {
      return category;
    }
  }
  return 'pantry'; // default category
}

function calculateQuantity(ingredient, days) {
  const baseQuantities = {
    'chicken': 150, // grams per serving
    'rice': 75,
    'vegetables': 100,
    'milk': 250, // ml
    'eggs': 1, // piece
    'bread': 2 // slices
  };

  const key = Object.keys(baseQuantities).find(item => 
    ingredient.toLowerCase().includes(item)
  );
  
  return (baseQuantities[key] || 50) * days; // multiply by number of days
}

function getIngredientUnit(ingredient) {
  const units = {
    'milk': 'ml',
    'oil': 'ml',
    'eggs': 'pieces',
    'bread': 'slices',
    'chicken': 'g',
    'rice': 'g',
    'vegetables': 'g'
  };

  const key = Object.keys(units).find(item => 
    ingredient.toLowerCase().includes(item)
  );
  
  return units[key] || 'g';
}

function estimateIngredientCost(ingredient, budgetRange, location) {
  const baseCosts = {
    'low': 0.5,
    'medium': 1.0,
    'high': 2.0
  };

  const ingredientMultipliers = {
    'chicken': 3.0,
    'beef': 4.0,
    'fish': 3.5,
    'vegetables': 1.0,
    'rice': 0.8,
    'milk': 1.2
  };

  const baseCost = baseCosts[budgetRange] || baseCosts['medium'];
  const key = Object.keys(ingredientMultipliers).find(item => 
    ingredient.toLowerCase().includes(item)
  );
  
  const multiplier = ingredientMultipliers[key] || 1.0;
  
  return Math.round((baseCost * multiplier) * 100) / 100; // round to 2 decimal places
}

function getIngredientAlternatives(ingredient, budgetRange) {
  const alternatives = {
    'chicken': budgetRange === 'low' ? ['tofu', 'lentils'] : ['turkey', 'fish'],
    'beef': budgetRange === 'low' ? ['beans', 'mushrooms'] : ['lamb', 'pork'],
    'quinoa': budgetRange === 'low' ? ['brown rice', 'barley'] : ['wild rice', 'farro']
  };

  const key = Object.keys(alternatives).find(item => 
    ingredient.toLowerCase().includes(item)
  );
  
  return alternatives[key] || [];
}

function checkLocalAvailability(ingredient, location) {
  // Mock availability check - in real implementation, this would use location APIs
  const seasonalAvailability = {
    'berries': ['spring', 'summer'],
    'squash': ['fall', 'winter'],
    'leafy greens': ['year-round']
  };

  const currentSeason = getCurrentSeason();
  const key = Object.keys(seasonalAvailability).find(item => 
    ingredient.toLowerCase().includes(item)
  );
  
  if (key) {
    return seasonalAvailability[key].includes(currentSeason) || 
           seasonalAvailability[key].includes('year-round');
  }
  
  return true; // assume available if not specified
}

function consolidateIngredients(ingredients) {
  const consolidated = {};
  
  ingredients.forEach(ingredient => {
    if (consolidated[ingredient.name]) {
      consolidated[ingredient.name].quantity += ingredient.quantity;
      consolidated[ingredient.name].estimatedCost += ingredient.estimatedCost;
    } else {
      consolidated[ingredient.name] = { ...ingredient };
    }
  });
  
  return Object.values(consolidated);
}

function calculateBudgetBreakdown(categories) {
  const breakdown = {};
  
  Object.entries(categories).forEach(([category, items]) => {
    breakdown[category] = items.reduce((total, item) => total + item.estimatedCost, 0);
  });
  
  return breakdown;
}

function getLocalStoreRecommendations(location, budgetRange) {
  // Mock store recommendations - in real implementation, use store APIs
  const storeTypes = {
    'low': ['Walmart', 'Aldi', 'Local markets'],
    'medium': ['Kroger', 'Safeway', 'Target'],
    'high': ['Whole Foods', 'Fresh Market', 'Specialty stores']
  };
  
  return storeTypes[budgetRange] || storeTypes['medium'];
}

function calculateVarietyScore(mealPlan) {
  const uniqueIngredients = new Set();
  const uniqueCuisines = new Set();
  
  mealPlan.days.forEach(day => {
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
      if (day[mealType]) {
        if (day[mealType].ingredients) {
          day[mealType].ingredients.forEach(ingredient => {
            uniqueIngredients.add(ingredient);
          });
        }
        if (day[mealType].cuisine) {
          uniqueCuisines.add(day[mealType].cuisine);
        }
      }
    });
  });
  
  // Score based on ingredient variety and cuisine diversity
  const ingredientScore = Math.min(uniqueIngredients.size / 20, 1) * 50;
  const cuisineScore = Math.min(uniqueCuisines.size / 5, 1) * 50;
  
  return Math.round(ingredientScore + cuisineScore);
}

function calculateNutritionalBalance(mealPlan) {
  const dailyTotals = mealPlan.days.map(day => {
    const dayTotal = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    
    ['breakfast', 'lunch', 'dinner', 'snacks'].forEach(mealType => {
      if (day[mealType]) {
        dayTotal.calories += day[mealType].calories || 0;
        dayTotal.protein += day[mealType].protein || 0;
        dayTotal.carbs += day[mealType].carbs || 0;
        dayTotal.fat += day[mealType].fat || 0;
      }
    });
    
    return dayTotal;
  });
  
  // Calculate macro balance (ideal: 15-25% protein, 45-65% carbs, 20-35% fat)
  const avgDay = dailyTotals.reduce((acc, day) => {
    acc.calories += day.calories;
    acc.protein += day.protein;
    acc.carbs += day.carbs;
    acc.fat += day.fat;
    return acc;
  }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  
  Object.keys(avgDay).forEach(key => {
    avgDay[key] /= dailyTotals.length;
  });
  
  if (avgDay.calories === 0) return 0;
  
  const proteinPercent = (avgDay.protein * 4) / avgDay.calories * 100;
  const carbPercent = (avgDay.carbs * 4) / avgDay.calories * 100;
  const fatPercent = (avgDay.fat * 9) / avgDay.calories * 100;
  
  let score = 0;
  if (proteinPercent >= 15 && proteinPercent <= 25) score += 33;
  if (carbPercent >= 45 && carbPercent <= 65) score += 34;
  if (fatPercent >= 20 && fatPercent <= 35) score += 33;
  
  return Math.round(score);
}

function generateNutritionalRecommendations(dailyAverages) {
  const recommendations = [];
  
  if (dailyAverages.fiber < 25) {
    recommendations.push({
      type: 'increase',
      nutrient: 'fiber',
      message: 'Add more whole grains, fruits, and vegetables to increase fiber intake',
      targetIncrease: Math.ceil(25 - dailyAverages.fiber)
    });
  }
  
  if (dailyAverages.protein < 50) {
    recommendations.push({
      type: 'increase',
      nutrient: 'protein',
      message: 'Include more lean proteins like chicken, fish, or legumes',
      targetIncrease: Math.ceil(50 - dailyAverages.protein)
    });
  }
  
  if (dailyAverages.sodium > 2300) {
    recommendations.push({
      type: 'decrease',
      nutrient: 'sodium',
      message: 'Reduce processed foods and use herbs and spices for flavor',
      targetDecrease: Math.ceil(dailyAverages.sodium - 2300)
    });
  }
  
  return recommendations;
}

function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

module.exports = router; 