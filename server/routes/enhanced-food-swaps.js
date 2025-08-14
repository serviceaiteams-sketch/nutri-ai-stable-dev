const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Regional food databases with cultural relevance
const REGIONAL_FOOD_DATABASE = {
  'north_america': {
    staples: ['quinoa', 'salmon', 'blueberries', 'avocado', 'sweet potato', 'kale'],
    swaps: {
      'white rice': { alternatives: ['quinoa', 'cauliflower rice', 'brown rice'], availability: 'high' },
      'beef': { alternatives: ['bison', 'turkey', 'plant-based protein'], availability: 'high' },
      'iceberg lettuce': { alternatives: ['spinach', 'arugula', 'kale'], availability: 'high' }
    }
  },
  'europe': {
    staples: ['olive oil', 'feta cheese', 'lentils', 'sardines', 'whole grains', 'Mediterranean herbs'],
    swaps: {
      'butter': { alternatives: ['olive oil', 'avocado oil', 'coconut oil'], availability: 'high' },
      'white bread': { alternatives: ['sourdough', 'whole grain bread', 'rye bread'], availability: 'high' },
      'regular pasta': { alternatives: ['whole wheat pasta', 'legume pasta', 'zucchini noodles'], availability: 'medium' }
    }
  },
  'south_asia': {
    staples: ['turmeric', 'lentils', 'yogurt', 'spinach', 'ginger', 'coconut', 'millet'],
    swaps: {
      'white rice': { alternatives: ['brown rice', 'quinoa', 'millet', 'cauliflower rice'], availability: 'high' },
      'refined oil': { alternatives: ['coconut oil', 'mustard oil', 'sesame oil'], availability: 'high' },
      'sugar': { alternatives: ['jaggery', 'honey', 'dates', 'stevia'], availability: 'high' }
    }
  },
  'east_asia': {
    staples: ['tofu', 'seaweed', 'green tea', 'shiitake mushrooms', 'miso', 'sesame'],
    swaps: {
      'white rice': { alternatives: ['brown rice', 'quinoa', 'shirataki noodles'], availability: 'high' },
      'soy sauce': { alternatives: ['coconut aminos', 'low-sodium soy sauce', 'tamari'], availability: 'medium' },
      'regular noodles': { alternatives: ['shirataki noodles', 'kelp noodles', 'zucchini noodles'], availability: 'medium' }
    }
  },
  'middle_east': {
    staples: ['olive oil', 'tahini', 'chickpeas', 'pomegranate', 'herbs', 'yogurt'],
    swaps: {
      'white bread': { alternatives: ['whole wheat pita', 'lavash', 'sprouted grain bread'], availability: 'high' },
      'regular hummus': { alternatives: ['tahini-based dips', 'baba ganoush', 'white bean dip'], availability: 'high' },
      'refined grains': { alternatives: ['bulgur', 'freekeh', 'quinoa'], availability: 'medium' }
    }
  }
};

// Health scoring system
const HEALTH_SCORES = {
  'excellent': { min: 85, color: 'green', description: 'Nutrient-dense superfood' },
  'very_good': { min: 70, color: 'light-green', description: 'Highly nutritious choice' },
  'good': { min: 55, color: 'yellow', description: 'Balanced nutritional profile' },
  'fair': { min: 40, color: 'orange', description: 'Moderate nutritional value' },
  'poor': { min: 0, color: 'red', description: 'Limited nutritional benefits' }
};

