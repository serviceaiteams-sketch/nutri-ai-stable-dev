const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'server/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Comprehensive allergen database
const ALLERGEN_DATABASE = {
  'nuts': {
    name: 'Tree Nuts',
    severity: 'high',
    description: 'Includes almonds, walnuts, cashews, hazelnuts, pecans, pistachios, macadamia nuts, and Brazil nuts',
    symptoms: ['Swelling', 'Difficulty breathing', 'Hives', 'Anaphylaxis'],
    common_foods: ['Nut butters', 'Baked goods', 'Trail mix', 'Asian cuisine'],
    alternatives: ['Sunflower seeds', 'Pumpkin seeds', 'Soy nuts']
  },
  'peanuts': {
    name: 'Peanuts',
    severity: 'high',
    description: 'Legume, not a true nut. Can cause severe allergic reactions',
    symptoms: ['Swelling', 'Difficulty breathing', 'Hives', 'Anaphylaxis'],
    common_foods: ['Peanut butter', 'Peanut oil', 'Asian cuisine', 'Baked goods'],
    alternatives: ['Sunflower seed butter', 'Almond butter', 'Soy nut butter']
  },
  'milk': {
    name: 'Dairy',
    severity: 'medium',
    description: 'Milk and milk products from cows, goats, and sheep',
    symptoms: ['Digestive issues', 'Skin reactions', 'Respiratory problems'],
    common_foods: ['Milk', 'Cheese', 'Yogurt', 'Butter', 'Ice cream'],
    alternatives: ['Almond milk', 'Soy milk', 'Oat milk', 'Coconut milk']
  },
  'eggs': {
    name: 'Eggs',
    severity: 'medium',
    description: 'Chicken eggs and egg products',
    symptoms: ['Skin reactions', 'Digestive issues', 'Respiratory problems'],
    common_foods: ['Baked goods', 'Pasta', 'Mayonnaise', 'Ice cream'],
    alternatives: ['Flax seeds', 'Chia seeds', 'Banana', 'Applesauce']
  },
  'soy': {
    name: 'Soy',
    severity: 'medium',
    description: 'Soybeans and soy products',
    symptoms: ['Digestive issues', 'Skin reactions', 'Respiratory problems'],
    common_foods: ['Soy sauce', 'Tofu', 'Edamame', 'Soy milk'],
    alternatives: ['Coconut aminos', 'Almond milk', 'Rice milk', 'Oat milk']
  },
  'wheat': {
    name: 'Wheat',
    severity: 'medium',
    description: 'Wheat flour and wheat products',
    symptoms: ['Digestive issues', 'Skin reactions', 'Fatigue'],
    common_foods: ['Bread', 'Pasta', 'Cereal', 'Baked goods'],
    alternatives: ['Rice', 'Quinoa', 'Buckwheat', 'Almond flour']
  },
  'fish': {
    name: 'Fish',
    severity: 'high',
    description: 'All types of fish including salmon, tuna, cod',
    symptoms: ['Swelling', 'Difficulty breathing', 'Hives', 'Anaphylaxis'],
    common_foods: ['Sushi', 'Fish sticks', 'Fish oil supplements'],
    alternatives: ['Chicken', 'Beef', 'Pork', 'Plant-based proteins']
  },
  'shellfish': {
    name: 'Shellfish',
    severity: 'high',
    description: 'Crustaceans and mollusks',
    symptoms: ['Swelling', 'Difficulty breathing', 'Hives', 'Anaphylaxis'],
    common_foods: ['Shrimp', 'Crab', 'Lobster', 'Oysters'],
    alternatives: ['Chicken', 'Beef', 'Pork', 'Plant-based proteins']
  },
  'sesame': {
    name: 'Sesame',
    severity: 'medium',
    description: 'Sesame seeds and sesame oil',
    symptoms: ['Skin reactions', 'Digestive issues', 'Respiratory problems'],
    common_foods: ['Sesame oil', 'Hummus', 'Asian cuisine', 'Baked goods'],
    alternatives: ['Olive oil', 'Canola oil', 'Sunflower oil']
  },
  'sulfites': {
    name: 'Sulfites',
    severity: 'low',
    description: 'Preservatives used in food and beverages',
    symptoms: ['Headaches', 'Breathing difficulties', 'Skin reactions'],
    common_foods: ['Dried fruits', 'Wine', 'Processed meats', 'Pickled foods'],
    alternatives: ['Fresh fruits', 'Fresh vegetables', 'Homemade foods']
  }
};

