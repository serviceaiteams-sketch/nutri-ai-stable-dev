const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { runQuery, getRow, getAll } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// Reference object database for scale estimation
const REFERENCE_OBJECTS = {
  hand: {
    length: { min: 17, max: 21, avg: 19 }, // cm
    width: { min: 7, max: 10, avg: 8.5 }, // cm
    area: { min: 85, max: 150, avg: 115 }, // cm²
    confidence_factor: 0.9
  },
  fork: {
    length: { min: 18, max: 22, avg: 20 }, // cm
    width: { min: 2, max: 3, avg: 2.5 }, // cm
    area: { min: 40, max: 55, avg: 48 }, // cm²
    confidence_factor: 0.95
  },
  spoon: {
    length: { min: 15, max: 19, avg: 17 }, // cm
    width: { min: 3, max: 4, avg: 3.5 }, // cm
    area: { min: 45, max: 65, avg: 55 }, // cm²
    confidence_factor: 0.92
  },
  knife: {
    length: { min: 20, max: 25, avg: 22.5 }, // cm
    width: { min: 1.5, max: 2.5, avg: 2 }, // cm
    area: { min: 30, max: 50, avg: 40 }, // cm²
    confidence_factor: 0.88
  },
  coin: {
    diameter: { min: 2.2, max: 2.6, avg: 2.4 }, // cm (quarter)
    area: { min: 3.8, max: 5.3, avg: 4.5 }, // cm²
    confidence_factor: 0.98
  },
  credit_card: {
    length: { min: 8.5, max: 8.6, avg: 8.55 }, // cm
    width: { min: 5.3, max: 5.4, avg: 5.35 }, // cm
    area: { min: 45, max: 46, avg: 45.7 }, // cm²
    confidence_factor: 0.99
  }
};

// Food volume estimation factors
const FOOD_VOLUME_FACTORS = {
  rice: { density: 1.4, shape_factor: 0.8 }, // g/cm³
  pasta: { density: 1.1, shape_factor: 0.7 },
  chicken: { density: 1.05, shape_factor: 0.9 },
  fish: { density: 1.0, shape_factor: 0.85 },
  vegetables: { density: 0.6, shape_factor: 0.75 },
  fruits: { density: 0.8, shape_factor: 0.9 },
  bread: { density: 0.3, shape_factor: 0.6 },
  sauce: { density: 1.2, shape_factor: 1.0 }
};

