const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll, getRow } = require('../config/database');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Configure multer for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Get user's allergies
router.get('/allergies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const allergies = await getAll(
      'SELECT * FROM user_allergies WHERE user_id = ? ORDER BY severity DESC',
      [userId]
    );
    res.json({ allergies });
  } catch (error) {
    console.error('Error fetching allergies:', error);
    res.status(500).json({ error: 'Failed to fetch allergies' });
  }
});

// Add/update user allergy
router.post('/allergies', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergen, severity, reaction, notes } = req.body;

    if (!allergen || !severity) {
      return res.status(400).json({ error: 'Allergen and severity are required' });
    }

    // Check if allergy already exists
    const existing = await getRow(
      'SELECT * FROM user_allergies WHERE user_id = ? AND allergen = ?',
      [userId, allergen]
    );

    if (existing) {
      // Update existing allergy
      await runQuery(
        'UPDATE user_allergies SET severity = ?, reaction = ?, notes = ?, updated_at = ? WHERE id = ?',
        [severity, reaction || '', notes || '', new Date().toISOString(), existing.id]
      );
      res.json({ message: 'Allergy updated successfully' });
    } else {
      // Add new allergy
      await runQuery(
        'INSERT INTO user_allergies (user_id, allergen, severity, reaction, notes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, allergen, severity, reaction || '', notes || '', new Date().toISOString()]
      );
      res.json({ message: 'Allergy added successfully' });
    }
  } catch (error) {
    console.error('Error managing allergy:', error);
    res.status(500).json({ error: 'Failed to manage allergy' });
  }
});

// Delete user allergy
router.delete('/allergies/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const allergyId = req.params.id;

    await runQuery(
      'DELETE FROM user_allergies WHERE id = ? AND user_id = ?',
      [allergyId, userId]
    );

    res.json({ message: 'Allergy removed successfully' });
  } catch (error) {
    console.error('Error removing allergy:', error);
    res.status(500).json({ error: 'Failed to remove allergy' });
  }
});

// Analyze food image for allergens
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { imageDescription } = req.body;

    if (!req.file && !imageDescription) {
      return res.status(400).json({ error: 'Image or description is required' });
    }

    // Get user's allergies
    const userAllergies = await getAll(
      'SELECT * FROM user_allergies WHERE user_id = ?',
      [userId]
    );

    // Create analysis prompt
    let prompt = `Analyze this food for potential allergens and provide a safety assessment.

User's Known Allergies:
${userAllergies.map(a => `- ${a.allergen} (${a.severity} severity): ${a.reaction || 'No specific reaction noted'}`).join('\n') || 'No known allergies reported'}

Food Description: ${imageDescription || 'Image uploaded'}

Provide analysis in this format:

**FOOD IDENTIFICATION**: [What food items are visible/described]
**INGREDIENTS DETECTED**: [List of ingredients that can be identified]
**ALLERGEN RISK ASSESSMENT**: [High/Medium/Low risk based on visible ingredients]
**SPECIFIC ALLERGEN ALERTS**: [List any allergens that match user's known allergies]
**SAFETY SCORE**: [Percentage from 0-100, where 100 is completely safe]
**RECOMMENDATIONS**: [Specific advice for this user based on their allergies]
**CONFIDENCE LEVEL**: [How confident the analysis is - High/Medium/Low]

Focus on identifying ingredients that could contain common allergens like nuts, dairy, eggs, soy, wheat, fish, shellfish, etc.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 600
    });

    const analysis = completion.choices[0].message.content;

    // Extract safety score from analysis
    const safetyScoreMatch = analysis.match(/SAFETY SCORE.*?(\d+)/i);
    const safetyScore = safetyScoreMatch ? parseInt(safetyScoreMatch[1]) : 50;

    // Determine allergen risk level
    let allergenRisk = 'Low';
    if (safetyScore < 30) allergenRisk = 'High';
    else if (safetyScore < 70) allergenRisk = 'Medium';

    // Log the analysis
    await runQuery(
      'INSERT INTO allergen_scans (user_id, image_description, analysis_result, safety_score, allergen_risk, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, imageDescription || 'Image uploaded', analysis, safetyScore, allergenRisk, new Date().toISOString()]
    );

    res.json({
      success: true,
      analysis: analysis,
      safetyScore: safetyScore,
      allergenRisk: allergenRisk,
      userAllergies: userAllergies,
      message: 'Allergen analysis completed successfully'
    });

  } catch (error) {
    console.error('Error analyzing image for allergens:', error);
    res.status(500).json({ error: 'Failed to analyze image for allergens' });
  }
});

// Get user's scan history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const scans = await getAll(
      'SELECT * FROM allergen_scans WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json({ scans });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({ error: 'Failed to fetch scan history' });
  }
});

// Get allergen statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const totalScans = await getRow(
      'SELECT COUNT(*) as count FROM allergen_scans WHERE user_id = ?',
      [userId]
    );

    const highRiskScans = await getRow(
      'SELECT COUNT(*) as count FROM allergen_scans WHERE user_id = ? AND allergen_risk = "High"',
      [userId]
    );

    const avgSafetyScore = await getRow(
      'SELECT AVG(safety_score) as avg FROM allergen_scans WHERE user_id = ?',
      [userId]
    );

    res.json({
      totalScans: totalScans.count || 0,
      highRiskScans: highRiskScans.count || 0,
      averageSafetyScore: Math.round(avgSafetyScore.avg || 0),
      todayScans: 0 // TODO: Implement daily count
    });

  } catch (error) {
    console.error('Error fetching allergen stats:', error);
    res.status(500).json({ error: 'Failed to fetch allergen statistics' });
  }
});

module.exports = router;
