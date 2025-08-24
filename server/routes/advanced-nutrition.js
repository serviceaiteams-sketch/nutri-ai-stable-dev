const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll, getRow } = require('../config/database');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Get micronutrient analysis for a specific period
router.get('/micronutrients/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'weekly' } = req.query;

    // Get user's recent nutrition data
    const recentMeals = await getAll(
      'SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    // Get user's health conditions
    const healthConditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // Create AI analysis prompt
    const prompt = `As a clinical nutritionist and micronutrient expert, analyze this user's nutrition data and provide mind-blowing, personalized insights:

User's Health Conditions:
${healthConditions.map(c => `- ${c.condition_name} (${c.severity || 'mild'})`).join('\n') || 'No specific conditions reported'}

Recent Nutrition Data (Last 20 meals):
${recentMeals.map(m => `- ${m.food_name}: ${m.calories} cal, Protein: ${m.protein}g, Carbs: ${m.carbs}g, Fat: ${m.fat}g`).join('\n') || 'No recent meals recorded'}

Analysis Period: ${period}

Provide a mind-blowing, comprehensive analysis in this format:

**🎯 MICRONUTRIENT INSIGHTS**:
- [Specific micronutrient findings with percentages and impact]
- [Hidden deficiencies or excesses discovered]
- [Unique patterns that could transform their health]

**🚀 REVOLUTIONARY RECOMMENDATIONS**:
- [Breakthrough food combinations for maximum absorption]
- [Timing strategies for optimal nutrient utilization]
- [Synergistic nutrient pairings they've never heard of]

**💡 GAME-CHANGING DISCOVERIES**:
- [Unexpected connections between their diet and health]
- [Hidden superfoods perfect for their specific needs]
- [Innovative meal timing that could double their energy]

**🔬 SCIENTIFIC BREAKTHROUGHS**:
- [Latest research findings relevant to their situation]
- [Cutting-edge nutrition science they can apply]
- [Emerging trends that could revolutionize their health]

**🎨 PERSONALIZED ACTION PLAN**:
- [Specific foods to add/remove with exact quantities]
- [Meal timing strategies for their lifestyle]
- [Supplement recommendations if needed]

Make this analysis mind-blowing, scientific, and highly actionable. Use specific numbers, percentages, and revolutionary insights that will make them excited about nutrition!`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    const analysis = completion.choices[0].message.content;

    res.json({
      success: true,
      period: period,
      analysis: analysis,
      dataPoints: recentMeals.length,
      healthConditions: healthConditions.length,
      message: 'Mind-blowing micronutrient analysis completed!'
    });

  } catch (error) {
    console.error('Error analyzing micronutrients:', error);
    res.status(500).json({ error: 'Failed to analyze micronutrients' });
  }
});

// Get weekly micronutrient data
router.get('/micronutrients/weekly-data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get weekly nutrition summary
    const weeklyMeals = await getAll(
      'SELECT * FROM meals WHERE user_id = ? AND created_at >= datetime("now", "-7 days") ORDER BY created_at DESC',
      [userId]
    );

    // Calculate weekly totals
    const weeklyTotals = weeklyMeals.reduce((acc, meal) => {
      acc.calories += meal.calories || 0;
      acc.protein += meal.protein || 0;
      acc.carbs += meal.carbs || 0;
      acc.fat += meal.fat || 0;
      acc.fiber += meal.fiber || 0;
      acc.sugar += meal.sugar || 0;
      acc.sodium += meal.sodium || 0;
      return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 });

    // Calculate daily averages
    const dailyAverages = {
      calories: Math.round(weeklyTotals.calories / 7),
      protein: Math.round(weeklyTotals.protein / 7 * 10) / 10,
      carbs: Math.round(weeklyTotals.carbs / 7 * 10) / 10,
      fat: Math.round(weeklyTotals.fat / 7 * 10) / 10,
      fiber: Math.round(weeklyTotals.fiber / 7 * 10) / 10,
      sugar: Math.round(weeklyTotals.sugar / 7 * 10) / 10,
      sodium: Math.round(weeklyTotals.sodium / 7 * 10) / 10
    };

    res.json({
      success: true,
      weeklyData: {
        totalMeals: weeklyMeals.length,
        dailyAverages: dailyAverages,
        weeklyTotals: weeklyTotals,
        trends: weeklyMeals.slice(0, 7).map(meal => ({
          date: meal.created_at,
          calories: meal.calories,
          protein: meal.protein,
          carbs: meal.carbs,
          fat: meal.fat
        }))
      }
    });

  } catch (error) {
    console.error('Error fetching weekly data:', error);
    res.status(500).json({ error: 'Failed to fetch weekly data' });
  }
});

module.exports = router;
