const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll, getRow } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads/health-reports/'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, JPG, and PNG files are allowed.'), false);
    }
  }
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
const uploadDir = path.join(__dirname, '../uploads/health-reports/');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize health analysis tables
const initializeHealthTables = async () => {
  try {
    // Health reports table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS health_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        analyzed_at DATETIME,
        analysis_result TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Health conditions table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS health_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        condition_name TEXT NOT NULL,
        diagnosed_date DATE,
        severity TEXT DEFAULT 'mild',
        medications TEXT,
        symptoms TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Health metrics table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS health_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        metric_name TEXT NOT NULL,
        metric_value REAL NOT NULL,
        metric_unit TEXT,
        status TEXT DEFAULT 'normal',
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Health alerts table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS health_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        alert_type TEXT NOT NULL,
        message TEXT NOT NULL,
        metric_name TEXT,
        severity TEXT DEFAULT 'medium',
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log('✅ Health analysis tables initialized');
  } catch (error) {
    console.error('❌ Error initializing health tables:', error);
  }
};

initializeHealthTables();

// Upload health reports
router.post('/upload-reports', authenticateToken, upload.array('reports', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const files = req.files;
    const healthConditions = JSON.parse(req.body.healthConditions || '[]');

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedReports = [];

    for (const file of files) {
      const result = await runQuery(
        'INSERT INTO health_reports (user_id, filename, file_path, file_type, file_size) VALUES (?, ?, ?, ?, ?)',
        [userId, file.originalname, file.path, file.mimetype, file.size]
      );

      uploadedReports.push({
        id: result.lastID,
        filename: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        uploadedAt: new Date().toISOString()
      });
    }

    // Save health conditions
    for (const condition of healthConditions) {
      if (condition.condition) {
        await runQuery(
          'INSERT INTO health_conditions (user_id, condition_name, diagnosed_date, severity, medications) VALUES (?, ?, ?, ?, ?)',
          [
            userId,
            condition.condition,
            condition.diagnosedDate,
            condition.severity,
            JSON.stringify(condition.medications || [])
          ]
        );
      }
    }

    res.json({
      success: true,
      message: `${files.length} report(s) uploaded successfully`,
      reports: uploadedReports
    });
  } catch (error) {
    console.error('Error uploading health reports:', error);
    res.status(500).json({ error: 'Failed to upload health reports' });
  }
});

// Analyze health reports with AI
router.post('/analyze-reports', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's uploaded reports
    const reports = await getAll(
      'SELECT * FROM health_reports WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );

    if (reports.length === 0) {
      return res.status(400).json({ error: 'No health reports found for analysis' });
    }

    // Get user's health conditions
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // Simulate AI analysis (in a real implementation, this would call an AI service)
    const analysisResult = await performAIAnalysis(reports, conditions);

    // Update reports with analysis results
    for (const report of reports) {
      await runQuery(
        'UPDATE health_reports SET analyzed_at = ?, analysis_result = ? WHERE id = ?',
        [new Date().toISOString(), JSON.stringify(analysisResult), report.id]
      );
    }

    res.json(analysisResult);
  } catch (error) {
    console.error('Error analyzing health reports:', error);
    res.status(500).json({ error: 'Failed to analyze health reports' });
  }
});

// ------------------- Health Conditions APIs -------------------

