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
    
    // Migration: Add missing columns to existing tables
    try {
      // Check if health_conditions table has symptoms column
      const healthConditionsColumns = await getAll("PRAGMA table_info(health_conditions)");
      const hasSymptoms = healthConditionsColumns.some(c => c.name === 'symptoms');
      if (!hasSymptoms) {
        await runQuery('ALTER TABLE health_conditions ADD COLUMN symptoms TEXT');
        console.log('🛠️ Added missing health_conditions.symptoms column');
      }
    } catch (error) {
      console.log('Migration completed (some columns may already exist)');
    }
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

// AI analysis function using ChatGPT API
async function performAIAnalysis(reports, conditions) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const axios = require('axios');
    
    // Prepare report data for analysis with content
    const reportData = [];
    for (const report of reports) {
      try {
        // Read file content if it exists
        const fs = require('fs');
        const path = require('path');
        let content = '';
        
        if (fs.existsSync(report.file_path)) {
          if (report.file_type === 'application/pdf') {
            // For PDFs, we'll extract text content
            const pdf = require('pdf-parse');
            const dataBuffer = fs.readFileSync(report.file_path);
            const pdfData = await pdf(dataBuffer);
            content = pdfData.text;
          } else if (report.file_type.startsWith('image/')) {
            // For images, we'll describe the file
            content = `Image file: ${report.filename}`;
          } else {
            // For other files, try to read as text
            content = fs.readFileSync(report.file_path, 'utf8');
          }
        }
        
        reportData.push({
          filename: report.filename,
          fileType: report.file_type,
          uploadedAt: report.uploaded_at,
          content: content.substring(0, 5000) // Limit content length
        });
      } catch (error) {
        console.log(`Could not read content for ${report.filename}:`, error.message);
        reportData.push({
          filename: report.filename,
          fileType: report.file_type,
          uploadedAt: report.uploaded_at,
          content: 'Content could not be extracted'
        });
      }
    }

    // Create a comprehensive prompt for health report analysis
    const prompt = `You are an expert medical AI assistant analyzing health reports. 

PATIENT CONTEXT:
- Health Conditions: ${conditions.map(c => `${c.condition_name} (${c.severity || 'mild'})`).join(', ') || 'None specified'}

REPORTS TO ANALYZE:
${reportData.map((report, index) => `
REPORT ${index + 1}: ${report.filename}
Type: ${report.fileType}
Content:
${report.content}
`).join('\n')}

TASK: Analyze the actual content of the uploaded health reports and provide a comprehensive medical analysis.

IMPORTANT GUIDELINES:
1. Analyze the ACTUAL LAB VALUES and results shown in the report content
2. Compare values to reference ranges when provided
3. If values are within normal ranges, clearly state "NORMAL" or "WITHIN NORMAL RANGE"
4. If a report shows normal values, do NOT diagnose conditions - state the results are normal
5. Only identify issues if values are clearly outside normal ranges
6. Be conservative - when in doubt, recommend consulting a healthcare provider
7. Focus on the actual lab results, not the patient's existing conditions

Return STRICT JSON in this exact schema (no prose outside JSON):
{
  "totalReports": ${reports.length},
  "normalMetrics": number,
  "attentionNeeded": number,
  "findings": [
    {
      "type": "success|warning|danger|info",
      "title": "Finding title",
      "description": "Detailed description of the finding"
    }
  ],
  "recommendations": [
    {
      "title": "Recommendation title",
      "description": "Detailed recommendation",
      "action": "Suggested action"
    }
  ],
  "riskFactors": ["risk factor 1", "risk factor 2"],
  "nextSteps": ["next step 1", "next step 2"],
  "analysisSummary": "Overall summary of the analysis",
  "confidence": "high|medium|low",
  "limitations": ["limitation 1", "limitation 2"]
}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.2
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    const analysis = JSON.parse(content);
    
    console.log('✅ AI analysis completed successfully');
    return analysis;
    
  } catch (error) {
    console.error('❌ AI analysis failed:', error.message);
    
    // Fallback to basic analysis
    return {
      totalReports: reports.length,
      normalMetrics: 0,
      attentionNeeded: 0,
      findings: [
        {
          type: 'info',
          title: 'Analysis Unavailable',
          description: 'Unable to analyze reports at this time. Please consult your healthcare provider for interpretation.'
        }
      ],
      recommendations: [
        {
          title: 'Consult Healthcare Provider',
          description: 'Please discuss your lab results with your doctor for proper interpretation.',
          action: 'Schedule Appointment'
        }
      ],
      riskFactors: [],
      nextSteps: ['Consult with healthcare provider'],
      analysisSummary: 'Analysis could not be completed. Please consult your healthcare provider.',
      confidence: 'low',
      limitations: ['AI analysis unavailable', 'Manual review required']
    };
  }
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
    const prompt = `You are an expert medical AI assistant specializing in personalized health recommendations. 

PATIENT CONDITIONS: ${conditions.map(c => `${c.condition} (${c.severity || 'mild'})`).join(', ') || 'No specific conditions'}

TASK: Provide comprehensive, evidence-based recommendations for each condition.

IMPORTANT GUIDELINES:
1. Be conservative and safety-focused
2. Always recommend consulting healthcare providers for medical decisions
3. Provide practical, actionable advice
4. Consider interactions between multiple conditions
5. Focus on lifestyle modifications and preventive care