// Advanced AI portion estimation
router.post('/estimate', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const { foodItems, mealId } = req.body;
    const imagePath = req.file ? req.file.path : null;

    if (!imagePath) {
      return res.status(400).json({ error: 'Image is required for portion estimation' });
    }

    // Simulate AI-powered analysis
    const analysisResults = await performAdvancedPortionAnalysis(imagePath, JSON.parse(foodItems));

    // Store estimation results
    const result = await runQuery(
      `INSERT INTO ai_portion_estimations 
       (user_id, meal_id, image_path, reference_objects, portion_analysis, confidence_score, 
        visual_feedback_data, macro_estimations) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        mealId,
        imagePath,
        JSON.stringify(analysisResults.detectedReferenceObjects),
        JSON.stringify(analysisResults.portionAnalysis),
        analysisResults.overallConfidence,
        JSON.stringify(analysisResults.visualFeedback),
        JSON.stringify(analysisResults.macroEstimations)
      ]
    );

    res.json({
      success: true,
      estimationId: result.id,
      analysisResults,
      recommendations: generatePortionRecommendations(analysisResults),
      tips: getPortionEstimationTips(analysisResults.detectedReferenceObjects)
    });

  } catch (error) {
    console.error('Error in portion estimation:', error);
    res.status(500).json({ error: 'Failed to estimate portions' });
  }
});

// Get portion estimation feedback
router.post('/feedback/:estimationId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { estimationId } = req.params;
    const { accuracyRating, actualPortions, feedback } = req.body;

    // Update estimation with user feedback
    await runQuery(
      'UPDATE ai_portion_estimations SET accuracy_feedback = ? WHERE id = ? AND user_id = ?',
      [accuracyRating, estimationId, userId]
    );

    // Learn from feedback to improve future estimations
    const learningData = {
      estimationId,
      accuracyRating,
      actualPortions,
      feedback,
      timestamp: new Date()
    };

    await updatePortionEstimationModel(learningData);

    res.json({ 
      success: true, 
      message: 'Feedback recorded successfully',
      improvedAccuracy: await calculateImprovedAccuracy(userId)
    });

  } catch (error) {
    console.error('Error recording portion feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Get estimation history and accuracy analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query;

    const days = period === 'weekly' ? 7 : period === 'monthly' ? 30 : 90;

    const estimations = await getAll(
      `SELECT * FROM ai_portion_estimations 
       WHERE user_id = ? AND created_at >= date('now', '-${days} days')
       ORDER BY created_at DESC`,
      [userId]
    );

    const analytics = {
      totalEstimations: estimations.length,
      averageConfidence: calculateAverageConfidence(estimations),
      accuracyTrend: calculateAccuracyTrend(estimations),
      mostUsedReferenceObjects: getMostUsedReferenceObjects(estimations),
      improvementOverTime: calculateImprovementOverTime(estimations),
      commonFoodTypes: getCommonFoodTypes(estimations)
    };

    res.json({
      period,
      analytics,
      recommendations: generateAnalyticsRecommendations(analytics),
      tips: getPersonalizedTips(analytics)
    });

  } catch (error) {
    console.error('Error fetching portion analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper functions for advanced AI analysis
async function performAdvancedPortionAnalysis(imagePath, foodItems) {
  // Simulate advanced AI analysis with 3D modeling
  const detectedReferenceObjects = await detectReferenceObjects(imagePath);
  const scalingFactor = calculateScalingFactor(detectedReferenceObjects);
  
  const portionAnalysis = [];
  const visualFeedback = {
    overlays: [],
    measurements: [],
    confidence_indicators: []
  };

  for (const food of foodItems) {
    const analysis = await analyzeFoodPortion(food, scalingFactor, detectedReferenceObjects);
    portionAnalysis.push(analysis);

    // Create visual feedback overlay
    const overlay = createVisualOverlay(food, analysis);
    visualFeedback.overlays.push(overlay);
  }

  const macroEstimations = calculateMacroEstimations(portionAnalysis);
  const overallConfidence = calculateOverallConfidence(portionAnalysis, detectedReferenceObjects);

  return {
    detectedReferenceObjects,
    portionAnalysis,
    visualFeedback,
    macroEstimations,
    overallConfidence,
    scalingFactor,
    analysisMetadata: {
      processingTime: Math.random() * 2 + 1, // 1-3 seconds
      algorithmsUsed: ['3D_MODELING', 'DEPTH_ESTIMATION', 'OBJECT_SEGMENTATION'],
      imageQuality: assessImageQuality(imagePath)
    }
  };
}

async function detectReferenceObjects(imagePath) {
  // Simulate AI-powered reference object detection
  const possibleObjects = Object.keys(REFERENCE_OBJECTS);
  const detectedObjects = [];

  // Simulate detection with varying confidence
  for (const objType of possibleObjects) {
    const detectionProbability = Math.random();
    
    if (detectionProbability > 0.7) { // 30% chance of detection per object
      const objectData = REFERENCE_OBJECTS[objType];
      const confidence = Math.random() * 0.3 + 0.7; // 0.7 - 1.0
      
      detectedObjects.push({
        type: objType,
        confidence,
        boundingBox: {
          x: Math.random() * 300 + 50,
          y: Math.random() * 300 + 50,
          width: objectData.width ? objectData.width.avg * 10 : 50,
          height: objectData.length ? objectData.length.avg * 10 : 50
        },
        realWorldDimensions: {
          length: objectData.length ? objectData.length.avg : objectData.diameter?.avg,
          width: objectData.width?.avg,
          area: objectData.area.avg
        },
        pixelDimensions: {
          length: (objectData.length?.avg || objectData.diameter?.avg) * 10,
          width: objectData.width ? objectData.width.avg * 10 : (objectData.diameter?.avg * 10)
        }
      });
    }
  }

  return detectedObjects;
}

function calculateScalingFactor(detectedReferenceObjects) {
  if (detectedReferenceObjects.length === 0) {
    return {
      pixelsPerCm: 10, // Default assumption
      confidence: 0.3,
      method: 'default_estimation'
    };
  }

  // Use the most confident reference object
  const bestReference = detectedReferenceObjects.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );

  const pixelsPerCm = bestReference.pixelDimensions.length / bestReference.realWorldDimensions.length;
  
  return {
    pixelsPerCm,
    confidence: bestReference.confidence,
    method: `${bestReference.type}_reference`,
    referenceObject: bestReference
  };
}

async function analyzeFoodPortion(food, scalingFactor, referenceObjects) {
  const foodType = categorizeFoodType(food.name);
  const volumeFactors = FOOD_VOLUME_FACTORS[foodType] || FOOD_VOLUME_FACTORS.vegetables;

  // Simulate 3D volume analysis
  const pixelArea = Math.random() * 5000 + 2000; // 2000-7000 pixels²
  const realWorldArea = pixelArea / (scalingFactor.pixelsPerCm ** 2); // cm²
  
  // Estimate height/depth using shape analysis
  const estimatedHeight = estimateHeightFromShape(food.name, realWorldArea);
  const volume = realWorldArea * estimatedHeight * volumeFactors.shape_factor; // cm³
  
  // Convert volume to mass
  const estimatedMass = volume * volumeFactors.density; // grams
  
  // Calculate confidence based on various factors
  const confidence = calculatePortionConfidence(
    scalingFactor.confidence,
    referenceObjects.length,
    foodType,
    estimatedMass
  );

  return {
    foodName: food.name,
    estimatedMass: Math.round(estimatedMass),
    estimatedVolume: Math.round(volume),
    confidence,
    dimensions: {
      area: Math.round(realWorldArea),
      estimatedHeight: Math.round(estimatedHeight * 10) / 10,
      boundingBox: generateBoundingBox()
    },
    nutritionalEstimate: calculateNutritionalEstimate(food.name, estimatedMass),
    portionSize: classifyPortionSize(estimatedMass, food.name),
    uncertaintyRange: {
      min: Math.round(estimatedMass * 0.8),
      max: Math.round(estimatedMass * 1.2)
    }
  };
}

function categorizeFoodType(foodName) {
  const categories = {
    rice: ['rice', 'risotto', 'pilaf'],
    pasta: ['pasta', 'noodles', 'spaghetti', 'linguine'],
    chicken: ['chicken', 'poultry'],
    fish: ['fish', 'salmon', 'tuna', 'cod'],
    vegetables: ['broccoli', 'spinach', 'carrots', 'lettuce'],
    fruits: ['apple', 'banana', 'orange', 'berries'],
    bread: ['bread', 'toast', 'roll', 'bun'],
    sauce: ['sauce', 'dressing', 'gravy']
  };

  for (const [category, foods] of Object.entries(categories)) {
    if (foods.some(food => foodName.toLowerCase().includes(food))) {
      return category;
    }
  }
  
  return 'vegetables'; // Default category
}

function estimateHeightFromShape(foodName, area) {
  // Estimate height based on food type and area
  const heightEstimates = {
    rice: Math.sqrt(area) * 0.3, // Relatively flat
    pasta: Math.sqrt(area) * 0.4, // Medium height
    chicken: Math.sqrt(area) * 0.6, // Thicker
    fish: Math.sqrt(area) * 0.5, // Medium-thick
    vegetables: Math.sqrt(area) * 0.2, // Usually flat
    fruits: Math.sqrt(area) * 0.8, // Often rounded
    bread: Math.sqrt(area) * 0.4, // Medium thickness
    sauce: Math.sqrt(area) * 0.1 // Very flat
  };

  const foodType = categorizeFoodType(foodName);
  return heightEstimates[foodType] || heightEstimates.vegetables;
}

function calculatePortionConfidence(scalingConfidence, numReferenceObjects, foodType, estimatedMass) {
  let confidence = scalingConfidence;
  
  // Boost confidence with more reference objects
  confidence += Math.min(numReferenceObjects * 0.1, 0.3);
  
  // Adjust based on food type difficulty
  const difficultyFactors = {
    rice: 0.8, // Harder to estimate individual grains
    pasta: 0.9, // Moderate difficulty
    chicken: 0.95, // Easier to see boundaries
    fish: 0.93,
    vegetables: 0.85,
    fruits: 0.98, // Usually well-defined
    bread: 0.92,
    sauce: 0.7 // Very difficult
  };
  
  confidence *= difficultyFactors[foodType] || 0.85;
  
  // Adjust for reasonable mass ranges
  if (estimatedMass < 10 || estimatedMass > 1000) {
    confidence *= 0.7; // Less confident for extreme values
  }
  
  return Math.min(confidence, 0.98); // Cap at 98%
}

function generateBoundingBox() {
  return {
    x: Math.random() * 200 + 100,
    y: Math.random() * 200 + 100,
    width: Math.random() * 150 + 100,
    height: Math.random() * 150 + 100
  };
}

function calculateNutritionalEstimate(foodName, mass) {
  // Simplified nutritional calculation per 100g
  const nutritionPer100g = {
    rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    broccoli: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    salmon: { calories: 206, protein: 22, carbs: 0, fat: 12 },
    pasta: { calories: 131, protein: 5, carbs: 25, fat: 1.1 }
  };

  const foodType = categorizeFoodType(foodName);
  const baseNutrition = nutritionPer100g[foodType] || nutritionPer100g.broccoli;
  
  const multiplier = mass / 100;
  
  return {
    calories: Math.round(baseNutrition.calories * multiplier),
    protein: Math.round(baseNutrition.protein * multiplier * 10) / 10,
    carbs: Math.round(baseNutrition.carbs * multiplier * 10) / 10,
    fat: Math.round(baseNutrition.fat * multiplier * 10) / 10
  };
}

function classifyPortionSize(mass, foodName) {
  const portionRanges = {
    rice: { small: 75, medium: 150, large: 300 },
    chicken: { small: 85, medium: 170, large: 255 },
    vegetables: { small: 50, medium: 100, large: 200 },
    fruits: { small: 80, medium: 160, large: 240 }
  };

  const foodType = categorizeFoodType(foodName);
  const ranges = portionRanges[foodType] || portionRanges.vegetables;

  if (mass <= ranges.small) return 'small';
  if (mass <= ranges.medium) return 'medium';
  if (mass <= ranges.large) return 'large';
  return 'extra_large';
}

function createVisualOverlay(food, analysis) {
  return {
    foodName: food.name,
    boundingBox: analysis.dimensions.boundingBox,
    confidence: analysis.confidence,
    estimatedMass: analysis.estimatedMass,
    portionSize: analysis.portionSize,
    overlayElements: [
      {
        type: 'text',
        content: `${analysis.estimatedMass}g`,
        position: { x: analysis.dimensions.boundingBox.x, y: analysis.dimensions.boundingBox.y - 20 },
        style: { color: getConfidenceColor(analysis.confidence), fontSize: 14 }
      },
      {
        type: 'rectangle',
        position: analysis.dimensions.boundingBox,
        style: { 
          borderColor: getConfidenceColor(analysis.confidence), 
          borderWidth: 2,
          opacity: 0.7
        }
      },
      {
        type: 'progress_bar',
        position: { 
          x: analysis.dimensions.boundingBox.x, 
          y: analysis.dimensions.boundingBox.y + analysis.dimensions.boundingBox.height + 5 
        },
        value: analysis.confidence,
        label: 'Confidence'
      }
    ]
  };
}

function getConfidenceColor(confidence) {
  if (confidence >= 0.8) return '#22c55e'; // Green
  if (confidence >= 0.6) return '#eab308'; // Yellow
  return '#ef4444'; // Red
}

function calculateMacroEstimations(portionAnalysis) {
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  
  portionAnalysis.forEach(portion => {
    const nutrition = portion.nutritionalEstimate;
    totals.calories += nutrition.calories;
    totals.protein += nutrition.protein;
    totals.carbs += nutrition.carbs;
    totals.fat += nutrition.fat;
  });

  return {
    totals,
    macroPercentages: {
      protein: Math.round((totals.protein * 4 / totals.calories) * 100),
      carbs: Math.round((totals.carbs * 4 / totals.calories) * 100),
      fat: Math.round((totals.fat * 9 / totals.calories) * 100)
    },
    portionBreakdown: portionAnalysis.map(p => ({
      food: p.foodName,
      mass: p.estimatedMass,
      calories: p.nutritionalEstimate.calories,
      portion_size: p.portionSize
    }))
  };
}

function calculateOverallConfidence(portionAnalysis, referenceObjects) {
  if (portionAnalysis.length === 0) return 0;
  
  const avgPortionConfidence = portionAnalysis.reduce((sum, p) => sum + p.confidence, 0) / portionAnalysis.length;
  const referenceObjectBonus = Math.min(referenceObjects.length * 0.1, 0.2);
  
  return Math.min(avgPortionConfidence + referenceObjectBonus, 0.98);
}

function assessImageQuality(imagePath) {
  // Simulate image quality assessment
  const quality = Math.random() * 0.4 + 0.6; // 0.6 - 1.0
  
  return {
    score: quality,
    factors: {
      lighting: quality > 0.8 ? 'good' : quality > 0.6 ? 'fair' : 'poor',
      focus: quality > 0.7 ? 'sharp' : 'blurry',
      angle: quality > 0.75 ? 'optimal' : 'suboptimal',
      obstruction: quality > 0.85 ? 'none' : 'minimal'
    },
    recommendations: quality < 0.7 ? [
      'Ensure good lighting',
      'Take photo from directly above',
      'Keep camera steady for sharp focus'
    ] : []
  };
}

function generatePortionRecommendations(analysisResults) {
  const recommendations = [];
  
  analysisResults.portionAnalysis.forEach(portion => {
    if (portion.confidence < 0.7) {
      recommendations.push({
        type: 'accuracy_improvement',
        message: `For better ${portion.foodName} estimation, include a reference object like a fork or coin`,
        confidence: portion.confidence
      });
    }
    
    if (portion.portionSize === 'extra_large') {
      recommendations.push({
        type: 'portion_control',
        message: `Consider reducing ${portion.foodName} portion for better balance`,
        estimatedMass: portion.estimatedMass
      });
    }
  });

  if (analysisResults.detectedReferenceObjects.length === 0) {
    recommendations.push({
      type: 'reference_object',
      message: 'Include a common object (fork, coin, hand) in your photo for more accurate sizing'
    });
  }

  return recommendations;
}

function getPortionEstimationTips(detectedReferenceObjects) {
  const tips = [
    'Take photos from directly above for best results',
    'Ensure good lighting to help AI detect food boundaries',
    'Keep the camera steady to avoid blur'
  ];

  if (detectedReferenceObjects.length === 0) {
    tips.push('Include a fork, spoon, or your hand for scale reference');
  } else {
    tips.push('Great job including reference objects for accurate sizing!');
  }

  return tips;
}

async function updatePortionEstimationModel(learningData) {
  // This would update ML models based on user feedback
  console.log('Learning from portion estimation feedback:', learningData);
  
  // Store feedback for model improvement
  // In production, this would feed into ML pipeline
}

async function calculateImprovedAccuracy(userId) {
  const recent = await getAll(
    `SELECT accuracy_feedback FROM ai_portion_estimations 
     WHERE user_id = ? AND accuracy_feedback IS NOT NULL 
     ORDER BY created_at DESC LIMIT 10`,
    [userId]
  );

  if (recent.length === 0) return null;

  const avgAccuracy = recent.reduce((sum, r) => sum + r.accuracy_feedback, 0) / recent.length;
  return Math.round(avgAccuracy * 100) / 100;
}

function calculateAverageConfidence(estimations) {
  if (estimations.length === 0) return 0;
  
  const total = estimations.reduce((sum, est) => sum + (est.confidence_score || 0), 0);
  return Math.round((total / estimations.length) * 100) / 100;
}

function calculateAccuracyTrend(estimations) {
  const withFeedback = estimations.filter(e => e.accuracy_feedback !== null);
  
  if (withFeedback.length < 2) return 'insufficient_data';
  
  const recent = withFeedback.slice(0, 5);
  const older = withFeedback.slice(5, 10);
  
  const recentAvg = recent.reduce((sum, e) => sum + e.accuracy_feedback, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((sum, e) => sum + e.accuracy_feedback, 0) / older.length : recentAvg;
  
  if (recentAvg > olderAvg + 0.2) return 'improving';
  if (recentAvg < olderAvg - 0.2) return 'declining';
  return 'stable';
}

function getMostUsedReferenceObjects(estimations) {
  const objectCounts = {};
  
  estimations.forEach(est => {
    if (est.reference_objects) {
      try {
        const objects = JSON.parse(est.reference_objects);
        objects.forEach(obj => {
          objectCounts[obj.type] = (objectCounts[obj.type] || 0) + 1;
        });
      } catch (e) {
        // Handle parsing errors
      }
    }
  });

  return Object.entries(objectCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([type, count]) => ({ type, count }));
}

function calculateImprovementOverTime(estimations) {
  if (estimations.length < 5) return 'insufficient_data';
  
  const chronological = estimations.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const first5 = chronological.slice(0, 5);
  const last5 = chronological.slice(-5);
  
  const firstAvgConfidence = first5.reduce((sum, e) => sum + e.confidence_score, 0) / first5.length;
  const lastAvgConfidence = last5.reduce((sum, e) => sum + e.confidence_score, 0) / last5.length;
  
  const improvement = ((lastAvgConfidence - firstAvgConfidence) / firstAvgConfidence) * 100;
  return Math.round(improvement * 100) / 100;
}

function getCommonFoodTypes(estimations) {
  const foodTypes = {};
  
  estimations.forEach(est => {
    if (est.portion_analysis) {
      try {
        const analysis = JSON.parse(est.portion_analysis);
        analysis.forEach(portion => {
          const type = categorizeFoodType(portion.foodName);
          foodTypes[type] = (foodTypes[type] || 0) + 1;
        });
      } catch (e) {
        // Handle parsing errors
      }
    }
  });

  return Object.entries(foodTypes)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));
}

function generateAnalyticsRecommendations(analytics) {
  const recommendations = [];
  
  if (analytics.averageConfidence < 0.7) {
    recommendations.push('Try including more reference objects to improve estimation accuracy');
  }
  
  if (analytics.accuracyTrend === 'improving') {
    recommendations.push('Great job! Your portion estimation accuracy is improving over time');
  }
  
  if (analytics.mostUsedReferenceObjects.length === 0) {
    recommendations.push('Consider using reference objects like forks or coins for better scale estimation');
  }

  return recommendations;
}

function getPersonalizedTips(analytics) {
  const tips = [];
  
  const commonFoodTypes = analytics.commonFoodTypes || [];
  if (commonFoodTypes.length > 0) {
    const topFood = commonFoodTypes[0].type;
    tips.push(`Since you often photograph ${topFood}, try to spread it out on the plate for better estimation`);
  }
  
  const mostUsedObjects = analytics.mostUsedReferenceObjects || [];
  if (mostUsedObjects.length > 0) {
    const topObject = mostUsedObjects[0].type;
    tips.push(`You frequently use ${topObject} as reference - this helps with accuracy!`);
  }

  return tips;
}

module.exports = router; 