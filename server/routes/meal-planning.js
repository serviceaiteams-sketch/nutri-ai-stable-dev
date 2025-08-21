const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAll, getRow } = require('../config/database');

// Generate AI-powered meal plan
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { weekStart, preferences } = req.body;

    // Get user's health conditions and dietary preferences
    const healthConditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // Get user's recent meals for context
    const recentMeals = await getAll(
      `SELECT m.meal_type, fi.food_name, fi.calories, fi.protein, fi.carbs, fi.fat
       FROM meals m
       JOIN food_items fi ON m.id = fi.meal_id
       WHERE m.user_id = ? 
       AND datetime(m.created_at) >= datetime('now', '-7 days')
       ORDER BY m.created_at DESC
       LIMIT 20`,
      [userId]
    );

    // Generate meal plan using AI
    const mealPlan = await generateAIMealPlan(weekStart, preferences, healthConditions, recentMeals);
    
    // Generate shopping list from meal plan
    const shoppingList = generateShoppingList(mealPlan);

    res.json({
      success: true,
      mealPlan: mealPlan,
      shoppingList: shoppingList
    });

  } catch (error) {
    console.error('Meal planning error:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});

// Generate AI meal plan
async function generateAIMealPlan(weekStart, preferences, healthConditions, recentMeals) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const axios = require('axios');
    
    const prompt = `You are an expert nutritionist and meal planner. Generate a comprehensive weekly meal plan based on the user's preferences and health conditions.

USER PREFERENCES:
- Dietary Restrictions: ${preferences.dietaryRestrictions.join(', ') || 'None'}
- Cooking Time: ${preferences.cookingTime}
- Servings: ${preferences.servings}
- Budget: ${preferences.budget}

HEALTH CONDITIONS:
${healthConditions.map(c => `- ${c.condition_name} (${c.severity || 'mild'})`).join('\n') || 'None specified'}

RECENT MEALS (for context):
${recentMeals.map(m => `- ${m.meal_type}: ${m.food_name}`).join('\n') || 'No recent meals'}

TASK: Generate a 7-day meal plan with breakfast, lunch, and dinner for each day.

IMPORTANT GUIDELINES:
1. Consider health conditions and dietary restrictions
2. Ensure nutritional balance and variety
3. Match cooking time preferences
4. Consider budget constraints
5. Include specific ingredients and portions
6. Provide cooking instructions
7. Include nutritional information
8. Rate difficulty level (easy/medium/hard)
9. Add recipe ratings (1-5 stars)

Return STRICT JSON in this exact schema (no prose outside JSON):
{
  "weekStart": "${weekStart}",
  "days": [
    {
      "day": "Monday",
      "date": "2024-01-15T00:00:00.000Z",
      "meals": {
        "breakfast": {
          "name": "meal name",
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": "step-by-step cooking instructions",
          "prepTime": 10,
          "cookTime": 15,
          "nutrition": {
            "calories": 350,
            "protein": 15,
            "carbs": 45,
            "fat": 12
          },
          "difficulty": "easy",
          "rating": 4.5,
          "image": "https://example.com/image.jpg"
        },
        "lunch": { /* same structure */ },
        "dinner": { /* same structure */ }
      }
    }
  ]
}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 3000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error('AI meal plan generation failed:', error);
    return getMockMealPlan(weekStart);
  }
}

// Generate shopping list from meal plan
async function generateShoppingList(mealPlan) {
  try {
    const allIngredients = new Map();

    // Collect all ingredients from the meal plan
    mealPlan.days.forEach(day => {
      Object.values(day.meals).forEach(meal => {
        meal.ingredients.forEach(ingredient => {
          const cleanIngredient = ingredient.trim().toLowerCase();
          if (allIngredients.has(cleanIngredient)) {
            allIngredients.set(cleanIngredient, allIngredients.get(cleanIngredient) + 1);
          } else {
            allIngredients.set(cleanIngredient, 1);
          }
        });
      });
    });

    // Categorize ingredients
    const categories = {
      'Proteins': [],
      'Grains': [],
      'Vegetables': [],
      'Fruits': [],
      'Dairy': [],
      'Nuts & Seeds': [],
      'Condiments': [],
      'Herbs & Spices': []
    };

    // Simple categorization logic (in real app, use a food database)
    allIngredients.forEach((count, ingredient) => {
      const item = { name: ingredient, quantity: count, checked: false };
      
      if (ingredient.includes('chicken') || ingredient.includes('beef') || ingredient.includes('fish') || 
          ingredient.includes('tofu') || ingredient.includes('turkey') || ingredient.includes('salmon')) {
        categories['Proteins'].push(item);
      } else if (ingredient.includes('rice') || ingredient.includes('quinoa') || ingredient.includes('oats') || 
                 ingredient.includes('bread') || ingredient.includes('pasta') || ingredient.includes('tortilla')) {
        categories['Grains'].push(item);
      } else if (ingredient.includes('tomato') || ingredient.includes('lettuce') || ingredient.includes('spinach') || 
                 ingredient.includes('broccoli') || ingredient.includes('carrot') || ingredient.includes('cucumber')) {
        categories['Vegetables'].push(item);
      } else if (ingredient.includes('apple') || ingredient.includes('banana') || ingredient.includes('berry') || 
                 ingredient.includes('orange') || ingredient.includes('grape')) {
        categories['Fruits'].push(item);
      } else if (ingredient.includes('milk') || ingredient.includes('yogurt') || ingredient.includes('cheese') || 
                 ingredient.includes('cream')) {
        categories['Dairy'].push(item);
      } else if (ingredient.includes('almond') || ingredient.includes('walnut') || ingredient.includes('seed')) {
        categories['Nuts & Seeds'].push(item);
      } else if (ingredient.includes('oil') || ingredient.includes('sauce') || ingredient.includes('vinegar') || 
                 ingredient.includes('honey') || ingredient.includes('mustard')) {
        categories['Condiments'].push(item);
      } else if (ingredient.includes('garlic') || ingredient.includes('ginger') || ingredient.includes('basil') || 
                 ingredient.includes('oregano') || ingredient.includes('salt') || ingredient.includes('pepper')) {
        categories['Herbs & Spices'].push(item);
      } else {
        categories['Other'].push(item);
      }
    });

    // Convert to array format and remove empty categories
    const shoppingList = Object.entries(categories)
      .filter(([category, items]) => items.length > 0)
      .map(([category, items]) => ({
        category: category,
        items: items
      }));

    return shoppingList;

  } catch (error) {
    console.error('Shopping list generation failed:', error);
    return getMockShoppingList();
  }
}

// Get meal plan history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 10 } = req.query;

    // In a real app, you'd store meal plans in the database
    // For now, return mock data
    const history = getMockMealPlanHistory(limit);

    res.json({
      success: true,
      history: history
    });

  } catch (error) {
    console.error('Meal plan history error:', error);
    res.status(500).json({ error: 'Failed to fetch meal plan history' });
  }
});

// Save meal plan
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mealPlan, name } = req.body;

    // In a real app, save to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Meal plan saved successfully',
      planId: Date.now()
    });

  } catch (error) {
    console.error('Save meal plan error:', error);
    res.status(500).json({ error: 'Failed to save meal plan' });
  }
});

// Get recipe recommendations
router.get('/recipes', authenticateToken, async (req, res) => {
  try {
    const { cuisine, difficulty, time, ingredients } = req.query;

    // Generate recipe recommendations using AI
    const recipes = await generateRecipeRecommendations(cuisine, difficulty, time, ingredients);

    res.json({
      success: true,
      recipes: recipes
    });

  } catch (error) {
    console.error('Recipe recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recipe recommendations' });
  }
});

// Generate recipe recommendations
async function generateRecipeRecommendations(cuisine, difficulty, time, ingredients) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const axios = require('axios');
    
    const prompt = `You are an expert chef and nutritionist. Recommend recipes based on the user's preferences.

PREFERENCES:
- Cuisine: ${cuisine || 'Any'}
- Difficulty: ${difficulty || 'Any'}
- Time: ${time || 'Any'}
- Available Ingredients: ${ingredients || 'Any'}

TASK: Recommend 5 recipes that match these preferences.

Return STRICT JSON in this exact schema (no prose outside JSON):
{
  "recipes": [
    {
      "name": "Recipe Name",
      "description": "Brief description",
      "cuisine": "cuisine type",
      "difficulty": "easy/medium/hard",
      "prepTime": 15,
      "cookTime": 30,
      "servings": 4,
      "ingredients": ["ingredient1", "ingredient2"],
      "instructions": ["step1", "step2"],
      "nutrition": {
        "calories": 350,
        "protein": 15,
        "carbs": 45,
        "fat": 12
      },
      "rating": 4.5,
      "image": "https://example.com/image.jpg"
    }
  ]
}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.3
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    return JSON.parse(content);

  } catch (error) {
    console.error('Recipe recommendations generation failed:', error);
    return getMockRecipes();
  }
}

