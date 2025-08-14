const express = require('express');
const router = express.Router();
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const OpenAI = require('openai');
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Mood analysis algorithms and patterns
const MOOD_CORRELATIONS = {
  nutrients: {
    vitamin_d: { mood: 0.7, energy: 0.6, description: 'Vitamin D deficiency linked to depression' },
    omega_3: { mood: 0.8, mental_clarity: 0.7, description: 'Omega-3s support brain health' },
    magnesium: { stress: -0.6, sleep: 0.7, description: 'Magnesium reduces stress and improves sleep' },
    iron: { energy: 0.8, productivity: 0.6, description: 'Iron deficiency causes fatigue' },
    b_vitamins: { mood: 0.6, mental_clarity: 0.8, description: 'B vitamins essential for neurotransmitters' },
    protein: { energy: 0.5, mood: 0.4, description: 'Protein provides steady energy' },
    sugar: { mood: -0.7, energy: -0.5, description: 'High sugar causes mood swings' },
    caffeine: { energy: 0.6, stress: 0.4, description: 'Caffeine boosts energy but may increase stress' }
  },
  timing: {
    skipped_breakfast: { energy: -0.8, productivity: -0.6, mood: -0.5 },
    late_dinner: { sleep: -0.7, energy: -0.4, description: 'Late eating disrupts sleep' },
    irregular_meals: { mood: -0.6, stress: 0.5, description: 'Irregular eating affects mood stability' }
  }
};

// Physical symptoms that may correlate with nutrition
const PHYSICAL_SYMPTOMS = [
  'headache', 'fatigue', 'brain_fog', 'digestive_issues', 'mood_swings',
  'anxiety', 'depression', 'insomnia', 'joint_pain', 'skin_issues',
  'low_energy', 'irritability', 'difficulty_concentrating', 'cravings'
];

// Log detailed mood and wellness data
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      date = new Date().toISOString().split('T')[0],
      timeOfDay = new Date().toTimeString().slice(0, 5),
      moodScore,
      energyLevel,
      productivityScore,
      stressLevel,
      sleepQuality = 0,
      physicalSymptoms = [],
      mentalClarity = 0,
      socialEngagement = 0,
      exerciseCompleted = false,
      medicationTaken = false,
      notes = ''
    } = req.body;

    // Validate required fields
    if (!moodScore || !energyLevel || !productivityScore || !stressLevel) {
      return res.status(400).json({ 
        error: 'Missing required fields: moodScore, energyLevel, productivityScore, stressLevel' 
      });
    }

    // Store mood data
    await runQuery(
      `INSERT INTO enhanced_mood_tracking 
       (user_id, date, time_of_day, mood_score, energy_level, productivity_score, stress_level,
        sleep_quality, physical_symptoms, mental_clarity, social_engagement, exercise_completed,
        medication_taken, notes) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, date, timeOfDay, moodScore, energyLevel, productivityScore, stressLevel,
        sleepQuality, JSON.stringify(physicalSymptoms), mentalClarity, socialEngagement,
        exerciseCompleted, medicationTaken, notes
      ]
    );

    // Trigger correlation analysis if enough data exists
    const recentEntries = await getAll(
      'SELECT COUNT(*) as count FROM enhanced_mood_tracking WHERE user_id = ? AND date >= date("now", "-7 days")',
      [userId]
    );

    let correlationSuggestion = null;
    if (recentEntries[0].count >= 5) {
      correlationSuggestion = await performQuickCorrelationAnalysis(userId);
    }

    res.json({ 
      success: true, 
      message: 'Mood data logged successfully',
      correlationSuggestion,
      dataPoints: recentEntries[0].count,
      recommendAnalysis: recentEntries[0].count >= 7
    });

  } catch (error) {
    console.error('Error logging mood data:', error);
    res.status(500).json({ error: 'Failed to log mood data' });
  }
});

// Perform comprehensive correlation analysis
router.post('/analyze', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      analysisPeriod = 'monthly',
      focusAreas = ['mood', 'energy', 'productivity'],
      includeNutrition = true,
      includeTiming = true,
      includeExercise = true
    } = req.body;

    const days = analysisPeriod === 'weekly' ? 7 : analysisPeriod === 'monthly' ? 30 : 90;

    // Get mood tracking data
    const moodData = await getAll(
      `SELECT * FROM enhanced_mood_tracking 
       WHERE user_id = ? AND date >= date('now', '-${days} days')
       ORDER BY date, time_of_day`,
      [userId]
    );

    // Get nutrition data
    let nutritionData = [];
    if (includeNutrition) {
      nutritionData = await getAll(
        `SELECT * FROM meals 
         WHERE user_id = ? AND created_at >= date('now', '-${days} days')
         ORDER BY created_at`,
        [userId]
      );
    }

    // Get micronutrient data if available
    let micronutrientData = [];
    if (includeNutrition) {
      micronutrientData = await getAll(
        `SELECT * FROM micronutrient_tracking 
         WHERE user_id = ? AND date >= date('now', '-${days} days')
         ORDER BY date`,
        [userId]
      );
    }

    if (moodData.length < 5) {
      return res.json({
        error: 'Insufficient data for analysis',
        message: 'Need at least 5 mood entries for meaningful correlation analysis',
        currentEntries: moodData.length,
        requiredEntries: 5
      });
    }

    // Perform correlation analysis
    const correlationAnalysis = await performComprehensiveAnalysis({
      moodData,
      nutritionData,
      micronutrientData,
      focusAreas,
      analysisPeriod,
      includeOptions: { includeNutrition, includeTiming, includeExercise }
    });

    // Generate recommendations
    const recommendations = generatePersonalizedRecommendations(correlationAnalysis);

    // Store analysis results
    const result = await runQuery(
      `INSERT INTO nutrition_mood_correlations 
       (user_id, analysis_period, correlation_data, significant_patterns, recommendations, confidence_score) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        analysisPeriod,
        JSON.stringify(correlationAnalysis),
        JSON.stringify(correlationAnalysis.significantPatterns),
        JSON.stringify(recommendations),
        correlationAnalysis.overallConfidence
      ]
    );

    res.json({
      success: true,
      analysisId: result.id,
      correlationAnalysis,
      recommendations,
      insights: generateInsights(correlationAnalysis),
      nextSteps: generateNextSteps(correlationAnalysis)
    });

  } catch (error) {
    console.error('Error performing correlation analysis:', error);
    res.status(500).json({ error: 'Failed to perform correlation analysis' });
  }
});

