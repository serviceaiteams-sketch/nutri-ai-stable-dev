const express = require('express');
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get health warnings for user
router.get('/health-warnings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    // Get user's nutrition data for the specified period
    const nutritionData = await getRow(
      `SELECT 
        AVG(total_calories) as avg_calories,
        AVG(total_protein) as avg_protein,
        AVG(total_carbs) as avg_carbs,
        AVG(total_fat) as avg_fat,
        AVG(total_sugar) as avg_sugar,
        AVG(total_sodium) as avg_sodium,
        AVG(total_fiber) as avg_fiber,
        COUNT(*) as days_tracked
       FROM meals 
       WHERE user_id = ? AND created_at >= DATE('now', '-${days} days')`,
      [userId]
    );

    // Get user profile for personalized warnings
    const user = await getRow(
      'SELECT age, gender, weight, health_goal, medical_conditions FROM users WHERE id = ?',
      [userId]
    );

    // Generate health warnings
    const warnings = generateHealthWarnings(nutritionData, user);

    // Store warnings in database
    for (const warning of warnings) {
      await runQuery(
        `INSERT INTO health_warnings (user_id, warning_type, title, message, severity) 
         VALUES (?, ?, ?, ?, ?)`,
        [userId, warning.type, warning.title, warning.message, warning.severity]
      );
    }

    res.json({
      nutrition_data: nutritionData,
      warnings,
      period_days: days
    });

  } catch (error) {
    console.error('Get health warnings error:', error);
    res.status(500).json({ error: 'Failed to get health warnings' });
  }
});

// Get dietary recommendations
router.get('/dietary-recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    // Get user's recent nutrition data
    const recentNutrition = await getRow(
      `SELECT 
        AVG(total_calories) as avg_calories,
        AVG(total_protein) as avg_protein,
        AVG(total_carbs) as avg_carbs,
        AVG(total_fat) as avg_fat,
        AVG(total_sugar) as avg_sugar,
        AVG(total_sodium) as avg_sodium,
        AVG(total_fiber) as avg_fiber
       FROM meals 
       WHERE user_id = ? AND created_at >= DATE('now', '-7 days')`,
      [userId]
    );

    // Get user profile
    const user = await getRow(
      'SELECT age, gender, weight, health_goal, dietary_preferences, allergies FROM users WHERE id = ?',
      [userId]
    );

    // Get nutrition goals
    const goals = await getRow(
      'SELECT * FROM nutrition_goals WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    // Generate dietary recommendations
    const recommendations = generateDietaryRecommendations(recentNutrition, user, goals);

    res.json({
      recent_nutrition: recentNutrition,
      user_profile: user,
      goals,
      recommendations
    });

  } catch (error) {
    console.error('Get dietary recommendations error:', error);
    res.status(500).json({ error: 'Failed to get dietary recommendations' });
  }
});