// Helper functions for mock data
function getMockMealPlan(weekStart) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  // Create a seed based on the week start date to ensure consistent but varied meal plans
  const weekSeed = new Date(weekStart).getTime();
  
  const breakfastOptions = [
    {
      name: 'Oatmeal with Berries and Nuts',
      ingredients: ['Oats', 'Mixed berries', 'Almonds', 'Honey', 'Milk'],
      instructions: 'Cook oats with milk, top with berries and nuts, drizzle with honey',
      prepTime: 10, cookTime: 5,
      nutrition: { calories: 320, protein: 12, carbs: 45, fat: 15 },
      difficulty: 'easy', rating: 4.5
    },
    {
      name: 'Greek Yogurt Parfait',
      ingredients: ['Greek yogurt', 'Granola', 'Honey', 'Fresh fruit'],
      instructions: 'Layer yogurt, granola, and fruit in a glass, drizzle with honey',
      prepTime: 5, cookTime: 0,
      nutrition: { calories: 280, protein: 18, carbs: 35, fat: 8 },
      difficulty: 'easy', rating: 4.3
    },
    {
      name: 'Avocado Toast with Eggs',
      ingredients: ['Whole grain bread', 'Avocado', 'Eggs', 'Cherry tomatoes', 'Salt', 'Pepper'],
      instructions: 'Toast bread, mash avocado, fry eggs, assemble with tomatoes',
      prepTime: 8, cookTime: 7,
      nutrition: { calories: 350, protein: 15, carbs: 25, fat: 22 },
      difficulty: 'easy', rating: 4.6
    },
    {
      name: 'Smoothie Bowl',
      ingredients: ['Banana', 'Mixed berries', 'Greek yogurt', 'Granola', 'Chia seeds'],
      instructions: 'Blend fruits with yogurt, top with granola and seeds',
      prepTime: 10, cookTime: 0,
      nutrition: { calories: 300, protein: 16, carbs: 40, fat: 10 },
      difficulty: 'easy', rating: 4.4
    }
  ];

  const lunchOptions = [
    {
      name: 'Grilled Chicken Salad',
      ingredients: ['Chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Olive oil'],
      instructions: 'Grill chicken, chop vegetables, assemble salad with dressing',
      prepTime: 15, cookTime: 12,
      nutrition: { calories: 380, protein: 35, carbs: 8, fat: 22 },
      difficulty: 'medium', rating: 4.8
    },
    {
      name: 'Turkey and Avocado Wrap',
      ingredients: ['Turkey breast', 'Avocado', 'Whole wheat tortilla', 'Spinach', 'Mustard'],
      instructions: 'Spread avocado on tortilla, add turkey and spinach, roll up',
      prepTime: 8, cookTime: 0,
      nutrition: { calories: 320, protein: 25, carbs: 28, fat: 16 },
      difficulty: 'easy', rating: 4.4
    },
    {
      name: 'Quinoa Buddha Bowl',
      ingredients: ['Quinoa', 'Chickpeas', 'Sweet potato', 'Kale', 'Tahini dressing'],
      instructions: 'Cook quinoa and sweet potato, assemble bowl with vegetables and dressing',
      prepTime: 20, cookTime: 25,
      nutrition: { calories: 420, protein: 18, carbs: 45, fat: 20 },
      difficulty: 'medium', rating: 4.7
    },
    {
      name: 'Mediterranean Pasta Salad',
      ingredients: ['Whole wheat pasta', 'Cherry tomatoes', 'Olives', 'Feta cheese', 'Olive oil'],
      instructions: 'Cook pasta, mix with vegetables and cheese, dress with olive oil',
      prepTime: 12, cookTime: 10,
      nutrition: { calories: 380, protein: 12, carbs: 45, fat: 18 },
      difficulty: 'easy', rating: 4.3
    }
  ];

  const dinnerOptions = [
    {
      name: 'Salmon with Quinoa and Vegetables',
      ingredients: ['Salmon fillet', 'Quinoa', 'Broccoli', 'Carrots', 'Lemon'],
      instructions: 'Bake salmon, cook quinoa, steam vegetables, serve with lemon',
      prepTime: 20, cookTime: 25,
      nutrition: { calories: 450, protein: 40, carbs: 35, fat: 18 },
      difficulty: 'medium', rating: 4.7
    },
    {
      name: 'Vegetarian Stir Fry',
      ingredients: ['Tofu', 'Mixed vegetables', 'Soy sauce', 'Ginger', 'Garlic'],
      instructions: 'Stir fry tofu and vegetables with soy sauce and aromatics',
      prepTime: 15, cookTime: 10,
      nutrition: { calories: 380, protein: 22, carbs: 25, fat: 20 },
      difficulty: 'medium', rating: 4.2
    },
    {
      name: 'Grilled Chicken with Sweet Potato',
      ingredients: ['Chicken breast', 'Sweet potato', 'Green beans', 'Olive oil', 'Herbs'],
      instructions: 'Grill chicken, roast sweet potato and green beans, season with herbs',
      prepTime: 15, cookTime: 30,
      nutrition: { calories: 420, protein: 35, carbs: 30, fat: 16 },
      difficulty: 'medium', rating: 4.6
    },
    {
      name: 'Lentil Curry with Rice',
      ingredients: ['Red lentils', 'Onion', 'Tomatoes', 'Coconut milk', 'Spices', 'Rice'],
      instructions: 'Cook lentils with spices and coconut milk, serve with rice',
      prepTime: 10, cookTime: 25,
      nutrition: { calories: 400, protein: 18, carbs: 50, fat: 12 },
      difficulty: 'easy', rating: 4.5
    }
  ];

  // Generate varied meal plan for the entire week
  const days = dayNames.map((dayName, index) => {
    // Use the week seed and day index to create consistent but varied selections
    const daySeed = weekSeed + index;
    const breakfastIndex = Math.floor(Math.abs(Math.sin(daySeed)) * breakfastOptions.length) % breakfastOptions.length;
    const lunchIndex = Math.floor(Math.abs(Math.cos(daySeed)) * lunchOptions.length) % lunchOptions.length;
    const dinnerIndex = Math.floor(Math.abs(Math.sin(daySeed + 1)) * dinnerOptions.length) % dinnerOptions.length;

    return {
      day: dayName,
      date: new Date(new Date(weekStart).getTime() + index * 24 * 60 * 60 * 1000).toISOString(),
      meals: {
        breakfast: breakfastOptions[breakfastIndex],
        lunch: lunchOptions[lunchIndex],
        dinner: dinnerOptions[dinnerIndex]
      }
    };
  });

  return {
    weekStart: weekStart,
    days: days
  };
}