// Get mood tracking history and trends
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly', metric = 'mood_score' } = req.query;

    const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

    const moodHistory = await getAll(
      `SELECT * FROM enhanced_mood_tracking 
       WHERE user_id = ? AND date >= date('now', '-${days} days')
       ORDER BY date, time_of_day`,
      [userId]
    );

    const trends = calculateTrends(moodHistory, metric);
    const patterns = identifyPatterns(moodHistory);
    const averages = calculateAverages(moodHistory);
    const correlations = identifyBasicCorrelations(moodHistory);

    res.json({
      period,
      totalEntries: moodHistory.length,
      moodHistory,
      trends,
      patterns,
      averages,
      correlations,
      recommendations: generateTrendRecommendations(trends, patterns)
    });

  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({ error: 'Failed to fetch mood history' });
  }
});

// Get real-time mood alerts and interventions
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get recent mood entries
    const recentMood = await getAll(
      `SELECT * FROM enhanced_mood_tracking 
       WHERE user_id = ? AND date >= date('now', '-3 days')
       ORDER BY date DESC, time_of_day DESC`,
      [userId]
    );

    const alerts = [];
    const interventions = [];

    if (recentMood.length >= 3) {
      // Check for concerning patterns
      const alerts_and_interventions = analyzeForAlerts(recentMood);
      alerts.push(...alerts_and_interventions.alerts);
      interventions.push(...alerts_and_interventions.interventions);
    }

    // Get nutrition-based alerts
    const nutritionAlerts = await getNutritionBasedAlerts(userId);
    alerts.push(...nutritionAlerts);

    res.json({
      alerts,
      interventions,
      priorityLevel: calculatePriorityLevel(alerts),
      actionRequired: alerts.some(a => a.severity === 'high'),
      supportResources: getSupportResources(alerts)
    });

  } catch (error) {
    console.error('Error fetching mood alerts:', error);
    res.status(500).json({ error: 'Failed to fetch mood alerts' });
  }
});