// Set nutrition goals
router.post('/goals', authenticateToken, async (req, res) => {
  try {
    const {
      daily_calories,
      daily_protein,
      daily_carbs,
      daily_fat,
      daily_sugar,
      daily_sodium,
      daily_fiber
    } = req.body;

    const userId = req.user.id;

    const result = await runQuery(
      `INSERT INTO nutrition_goals (user_id, daily_calories, daily_protein, daily_carbs, 
       daily_fat, daily_sugar, daily_sodium, daily_fiber) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, daily_calories, daily_protein, daily_carbs, daily_fat, 
       daily_sugar, daily_sodium, daily_fiber]
    );

    res.status(201).json({
      message: 'Nutrition goals set successfully',
      goal_id: result.id
    });

  } catch (error) {
    console.error('Set nutrition goals error:', error);
    res.status(500).json({ error: 'Failed to set nutrition goals' });
  }
});

// Get nutrition goals
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const goals = await getRow(
      'SELECT * FROM nutrition_goals WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );

    res.json({ goals });

  } catch (error) {
    console.error('Get nutrition goals error:', error);
    res.status(500).json({ error: 'Failed to get nutrition goals' });
  }
});

// Generate health warnings based on nutrition data
function generateHealthWarnings(nutritionData, user) {
  const warnings = [];
  const { avg_calories, avg_protein, avg_carbs, avg_fat, avg_sugar, avg_sodium, avg_fiber } = nutritionData;
  const { age, gender, weight, health_goal, medical_conditions } = user;

  // High sugar warning
  if (avg_sugar > 50) {
    warnings.push({
      type: 'high_sugar',
      title: 'High Sugar Intake',
      message: `Your average daily sugar intake is ${Math.round(avg_sugar)}g, which is above the recommended 50g. High sugar consumption can increase the risk of diabetes and other health issues. Consider reducing sugary drinks and snacks.`,
      severity: 'high'
    });
  }

  // High sodium warning
  if (avg_sodium > 2300) {
    warnings.push({
      type: 'high_sodium',
      title: 'High Sodium Intake',
      message: `Your average daily sodium intake is ${Math.round(avg_sodium)}mg, which is above the recommended 2300mg. High sodium can increase blood pressure. Try reducing processed foods and adding less salt to meals.`,
      severity: 'medium'
    });
  }

  // Low fiber warning
  if (avg_fiber < 25) {
    warnings.push({
      type: 'low_fiber',
      title: 'Low Fiber Intake',
      message: `Your average daily fiber intake is ${Math.round(avg_fiber)}g, which is below the recommended 25g. Fiber is important for digestive health. Add more fruits, vegetables, and whole grains to your diet.`,
      severity: 'medium'
    });
  }

  // High calorie warning
  if (avg_calories > 2500) {
    warnings.push({
      type: 'high_calories',
      title: 'High Calorie Intake',
      message: `Your average daily calorie intake is ${Math.round(avg_calories)} calories, which is quite high. This may lead to weight gain. Consider reducing portion sizes or choosing lower-calorie alternatives.`,
      severity: 'medium'
    });
  }

  // Low protein warning
  if (avg_protein < 50) {
    warnings.push({
      type: 'low_protein',
      title: 'Low Protein Intake',
      message: `Your average daily protein intake is ${Math.round(avg_protein)}g, which is below the recommended 50g. Protein is essential for muscle maintenance and overall health. Consider adding more lean meats, fish, or plant-based proteins.`,
      severity: 'medium'
    });
  }

  // Personalized warnings based on medical conditions
  if (medical_conditions && medical_conditions.includes('diabetes')) {
    if (avg_sugar > 30) {
      warnings.push({
        type: 'diabetes_sugar',
        title: 'Diabetes - Sugar Management',
        message: 'As someone with diabetes, it\'s important to monitor your sugar intake. Your current intake may be affecting your blood sugar levels. Consult with your healthcare provider about your diet.',
        severity: 'high'
      });
    }
  }

  if (medical_conditions && medical_conditions.includes('hypertension')) {
    if (avg_sodium > 1500) {
      warnings.push({
        type: 'hypertension_sodium',
        title: 'Hypertension - Sodium Management',
        message: 'As someone with hypertension, it\'s crucial to limit sodium intake. Your current intake may be affecting your blood pressure. Consider a low-sodium diet and consult your healthcare provider.',
        severity: 'high'
      });
    }
  }

  return warnings;
}

// Generate dietary recommendations
function generateDietaryRecommendations(nutritionData, user, goals) {
  const recommendations = [];
  const { avg_calories, avg_protein, avg_carbs, avg_fat, avg_sugar, avg_sodium, avg_fiber } = nutritionData;
  const { health_goal, dietary_preferences, allergies } = user;

  // High sugar - recommend alternatives
  if (avg_sugar > 40) {
    recommendations.push({
      type: 'sugar_reduction',
      title: 'Reduce Sugar Intake',
      suggestions: [
        'Replace sugary drinks with water or herbal tea',
        'Choose fresh fruits instead of desserts',
        'Read food labels and avoid products with added sugars',
        'Use natural sweeteners like honey or maple syrup in moderation'
      ],
      priority: 'high'
    });
  }

  // Low protein - recommend protein sources
  if (avg_protein < 60) {
    const proteinSources = dietary_preferences === 'vegetarian' ? [
      'Add more legumes (beans, lentils, chickpeas)',
      'Include quinoa and other whole grains',
      'Try tofu, tempeh, or seitan',
      'Add nuts and seeds to meals'
    ] : [
      'Include lean meats like chicken breast or turkey',
      'Add fish like salmon or tuna',
      'Include eggs and dairy products',
      'Add legumes and nuts for variety'
    ];

    recommendations.push({
      type: 'protein_increase',
      title: 'Increase Protein Intake',
      suggestions: proteinSources,
      priority: 'medium'
    });
  }

  // Low fiber - recommend fiber sources
  if (avg_fiber < 25) {
    recommendations.push({
      type: 'fiber_increase',
      title: 'Increase Fiber Intake',
      suggestions: [
        'Add more vegetables to every meal',
        'Choose whole grains over refined grains',
        'Include fruits with skin (apples, pears)',
        'Add nuts, seeds, and legumes to your diet',
        'Try chia seeds or flaxseeds'
      ],
      priority: 'medium'
    });
  }

  // High sodium - recommend low-sodium alternatives
  if (avg_sodium > 2000) {
    recommendations.push({
      type: 'sodium_reduction',
      title: 'Reduce Sodium Intake',
      suggestions: [
        'Cook meals at home instead of eating out',
        'Use herbs and spices instead of salt',
        'Choose fresh foods over processed ones',
        'Read labels and choose low-sodium options',
        'Rinse canned beans and vegetables'
      ],
      priority: 'high'
    });
  }

  // Weight loss recommendations
  if (health_goal === 'weight_loss' && avg_calories > 2000) {
    recommendations.push({
      type: 'calorie_reduction',
      title: 'Calorie Management for Weight Loss',
      suggestions: [
        'Reduce portion sizes gradually',
        'Fill half your plate with vegetables',
        'Choose lean protein sources',
        'Limit added fats and oils',
        'Drink water before meals to feel fuller'
      ],
      priority: 'high'
    });
  }

  // Muscle gain recommendations
  if (health_goal === 'muscle_gain' && avg_protein < 80) {
    recommendations.push({
      type: 'muscle_building',
      title: 'Protein for Muscle Building',
      suggestions: [
        'Aim for 1.2-1.6g protein per kg of body weight',
        'Distribute protein intake throughout the day',
        'Include protein in every meal and snack',
        'Consider protein supplements if needed',
        'Combine protein with strength training'
      ],
      priority: 'medium'
    });
  }

  // Allergy considerations
  if (allergies) {
    const allergyList = allergies.split(',').map(a => a.trim());
    recommendations.push({
      type: 'allergy_management',
      title: 'Allergy-Safe Alternatives',
      suggestions: allergyList.map(allergy => `Find ${allergy}-free alternatives for your favorite foods`),
      priority: 'high'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

module.exports = router; 