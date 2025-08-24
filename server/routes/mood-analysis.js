const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll } = require('../config/database');

const router = express.Router();

// Test route to verify module loading
router.get('/mood/test', (req, res) => {
  res.json({ message: 'Mood analysis module loaded successfully' });
});

// Initialize OpenAI only when needed
let openai = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    const OpenAI = require('openai');
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openai;
}

// Log mood entry
router.post('/mood/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood, energyLevel, productivity, notes } = req.body;

    if (!mood || !energyLevel || !productivity) {
      return res.status(400).json({ error: 'Mood, energy level, and productivity are required' });
    }

    await runQuery(
      'INSERT INTO mood_entries (user_id, mood_level, energy_level, productivity_level, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, mood, energyLevel, productivity, notes || '', new Date().toISOString()]
    );

    res.json({ message: 'Mood logged successfully' });
  } catch (error) {
    console.error('Error logging mood:', error);
    res.status(500).json({ error: 'Failed to log mood entry' });
  }
});

// Get mood history
router.get('/mood/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    let query = 'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY created_at DESC';
    let params = [userId];

    if (date) {
      query += ' AND DATE(created_at) = ?';
      params.push(date);
    }

    const moodEntries = await getAll(query, params);
    res.json({ moodEntries });
  } catch (error) {
    console.error('Error fetching mood history:', error);
    res.status(500).json({ error: 'Failed to fetch mood history' });
  }
});

// Get mood correlations
router.get('/mood/correlations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const correlations = await getAll(
      'SELECT * FROM mood_correlations WHERE user_id = ? ORDER BY correlation_strength DESC',
      [userId]
    );
    res.json({ correlations });
  } catch (error) {
    console.error('Error fetching mood correlations:', error);
    res.status(500).json({ error: 'Failed to fetch mood correlations' });
  }
});

// AI Chef - Get mood-based food recommendations
router.post('/mood/chef', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { mood, energyLevel, productivity, preferences } = req.body;

    // Get user's recent mood patterns
    const recentMoods = await getAll(
      'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 7',
      [userId]
    );

    // Get user's health conditions for personalized recommendations
    const healthConditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // Get recent nutrition data
    const recentMeals = await getAll(
      'SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );

    const prompt = `As a revolutionary nutritionist, mood expert, and quantum health specialist, provide mind-blowing, breakthrough food recommendations that will transform this user's emotional and physical state:

CURRENT STATE ANALYSIS:
- Mood: ${mood}/10
- Energy Level: ${energyLevel}/10  
- Productivity: ${productivity}/10
- Preferences: ${preferences || 'None specified'}

REVOLUTIONARY MOOD PATTERNS (Last 7 days):
${recentMoods.map(m => `- ${m.mood_level}/10 mood, ${m.energy_level}/10 energy, ${m.productivity_level}/10 productivity`).join('\n') || 'No mood data yet - creating breakthrough baseline'}

HEALTH CONDITIONS (Personalized Approach):
${healthConditions.map(c => `- ${c.condition_name} (${c.severity || 'mild'})`).join('\n') || 'No conditions - optimizing for peak performance'}

RECENT NUTRITION DATA:
${recentMeals.map(m => `- ${m.food_name}: ${m.calories} cal, Protein: ${m.protein}g, Carbs: ${m.carbs}g, Fat: ${m.fat}g`).join('\n') || 'No recent meals - creating revolutionary starting point'}

Provide MIND-BLOWING recommendations in this revolutionary format:

**🚀 QUANTUM MOOD TRANSFORMATION**:
- [Breakthrough food combinations that create instant mood elevation]
- [Synergistic nutrient timing for maximum emotional impact]
- [Revolutionary food-mood connections they've never heard of]

**⚡ ENERGY EXPLOSION PROTOCOL**:
- [Superfood combinations that create sustained energy for 8+ hours]
- [Timing strategies that eliminate afternoon crashes]
- [Metabolic optimization techniques for peak performance]

**🧠 PRODUCTIVITY REVOLUTION**:
- [Cognitive enhancement foods that boost focus by 300%]
- [Brain-optimizing meal sequences for maximum creativity]
- [Neurotransmitter-boosting combinations for genius-level thinking]

**🎯 PERSONALIZED BREAKTHROUGH PLAN**:
- [Exact foods, portions, and timing for their specific state]
- [Revolutionary meal combinations they've never tried]
- [Timing strategies that align with their circadian rhythm]

**💎 HIDDEN SUPERFOOD DISCOVERIES**:
- [Rare superfoods perfect for their current emotional state]
- [Synergistic combinations that multiply benefits exponentially]
- [Local alternatives that rival expensive supplements]

**🔬 QUANTUM NUTRITION SCIENCE**:
- [Latest research on food-mood quantum connections]
- [Breakthrough findings on nutrient timing and absorption]
- [Emerging science that could revolutionize their health]

Make this absolutely mind-blowing! Use specific numbers, percentages, revolutionary timing strategies, and breakthrough insights that will make them excited about the power of food to transform their life!`;

    const completion = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000
    });

    const recommendations = completion.choices[0].message.content;

    // Parse the response to extract structured data
    const aiResult = {
      recommendations: recommendations,
      mood: mood,
      energyLevel: energyLevel,
      productivity: productivity,
      timestamp: new Date().toISOString(),
      revolutionary: true,
      breakthrough: true
    };

    res.json({ 
      success: true,
      aiResult,
      message: '🚀 REVOLUTIONARY mood-based recommendations generated! Your life is about to change!'
    });

  } catch (error) {
    console.error('Error generating revolutionary mood-based recommendations:', error);
    res.status(500).json({ error: 'Failed to generate breakthrough recommendations' });
  }
});

// Get weekly mood analysis
router.get('/mood/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'weekly' } = req.query;

    // Simple query to test
    const moodData = await getAll(
      'SELECT * FROM mood_entries WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    if (moodData.length === 0) {
      return res.json({ 
        analysis: 'No mood data available for analysis',
        period,
        dataPoints: 0
      });
    }

    // Calculate averages
    const avgMood = moodData.reduce((sum, entry) => sum + entry.mood_level, 0) / moodData.length;
    const avgEnergy = moodData.reduce((sum, entry) => sum + entry.energy_level, 0) / moodData.length;
    const avgProductivity = moodData.reduce((sum, entry) => sum + entry.productivity_level, 0) / moodData.length;

    res.json({
      period,
      dataPoints: moodData.length,
      averages: {
        mood: Math.round(avgMood * 10) / 10,
        energy: Math.round(avgEnergy * 10) / 10,
        productivity: Math.round(avgProductivity * 10) / 10
      },
      trends: moodData.slice(0, 5).map(entry => ({
        date: entry.created_at,
        mood: entry.mood_level,
        energy: entry.energy_level,
        productivity: entry.productivity_level
      }))
    });

  } catch (error) {
    console.error('Error analyzing mood data:', error);
    res.status(500).json({ error: 'Failed to analyze mood data' });
  }
});

module.exports = router;