// Mood-based chef: recommends ingredients or returns cooking procedure
router.post('/mood/chef', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mood = '',
      cravings = [],
      haveIngredients = [],
      dietaryRestrictions = [],
      allergies = [],
      intolerances = [],
      cuisinePreferences = [],
      cookingMethodsAvailable = ['stovetop','oven','microwave'],
      calorieTargetPerMeal = null,
      model = 'gpt-4o-mini'
    } = req.body || {};

    const system = 'You are a culinary nutritionist and chef. Produce safe, tasty, balanced guidance. Respect restrictions and allergies. Output valid JSON only per schema.';

    const user = `Task: Mood-based meal planning and cooking assistance.\n\nInputs:\n- User profile:\n  - dietaryRestrictions: ${JSON.stringify(dietaryRestrictions)}\n  - allergies: ${JSON.stringify(allergies)}\n  - intolerances: ${JSON.stringify(intolerances)}\n  - cuisinePreferences: ${JSON.stringify(cuisinePreferences)}\n  - calorieTargetPerMeal: ${calorieTargetPerMeal ?? 'null'}\n- Context:\n  - mood: ${mood}\n  - cravings: ${JSON.stringify(cravings)}\n  - cookingMethodsAvailable: ${JSON.stringify(cookingMethodsAvailable)}\n- Pantry (optional):\n  - haveIngredients: ${JSON.stringify(haveIngredients)}\n\nRequirements:\n1) If haveIngredients is empty or <3, return the \"recommendations\" schema.\n2) If haveIngredients has 3+ items, return the \"procedure\" schema.\n3) Avoid restricted/allergen items; offer substitutes.\n4) Use only available cooking methods.\n5) Match flavor pairings to cravings.\n6) Include short nutrition rationale and approx calories if reasonable.\n\nSchemas:\n- recommendations: { \"mode\":\"recommendations\", \"mealIdeaTitle\": \"...\", \"ingredients\":[...], \"flavorPairings\":[...], \"notes\":\"...\", \"approxCaloriesPerServing\": 000, \"whyThisFitsMood\":\"...\", \"safetyChecks\":[...] }\n- procedure: { \"mode\":\"procedure\", \"recipeTitle\":\"...\", \"servings\":2, \"timeMinutes\":25, \"ingredientsUsed\":[...], \"extraIngredientsNeeded\":[...], \"steps\":[...], \"tips\":[...], \"approxCaloriesPerServing\": 000, \"whyThisFitsMood\":\"...\", \"safetyChecks\":[...] }\n\nOutput:\nReturn exactly one JSON object following the matching schema. No markdown.`;

    // Attempt OpenAI call; fallback if unavailable
    let parsed;
    if (openai) {
      try {
        const resp = await openai.chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          temperature: 0.7,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ]
        });
        const text = resp.choices?.[0]?.message?.content || '{}';
        parsed = JSON.parse(text);
      } catch (err) {
        console.warn('OpenAI error, falling back:', err.message);
      }
    }

    if (!parsed) {
      // Deterministic fallback
      if (!haveIngredients || haveIngredients.length < 3) {
        parsed = {
          mode: 'recommendations',
          mealIdeaTitle: 'Zesty Chili-Lime Chickpea Bowl',
          ingredients: [
            { name: 'chickpeas (cooked)', quantityRange: '1–1.5 cups', reason: 'protein + fiber for steady energy', substitutes: ['white beans','tofu'] },
            { name: 'lime (juice + zest)', quantityRange: '1–2 tbsp + 1 tsp', reason: 'tangy lift for cravings', substitutes: ['lemon','tamarind'] },
            { name: 'fresh chili or flakes', quantityRange: '1/2–1 tsp', reason: 'controlled heat', substitutes: ['smoked paprika'] },
            { name: 'cucumber & tomato', quantityRange: '1 cup', reason: 'refreshing crunch', substitutes: ['bell pepper'] },
            { name: 'olive oil & garlic', quantityRange: '1 tbsp & 1 clove', reason: 'aroma and satiety', substitutes: ['avocado oil','ginger'] }
          ],
          flavorPairings: ['lime + chili + mint', 'garlic + chickpea + olive oil'],
          notes: 'Serve over quinoa or greens; swap yogurt with coconut yogurt if dairy-free.',
          approxCaloriesPerServing: 480,
          whyThisFitsMood: 'Bright acidity and gentle spice to elevate mood without heaviness.',
          safetyChecks: ['Respect allergies and restrictions; avoid peanuts and pork if listed.']
        };
      } else {
        parsed = {
          mode: 'procedure',
          recipeTitle: 'Tangy Chili-Lime Chicken (Stovetop)',
          servings: 2,
          timeMinutes: 30,
          ingredientsUsed: haveIngredients.slice(0, 8).map(n => ({ name: n, quantity: 'as available' })),
          extraIngredientsNeeded: [
            { name: 'lime', quantity: '1', substitutes: ['lemon','tamarind'] },
            { name: 'fresh herbs', quantity: '2 tbsp', substitutes: ['mint','cilantro','parsley'] }
          ],
          steps: [
            { step: 1, instruction: 'Season protein and/or legumes with spices; add lime zest/juice.', method: 'marinate' },
            { step: 2, instruction: 'Sauté onion/garlic until lightly browned.', method: 'stovetop' },
            { step: 3, instruction: 'Add tomatoes/puree, simmer 3–4 min.', method: 'stovetop' },
            { step: 4, instruction: 'Add main ingredients; cook through. Adjust salt, lime, and heat.', method: 'stovetop' },
            { step: 5, instruction: 'Serve with rice or greens; garnish herbs.', method: 'serve' }
          ],
          tips: ['Use lactose-free yogurt if intolerant.', 'Keep heat moderate to prevent splitting.'],
          approxCaloriesPerServing: 520,
          whyThisFitsMood: 'Creamy-tangy and gently spicy for comforting, uplifting flavors.',
          safetyChecks: ['Avoid allergens/restricted items from user profile.']
        };
      }
    }

    res.json({ success: true, userId, result: parsed });
  } catch (error) {
    console.error('Error in /mood/chef:', error);
    res.status(500).json({ error: 'Failed to generate mood-based meal assistance' });
  }
});