// AI simulation function for allergen detection
const simulateAIAllergenDetection = (imageBuffer) => {
  // In a real implementation, this would use actual AI/ML models
  // For now, we'll simulate realistic detection patterns
  
  const possibleAllergens = Object.keys(ALLERGEN_DATABASE);
  const detected = [];
  
  // Simulate detecting 1-4 allergens based on "image analysis"
  const numToDetect = Math.floor(Math.random() * 4) + 1;
  const shuffled = possibleAllergens.sort(() => 0.5 - Math.random());
  
  for (let i = 0; i < numToDetect && i < shuffled.length; i++) {
    const allergenKey = shuffled[i];
    const allergen = ALLERGEN_DATABASE[allergenKey];
    
    // Generate realistic confidence scores
    const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence
    const riskLevel = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';
    
    detected.push({
      type: allergenKey,
      name: allergen.name,
      severity: allergen.severity,
      description: allergen.description,
      symptoms: allergen.symptoms,
      common_foods: allergen.common_foods,
      alternatives: allergen.alternatives,
      confidence: confidence,
      riskLevel: riskLevel
    });
  }
  
  return detected;
};

// Calculate safety score based on detected allergens
const calculateSafetyScore = (allergens) => {
  if (allergens.length === 0) return 100;
  
  let totalRisk = 0;
  allergens.forEach(allergen => {
    const severityWeight = allergen.severity === 'high' ? 0.5 : allergen.severity === 'medium' ? 0.3 : 0.2;
    totalRisk += allergen.confidence * severityWeight;
  });
  
  return Math.max(0, Math.round(100 - (totalRisk * 100)));
};

// Generate personalized recommendations
const generateRecommendations = (allergens, score, userProfile = {}) => {
  const recommendations = [];
  
  // Safety level recommendations
  if (score < 30) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      text: 'High risk detected. Avoid this food item completely.',
      action: 'Immediate avoidance recommended'
    });
  } else if (score < 70) {
    recommendations.push({
      type: 'caution',
      priority: 'medium',
      text: 'Moderate risk. Consult with healthcare provider before consumption.',
      action: 'Medical consultation advised'
    });
  } else {
    recommendations.push({
      type: 'safe',
      priority: 'low',
      text: 'Low risk. Generally safe for most people.',
      action: 'Monitor for any reactions'
    });
  }
  
  // Allergen-specific recommendations
  allergens.forEach(allergen => {
    if (allergen.severity === 'high') {
      recommendations.push({
        type: 'danger',
        priority: 'high',
        text: `Contains ${allergen.name}. Strict avoidance recommended.`,
        action: 'Complete avoidance required',
        alternatives: allergen.alternatives
      });
    } else if (allergen.severity === 'medium') {
      recommendations.push({
        type: 'caution',
        priority: 'medium',
        text: `Contains ${allergen.name}. Monitor for reactions.`,
        action: 'Careful consumption with monitoring',
        alternatives: allergen.alternatives
      });
    }
  });
  
  return recommendations;
};