Return STRICT JSON in this exact schema (no prose outside JSON):
[
  {
    "condition": "condition name",
    "severity": "severity level",
    "treatment": ["clinical advice", "when to see doctor", "important tests"],
    "diet": { 
      "include": ["foods to include"], 
      "avoid": ["foods to limit/avoid"] 
    },
    "care": ["self-care steps", "monitoring reminders", "lifestyle changes"],
    "exerciseRecommendations": ["exercise recommendations"],
    "monitoringMetrics": ["key metrics to track"],
    "safetyConsiderations": ["safety warnings", "red flags to watch for"]
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

// Generate food recommendations based on health reports
router.post('/food-recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's health reports and conditions
    const reports = await getAll(
      'SELECT * FROM health_reports WHERE user_id = ? ORDER BY uploaded_at DESC',
      [userId]
    );
    
    const conditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    // Set a timeout for the AI request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds
    });

    // Generate AI-powered food recommendations with timeout
    const foodRecommendationsPromise = generateFoodRecommendations(reports, conditions);
    const foodRecommendations = await Promise.race([foodRecommendationsPromise, timeoutPromise]);
    
    res.json({
      success: true,
      recommendations: foodRecommendations
    });
  } catch (error) {
    console.error('Error generating food recommendations:', error);
    
    // Return fallback recommendations if AI fails
    const fallbackRecommendations = {
      recommendations: [
        {
          category: "general",
          foods: [
            {
              name: "Leafy green vegetables",
              benefit: "Rich in vitamins and minerals",
              frequency: "Daily",
              portion: "2-3 cups"
            },
            {
              name: "Lean proteins",
              benefit: "Essential for muscle maintenance",
              frequency: "Daily",
              portion: "3-4 oz per meal"
            }
          ]
        }
      ],
      generalGuidelines: [
        "Eat a balanced diet with plenty of fruits and vegetables",
        "Stay hydrated with water throughout the day",
        "Limit processed foods and added sugars"
      ],
      foodsToLimit: [
        {
          name: "Processed foods",
          reason: "High in sodium and unhealthy fats",
          alternative: "Fresh, whole foods"
        }
      ],
      supplements: [
        {
          name: "Multivitamin",
          benefit: "Fills nutritional gaps",
          dosage: "1 tablet daily",
          note: "Consult with healthcare provider"
        }
      ]
    };
    
    res.json({
      success: true,
      recommendations: fallbackRecommendations,
      note: "Using fallback recommendations due to AI service issue"
    });
  }
});

// Generate AI-powered food recommendations
async function generateFoodRecommendations(reports, conditions) {
  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const axios = require('axios');
    
    // Prepare report data for analysis
    const reportData = [];
    for (const report of reports) {
      try {
        const fs = require('fs');
        let content = '';
        
        if (fs.existsSync(report.file_path)) {
          if (report.file_type === 'application/pdf') {
            const pdf = require('pdf-parse');
            const dataBuffer = fs.readFileSync(report.file_path);
            const pdfData = await pdf(dataBuffer);
            content = pdfData.text;
          } else {
            content = fs.readFileSync(report.file_path, 'utf8');
          }
        }
        
        reportData.push({
          filename: report.filename,
          content: content.substring(0, 3000)
        });
      } catch (error) {
        console.log(`Could not read content for ${report.filename}:`, error.message);
      }
    }

    const prompt = `You are an expert nutritionist and dietitian. Based on the health reports and conditions provided, generate personalized food recommendations.

PATIENT CONTEXT:
- Health Conditions: ${conditions.map(c => `${c.condition_name} (${c.severity || 'mild'})`).join(', ') || 'None specified'}

HEALTH REPORTS:
${reportData.map((report, index) => `
REPORT ${index + 1}: ${report.filename}
Content: ${report.content}
`).join('\n')}

TASK: Generate personalized food recommendations based on the health reports and conditions.

IMPORTANT GUIDELINES:
1. Focus on foods that support the specific health conditions identified
2. Consider any abnormal lab values and recommend foods that help address them
3. If all values are normal, recommend foods for general health and prevention
4. Include specific foods, not just general categories
5. Consider cultural preferences and practical meal planning
6. Be specific about portion sizes and frequency

Return STRICT JSON in this exact schema (no prose outside JSON):
{
  "recommendations": [
    {
      "category": "breakfast",
      "foods": [
        {
          "name": "food name",
          "benefit": "specific health benefit",
          "frequency": "how often to consume",
          "portion": "recommended portion size"
        }
      ]
    }
  ],
  "generalGuidelines": [
    "general dietary guideline 1",
    "general dietary guideline 2"
  ],
  "foodsToLimit": [
    {
      "name": "food name",
      "reason": "why to limit",
      "alternative": "healthier alternative"
    }
  ],
  "supplements": [
    {
      "name": "supplement name",
      "benefit": "health benefit",
      "dosage": "recommended dosage",
      "note": "important note"
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
    
    // Try to extract JSON from markdown code blocks if present
    let jsonContent = content;
    if (content.includes('```json')) {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
    } else if (content.includes('```')) {
      const jsonMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }
    }
    
    try {
      return JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.log('Raw AI response:', content);
      throw new Error('Invalid JSON response from AI');
    }
    
  } catch (error) {
    console.error('AI food recommendation generation failed:', error);
    
    // Fallback recommendations
    return {
      recommendations: [
        {
          category: "general",
          foods: [
            {
              name: "Leafy green vegetables",
              benefit: "Rich in vitamins and minerals",
              frequency: "Daily",
              portion: "2-3 cups"
            }
          ]
        }
      ],
      generalGuidelines: [
        "Eat a balanced diet with plenty of fruits and vegetables",
        "Stay hydrated with water throughout the day"
      ],
      foodsToLimit: [],
      supplements: []
    };
  }
}

module.exports = router; 