// Helper functions for correlation analysis
async function performQuickCorrelationAnalysis(userId) {
  // Quick analysis for immediate feedback
  const recentMood = await getAll(
    `SELECT * FROM enhanced_mood_tracking 
     WHERE user_id = ? AND date >= date('now', '-7 days')
     ORDER BY date DESC`,
    [userId]
  );

  if (recentMood.length < 3) return null;

  const avgMood = recentMood.reduce((sum, entry) => sum + entry.mood_score, 0) / recentMood.length;
  const avgEnergy = recentMood.reduce((sum, entry) => sum + entry.energy_level, 0) / recentMood.length;

  if (avgMood < 6 || avgEnergy < 6) {
    return {
      type: 'low_mood_energy',
      message: 'Your mood and energy levels have been below average this week',
      suggestion: 'Consider reviewing your nutrition and sleep patterns',
      confidence: 0.7
    };
  }

  return null;
}

async function performComprehensiveAnalysis({ moodData, nutritionData, micronutrientData, focusAreas, analysisPeriod, includeOptions }) {
  const analysis = {
    overallConfidence: 0,
    significantPatterns: [],
    correlations: {},
    insights: [],
    timeBasedPatterns: {},
    nutritionCorrelations: {},
    exerciseCorrelations: {},
    sleepCorrelations: {}
  };

  // Analyze mood trends over time
  analysis.timeBasedPatterns = analyzeTimeBasedPatterns(moodData);

  // Analyze nutrition correlations if data available
  if (includeOptions.includeNutrition && nutritionData.length > 0) {
    analysis.nutritionCorrelations = analyzeNutritionCorrelations(moodData, nutritionData, micronutrientData);
  }

  // Analyze exercise correlations
  if (includeOptions.includeExercise) {
    analysis.exerciseCorrelations = analyzeExerciseCorrelations(moodData);
  }

  // Analyze sleep patterns
  analysis.sleepCorrelations = analyzeSleepCorrelations(moodData);

  // Identify significant patterns
  analysis.significantPatterns = identifySignificantPatterns(analysis);

  // Calculate overall confidence
  analysis.overallConfidence = calculateAnalysisConfidence(analysis, moodData.length);

  return analysis;
}

function analyzeTimeBasedPatterns(moodData) {
  const patterns = {
    weeklyPatterns: {},
    dailyPatterns: {},
    timeOfDayPatterns: {}
  };

  // Group by day of week
  const dayGroups = {};
  moodData.forEach(entry => {
    const dayOfWeek = new Date(entry.date).getDay();
    const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];
    
    if (!dayGroups[dayName]) dayGroups[dayName] = [];
    dayGroups[dayName].push(entry);
  });

  // Calculate averages for each day
  Object.keys(dayGroups).forEach(day => {
    const entries = dayGroups[day];
    patterns.weeklyPatterns[day] = {
      avgMood: entries.reduce((sum, e) => sum + e.mood_score, 0) / entries.length,
      avgEnergy: entries.reduce((sum, e) => sum + e.energy_level, 0) / entries.length,
      avgStress: entries.reduce((sum, e) => sum + e.stress_level, 0) / entries.length,
      count: entries.length
    };
  });

  // Group by time of day
  const timeGroups = { morning: [], afternoon: [], evening: [] };
  moodData.forEach(entry => {
    const hour = parseInt(entry.time_of_day.split(':')[0]);
    if (hour < 12) timeGroups.morning.push(entry);
    else if (hour < 18) timeGroups.afternoon.push(entry);
    else timeGroups.evening.push(entry);
  });

  // Calculate time-based patterns
  Object.keys(timeGroups).forEach(timeOfDay => {
    const entries = timeGroups[timeOfDay];
    if (entries.length > 0) {
      patterns.timeOfDayPatterns[timeOfDay] = {
        avgMood: entries.reduce((sum, e) => sum + e.mood_score, 0) / entries.length,
        avgEnergy: entries.reduce((sum, e) => sum + e.energy_level, 0) / entries.length,
        avgProductivity: entries.reduce((sum, e) => sum + e.productivity_score, 0) / entries.length,
        count: entries.length
      };
    }
  });

  return patterns;
}