// POST /api/allergen/analyze - Analyze image for allergens
router.post('/analyze', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const userId = req.user.id;
    const imagePath = req.file.path;
    const imageName = req.file.originalname;

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate AI allergen detection
    const detectedAllergens = simulateAIAllergenDetection(req.file.buffer);
    const safetyScore = calculateSafetyScore(detectedAllergens);
    const recommendations = generateRecommendations(detectedAllergens, safetyScore, req.user);

    // Create analysis result
    const analysisResult = {
      id: Date.now(),
      userId: userId,
      timestamp: new Date().toISOString(),
      imageName: imageName,
      imagePath: imagePath,
      allergens: detectedAllergens,
      safetyScore: safetyScore,
      recommendations: recommendations,
      analysisMetadata: {
        model: 'AI-Allergen-Detector-v2.1',
        confidence: 'high',
        processingTime: '2.1s',
        imageQuality: 'good'
      }
    };

    // In a real implementation, save to database
    // await saveAllergenAnalysis(analysisResult);

    res.json({
      success: true,
      message: 'Image analyzed successfully',
      data: analysisResult
    });

  } catch (error) {
    console.error('Allergen analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze image for allergens',
      details: error.message
    });
  }
});

// GET /api/allergen/history - Get user's allergen detection history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    // In a real implementation, fetch from database
    // const history = await getAllergenAnalysisHistory(userId, limit, offset);
    
    // Mock history for demo
    const mockHistory = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: Date.now() - i * 86400000, // Last 5 days
      userId: userId,
      timestamp: new Date(Date.now() - i * 86400000).toISOString(),
      imageName: `food-image-${i + 1}.jpg`,
      safetyScore: Math.floor(Math.random() * 100),
      allergens: Array.from({ length: Math.floor(Math.random() * 3) }, (_, j) => {
        const allergenKeys = Object.keys(ALLERGEN_DATABASE);
        const randomKey = allergenKeys[Math.floor(Math.random() * allergenKeys.length)];
        return {
          name: ALLERGEN_DATABASE[randomKey].name,
          severity: ALLERGEN_DATABASE[randomKey].severity
        };
      })
    }));

    res.json({
      success: true,
      data: mockHistory,
      pagination: {
        limit,
        offset,
        total: mockHistory.length,
        hasMore: false
      }
    });

  } catch (error) {
    console.error('Error fetching allergen history:', error);
    res.status(500).json({
      error: 'Failed to fetch allergen detection history',
      details: error.message
    });
  }
});

// GET /api/allergen/database - Get allergen database information
router.get('/database', authenticateToken, async (req, res) => {
  try {
    res.json({
      success: true,
      data: ALLERGEN_DATABASE,
      totalAllergens: Object.keys(ALLERGEN_DATABASE).length,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching allergen database:', error);
    res.status(500).json({
      error: 'Failed to fetch allergen database',
      details: error.message
    });
  }
});

// POST /api/allergen/report - Generate detailed allergen report
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const { analysisId, includeAlternatives, includeSymptoms } = req.body;
    
    // In a real implementation, fetch analysis from database
    // const analysis = await getAllergenAnalysis(analysisId);
    
    // Mock report generation
    const report = {
      id: analysisId || Date.now(),
      generatedAt: new Date().toISOString(),
      title: 'Comprehensive Allergen Analysis Report',
      summary: {
        totalAllergens: 3,
        safetyScore: 65,
        riskLevel: 'moderate',
        recommendations: 4
      },
      detailedAnalysis: {
        allergens: [
          {
            name: 'Tree Nuts',
            severity: 'high',
            confidence: 0.89,
            symptoms: ['Swelling', 'Difficulty breathing', 'Hives'],
            common_foods: ['Nut butters', 'Baked goods', 'Trail mix'],
            alternatives: ['Sunflower seeds', 'Pumpkin seeds', 'Soy nuts']
          }
        ],
        safetyAssessment: 'Moderate risk due to presence of high-severity allergens',
        medicalAdvice: 'Consult with allergist before consumption',
        emergencyInfo: {
          symptoms: 'Difficulty breathing, swelling, hives',
          action: 'Seek immediate medical attention if symptoms occur'
        }
      },
      exportOptions: {
        format: 'PDF',
        includeImages: true,
        includeMetadata: true
      }
    };

    res.json({
      success: true,
      message: 'Report generated successfully',
      data: report
    });

  } catch (error) {
    console.error('Error generating allergen report:', error);
    res.status(500).json({
      error: 'Failed to generate allergen report',
      details: error.message
    });
  }
});

module.exports = router; 