function getMockShoppingList(mealPlan) {
  // Extract all ingredients from the meal plan
  const allIngredients = [];
  
  if (mealPlan && mealPlan.days) {
    mealPlan.days.forEach(day => {
      if (day.meals) {
        Object.values(day.meals).forEach(meal => {
          if (meal.ingredients) {
            allIngredients.push(...meal.ingredients);
          }
        });
      }
    });
  }

  // Categorize ingredients
  const categories = {
    'Proteins': [],
    'Grains': [],
    'Vegetables': [],
    'Fruits': [],
    'Nuts & Seeds': [],
    'Dairy': [],
    'Condiments': [],
    'Herbs & Spices': []
  };

  const ingredientCategories = {
    // Proteins
    'Chicken breast': 'Proteins', 'Salmon fillet': 'Proteins', 'Turkey breast': 'Proteins', 
    'Tofu': 'Proteins', 'Eggs': 'Proteins',
    
    // Grains
    'Oats': 'Grains', 'Quinoa': 'Grains', 'Whole wheat tortillas': 'Grains', 
    'Granola': 'Grains', 'Whole grain bread': 'Grains', 'Rice': 'Grains',
    'Whole wheat pasta': 'Grains',
    
    // Vegetables
    'Mixed greens': 'Vegetables', 'Cherry tomatoes': 'Vegetables', 'Cucumber': 'Vegetables',
    'Broccoli': 'Vegetables', 'Carrots': 'Vegetables', 'Spinach': 'Vegetables',
    'Mixed vegetables': 'Vegetables', 'Sweet potato': 'Vegetables', 'Green beans': 'Vegetables',
    'Onion': 'Vegetables', 'Tomatoes': 'Vegetables', 'Kale': 'Vegetables',
    
    // Fruits
    'Mixed berries': 'Fruits', 'Fresh fruit': 'Fruits', 'Banana': 'Fruits',
    
    // Nuts & Seeds
    'Almonds': 'Nuts & Seeds', 'Chia seeds': 'Nuts & Seeds',
    
    // Dairy
    'Milk': 'Dairy', 'Greek yogurt': 'Dairy', 'Feta cheese': 'Dairy',
    
    // Condiments
    'Honey': 'Condiments', 'Olive oil': 'Condiments', 'Lemon': 'Condiments',
    'Soy sauce': 'Condiments', 'Mustard': 'Condiments', 'Coconut milk': 'Condiments',
    'Tahini dressing': 'Condiments',
    
    // Herbs & Spices
    'Ginger': 'Herbs & Spices', 'Garlic': 'Herbs & Spices', 'Spices': 'Herbs & Spices',
    'Herbs': 'Herbs & Spices', 'Salt': 'Herbs & Spices', 'Pepper': 'Herbs & Spices'
  };

  // Categorize ingredients and remove duplicates
  const uniqueIngredients = [...new Set(allIngredients)];
  uniqueIngredients.forEach(ingredient => {
    const category = ingredientCategories[ingredient];
    if (category && !categories[category].includes(ingredient)) {
      categories[category].push(ingredient);
    }
  });

  // Convert to array format and remove empty categories
  return Object.entries(categories)
    .filter(([category, items]) => items.length > 0)
    .map(([category, items]) => ({
      category: category,
      items: items.sort()
    }));
}

function getMockMealPlanHistory(limit) {
  return Array.from({ length: limit }, (_, i) => ({
    id: i + 1,
    name: `Meal Plan ${i + 1}`,
    weekStart: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString(),
    totalMeals: 21,
    averageRating: 4.2 + Math.random() * 0.6
  }));
}

function getMockRecipes() {
  return {
    recipes: [
      {
        name: 'Mediterranean Quinoa Bowl',
        description: 'A healthy and flavorful quinoa bowl with Mediterranean ingredients',
        cuisine: 'Mediterranean',
        difficulty: 'easy',
        prepTime: 15,
        cookTime: 20,
        servings: 4,
        ingredients: ['Quinoa', 'Cherry tomatoes', 'Cucumber', 'Olive oil', 'Feta cheese', 'Lemon'],
        instructions: [
          'Cook quinoa according to package instructions',
          'Chop vegetables and mix with cooked quinoa',
          'Add olive oil, lemon juice, and feta cheese',
          'Season with salt and pepper to taste'
        ],
        nutrition: { calories: 280, protein: 12, carbs: 35, fat: 14 },
        rating: 4.6
      }
    ]
  };
}

module.exports = router; 