// List current user's health conditions
router.get('/conditions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const rows = await getAll(
      `SELECT id, condition_name as condition, diagnosed_date as diagnosedDate, severity, medications, symptoms, created_at as createdAt
       FROM health_conditions WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    const parsed = rows.map(r => ({
      ...r,
      medications: r.medications ? JSON.parse(r.medications) : [],
      symptoms: r.symptoms ? JSON.parse(r.symptoms) : []
    }));
    res.json({ success: true, conditions: parsed });
  } catch (error) {
    console.error('Error fetching conditions:', error);
    res.status(500).json({ error: 'Failed to fetch conditions' });
  }
});

// Replace all conditions for the user (bulk upsert via replace strategy)
router.post('/conditions/bulk', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions = [] } = req.body;
    await runQuery('DELETE FROM health_conditions WHERE user_id = ?', [userId]);
    for (const c of conditions) {
      if (!c || !c.condition) continue;
      await runQuery(
        `INSERT INTO health_conditions (user_id, condition_name, diagnosed_date, severity, medications, symptoms)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          c.condition,
          c.diagnosedDate || null,
          c.severity || 'mild',
          JSON.stringify(c.medications || []),
          JSON.stringify(c.symptoms || [])
        ]
      );
    }
    const rows = await getAll(
      `SELECT id, condition_name as condition, diagnosed_date as diagnosedDate, severity, medications, symptoms, created_at as createdAt
       FROM health_conditions WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    const parsed = rows.map(r => ({
      ...r,
      medications: r.medications ? JSON.parse(r.medications) : [],
      symptoms: r.symptoms ? JSON.parse(r.symptoms) : []
    }));
    res.json({ success: true, conditions: parsed });
  } catch (error) {
    console.error('Error saving conditions:', error);
    res.status(500).json({ error: 'Failed to save conditions' });
  }
});

// Generate recommendations (foods and exercises) for given conditions
router.post('/conditions/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions } = req.body;
    let list = conditions;
    if (!Array.isArray(list)) {
      list = await getAll(
        `SELECT condition_name as condition, severity FROM health_conditions WHERE user_id = ?`,
        [userId]
      );
    }
    const recs = await generateRecommendations(list || []);
    const normalized = Array.isArray(recs) ? recs : (recs && typeof recs === 'object' ? [recs] : []);
    res.json({ success: true, recommendations: normalized });
  } catch (error) {
    console.error('Error creating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get health metrics
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const metrics = await getAll(
      'SELECT * FROM health_metrics WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 50',
      [userId]
    );

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching health metrics:', error);
    res.status(500).json({ error: 'Failed to fetch health metrics' });
  }
});

// Add health metric
router.post('/metrics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { metricName, metricValue, metricUnit, status } = req.body;

    const result = await runQuery(
      'INSERT INTO health_metrics (user_id, metric_name, metric_value, metric_unit, status) VALUES (?, ?, ?, ?, ?)',
      [userId, metricName, metricValue, metricUnit, status]
    );

    res.json({
      success: true,
      message: 'Health metric added successfully',
      metricId: result.lastID
    });
  } catch (error) {
    console.error('Error adding health metric:', error);
    res.status(500).json({ error: 'Failed to add health metric' });
  }
});

// Get health alerts
router.get('/alerts', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const alerts = await getAll(
      'SELECT * FROM health_alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
      [userId]
    );

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching health alerts:', error);
    res.status(500).json({ error: 'Failed to fetch health alerts' });
  }
});

// Mark alert as read
router.put('/alerts/:alertId/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const alertId = req.params.alertId;

    await runQuery(
      'UPDATE health_alerts SET is_read = 1 WHERE id = ? AND user_id = ?',
      [alertId, userId]
    );

    res.json({ success: true, message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ error: 'Failed to mark alert as read' });
  }
});

// Get health trends
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '30' } = req.query;

    const trends = await getAll(
      `SELECT 
        metric_name,
        metric_value,
        metric_unit,
        status,
        recorded_at
       FROM health_metrics 
       WHERE user_id = ? 
       AND recorded_at >= datetime('now', '-${period} days')
       ORDER BY recorded_at DESC`,
      [userId]
    );

    res.json({ trends });
  } catch (error) {
    console.error('Error fetching health trends:', error);
    res.status(500).json({ error: 'Failed to fetch health trends' });
  }
});

// Get health recommendations for user
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health conditions from database
    const conditions = await getAll(
      `SELECT condition_name as condition, severity FROM health_conditions WHERE user_id = ?`,
      [userId]
    );

    if (conditions.length === 0) {
      return res.json({
        recommendations: [],
        message: 'No health conditions found. Add health conditions to get personalized recommendations.'
      });
    }

    // Generate recommendations using AI or fallback
    const recommendations = await generateRecommendations(conditions);
    
    res.json({
      recommendations,
      conditions: conditions.map(c => ({ condition: c.condition, severity: c.severity })),
      message: 'Health recommendations generated successfully'
    });
  } catch (error) {
    console.error('Error generating health recommendations:', error);
    res.status(500).json({ error: 'Failed to generate health recommendations' });
  }
});

// Simulate AI analysis function
async function performAIAnalysis(reports, conditions) {
  // This is a simulation - in a real implementation, this would call an AI service
  // like OpenAI's GPT-4 Vision API or a specialized medical AI service
  
  const analysis = {
    totalReports: reports.length,
    normalMetrics: Math.floor(Math.random() * 8) + 5,
    attentionNeeded: Math.floor(Math.random() * 3) + 1,
    findings: [
      {
        type: 'warning',
        title: 'Blood Pressure Elevated',
        description: 'Your systolic blood pressure is slightly above normal range. Consider lifestyle modifications.'
      },
      {
        type: 'success',
        title: 'Cholesterol Levels Optimal',
        description: 'Your cholesterol profile shows excellent values within healthy ranges.'
      },
      {
        type: 'info',
        title: 'Vitamin D Improving',
        description: 'Your vitamin D levels have improved compared to previous reports.'
      }
    ],
    recommendations: [
      {
        title: 'Monitor Blood Pressure',
        description: 'Check your blood pressure regularly and consider reducing salt intake.',
        action: 'Set Reminder'
      },
      {
        title: 'Increase Physical Activity',
        description: 'Aim for 150 minutes of moderate exercise per week to improve cardiovascular health.',
        action: 'View Exercise Plans'
      },
      {
        title: 'Schedule Follow-up',
        description: 'Schedule a follow-up appointment with your healthcare provider in 3 months.',
        action: 'Book Appointment'
      }
    ],
    riskFactors: [
      'Family history of cardiovascular disease',
      'Sedentary lifestyle',
      'Stress levels'
    ],
    nextSteps: [
      'Continue monitoring blood pressure daily',
      'Increase physical activity gradually',
      'Follow up with healthcare provider'
    ]
  };

  return analysis;
}

// Generate health recommendations based on conditions
async function generateRecommendations(conditions) {
  try {
    // Try AI recommendations first
    const aiRecommendations = await generateAIRecommendations(conditions);
    if (aiRecommendations && aiRecommendations.length > 0) {
      return aiRecommendations;
    }
  } catch (error) {
    console.log('AI recommendations failed, using fallback:', error.message);
  }
  
  // Fallback to rule-based recommendations
  return generateFallbackRecommendations(conditions);
}

// Generate AI-based recommendations using OpenAI
async function generateAIRecommendations(conditions) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const axios = require('axios');
    const prompt = `You are an expert clinician and dietitian. Provide concise, practical guidance for these conditions: ${conditions.map(c => `${c.condition} (${c.severity || 'mild'})`).join(', ')}.

Return STRICT JSON in this exact schema (no prose outside JSON):
[
  {
    "condition": "condition name",
    "severity": "severity level",
    "treatment": ["first-line treatment or clinical advice", "when to see doctor", "tests to consider"],
    "diet": { "include": ["foods to include"], "avoid": ["foods to limit/avoid"] },
    "care": ["self-care steps", "monitoring reminders", "lifestyle"],
    "exerciseRecommendations": ["exercise1", "exercise2"],
    "monitoringMetrics": ["metric1", "metric2"],
    "safetyConsiderations": ["safety1", "safety2"]
  }
]`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1000,
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
    console.error('AI recommendation generation failed:', error);
    throw error;
  }
}

// Generate fallback rule-based recommendations
function generateFallbackRecommendations(conditions) {
  const recommendations = [];
  
  for (const condition of conditions) {
    const conditionName = (condition.condition || '').toLowerCase();
    const severity = condition.severity || 'mild';
    
    const recommendation = {
      condition: condition.condition,
      severity: severity,
      // keep old fields for backward compatibility
      foodRecommendations: [],
      exerciseRecommendations: [],
      supplementRecommendations: [],
      lifestyleRecommendations: [],
      monitoringMetrics: [],
      safetyConsiderations: [],
      // new rich schema
      treatment: [],
      diet: { include: [], avoid: [] },
      care: []
    };

    if (conditionName.includes('diabetes')) {
      recommendation.treatment = [
        'Consult your physician for individualized targets; continue prescribed medications',
        'Aim for HbA1c < 7% unless advised otherwise',
        'Annual eye, foot, and kidney screening'
      ];
      recommendation.diet.include = [
        'Low glycemic index carbohydrates (millets, oats, legumes)',
        'High-fiber vegetables and salads',
        'Lean protein: eggs, fish, tofu, dals'
      ];
      recommendation.diet.avoid = [
        'Sugary drinks and sweets',
        'Refined flour snacks, deep-fried foods',
        'Large late-night meals'
      ];
      recommendation.care = [
        'Monitor fasting and post-meal glucose routinely',
        'Walk 10–20 minutes after meals',
        'Maintain sleep 7–8 hours and manage stress'
      ];
      recommendation.exerciseRecommendations = [
        '150 minutes/week brisk walking or cycling',
        '2–3 days/week resistance training'
      ];
      recommendation.monitoringMetrics = ['Fasting glucose', 'Post-prandial glucose', 'HbA1c', 'Blood pressure'];
    } else if (conditionName.includes('hypertension') || conditionName.includes('high blood pressure')) {
      recommendation.treatment = [
        'Check BP at home (validated device); record morning/evening',
        'Continue prescribed antihypertensives; do not stop abruptly',
        'Review with clinician if BP persistently >140/90'
      ];
      recommendation.diet.include = ['DASH-style meals', 'Potassium-rich foods (banana, coconut water, leafy greens)', 'Unsalted nuts, seeds'];
      recommendation.diet.avoid = ['High-salt pickles, papads, chips', 'Processed/instant foods', 'Excessive caffeine and alcohol'];
      recommendation.care = ['30–45 min moderate exercise most days', 'Weight management and stress reduction', 'Limit added salt < 5 g/day'];
      recommendation.exerciseRecommendations = ['Brisk walking', 'Yoga/meditation, breathing exercises'];
      recommendation.monitoringMetrics = ['Daily blood pressure', 'Sodium intake'];
    } else if (conditionName.includes('wound')) {
      recommendation.treatment = [
        'Keep the wound clean and dry; follow dressing protocol',
        'Seek medical care for signs of infection (increasing pain, redness, pus, fever)',
        'Tetanus prophylaxis if indicated'
      ];
      recommendation.diet.include = ['High-protein foods (eggs, paneer, fish, dals)', 'Vitamin C sources (amla, citrus, capsicum)', 'Zinc sources (seeds, nuts, whole grains)', 'Adequate hydration'];
      recommendation.diet.avoid = ['Excess sugar and ultra-processed snacks', 'Alcohol and smoking'];
      recommendation.care = ['Gentle movement to promote circulation as advised', 'Proper wound dressing hygiene', 'Adequate sleep for recovery'];
      recommendation.exerciseRecommendations = ['Light mobility as tolerated', 'Avoid strain on affected area'];
      recommendation.monitoringMetrics = ['Temperature', 'Redness/swelling increase', 'Pain scale'];
      recommendation.supplementRecommendations = ['Vitamin C 500 mg/day if dietary intake is low (consult clinician)', 'Zinc 15–30 mg/day short-term if deficient'];
    } else {
      // General wellness default
      recommendation.treatment = ['Annual preventive check-up', 'Address deficiencies if detected'];
      recommendation.diet.include = ['Fruits and vegetables (5+ servings/day)', 'Adequate protein each meal', 'Healthy fats (nuts, seeds, olive/mustard oil)'];
      recommendation.diet.avoid = ['Sugary beverages', 'Ultra-processed snacks', 'Excess salt'];
      recommendation.care = ['7–9 hours sleep', 'Stress management', 'Regular activity 30+ min/day'];
      recommendation.exerciseRecommendations = ['150 minutes moderate exercise/week', '2–3 sessions strength training/week'];
      recommendation.monitoringMetrics = ['Weight/BMI trend', 'Waist circumference'];
    }

    // maintain backward compatibility fields
    recommendation.foodRecommendations = recommendation.diet.include.slice(0, 6);
    recommendation.lifestyleRecommendations = recommendation.care.slice(0, 6);

    recommendations.push(recommendation);
  }
  
  return recommendations;
}

module.exports = router; 