// Real-time food swap suggestions based on photo
router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      detectedFoods, 
      userLocation = 'north_america', 
      dietaryRestrictions = [], 
      healthGoals = [],
      culturalPreferences = []
    } = req.body;

    // Get user's allergens
    const userAllergens = await getAll(
      'SELECT allergen_name FROM user_allergens WHERE user_id = ?',
      [userId]
    );

    // Get user's historical preferences
    const userHistory = await getAll(
      `SELECT original_food, suggested_food, accepted 
       FROM food_swap_suggestions 
       WHERE user_id = ? AND created_at >= date('now', '-30 days')`,
      [userId]
    );

    const swapSuggestions = [];

    for (const food of detectedFoods) {
      const suggestions = await generateRealTimeSwaps({
        originalFood: food,
        userLocation,
        dietaryRestrictions,
        healthGoals,
        culturalPreferences,
        allergens: userAllergens.map(a => a.allergen_name),
        userHistory
      });

      if (suggestions.length > 0) {
        swapSuggestions.push({
          originalFood: food,
          suggestions,
          swapReasons: analyzeSwapReasons(food, suggestions),
          locationOptimized: true
        });

        // Store suggestions for learning
        for (const suggestion of suggestions.slice(0, 3)) { // Store top 3
          await runQuery(
            `INSERT INTO food_swap_suggestions 
             (user_id, original_food, suggested_food, swap_reason, health_score_improvement, 
              cultural_relevance, local_availability, nutritional_comparison, location_data) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              userId, 
              food.name, 
              suggestion.name,
              suggestion.swapReason,
              suggestion.healthScoreImprovement,
              suggestion.culturalRelevance,
              suggestion.localAvailability,
              JSON.stringify(suggestion.nutritionalComparison),
              JSON.stringify({ location: userLocation, preferences: culturalPreferences })
            ]
          );
        }
      }
    }

    // Get market availability data
    const marketData = await getMarketAvailability(userLocation);

    res.json({
      swapSuggestions,
      totalFoodsAnalyzed: detectedFoods.length,
      totalSuggestions: swapSuggestions.reduce((sum, s) => sum + s.suggestions.length, 0),
      marketData,
      personalizedInsights: generatePersonalizedInsights(userHistory, swapSuggestions),
      locationSpecificTips: getLocationSpecificTips(userLocation)
    });

  } catch (error) {
    console.error('Error generating food swaps:', error);
    res.status(500).json({ error: 'Failed to generate food swap suggestions' });
  }
});

// Accept or reject swap suggestion
router.post('/feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { originalFood, suggestedFood, accepted, feedback } = req.body;

    // Update the suggestion record
    await runQuery(
      `UPDATE food_swap_suggestions 
       SET accepted = ?, feedback = ? 
       WHERE user_id = ? AND original_food = ? AND suggested_food = ?`,
      [accepted, feedback, userId, originalFood, suggestedFood]
    );

    // Learn from feedback for future suggestions
    const learningData = {
      userId,
      originalFood,
      suggestedFood,
      accepted,
      feedback,
      timestamp: new Date()
    };

    // This would feed into ML model for better suggestions
    await updateUserPreferenceModel(learningData);

    res.json({ 
      success: true, 
      message: 'Feedback recorded successfully',
      improvedSuggestions: accepted ? await getImprovedSuggestions(userId, originalFood) : null
    });

  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get swap history and analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query;

    const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

    const swapHistory = await getAll(
      `SELECT * FROM food_swap_suggestions 
       WHERE user_id = ? AND created_at >= date('now', '-${days} days')
       ORDER BY created_at DESC`,
      [userId]
    );

    const analytics = {
      totalSuggestions: swapHistory.length,
      acceptedSuggestions: swapHistory.filter(s => s.accepted).length,
      rejectedSuggestions: swapHistory.filter(s => s.accepted === false).length,
      pendingSuggestions: swapHistory.filter(s => s.accepted === null).length,
      averageHealthImprovement: calculateAverageHealthImprovement(swapHistory),
      topSwapCategories: getTopSwapCategories(swapHistory),
      culturalAdaptation: calculateCulturalAdaptation(swapHistory),
      costSavings: estimateCostSavings(swapHistory),
      healthImpact: calculateHealthImpact(swapHistory)
    };

    res.json({
      period,
      analytics,
      recommendations: generateAnalyticsRecommendations(analytics),
      trends: identifyTrends(swapHistory)
    });

  } catch (error) {
    console.error('Error fetching swap analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper functions
async function generateRealTimeSwaps({ originalFood, userLocation, dietaryRestrictions, healthGoals, culturalPreferences, allergens, userHistory }) {
  const foodName = originalFood.name.toLowerCase();
  const regionalData = REGIONAL_FOOD_DATABASE[userLocation] || REGIONAL_FOOD_DATABASE['north_america'];
  
  let suggestions = [];

  // Check if food is in regional swap database
  if (regionalData.swaps[foodName]) {
    const swapData = regionalData.swaps[foodName];
    
    for (const alternative of swapData.alternatives) {
      // Filter out allergens
      if (allergens.some(allergen => alternative.toLowerCase().includes(allergen.toLowerCase()))) {
        continue;
      }

      const suggestion = await createDetailedSuggestion({
        originalFood,
        suggestedFood: alternative,
        swapData,
        userLocation,
        dietaryRestrictions,
        healthGoals,
        culturalPreferences,
        userHistory
      });

      suggestions.push(suggestion);
    }
  }

  // Generate health-based swaps
  const healthBasedSwaps = generateHealthBasedSwaps(originalFood, healthGoals, userLocation);
  suggestions.push(...healthBasedSwaps);

  // Generate cultural swaps
  const culturalSwaps = generateCulturalSwaps(originalFood, culturalPreferences, userLocation);
  suggestions.push(...culturalSwaps);

  // Remove duplicates and sort by relevance
  suggestions = removeDuplicates(suggestions);
  suggestions = rankSuggestions(suggestions, userHistory);

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

async function createDetailedSuggestion({ originalFood, suggestedFood, swapData, userLocation, dietaryRestrictions, healthGoals, culturalPreferences, userHistory }) {
  const originalNutrition = await getNutritionData(originalFood.name);
  const suggestedNutrition = await getNutritionData(suggestedFood);

  const healthScoreImprovement = calculateHealthScoreImprovement(originalNutrition, suggestedNutrition);
  const culturalRelevance = calculateCulturalRelevance(suggestedFood, culturalPreferences, userLocation);
  const localAvailability = await getLocalAvailability(suggestedFood, userLocation);
  const priceComparison = await getPriceComparison(originalFood.name, suggestedFood, userLocation);

  return {
    name: suggestedFood,
    healthScore: getHealthScore(suggestedNutrition),
    healthScoreImprovement,
    culturalRelevance,
    localAvailability,
    priceComparison,
    swapReason: determineSwapReason(originalNutrition, suggestedNutrition, healthGoals),
    nutritionalComparison: {
      original: originalNutrition,
      suggested: suggestedNutrition,
      improvements: identifyNutritionalImprovements(originalNutrition, suggestedNutrition)
    },
    availability: swapData?.availability || 'medium',
    preparationTips: getPreparationTips(suggestedFood),
    seasonality: getSeasonality(suggestedFood),
    sustainabilityScore: getSustainabilityScore(suggestedFood),
    allergenFree: !containsAllergens(suggestedFood, dietaryRestrictions)
  };
}

function generateHealthBasedSwaps(originalFood, healthGoals, userLocation) {
  const swaps = [];
  const foodName = originalFood.name.toLowerCase();

  // Generate swaps based on health goals
  if (healthGoals.includes('weight_loss')) {
    if (foodName.includes('rice')) {
      swaps.push(createSimpleSwap('Cauliflower rice', 'Lower calorie alternative'));
    }
    if (foodName.includes('pasta')) {
      swaps.push(createSimpleSwap('Zucchini noodles', 'Vegetable-based alternative'));
    }
  }

  if (healthGoals.includes('heart_health')) {
    if (foodName.includes('beef')) {
      swaps.push(createSimpleSwap('Salmon', 'Heart-healthy omega-3s'));
    }
    if (foodName.includes('butter')) {
      swaps.push(createSimpleSwap('Olive oil', 'Heart-healthy fats'));
    }
  }

  if (healthGoals.includes('diabetes_management')) {
    if (foodName.includes('white bread')) {
      swaps.push(createSimpleSwap('Whole grain bread', 'Better blood sugar control'));
    }
    if (foodName.includes('sugar')) {
      swaps.push(createSimpleSwap('Stevia', 'Natural sugar alternative'));
    }
  }

  return swaps;
}

function generateCulturalSwaps(originalFood, culturalPreferences, userLocation) {
  const swaps = [];
  const regionalData = REGIONAL_FOOD_DATABASE[userLocation];

  if (!regionalData) return swaps;

  // Suggest regional staples as alternatives
  if (culturalPreferences.includes('traditional')) {
    regionalData.staples.forEach(staple => {
      if (isSuitableSwap(originalFood.name, staple)) {
        swaps.push(createSimpleSwap(staple, 'Traditional regional alternative'));
      }
    });
  }

  return swaps;
}

function createSimpleSwap(name, reason) {
  return {
    name,
    swapReason: reason,
    healthScoreImprovement: Math.floor(Math.random() * 20) + 5, // Simplified
    culturalRelevance: 0.7,
    localAvailability: 0.8,
    priceComparison: 0.9
  };
}

function isSuitableSwap(originalFood, suggestedFood) {
  // Simplified logic - would be enhanced with proper food categorization
  const originalCategory = getFoodCategory(originalFood);
  const suggestedCategory = getFoodCategory(suggestedFood);
  return originalCategory === suggestedCategory;
}

function getFoodCategory(foodName) {
  const categories = {
    grain: ['rice', 'bread', 'pasta', 'quinoa', 'oats'],
    protein: ['chicken', 'beef', 'fish', 'tofu', 'eggs'],
    vegetable: ['spinach', 'kale', 'broccoli', 'carrots'],
    fat: ['oil', 'butter', 'avocado', 'nuts']
  };

  for (const [category, foods] of Object.entries(categories)) {
    if (foods.some(food => foodName.toLowerCase().includes(food))) {
      return category;
    }
  }
  return 'other';
}

async function getNutritionData(foodName) {
  // Simplified nutrition database - would be enhanced with comprehensive database
  const nutritionDB = {
    'white rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, sugar: 0.1 },
    'brown rice': { calories: 112, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, sugar: 0.4 },
    'quinoa': { calories: 120, protein: 4.4, carbs: 22, fat: 1.9, fiber: 2.8, sugar: 0.9 },
    'cauliflower rice': { calories: 25, protein: 2, carbs: 5, fat: 0.3, fiber: 2, sugar: 2 },
    'salmon': { calories: 206, protein: 22, carbs: 0, fat: 12, fiber: 0, sugar: 0 },
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0 }
  };

  return nutritionDB[foodName.toLowerCase()] || {
    calories: 100, protein: 5, carbs: 15, fat: 3, fiber: 2, sugar: 5
  };
}

function calculateHealthScoreImprovement(originalNutrition, suggestedNutrition) {
  let improvement = 0;

  // Fiber improvement
  if (suggestedNutrition.fiber > originalNutrition.fiber) {
    improvement += 10;
  }

  // Protein improvement
  if (suggestedNutrition.protein > originalNutrition.protein) {
    improvement += 8;
  }

  // Sugar reduction
  if (suggestedNutrition.sugar < originalNutrition.sugar) {
    improvement += 12;
  }

  // Calorie efficiency (more nutrients per calorie)
  const originalDensity = (originalNutrition.protein + originalNutrition.fiber) / originalNutrition.calories;
  const suggestedDensity = (suggestedNutrition.protein + suggestedNutrition.fiber) / suggestedNutrition.calories;
  
  if (suggestedDensity > originalDensity) {
    improvement += 15;
  }

  return Math.min(improvement, 50); // Cap at 50 points
}

function calculateCulturalRelevance(suggestedFood, culturalPreferences, userLocation) {
  const regionalData = REGIONAL_FOOD_DATABASE[userLocation];
  
  if (!regionalData) return 0.5;

  // Check if suggested food is in regional staples
  if (regionalData.staples.includes(suggestedFood.toLowerCase())) {
    return 0.9;
  }

  // Check cultural preferences
  if (culturalPreferences.includes('traditional') && 
      regionalData.staples.includes(suggestedFood.toLowerCase())) {
    return 0.95;
  }

  return 0.6; // Default moderate relevance
}

async function getLocalAvailability(foodName, userLocation) {
  // Simplified availability calculation - would use real market data
  const baseAvailability = {
    'north_america': 0.8,
    'europe': 0.75,
    'south_asia': 0.7,
    'east_asia': 0.8
  };

  return baseAvailability[userLocation] || 0.7;
}

async function getPriceComparison(originalFood, suggestedFood, userLocation) {
  // Simplified price comparison - would use real market pricing APIs
  return Math.random() * 0.4 + 0.8; // 0.8 to 1.2 multiplier
}

function getHealthScore(nutrition) {
  let score = 50; // Base score

  // Positive factors
  score += Math.min(nutrition.protein * 2, 20);
  score += Math.min(nutrition.fiber * 5, 20);
  
  // Negative factors
  score -= Math.min(nutrition.sugar * 2, 15);
  score -= Math.min((nutrition.calories - 100) / 10, 10);

  return Math.max(0, Math.min(100, score));
}

function determineSwapReason(originalNutrition, suggestedNutrition, healthGoals) {
  const reasons = [];

  if (suggestedNutrition.fiber > originalNutrition.fiber) {
    reasons.push('Higher fiber content');
  }
  if (suggestedNutrition.protein > originalNutrition.protein) {
    reasons.push('More protein');
  }
  if (suggestedNutrition.sugar < originalNutrition.sugar) {
    reasons.push('Lower sugar');
  }
  if (suggestedNutrition.calories < originalNutrition.calories) {
    reasons.push('Fewer calories');
  }

  return reasons.length > 0 ? reasons.join(', ') : 'Nutritional benefits';
}

function identifyNutritionalImprovements(originalNutrition, suggestedNutrition) {
  const improvements = [];

  Object.keys(originalNutrition).forEach(nutrient => {
    const original = originalNutrition[nutrient];
    const suggested = suggestedNutrition[nutrient];
    const change = suggested - original;
    const percentChange = (change / original) * 100;

    if (Math.abs(percentChange) > 10) {
      improvements.push({
        nutrient,
        change,
        percentChange: Math.round(percentChange),
        improvement: (nutrient === 'sugar' || nutrient === 'calories') ? change < 0 : change > 0
      });
    }
  });

  return improvements;
}

function getPreparationTips(foodName) {
  const tips = {
    'quinoa': ['Rinse before cooking', 'Use 2:1 water ratio', 'Cook for 15 minutes'],
    'cauliflower rice': ['Pulse in food processor', 'Sauté for 5-7 minutes', 'Season well'],
    'zucchini noodles': ['Use spiralizer', 'Salt and drain first', 'Cook briefly to avoid mushy texture']
  };

  return tips[foodName.toLowerCase()] || ['Follow package instructions', 'Season to taste'];
}

function getSeasonality(foodName) {
  const seasonality = {
    'zucchini': 'Summer peak season',
    'cauliflower': 'Fall and winter best',
    'quinoa': 'Available year-round'
  };

  return seasonality[foodName.toLowerCase()] || 'Available year-round';
}

function getSustainabilityScore(foodName) {
  const scores = {
    'quinoa': 8,
    'lentils': 9,
    'salmon': 6,
    'beef': 3,
    'cauliflower': 8
  };

  return scores[foodName.toLowerCase()] || 7;
}

function containsAllergens(foodName, dietaryRestrictions) {
  return dietaryRestrictions.some(restriction => 
    foodName.toLowerCase().includes(restriction.toLowerCase())
  );
}

function removeDuplicates(suggestions) {
  const seen = new Set();
  return suggestions.filter(suggestion => {
    if (seen.has(suggestion.name)) {
      return false;
    }
    seen.add(suggestion.name);
    return true;
  });
}

function rankSuggestions(suggestions, userHistory) {
  // Rank based on user's historical preferences
  return suggestions.sort((a, b) => {
    const aScore = calculateRankingScore(a, userHistory);
    const bScore = calculateRankingScore(b, userHistory);
    return bScore - aScore;
  });
}

function calculateRankingScore(suggestion, userHistory) {
  let score = suggestion.healthScoreImprovement || 0;
  score += (suggestion.culturalRelevance || 0) * 20;
  score += (suggestion.localAvailability || 0) * 15;

  // Bonus for previously accepted similar suggestions
  const similarAccepted = userHistory.filter(h => 
    h.accepted && h.suggested_food.toLowerCase().includes(suggestion.name.toLowerCase())
  );
  score += similarAccepted.length * 10;

  return score;
}

async function getMarketAvailability(userLocation) {
  // Mock market data - would be enhanced with real APIs
  return {
    farmers_markets: Math.floor(Math.random() * 10) + 5,
    supermarkets: Math.floor(Math.random() * 20) + 10,
    health_food_stores: Math.floor(Math.random() * 8) + 3,
    average_prices: {
      produce: '$2.50/lb',
      grains: '$1.80/lb',
      proteins: '$8.50/lb'
    }
  };
}

function generatePersonalizedInsights(userHistory, currentSuggestions) {
  const insights = [];

  const acceptanceRate = userHistory.length > 0 ? 
    userHistory.filter(h => h.accepted).length / userHistory.length : 0;

  if (acceptanceRate > 0.7) {
    insights.push('You have a high acceptance rate for healthy swaps!');
  }

  const commonSwaps = getCommonSwapTypes(userHistory);
  if (commonSwaps.length > 0) {
    insights.push(`You often prefer ${commonSwaps[0]} swaps`);
  }

  return insights;
}

function getCommonSwapTypes(userHistory) {
  const swapTypes = {};
  userHistory.forEach(swap => {
    const type = swap.swap_reason || 'health';
    swapTypes[type] = (swapTypes[type] || 0) + 1;
  });

  return Object.entries(swapTypes)
    .sort(([,a], [,b]) => b - a)
    .map(([type]) => type);
}

function getLocationSpecificTips(userLocation) {
  const tips = {
    'north_america': [
      'Visit farmers markets for seasonal produce',
      'Check Whole Foods for organic alternatives',
      'Consider CSA subscriptions for local foods'
    ],
    'south_asia': [
      'Look for traditional grains in local markets',
      'Use spices to enhance nutrition',
      'Consider seasonal fruits for natural sweetness'
    ],
    'europe': [
      'Explore Mediterranean diet options',
      'Visit local markets for fresh ingredients',
      'Consider fermented foods for gut health'
    ]
  };

  return tips[userLocation] || tips['north_america'];
}

function analyzeSwapReasons(originalFood, suggestions) {
  const reasons = {
    health: 0,
    availability: 0,
    cost: 0,
    taste: 0,
    culture: 0
  };

  suggestions.forEach(suggestion => {
    if (suggestion.healthScoreImprovement > 10) reasons.health++;
    if (suggestion.localAvailability > 0.8) reasons.availability++;
    if (suggestion.priceComparison < 1.0) reasons.cost++;
    if (suggestion.culturalRelevance > 0.7) reasons.culture++;
  });

  return reasons;
}

async function updateUserPreferenceModel(learningData) {
  // This would update an ML model for personalized suggestions
  // For now, we'll store the learning data for future use
  console.log('Learning from user feedback:', learningData);
}

async function getImprovedSuggestions(userId, originalFood) {
  // Generate improved suggestions based on accepted feedback
  return [
    { name: 'Similar healthy alternative', reason: 'Based on your preferences' }
  ];
}

function calculateAverageHealthImprovement(swapHistory) {
  if (swapHistory.length === 0) return 0;
  
  const total = swapHistory.reduce((sum, swap) => sum + (swap.health_score_improvement || 0), 0);
  return Math.round(total / swapHistory.length);
}

function getTopSwapCategories(swapHistory) {
  const categories = {};
  swapHistory.forEach(swap => {
    const category = getFoodCategory(swap.original_food);
    categories[category] = (categories[category] || 0) + 1;
  });

  return Object.entries(categories)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([category, count]) => ({ category, count }));
}

function calculateCulturalAdaptation(swapHistory) {
  if (swapHistory.length === 0) return 0;
  
  const total = swapHistory.reduce((sum, swap) => sum + (swap.cultural_relevance || 0), 0);
  return Math.round((total / swapHistory.length) * 100) / 100;
}

function estimateCostSavings(swapHistory) {
  // Mock cost savings calculation
  return swapHistory.length * 1.5; // $1.50 per swap
}

function calculateHealthImpact(swapHistory) {
  const acceptedSwaps = swapHistory.filter(s => s.accepted);
  const totalImprovement = acceptedSwaps.reduce((sum, swap) => sum + (swap.health_score_improvement || 0), 0);
  
  return {
    acceptedSwaps: acceptedSwaps.length,
    totalHealthImprovement: totalImprovement,
    averageImprovement: acceptedSwaps.length > 0 ? Math.round(totalImprovement / acceptedSwaps.length) : 0
  };
}

function generateAnalyticsRecommendations(analytics) {
  const recommendations = [];

  if (analytics.acceptedSuggestions > 0) {
    recommendations.push('Great job accepting healthy swap suggestions!');
  }

  if (analytics.averageHealthImprovement > 15) {
    recommendations.push('Your swaps are significantly improving your nutrition profile');
  }

  return recommendations;
}

function identifyTrends(swapHistory) {
  // Identify trends in swap acceptance over time
  return {
    improvingAcceptance: true,
    preferredCategories: getTopSwapCategories(swapHistory),
    seasonalPatterns: 'More vegetable swaps in summer'
  };
}

module.exports = router; 