function analyzeNutritionCorrelations(moodData, nutritionData, micronutrientData) {
  const correlations = {
    macroCorrelations: {},
    micronutrientCorrelations: {},
    mealTimingCorrelations: {},
    sugarImpact: {},
    proteinImpact: {}
  };

  // Create daily nutrition summaries
  const dailyNutrition = {};
  nutritionData.forEach(meal => {
    const date = meal.created_at.split('T')[0];
    if (!dailyNutrition[date]) {
      dailyNutrition[date] = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, meals: [] };
    }
    
    dailyNutrition[date].calories += meal.calories || 0;
    dailyNutrition[date].protein += meal.protein || 0;
    dailyNutrition[date].carbs += meal.carbs || 0;
    dailyNutrition[date].fat += meal.fat || 0;
    dailyNutrition[date].sugar += meal.sugar || 0;
    dailyNutrition[date].meals.push(meal);
  });

  // Match mood data with nutrition data
  const matchedData = [];
  moodData.forEach(mood => {
    const nutrition = dailyNutrition[mood.date];
    if (nutrition) {
      matchedData.push({ mood, nutrition });
    }
  });

  if (matchedData.length >= 5) {
    // Calculate macro correlations
    correlations.macroCorrelations = {
      protein: calculateCorrelation(matchedData, 'nutrition.protein', 'mood.energy_level'),
      carbs: calculateCorrelation(matchedData, 'nutrition.carbs', 'mood.mood_score'),
      sugar: calculateCorrelation(matchedData, 'nutrition.sugar', 'mood.mood_score'),
      calories: calculateCorrelation(matchedData, 'nutrition.calories', 'mood.energy_level')
    };

    // Analyze sugar impact specifically
    correlations.sugarImpact = analyzeSugarImpact(matchedData);
  }

  return correlations;
}

function analyzeExerciseCorrelations(moodData) {
  const exerciseData = moodData.filter(entry => entry.exercise_completed !== null);
  
  if (exerciseData.length < 5) {
    return { insufficient_data: true, message: 'Need more exercise data for correlation analysis' };
  }

  const exerciseDays = exerciseData.filter(entry => entry.exercise_completed === 1);
  const nonExerciseDays = exerciseData.filter(entry => entry.exercise_completed === 0);

  const correlations = {
    moodImprovement: 0,
    energyImprovement: 0,
    stressReduction: 0,
    sleepImprovement: 0
  };

  if (exerciseDays.length > 0 && nonExerciseDays.length > 0) {
    const exerciseAvg = {
      mood: exerciseDays.reduce((sum, e) => sum + e.mood_score, 0) / exerciseDays.length,
      energy: exerciseDays.reduce((sum, e) => sum + e.energy_level, 0) / exerciseDays.length,
      stress: exerciseDays.reduce((sum, e) => sum + e.stress_level, 0) / exerciseDays.length,
      sleep: exerciseDays.reduce((sum, e) => sum + (e.sleep_quality || 0), 0) / exerciseDays.length
    };

    const noExerciseAvg = {
      mood: nonExerciseDays.reduce((sum, e) => sum + e.mood_score, 0) / nonExerciseDays.length,
      energy: nonExerciseDays.reduce((sum, e) => sum + e.energy_level, 0) / nonExerciseDays.length,
      stress: nonExerciseDays.reduce((sum, e) => sum + e.stress_level, 0) / nonExerciseDays.length,
      sleep: nonExerciseDays.reduce((sum, e) => sum + (e.sleep_quality || 0), 0) / nonExerciseDays.length
    };

    correlations.moodImprovement = exerciseAvg.mood - noExerciseAvg.mood;
    correlations.energyImprovement = exerciseAvg.energy - noExerciseAvg.energy;
    correlations.stressReduction = noExerciseAvg.stress - exerciseAvg.stress; // Lower stress is better
    correlations.sleepImprovement = exerciseAvg.sleep - noExerciseAvg.sleep;
  }

  return correlations;
}

function analyzeSleepCorrelations(moodData) {
  const sleepData = moodData.filter(entry => entry.sleep_quality && entry.sleep_quality > 0);
  
  if (sleepData.length < 5) {
    return { insufficient_data: true };
  }

  return {
    sleepMoodCorrelation: calculateSimpleCorrelation(sleepData, 'sleep_quality', 'mood_score'),
    sleepEnergyCorrelation: calculateSimpleCorrelation(sleepData, 'sleep_quality', 'energy_level'),
    sleepProductivityCorrelation: calculateSimpleCorrelation(sleepData, 'sleep_quality', 'productivity_score'),
    averageSleepQuality: sleepData.reduce((sum, e) => sum + e.sleep_quality, 0) / sleepData.length
  };
}

