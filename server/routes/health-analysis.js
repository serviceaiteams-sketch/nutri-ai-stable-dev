const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll } = require('../config/database');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get health conditions for a user
router.get('/conditions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    res.json({ conditions });
  } catch (error) {
    console.error('Error fetching health conditions:', error);
    res.status(500).json({ error: 'Failed to fetch health conditions' });
  }
});

// Save health conditions in bulk
router.post('/conditions/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions } = req.body;
    
    if (!Array.isArray(conditions)) {
      return res.status(400).json({ error: 'Conditions must be an array' });
    }
    
    // Clear existing conditions
    await runQuery('DELETE FROM health_conditions WHERE user_id = ?', [userId]);
    
    // Insert new conditions
    for (const condition of conditions) {
      await runQuery(
        'INSERT INTO health_conditions (user_id, condition_name, severity, diagnosed_date, medications, symptoms, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          userId,
          condition.condition,
          condition.severity || 'mild',
          condition.diagnosedDate || new Date().toISOString(),
          JSON.stringify(condition.medications || []),
          JSON.stringify(condition.symptoms || []),
          new Date().toISOString()
        ]
      );
    }
    
    res.json({ message: 'Health conditions saved successfully' });
  } catch (error) {
    console.error('Error saving health conditions:', error);
    res.status(500).json({ error: 'Failed to save health conditions' });
  }
});

// Get food recommendations based on health conditions
router.post('/conditions/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions } = req.body;
    
    if (!conditions || conditions.length === 0) {
      return res.json({ recommendations: 'No specific conditions to analyze' });
    }
    
    const prompt = `Based on the following health conditions, provide personalized food recommendations:
    
Health Conditions:
${conditions.map(c => `- ${c.condition} (${c.severity || 'mild'})`).join('\n')}

Please provide:
1. Foods to include in their diet
2. Foods to avoid or limit
3. General dietary advice
4. Any specific nutrients to focus on

Format the response as a clear, actionable list.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    });

    const recommendations = completion.choices[0].message.content;
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating food recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Upload health reports
router.post('/upload-reports', authenticateToken, upload.single('reports'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { healthConditions } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Save file info to database
    await runQuery(
      'INSERT INTO health_reports (user_id, filename, file_path, file_type, file_size, uploaded_at, health_conditions) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        userId,
        req.file.originalname,
        req.file.originalname, // Using filename as file_path for now
        req.file.mimetype || 'application/octet-stream',
        req.file.size,
        new Date().toISOString(),
        healthConditions || '[]'
      ]
    );
    
    res.json({ message: 'Health report uploaded successfully' });
  } catch (error) {
    console.error('Error uploading health report:', error);
    res.status(500).json({ error: 'Failed to upload health report' });
  }
});

// Analyze uploaded health reports
router.post('/analyze-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's uploaded health reports
    const reports = await getAll(
      'SELECT * FROM health_reports WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    
    if (reports.length === 0) {
      return res.status(404).json({ error: 'No health reports found for analysis' });
    }
    
    // Get user's health conditions
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );
    
    // Generate AI analysis using OpenAI
    const prompt = `Analyze the following health reports and provide insights:

Health Reports:
${reports.map(r => `- ${r.filename} (${r.file_size} bytes, uploaded: ${r.uploaded_at})`).join('\n')}

User's Health Conditions:
${conditions.map(c => `- ${c.condition_name} (${c.severity || 'mild'})`).join('\n') || 'None specified'}

Please provide:
1. Summary of uploaded reports
2. Key health insights
3. Recommendations for follow-up
4. Any concerning patterns
5. Suggested next steps

Format as a clear, actionable analysis.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    const analysis = completion.choices[0].message.content;
    
    // Update the reports with analysis timestamp
    await runQuery(
      'UPDATE health_reports SET analyzed_at = ?, analysis_result = ? WHERE user_id = ?',
      [new Date().toISOString(), analysis, userId]
    );
    
    res.json({ 
      analysis,
      reportsCount: reports.length,
      conditionsCount: conditions.length,
      message: 'Health reports analyzed successfully'
    });
    
  } catch (error) {
    console.error('Error analyzing health reports:', error);
    res.status(500).json({ error: 'Failed to analyze health reports' });
  }
});

// Generate food recommendations
router.post('/food-recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health conditions
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );
    
    // Get user's recent meals
    const recentMeals = await getAll(
      'SELECT * FROM meals WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [userId]
    );
    
    const prompt = `As a nutritionist, provide personalized food recommendations based on:

User's Health Conditions:
${conditions.map(c => `- ${c.condition_name} (${c.severity || 'mild'})`).join('\n') || 'None specified'}

Recent Meals:
${recentMeals.map(m => `- ${m.food_name} (${m.calories} cal)`).join('\n') || 'No recent meals'}

Please provide:
1. Recommended foods to include
2. Foods to avoid or limit
3. Meal timing suggestions
4. Portion size guidance
5. Any specific nutrients to focus on

Make the recommendations practical and actionable.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600
    });

    const recommendations = completion.choices[0].message.content;
    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating food recommendations:', error);
    res.status(500).json({ error: 'Failed to generate food recommendations' });
  }
});

module.exports = router;