function calculateSimpleCorrelation(data, field1, field2) {
  if (data.length < 3) return 0;

  const values1 = data.map(item => item[field1]);
  const values2 = data.map(item => item[field2]);

  const mean1 = values1.reduce((sum, val) => sum + val, 0) / values1.length;
  const mean2 = values2.reduce((sum, val) => sum + val, 0) / values2.length;

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < values1.length; i++) {
    const diff1 = values1[i] - mean1;
    const diff2 = values2[i] - mean2;
    
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(denominator1 * denominator2);
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateCorrelation(data, path1, path2) {
  // Helper function to get nested property value
  const getValue = (obj, path) => {
    return path.split('.').reduce((current, key) => current && current[key], obj);
  };

  const values1 = data.map(item => getValue(item, path1)).filter(val => val !== undefined);
  const values2 = data.map(item => getValue(item, path2)).filter(val => val !== undefined);

  if (values1.length !== values2.length || values1.length < 3) return 0;

  return calculateSimpleCorrelation(
    values1.map((val1, index) => ({ [path1.split('.').pop()]: val1, [path2.split('.').pop()]: values2[index] })),
    path1.split('.').pop(),
    path2.split('.').pop()
  );
}

function analyzeSugarImpact(matchedData) {
  // Group by sugar intake levels
  const lowSugar = matchedData.filter(d => d.nutrition.sugar < 25);
  const mediumSugar = matchedData.filter(d => d.nutrition.sugar >= 25 && d.nutrition.sugar < 50);
  const highSugar = matchedData.filter(d => d.nutrition.sugar >= 50);

  const impact = {
    lowSugarMood: lowSugar.length > 0 ? lowSugar.reduce((sum, d) => sum + d.mood.mood_score, 0) / lowSugar.length : 0,
    mediumSugarMood: mediumSugar.length > 0 ? mediumSugar.reduce((sum, d) => sum + d.mood.mood_score, 0) / mediumSugar.length : 0,
    highSugarMood: highSugar.length > 0 ? highSugar.reduce((sum, d) => sum + d.mood.mood_score, 0) / highSugar.length : 0,
    pattern: 'unknown'
  };

  // Determine pattern
  if (impact.lowSugarMood > impact.highSugarMood) {
    impact.pattern = 'negative_correlation';
    impact.description = 'Higher sugar intake appears to negatively affect mood';
  } else if (impact.highSugarMood > impact.lowSugarMood) {
    impact.pattern = 'positive_correlation';
    impact.description = 'No clear negative impact of sugar on mood detected';
  }

  return impact;
}

function identifySignificantPatterns(analysis) {
  const patterns = [];

  // Time-based patterns
  if (analysis.timeBasedPatterns.weeklyPatterns) {
    const weeklyAvgs = Object.values(analysis.timeBasedPatterns.weeklyPatterns);
    const moodRange = Math.max(...weeklyAvgs.map(w => w.avgMood)) - Math.min(...weeklyAvgs.map(w => w.avgMood));
    
    if (moodRange > 2) {
      patterns.push({
        type: 'weekly_mood_variation',
        significance: 'high',
        description: 'Significant mood variations across different days of the week',
        confidence: 0.8
      });
    }
  }

  // Exercise patterns
  if (analysis.exerciseCorrelations && !analysis.exerciseCorrelations.insufficient_data) {
    if (analysis.exerciseCorrelations.moodImprovement > 1) {
      patterns.push({
        type: 'exercise_mood_boost',
        significance: 'high',
        description: 'Exercise consistently improves mood scores',
        confidence: 0.85
      });
    }
  }

  // Sleep patterns
  if (analysis.sleepCorrelations && !analysis.sleepCorrelations.insufficient_data) {
    if (analysis.sleepCorrelations.sleepMoodCorrelation > 0.5) {
      patterns.push({
        type: 'sleep_mood_correlation',
        significance: 'medium',
        description: 'Sleep quality strongly correlates with mood',
        confidence: 0.7
      });
    }
  }

  // Nutrition patterns
  if (analysis.nutritionCorrelations.sugarImpact && analysis.nutritionCorrelations.sugarImpact.pattern === 'negative_correlation') {
    patterns.push({
      type: 'sugar_mood_impact',
      significance: 'high',
      description: 'High sugar intake appears to negatively affect mood',
      confidence: 0.75
    });
  }

  return patterns;
}

function calculateAnalysisConfidence(analysis, dataPoints) {
  let confidence = 0.3; // Base confidence
  
  // Data quantity boost
  if (dataPoints >= 10) confidence += 0.2;
  if (dataPoints >= 20) confidence += 0.2;
  
  // Pattern strength boost
  if (analysis.significantPatterns.length > 0) confidence += 0.2;
  if (analysis.significantPatterns.length > 2) confidence += 0.1;
  
  // Multiple data source boost
  if (analysis.nutritionCorrelations && Object.keys(analysis.nutritionCorrelations).length > 0) confidence += 0.1;
  if (analysis.exerciseCorrelations && !analysis.exerciseCorrelations.insufficient_data) confidence += 0.1;
  
  return Math.min(confidence, 0.95);
}

function generatePersonalizedRecommendations(analysis) {
  const recommendations = [];

  // Exercise recommendations
  if (analysis.exerciseCorrelations && analysis.exerciseCorrelations.moodImprovement > 0.5) {
    recommendations.push({
      type: 'exercise',
      priority: 'high',
      title: 'Maintain Regular Exercise',
      description: 'Your data shows exercise significantly improves your mood and energy',
      action: 'Continue exercising regularly, especially on days when you feel low',
      expectedImpact: `+${Math.round(analysis.exerciseCorrelations.moodImprovement * 10)/10} mood points`
    });
  }

  // Sleep recommendations
  if (analysis.sleepCorrelations && analysis.sleepCorrelations.sleepMoodCorrelation > 0.4) {
    recommendations.push({
      type: 'sleep',
      priority: 'high',
      title: 'Prioritize Sleep Quality',
      description: 'Sleep quality strongly correlates with your mood and energy levels',
      action: 'Aim for 7-9 hours of quality sleep, maintain consistent sleep schedule',
      expectedImpact: 'Improved mood stability and energy'
    });
  }

  // Sugar recommendations
  if (analysis.nutritionCorrelations.sugarImpact && analysis.nutritionCorrelations.sugarImpact.pattern === 'negative_correlation') {
    recommendations.push({
      type: 'nutrition',
      priority: 'medium',
      title: 'Reduce Sugar Intake',
      description: 'High sugar intake appears to negatively affect your mood',
      action: 'Keep daily sugar intake below 25g, choose complex carbohydrates',
      expectedImpact: 'More stable mood throughout the day'
    });
  }

  // Time-based recommendations
  const weeklyPatterns = analysis.timeBasedPatterns.weeklyPatterns;
  if (weeklyPatterns) {
    const lowestMoodDay = Object.keys(weeklyPatterns).reduce((lowest, day) => 
      weeklyPatterns[day].avgMood < weeklyPatterns[lowest].avgMood ? day : lowest
    );
    
    if (weeklyPatterns[lowestMoodDay].avgMood < 6) {
      recommendations.push({
        type: 'timing',
        priority: 'medium',
        title: `Focus on ${lowestMoodDay}s`,
        description: `Your mood tends to be lowest on ${lowestMoodDay}s`,
        action: `Plan mood-boosting activities for ${lowestMoodDay}s: exercise, social time, or favorite meals`,
        expectedImpact: 'Better mood consistency throughout the week'
      });
    }
  }

  return recommendations;
}

function generateInsights(analysis) {
  const insights = [];

  if (analysis.significantPatterns.length > 0) {
    insights.push(`Found ${analysis.significantPatterns.length} significant patterns in your mood data`);
  }

  if (analysis.exerciseCorrelations && analysis.exerciseCorrelations.moodImprovement > 1) {
    insights.push(`Exercise improves your mood by an average of ${Math.round(analysis.exerciseCorrelations.moodImprovement * 10)/10} points`);
  }

  if (analysis.timeBasedPatterns.timeOfDayPatterns) {
    const patterns = analysis.timeBasedPatterns.timeOfDayPatterns;
    const bestTime = Object.keys(patterns).reduce((best, time) => 
      patterns[time].avgMood > patterns[best].avgMood ? time : best
    );
    insights.push(`Your mood is typically best in the ${bestTime}`);
  }

  return insights;
}

function generateNextSteps(analysis) {
  const steps = [];

  if (analysis.overallConfidence < 0.7) {
    steps.push('Continue logging mood data daily to improve analysis accuracy');
  }

  if (!analysis.nutritionCorrelations || Object.keys(analysis.nutritionCorrelations).length === 0) {
    steps.push('Track your meals alongside mood for nutrition-mood correlations');
  }

  if (analysis.significantPatterns.some(p => p.type === 'weekly_mood_variation')) {
    steps.push('Pay attention to mood patterns on specific days of the week');
  }

  steps.push('Review and act on personalized recommendations');
  steps.push('Continue monitoring for 2-4 weeks to validate patterns');

  return steps;
}

// Additional helper functions for mood tracking
function calculateTrends(moodHistory, metric) {
  if (moodHistory.length < 7) return { insufficient_data: true };

  const values = moodHistory.map(entry => entry[metric]).filter(val => val !== null);
  const firstHalf = values.slice(0, Math.floor(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;

  const trend = secondAvg - firstAvg;
  const trendPercentage = (trend / firstAvg) * 100;

  return {
    trend: trend > 0.5 ? 'improving' : trend < -0.5 ? 'declining' : 'stable',
    trendValue: Math.round(trend * 100) / 100,
    trendPercentage: Math.round(trendPercentage * 100) / 100,
    firstPeriodAvg: Math.round(firstAvg * 100) / 100,
    secondPeriodAvg: Math.round(secondAvg * 100) / 100
  };
}

function identifyPatterns(moodHistory) {
  const patterns = {
    dayOfWeekPatterns: {},
    timeOfDayPatterns: {},
    streaks: {}
  };

  // Day of week analysis
  const dayGroups = {};
  moodHistory.forEach(entry => {
    const date = new Date(entry.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (!dayGroups[dayName]) dayGroups[dayName] = [];
    dayGroups[dayName].push(entry);
  });

  Object.keys(dayGroups).forEach(day => {
    const entries = dayGroups[day];
    patterns.dayOfWeekPatterns[day] = {
      avgMood: entries.reduce((sum, e) => sum + e.mood_score, 0) / entries.length,
      count: entries.length
    };
  });

  return patterns;
}

function calculateAverages(moodHistory) {
  if (moodHistory.length === 0) return {};

  return {
    mood: moodHistory.reduce((sum, e) => sum + e.mood_score, 0) / moodHistory.length,
    energy: moodHistory.reduce((sum, e) => sum + e.energy_level, 0) / moodHistory.length,
    productivity: moodHistory.reduce((sum, e) => sum + e.productivity_score, 0) / moodHistory.length,
    stress: moodHistory.reduce((sum, e) => sum + e.stress_level, 0) / moodHistory.length,
    sleep: moodHistory.filter(e => e.sleep_quality > 0).reduce((sum, e) => sum + e.sleep_quality, 0) / 
           Math.max(1, moodHistory.filter(e => e.sleep_quality > 0).length)
  };
}

function identifyBasicCorrelations(moodHistory) {
  return {
    sleepMoodCorrelation: calculateSimpleCorrelation(
      moodHistory.filter(e => e.sleep_quality > 0), 
      'sleep_quality', 
      'mood_score'
    ),
    exerciseMoodCorrelation: moodHistory.filter(e => e.exercise_completed !== null).length > 5 ?
      'Exercise data available for correlation' : 'Insufficient exercise data'
  };
}

function generateTrendRecommendations(trends, patterns) {
  const recommendations = [];

  if (trends.trend === 'declining') {
    recommendations.push({
      type: 'intervention',
      message: 'Your mood trend is declining. Consider implementing mood-boosting activities.',
      priority: 'high'
    });
  }

  const dayPatterns = patterns.dayOfWeekPatterns;
  if (dayPatterns) {
    const lowestDay = Object.keys(dayPatterns).reduce((lowest, day) => 
      dayPatterns[day].avgMood < dayPatterns[lowest].avgMood ? day : lowest
    );
    
    recommendations.push({
      type: 'pattern',
      message: `Your mood is typically lowest on ${lowestDay}s. Plan supportive activities.`,
      priority: 'medium'
    });
  }

  return recommendations;
}

function analyzeForAlerts(recentMood) {
  const alerts = [];
  const interventions = [];

  // Check for consistently low mood
  const lowMoodDays = recentMood.filter(entry => entry.mood_score <= 4).length;
  if (lowMoodDays >= 2) {
    alerts.push({
      type: 'low_mood',
      severity: 'high',
      message: 'Consistently low mood detected over multiple days',
      description: 'Your mood has been below 4/10 for multiple days',
      recommendation: 'Consider reaching out to a healthcare provider'
    });

    interventions.push({
      type: 'immediate',
      title: 'Mood Support',
      actions: [
        'Practice deep breathing or meditation',
        'Go for a walk outside',
        'Connect with a friend or family member',
        'Consider professional support if feelings persist'
      ]
    });
  }

  // Check for high stress levels
  const highStressDays = recentMood.filter(entry => entry.stress_level >= 8).length;
  if (highStressDays >= 2) {
    alerts.push({
      type: 'high_stress',
      severity: 'medium',
      message: 'Elevated stress levels detected',
      description: 'Stress levels have been consistently high',
      recommendation: 'Implement stress-reduction techniques'
    });

    interventions.push({
      type: 'stress_management',
      title: 'Stress Reduction',
      actions: [
        'Try progressive muscle relaxation',
        'Limit caffeine intake',
        'Ensure adequate sleep',
        'Consider mindfulness practices'
      ]
    });
  }

  return { alerts, interventions };
}

async function getNutritionBasedAlerts(userId) {
  const alerts = [];

  // Check for micronutrient deficiency alerts
  const microAlerts = await getAll(
    'SELECT * FROM micronutrient_alerts WHERE user_id = ? AND acknowledged = 0',
    [userId]
  );

  microAlerts.forEach(alert => {
    alerts.push({
      type: 'micronutrient_deficiency',
      severity: alert.deficiency_level === 'severe' ? 'high' : 'medium',
      message: alert.alert_message,
      nutrient: alert.nutrient_name,
      recommendation: `Consider foods rich in ${alert.nutrient_name}`
    });
  });

  return alerts;
}

function calculatePriorityLevel(alerts) {
  if (alerts.some(a => a.severity === 'high')) return 'high';
  if (alerts.some(a => a.severity === 'medium')) return 'medium';
  return 'low';
}

function getSupportResources(alerts) {
  const resources = [];

  if (alerts.some(a => a.type === 'low_mood')) {
    resources.push({
      type: 'mental_health',
      title: 'Mental Health Support',
      resources: [
        'National Suicide Prevention Lifeline: 988',
        'Crisis Text Line: Text HOME to 741741',
        'Psychology Today Therapist Finder',
        'Your healthcare provider'
      ]
    });
  }

  if (alerts.some(a => a.type === 'micronutrient_deficiency')) {
    resources.push({
      type: 'nutrition',
      title: 'Nutrition Support',
      resources: [
        'Registered Dietitian consultation',
        'Nutritional supplement guidance',
        'Meal planning resources'
      ]
    });
  }

  return resources;
}

module.exports = router; 