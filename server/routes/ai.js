const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const axios = require('axios');

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_KEY_PLACEHOLDER = !OPENAI_API_KEY ? false : /your-openai-api-key-here/i.test(OPENAI_API_KEY);
const OPENAI_KEY_CONFIGURED = !!(OPENAI_API_KEY && !OPENAI_KEY_PLACEHOLDER);
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// We'll set this to true only after testing the API key
let HAS_VALID_OPENAI_KEY = false;

// Test the API key on startup
async function testOpenAIKey() {
  if (!OPENAI_KEY_CONFIGURED) {
    HAS_VALID_OPENAI_KEY = false;
    return;
  }

  try {
    const testResponse = await axios.post(
      OPENAI_API_URL,
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    HAS_VALID_OPENAI_KEY = true;
    console.log('✅ OpenAI API key validated successfully');
  } catch (error) {
    HAS_VALID_OPENAI_KEY = false;
    console.log('❌ OpenAI API key validation failed:', error.response?.data?.error?.message || error.message);
  }
}

// Test the key on startup
testOpenAIKey();

const router = express.Router();

// AI Service Health Check
router.get('/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'NutriAI AI Service',
      status: 'operational',
      timestamp: new Date().toISOString(),
      openai: {
        configured: !!OPENAI_API_KEY,
        valid_key: HAS_VALID_OPENAI_KEY,
        key_format: OPENAI_API_KEY ? 'valid' : 'missing',
        placeholder_detected: OPENAI_API_KEY ? /your-openai-api-key-here/i.test(OPENAI_API_KEY) : false
      },
      features: {
        chat: HAS_VALID_OPENAI_KEY ? 'enabled' : 'demo_mode',
        food_recognition: HAS_VALID_OPENAI_KEY ? 'enabled' : 'demo_mode',
        nutrition_analysis: HAS_VALID_OPENAI_KEY ? 'enabled' : 'demo_mode'
      }
    };

    // Test OpenAI API if key is configured
    if (OPENAI_KEY_CONFIGURED) {
      try {
        const testResponse = await axios.post(
          OPENAI_API_URL,
          {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 5
          },
          {
            headers: {
              Authorization: `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        healthStatus.openai.test_result = 'success';
        healthStatus.openai.response_time = testResponse.headers['x-request-id'] ? 'normal' : 'normal';
      } catch (testError) {
        healthStatus.openai.test_result = 'failed';
        healthStatus.openai.error_code = testError.response?.data?.error?.code || 'unknown';
        healthStatus.openai.error_message = testError.response?.data?.error?.message || testError.message;
      }
    }

    res.json(healthStatus);
  } catch (error) {
    console.error('AI health check error:', error);
    res.status(500).json({
      service: 'NutriAI AI Service',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple file-based cache for image recognition results
const CACHE_DIR = path.join(__dirname, '../data');
const CACHE_FILE = path.join(CACHE_DIR, 'food_analysis_cache.json');

function ensureCacheFile() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
  if (!fs.existsSync(CACHE_FILE)) fs.writeFileSync(CACHE_FILE, JSON.stringify({}), 'utf8');
}

function loadCache() {
  try {
    ensureCacheFile();
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveCache(cacheObj) {
  try {
    ensureCacheFile();
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheObj), 'utf8');
  } catch (e) {
    console.error('Failed to write cache:', e);
  }
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Food recognition using OpenAI API (with development fallback when no API key)
router.post('/recognize-food', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // Resize image for better processing
    await sharp(imagePath)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toFile(imagePath + '_processed');

    // Compute a stable hash for caching
    const processedBuffer = fs.readFileSync(imagePath + '_processed');
    const imageHash = hashBuffer(processedBuffer);
    const cache = loadCache();
    if (cache[imageHash]) {
      return res.json({ success: true, imageUrl, ...cache[imageHash] });
    }

    // Use OpenAI for food recognition if key is configured, otherwise simulate
    let recognizedFoods = [];
    if (OPENAI_KEY_CONFIGURED) {
      recognizedFoods = await recognizeFoodWithOpenAI(imagePath + '_processed');
    } else {
      recognizedFoods = await simulateFoodRecognition(imagePath + '_processed');
    }

    // Check if any food was detected
    if (!recognizedFoods || recognizedFoods.length === 0) {
      return res.json({
        success: false,
        error: 'no_food_detected',
        message: "Hey, I can't really see the food in that picture. Could you send the meal photo again?",
        imageUrl
      });
    }

    // Get nutrition data for recognized foods using OpenAI or fallback
    const nutritionData = OPENAI_KEY_CONFIGURED
      ? await getNutritionDataWithOpenAI(recognizedFoods)
      : await getNutritionData(recognizedFoods);

    const payload = {
      success: true,
      imageUrl,
      recognizedFoods,
      nutritionData,
      totalNutrition: calculateTotalNutrition(nutritionData)
    };

    // Save to cache
    cache[imageHash] = {
      recognizedFoods: payload.recognizedFoods,
      nutritionData: payload.nutritionData,
      totalNutrition: payload.totalNutrition
    };
    saveCache(cache);

    res.json(payload);

  } catch (error) {
    console.error('Food recognition error:', error);
    res.status(500).json({ error: 'Food recognition failed' });
  }
});

// Simulate AI food recognition (replace with actual YOLO model)
async function simulateFoodRecognition(imagePath) {
  // This is a simulation - replace with actual AI model
  // In a real implementation, this would analyze the actual image content
  
  // Try to analyze image characteristics (basic color analysis)
  const imageAnalysis = await analyzeImageColors(imagePath);
  
  // Food database with characteristics
  const foodDatabase = {
    grapes: { 
      colors: ['green', 'purple', 'red'], 
      shapes: ['round', 'cluster'], 
      confidence: 0.95,
      quantity: 1,
      unit: 'cup'
    },
    mango: { 
      colors: ['orange', 'yellow', 'red'], 
      shapes: ['oval', 'round'], 
      confidence: 0.92,
      quantity: 1,
      unit: 'medium'
    },
    apple: { 
      colors: ['red', 'green', 'yellow'], 
      shapes: ['round'], 
      confidence: 0.92,
      quantity: 1,
      unit: 'medium'
    },
    banana: { 
      colors: ['yellow'], 
      shapes: ['curved'], 
      confidence: 0.94,
      quantity: 1,
      unit: 'medium'
    },
    chicken_breast: { 
      colors: ['white', 'pink', 'brown'], 
      shapes: ['rectangular'], 
      confidence: 0.88,
      quantity: 1,
      unit: 'piece'
    },
    broccoli: { 
      colors: ['green'], 
      shapes: ['tree-like'], 
      confidence: 0.85,
      quantity: 1,
      unit: 'cup'
    },
    rice: { 
      colors: ['white', 'brown'], 
      shapes: ['grain'], 
      confidence: 0.90,
      quantity: 1,
      unit: 'cup'
    },
    salad: { 
      colors: ['green', 'red', 'orange'], 
      shapes: ['mixed'], 
      confidence: 0.87,
      quantity: 1,
      unit: 'bowl'
    },
    pizza: { 
      colors: ['red', 'brown', 'white'], 
      shapes: ['round'], 
      confidence: 0.89,
      quantity: 1,
      unit: 'slice'
    },
    // South Indian Food
    dosa: { 
      colors: ['golden', 'brown', 'yellow'], 
      shapes: ['flat', 'round'], 
      confidence: 0.95,
      quantity: 1,
      unit: 'piece'
    },
    idli: { 
      colors: ['white', 'cream'], 
      shapes: ['round', 'cylinder'], 
      confidence: 0.95,
      quantity: 3,
      unit: 'pieces'
    },
    vada: { 
      colors: ['golden', 'brown'], 
      shapes: ['round', 'donut'], 
      confidence: 0.95,
      quantity: 2,
      unit: 'pieces'
    },
    sambar: { 
      colors: ['orange', 'red', 'brown'], 
      shapes: ['liquid'], 
      confidence: 0.95,
      quantity: 1,
      unit: 'bowl'
    },
    coconut_chutney: { 
      colors: ['white', 'cream'], 
      shapes: ['paste'], 
      confidence: 0.95,
      quantity: 1,
      unit: 'bowl'
    }
  };

  // Analyze the image and make educated guesses
  const detectedFoods = [];
  
  // If image has orange/yellow colors and oval/round shapes, likely mango
  if ((imageAnalysis.dominantColors.includes('orange') || imageAnalysis.dominantColors.includes('yellow')) && 
      (imageAnalysis.shapes.includes('oval') || imageAnalysis.shapes.includes('round'))) {
    detectedFoods.push({
      name: 'mango',
      confidence: 0.92,
      quantity: 1,
      unit: 'medium',
      description: 'Fresh ripe mango'
    });
  }
  
  // If image has green/purple colors and round shapes, likely grapes
  else if ((imageAnalysis.dominantColors.includes('green') || imageAnalysis.dominantColors.includes('purple')) && 
           (imageAnalysis.shapes.includes('round') || imageAnalysis.shapes.includes('cluster'))) {
    detectedFoods.push({
      name: 'grapes',
      confidence: 0.95,
      quantity: 1,
      unit: 'cup',
      description: 'Fresh grapes'
    });
  }
  
  // If image has red colors and round shapes, likely apple
  else if (imageAnalysis.dominantColors.includes('red') && imageAnalysis.shapes.includes('round')) {
    detectedFoods.push({
      name: 'apple',
      confidence: 0.92,
      quantity: 1,
      unit: 'medium',
      description: 'Fresh apple'
    });
  }
  
  // If image has yellow colors and curved shapes, likely banana
  else if (imageAnalysis.dominantColors.includes('yellow') && imageAnalysis.shapes.includes('curved')) {
    detectedFoods.push({
      name: 'banana',
      confidence: 0.95,
      quantity: 1,
      unit: 'medium',
      description: 'Fresh ripe banana'
    });
  }
  
  // If image has golden/brown colors and flat shapes, likely dosa
  else if ((imageAnalysis.dominantColors.includes('golden') || imageAnalysis.dominantColors.includes('brown')) && 
           imageAnalysis.shapes.includes('flat')) {
    detectedFoods.push({
      name: 'dosa',
      confidence: 0.95,
      quantity: 1,
      unit: 'piece',
      description: 'Crispy South Indian crepe'
    });
  }
  
  // If image has white/cream colors and round/cylinder shapes, likely idli
  else if ((imageAnalysis.dominantColors.includes('white') || imageAnalysis.dominantColors.includes('cream')) && 
           (imageAnalysis.shapes.includes('round') || imageAnalysis.shapes.includes('cylinder'))) {
    detectedFoods.push({
      name: 'idli',
      confidence: 0.95,
      quantity: 3,
      unit: 'pieces',
      description: 'Steamed rice cakes'
    });
  }
  
  // If image has golden/brown colors and donut shapes, likely vada
  else if ((imageAnalysis.dominantColors.includes('golden') || imageAnalysis.dominantColors.includes('brown')) && 
           imageAnalysis.shapes.includes('donut')) {
    detectedFoods.push({
      name: 'vada',
      confidence: 0.95,
      quantity: 2,
      unit: 'pieces',
      description: 'Savory fried doughnuts'
    });
  }
  
  // If image has orange/red/brown colors and liquid shapes, likely sambar
  else if ((imageAnalysis.dominantColors.includes('orange') || imageAnalysis.dominantColors.includes('red') || imageAnalysis.dominantColors.includes('brown')) && 
           imageAnalysis.shapes.includes('liquid')) {
    detectedFoods.push({
      name: 'sambar',
      confidence: 0.95,
      quantity: 1,
      unit: 'bowl',
      description: 'Spicy lentil stew'
    });
  }
  
  // If no specific foods detected, provide a fallback
  if (detectedFoods.length === 0) {
    // Check if the image has characteristics of South Indian food
    const hasSouthIndianCharacteristics = (
      imageAnalysis.dominantColors.includes('golden') || 
      imageAnalysis.dominantColors.includes('brown') ||
      imageAnalysis.dominantColors.includes('white') ||
      imageAnalysis.dominantColors.includes('cream')
    );
    
    if (hasSouthIndianCharacteristics) {
      // Fallback to South Indian foods
      const southIndianFallbacks = [
        { name: 'dosa', confidence: 0.85, quantity: 1, unit: 'piece', description: 'South Indian crepe' },
        { name: 'idli', confidence: 0.85, quantity: 3, unit: 'pieces', description: 'Steamed rice cakes' },
        { name: 'vada', confidence: 0.85, quantity: 2, unit: 'pieces', description: 'Savory fried doughnuts' },
        { name: 'sambar', confidence: 0.85, quantity: 1, unit: 'bowl', description: 'Spicy lentil stew' }
      ];
      
      const randomSouthIndian = southIndianFallbacks[Math.floor(Math.random() * southIndianFallbacks.length)];
      detectedFoods.push(randomSouthIndian);
    } else {
      // Fallback to common foods based on general image characteristics
      const fallbackFoods = [
        { name: 'mixed vegetables', confidence: 0.75, quantity: 1, unit: 'cup', description: 'Assorted vegetables' },
        { name: 'fruit salad', confidence: 0.70, quantity: 1, unit: 'bowl', description: 'Mixed fruits' },
        { name: 'healthy meal', confidence: 0.65, quantity: 1, unit: 'plate', description: 'Balanced meal' }
      ];
      
      const randomFallback = fallbackFoods[Math.floor(Math.random() * fallbackFoods.length)];
      detectedFoods.push(randomFallback);
    }
  }

  return detectedFoods;
}

// Simulate basic image color analysis
async function analyzeImageColors(imagePath) {
  // In a real implementation, this would analyze actual image colors
  // For now, we'll simulate based on common food characteristics
  
  // Simulate color analysis based on file name or random selection
  const colorOptions = [
    { dominantColors: ['green', 'purple'], shapes: ['round', 'cluster'] }, // grapes
    { dominantColors: ['orange', 'yellow'], shapes: ['oval', 'round'] }, // mango
    { dominantColors: ['red'], shapes: ['round'] }, // apple
    { dominantColors: ['yellow'], shapes: ['curved'] }, // banana
    { dominantColors: ['green'], shapes: ['tree-like'] }, // broccoli
    { dominantColors: ['white', 'pink'], shapes: ['rectangular'] }, // chicken
    { dominantColors: ['white', 'brown'], shapes: ['grain'] }, // rice
    { dominantColors: ['green', 'red', 'orange'], shapes: ['mixed'] }, // salad
    { dominantColors: ['red', 'brown', 'white'], shapes: ['round'] } // pizza
  ];
  
  // Try to analyze the actual image file name for hints
  const fileName = imagePath.toLowerCase();
  
  // If filename contains hints about the food, use that
  if (fileName.includes('mango') || fileName.includes('orange') || fileName.includes('yellow')) {
    return colorOptions[1]; // mango
  } else if (fileName.includes('grape') || fileName.includes('green') || fileName.includes('purple')) {
    return colorOptions[0]; // grapes
  } else if (fileName.includes('apple') || fileName.includes('red')) {
    return colorOptions[2]; // apple
  } else if (fileName.includes('banana') || fileName.includes('yellow')) {
    return colorOptions[3]; // banana
  }
  
  // Otherwise, use weighted random selection for better testing
  const random = Math.random();
  if (random < 0.4) {
    // 40% chance to detect mango (orange/yellow colors) - most common fruit
    return colorOptions[1];
  } else if (random < 0.6) {
    // 20% chance to detect grapes (green/purple colors)
    return colorOptions[0];
  } else if (random < 0.75) {
    // 15% chance to detect apple (red colors)
    return colorOptions[2];
  } else {
    // 25% chance for other foods
    return colorOptions[Math.floor(Math.random() * colorOptions.length)];
  }
}

// Get nutrition data from external API (simulated)
async function getNutritionData(foods) {
  const nutritionData = [];

  for (const food of foods) {
    try {
      // Simulate API call to nutrition database
      const nutrition = await simulateNutritionAPI(food.name);
      nutritionData.push({
        ...food,
        nutrition
      });
    } catch (error) {
      console.error(`Error getting nutrition for ${food.name}:`, error);
      // Add default nutrition data
      nutritionData.push({
        ...food,
        nutrition: getDefaultNutrition(food.name)
      });
    }
  }

  return nutritionData;
}

// Simulate nutrition API call
async function simulateNutritionAPI(foodName) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 100));

  const nutritionDatabase = {
    // Fruits
    'grapes': { calories: 62, protein: 0.6, carbs: 16, fat: 0.2, sugar: 16, sodium: 2, fiber: 0.9 },
    'mango': { calories: 99, protein: 1.4, carbs: 25, fat: 0.6, sugar: 23, sodium: 2, fiber: 2.6 },
    'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, sugar: 19, sodium: 2, fiber: 4.4 },
    'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, sugar: 14, sodium: 1, fiber: 3.1 },
    
    // South Indian Food
    'dosa': { calories: 120, protein: 3.5, carbs: 22, fat: 2.8, sugar: 1.2, sodium: 45, fiber: 1.8 },
    'idli': { calories: 39, protein: 2.5, carbs: 7.5, fat: 0.2, sugar: 0.3, sodium: 15, fiber: 0.8 },
    'vada': { calories: 266, protein: 8.5, carbs: 35, fat: 10.2, sugar: 1.8, sodium: 320, fiber: 2.1 },
    'sambar': { calories: 85, protein: 4.2, carbs: 12, fat: 2.1, sugar: 2.5, sodium: 180, fiber: 3.2 },
    'coconut chutney': { calories: 45, protein: 1.2, carbs: 3.8, fat: 3.2, sugar: 1.5, sodium: 25, fiber: 1.1 },
    'tomato chutney': { calories: 35, protein: 1.8, carbs: 6.2, fat: 0.8, sugar: 3.2, sodium: 45, fiber: 1.5 },
    'uttapam': { calories: 150, protein: 4.2, carbs: 28, fat: 3.5, sugar: 2.1, sodium: 55, fiber: 2.2 },
    'podi chutney': { calories: 25, protein: 2.1, carbs: 4.5, fat: 0.8, sugar: 1.2, sodium: 35, fiber: 1.8 },
    'paniyaram': { calories: 180, protein: 5.5, carbs: 32, fat: 4.2, sugar: 2.8, sodium: 75, fiber: 2.5 },
    'kesari': { calories: 320, protein: 6.8, carbs: 58, fat: 8.5, sugar: 45, sodium: 25, fiber: 1.2 },
    'upma': { calories: 185, protein: 5.2, carbs: 35, fat: 4.8, sugar: 2.5, sodium: 125, fiber: 3.1 },
    'pongal': { calories: 245, protein: 8.5, carbs: 42, fat: 6.2, sugar: 3.8, sodium: 185, fiber: 4.2 },
    'rasam': { calories: 65, protein: 3.8, carbs: 8.5, fat: 1.8, sugar: 3.2, sodium: 145, fiber: 2.8 },
    'curd rice': { calories: 285, protein: 7.2, carbs: 52, fat: 6.8, sugar: 4.5, sodium: 95, fiber: 2.1 },
    'lemon rice': { calories: 225, protein: 4.8, carbs: 38, fat: 5.2, sugar: 2.8, sodium: 165, fiber: 3.5 },
    'tamarind rice': { calories: 245, protein: 5.5, carbs: 42, fat: 6.8, sugar: 3.2, sodium: 185, fiber: 3.8 },
    'coconut rice': { calories: 285, protein: 6.2, carbs: 45, fat: 8.5, sugar: 4.8, sodium: 125, fiber: 3.2 },
    'peanut chutney': { calories: 55, protein: 2.8, carbs: 4.2, fat: 3.8, sugar: 1.8, sodium: 35, fiber: 1.5 },
    'mint chutney': { calories: 25, protein: 1.5, carbs: 3.8, fat: 0.8, sugar: 1.2, sodium: 25, fiber: 2.1 },
    'ginger chutney': { calories: 30, protein: 1.8, carbs: 4.5, fat: 1.2, sugar: 2.8, sodium: 45, fiber: 1.8 },
    
    // Other Foods
    'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 74, fiber: 0 },
    'rice': { calories: 205, protein: 4.3, carbs: 45, fat: 0.4, sugar: 0.1, sodium: 2, fiber: 0.6 },
    'broccoli': { calories: 55, protein: 3.7, carbs: 11, fat: 0.6, sugar: 2.6, sodium: 33, fiber: 5.2 },
    'pizza slice': { calories: 285, protein: 12, carbs: 36, fat: 10, sugar: 3, sodium: 640, fiber: 2 },
    'salad': { calories: 20, protein: 2, carbs: 4, fat: 0.2, sugar: 2, sodium: 15, fiber: 1.5 },
    'yogurt': { calories: 150, protein: 15, carbs: 12, fat: 8, sugar: 12, sodium: 105, fiber: 0 },
    'mixed vegetables': { calories: 70, protein: 4, carbs: 12, fat: 0.5, sugar: 4, sodium: 25, fiber: 4 },
    'fruit salad': { calories: 85, protein: 1, carbs: 20, fat: 0.3, sugar: 15, sodium: 3, fiber: 3 },
    'healthy meal': { calories: 350, protein: 25, carbs: 30, fat: 12, sugar: 8, sodium: 200, fiber: 6 }
  };

  return nutritionDatabase[foodName] || getDefaultNutrition(foodName);
}

// Get default nutrition for unknown foods
function getDefaultNutrition(foodName) {
  // Comprehensive nutrition database for common foods
  const nutritionDatabase = {
    // Fruits
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, sugar: 12, sodium: 1, fiber: 2.6 },
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, sugar: 10, sodium: 1, fiber: 2.4 },
    'mango': { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, sugar: 14, sodium: 1, fiber: 1.6 },
    'grapes': { calories: 62, protein: 0.6, carbs: 16, fat: 0.2, sugar: 16, sodium: 2, fiber: 0.9 },
    'orange': { calories: 47, protein: 0.9, carbs: 12, fat: 0.1, sugar: 9, sodium: 0, fiber: 2.4 },
    
    // Vegetables
    'carrot': { calories: 41, protein: 0.9, carbs: 10, fat: 0.2, sugar: 5, sodium: 69, fiber: 2.8 },
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, sugar: 1.5, sodium: 33, fiber: 2.6 },
    'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, sugar: 0.4, sodium: 79, fiber: 2.2 },
    'tomato': { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, sugar: 2.6, sodium: 5, fiber: 1.2 },
    
    // Grains
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, sugar: 0.1, sodium: 1, fiber: 0.4 },
    'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, sugar: 5, sodium: 491, fiber: 2.7 },
    'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, sugar: 0.6, sodium: 6, fiber: 1.8 },
    
    // Proteins
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 74, fiber: 0 },
    'fish': { calories: 84, protein: 18, carbs: 0, fat: 0.5, sugar: 0, sodium: 59, fiber: 0 },
    'egg': { calories: 155, protein: 13, carbs: 1.1, fat: 11, sugar: 1.1, sodium: 124, fiber: 0 },
    
    // Dairy
    'milk': { calories: 42, protein: 3.4, carbs: 5, fat: 1, sugar: 5, sodium: 44, fiber: 0 },
    'cheese': { calories: 113, protein: 7, carbs: 0.4, fat: 9, sugar: 0.1, sodium: 168, fiber: 0 },
    'yogurt': { calories: 59, protein: 10, carbs: 3.6, fat: 0.4, sugar: 3.2, sodium: 36, fiber: 0 },
    
    // Indian Foods
    'dosa': { calories: 133, protein: 4.2, carbs: 25, fat: 2.9, sugar: 0.5, sodium: 329, fiber: 1.4 },
    'idli': { calories: 39, protein: 2.2, carbs: 7.9, fat: 0.2, sugar: 0.2, sodium: 113, fiber: 0.6 },
    'vada': { calories: 266, protein: 8.2, carbs: 35, fat: 10, sugar: 1.2, sodium: 329, fiber: 2.1 },
    'sambar': { calories: 73, protein: 3.2, carbs: 12, fat: 1.8, sugar: 2.1, sodium: 245, fiber: 2.8 },
    'chutney': { calories: 89, protein: 2.1, carbs: 15, fat: 2.8, sugar: 8.2, sodium: 156, fiber: 1.8 },
    
    // Common Foods
    'pizza': { calories: 266, protein: 11, carbs: 33, fat: 10, sugar: 4, sodium: 640, fiber: 2 },
    'burger': { calories: 295, protein: 12, carbs: 30, fat: 15, sugar: 6, sodium: 512, fiber: 2 },
    'salad': { calories: 20, protein: 2, carbs: 4, fat: 0.2, sugar: 2, sodium: 10, fiber: 2 },
    'soup': { calories: 30, protein: 2, carbs: 5, fat: 0.5, sugar: 1, sodium: 400, fiber: 1 }
  };
  
  // Try to find exact match first
  const exactMatch = nutritionDatabase[foodName.toLowerCase()];
  if (exactMatch) {
    return exactMatch;
  }
  
  // Try partial matches
  for (const [key, nutrition] of Object.entries(nutritionDatabase)) {
    if (foodName.toLowerCase().includes(key) || key.includes(foodName.toLowerCase())) {
      return nutrition;
    }
  }
  
  // Default nutrition for unknown foods
  return {
    calories: 100,
    protein: 5,
    carbs: 15,
    fat: 3,
    sugar: 5,
    sodium: 50,
    fiber: 2
  };
}

// Calculate total nutrition for all foods
function calculateTotalNutrition(nutritionData) {
  const total = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sugar: 0,
    sodium: 0,
    fiber: 0
  };

  nutritionData.forEach(food => {
    const nutrition = food.nutrition;
    Object.keys(total).forEach(nutrient => {
      total[nutrient] += nutrition[nutrient] || 0;
    });
  });

  return total;
}

// Classify food as healthy or junk
function classifyFoodHealth(nutrition) {
  const { calories, sugar, sodium, fiber } = nutrition;
  
  // Simple classification logic
  const isHealthy = (
    sugar <= 10 && // Low sugar
    sodium <= 300 && // Low sodium
    fiber >= 3 && // High fiber
    calories <= 200 // Moderate calories
  );

  return isHealthy ? 'healthy' : 'junk';
}

// Get health classification for meal
router.post('/classify-meal', async (req, res) => {
  try {
    const { nutritionData } = req.body;

    if (!nutritionData || !Array.isArray(nutritionData)) {
      return res.status(400).json({ error: 'Nutrition data required' });
    }

    const classifications = nutritionData.map(food => ({
      name: food.name,
      classification: classifyFoodHealth(food.nutrition),
      confidence: food.confidence
    }));

    const healthyCount = classifications.filter(c => c.classification === 'healthy').length;
    const overallClassification = healthyCount > classifications.length / 2 ? 'healthy' : 'junk';

    res.json({
      classifications,
      overallClassification,
      healthyPercentage: (healthyCount / classifications.length) * 100
    });

  } catch (error) {
    console.error('Meal classification error:', error);
    res.status(500).json({ error: 'Meal classification failed' });
  }
});

// Add conversational chat endpoint for NutriAI assistant
router.post('/chat', async (req, res) => {
  try {
    const { messages = [], systemPrompt, model, message } = req.body || {};

    // Handle both old format (single message) and new format (messages array)
    let userMessage = '';
    if (messages && messages.length > 0) {
      userMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
    } else if (message) {
      userMessage = message.toLowerCase();
    }

    const openAiMessages = [];
    openAiMessages.push({
      role: 'system',
      content:
        systemPrompt ||
        "You are NutriAI, a helpful, friendly nutrition and wellness assistant. Provide practical, safe guidance on nutrition, meal planning, workouts, sleep, stress, and healthy habits. Be concise, empathetic, and avoid medical diagnosis. If asked for medical advice, suggest consulting a professional."
    });

    // Convert client messages (type: 'user' | 'ai') to OpenAI roles
    for (const m of messages) {
      if (!m || !m.content) continue;
      openAiMessages.push({
        role: m.type === 'user' || m.role === 'user' ? 'user' : 'assistant',
        content: String(m.content).slice(0, 8000)
      });
    }

    // If we have a single message, add it to the conversation
    if (message && !messages.length) {
      openAiMessages.push({
        role: 'user',
        content: String(message).slice(0, 8000)
      });
    }

    // Check if we have a valid OpenAI API key
    if (!HAS_VALID_OPENAI_KEY) {
      // Provide helpful fallback responses for common questions
      let fallbackResponse = "I'm currently running in demo mode. Here are some helpful nutrition tips:\n\n";
      
      if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
        fallbackResponse = "👋 Hello! I'm NutriAI, your nutrition assistant. I can help you with:\n";
        fallbackResponse += "• Meal planning and nutrition advice\n";
        fallbackResponse += "• Food recognition and analysis\n";
        fallbackResponse += "• Health and wellness tips\n";
        fallbackResponse += "• Workout recommendations\n\n";
        fallbackResponse += "To enable full AI features, please check your OpenAI API key configuration.";
      } else if (userMessage.includes('nutrition') || userMessage.includes('diet') || userMessage.includes('food') || userMessage.includes('eat')) {
        fallbackResponse = "🍎 General Nutrition Tips:\n\n";
        fallbackResponse += "• Eat a variety of colorful fruits and vegetables\n";
        fallbackResponse += "• Include lean proteins in each meal\n";
        fallbackResponse += "• Choose whole grains over refined grains\n";
        fallbackResponse += "• Stay hydrated with water throughout the day\n";
        fallbackResponse += "• Limit added sugars and processed foods\n\n";
        fallbackResponse += "For personalized nutrition advice, please ensure your OpenAI API key is properly configured.";
      } else if (userMessage.includes('workout') || userMessage.includes('exercise') || userMessage.includes('fitness') || userMessage.includes('train')) {
        fallbackResponse = "💪 Fitness Recommendations:\n\n";
        fallbackResponse += "• Aim for 150 minutes of moderate exercise weekly\n";
        fallbackResponse += "• Include strength training 2-3 times per week\n";
        fallbackResponse += "• Stay active throughout the day\n";
        fallbackResponse += "• Listen to your body and rest when needed\n\n";
        fallbackResponse += "For personalized workout plans, please ensure your OpenAI API key is properly configured.";
      } else {
        fallbackResponse = "I'd be happy to help with your nutrition and wellness questions! ";
        fallbackResponse += "For personalized AI assistance, please ensure your OpenAI API key is properly configured.";
      }
      
      return res.json({ 
        reply: fallbackResponse, 
        demo: true,
        message: "Running in demo mode due to API key validation failure"
      });
    }

    // Validate API key format before making the request
    if (!OPENAI_API_KEY || OPENAI_API_KEY.includes('your-openai-api-key-here')) {
      return res.status(400).json({
        error: 'api_key_missing',
        message: 'OpenAI API key is not properly configured. Please check your .env file.',
        reply: "I'm having trouble connecting to my AI services. Please check your API key configuration and restart the server."
      });
    }

    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: model || 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.3,
          max_tokens: 600
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const reply = response.data?.choices?.[0]?.message?.content || '';
      return res.json({ reply, raw: response.data });
    } catch (openaiError) {
      // Handle specific OpenAI API errors
      if (openaiError.response?.data?.error?.code === 'invalid_api_key') {
        console.error('OpenAI API key validation failed:', openaiError.response.data.error);
        return res.status(401).json({
          error: 'invalid_api_key',
          message: 'OpenAI API key is invalid or expired. Please check your API key and account status.',
          reply: "I'm experiencing authentication issues with my AI services. Please verify your OpenAI API key is valid and your account is active."
        });
      } else if (openaiError.response?.data?.error?.code === 'rate_limit_exceeded') {
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'OpenAI API rate limit exceeded. Please try again later.',
          reply: "I'm currently experiencing high demand. Please try again in a few minutes."
        });
      } else if (openaiError.response?.data?.error?.code === 'insufficient_quota') {
        return res.status(402).json({
          error: 'insufficient_quota',
          message: 'OpenAI API quota exceeded. Please check your billing status.',
          reply: "I've reached my usage limits. Please check your OpenAI account billing status."
        });
      } else {
        // Generic OpenAI error
        console.error('OpenAI API error:', openaiError.response?.data || openaiError.message);
        return res.status(500).json({
          error: 'openai_error',
          message: 'OpenAI service temporarily unavailable. Please try again later.',
          reply: "I'm experiencing technical difficulties. Please try again in a few moments."
        });
      }
    }
  } catch (err) {
    console.error('AI chat error:', err?.response?.data || err.message);
    return res.status(500).json({ 
      error: 'chat_failed', 
      message: err?.response?.data || err.message,
      reply: "I encountered an unexpected error. Please try again or contact support if the issue persists."
    });
  }
});

// OpenAI food recognition function
async function recognizeFoodWithOpenAI(imagePath) {
  try {
    // Convert image to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');

    const response = await axios.post(OPENAI_API_URL, {
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a food recognition expert specializing in global cuisines. Analyze the provided image and identify all visible food items accurately.
          
          CRITICAL: If you cannot clearly see any food items in the image (e.g., if the image is unclear, shows non-food objects, is blank, or contains no recognizable food), return an empty array: []
          
          Only if you can clearly identify actual food items, provide for each one:
          - name: the specific food name (e.g., "dosa", "idli", "vada", "sambar", "chutney", "banana", "apple")
          - confidence: confidence level (0-1) - ONLY use confidence > 0.7 for clearly visible food
          - quantity: estimated quantity
          - unit: unit of measurement (piece, cup, bowl, gram, etc.)
          - description: brief description of the food item
          
          IMPORTANT: Be very specific with food names. 
          - For South Indian food: "dosa", "idli", "vada", "sambar", "coconut chutney", "tomato chutney"
          - For fruits: "banana", "apple", "mango", "grapes"
          - For other cuisines: use specific dish names, not generic terms
          - For common foods: "rice", "bread", "pasta", "chicken", "fish", "vegetables"
          
          Do NOT use generic terms like "fruit salad", "healthy meal", "mixed food", "breakfast".
          Do NOT guess or make up food items if you cannot clearly see them.
          Only identify foods you can see with high confidence (>0.7).
          
          Return the response as a JSON array of food objects without markdown formatting. If no food is visible, return: []`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please identify all food items in this image and provide detailed information about each one.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
      temperature: 0.0
    }, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const content = response.data.choices[0].message.content;
    
    // Parse the JSON response - handle markdown formatting
    try {
      let jsonContent = content;
      
      // Remove markdown code blocks if present
      if (content.includes('```json')) {
        jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (content.includes('```')) {
        jsonContent = content.replace(/```\n?/g, '');
      }
      
      // Clean up any remaining whitespace and fix common JSON issues
      jsonContent = jsonContent.trim();
      
      // Fix common JSON parsing issues
      jsonContent = jsonContent.replace(/,\s*}/g, '}'); // Remove trailing commas
      jsonContent = jsonContent.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays

      // Extract the first JSON array if extra text exists
      if (!jsonContent.trim().startsWith('[')) {
        const start = jsonContent.indexOf('[');
        const end = jsonContent.lastIndexOf(']');
        if (start !== -1 && end !== -1 && end > start) {
          jsonContent = jsonContent.slice(start, end + 1);
        }
      }

      const foods = JSON.parse(jsonContent);
      const foodArray = Array.isArray(foods) ? foods : [foods];
      
      // Filter out foods with low confidence
      const validFoods = foodArray.filter(food => 
        food && food.name && (food.confidence || food.confidence_score || 0) >= 0.7
      );
      
      return validFoods;
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Raw content:', content);
      
      // Try to extract food names from the raw content as a last resort
      try {
        const foodMatches = content.match(/"name":\s*"([^"]+)"/g);
        if (foodMatches && foodMatches.length > 0) {
          const extractedFoods = foodMatches.map(match => {
            const name = match.match(/"name":\s*"([^"]+)"/)[1];
            return {
              name: name,
              confidence: 0.9,
              quantity: 1,
              unit: 'piece',
              description: `Extracted ${name} from response`
            };
          });
          return extractedFoods;
        }
      } catch (extractError) {
        console.error('Failed to extract food names from response');
      }
      
      // Return empty array if parsing fails
      console.log('Failed to parse OpenAI response, returning empty array');
      return [];
    }

  } catch (error) {
    console.error('OpenAI food recognition error:', error);
    // Return empty array if OpenAI fails
    return [];
  }
}

// OpenAI nutrition analysis function
async function getNutritionDataWithOpenAI(foods) {
  try {
    const nutritionData = [];

    for (const food of foods) {
      const foodName = food.name;
      
      const response = await axios.post(OPENAI_API_URL, {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a nutrition expert specializing in accurate nutritional analysis. 
            
            CRITICAL: You must return ONLY a valid JSON object with the exact structure below. No additional text, no markdown formatting, no explanations.
            
            For the given food item, provide nutritional information per 100g serving in this exact JSON format:
            {
              "calories": number,
              "protein": number,
              "carbs": number,
              "fat": number,
              "sugar": number,
              "sodium": number,
              "fiber": number
            }
            
            Guidelines:
            - calories: total calories per 100g
            - protein: grams of protein per 100g
            - carbs: grams of carbohydrates per 100g
            - fat: grams of fat per 100g
            - sugar: grams of sugar per 100g
            - sodium: milligrams of sodium per 100g
            - fiber: grams of dietary fiber per 100g
            
            Provide realistic, accurate nutritional values based on standard food databases.
            Return ONLY the JSON object, nothing else.`
          },
          {
            role: 'user',
            content: `Provide nutritional information for "${foodName}" per 100g serving. Return only the JSON object.`
          }
        ],
        max_tokens: 200,
        temperature: 0.0
      }, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      const content = response.data.choices[0].message.content;
      
      try {
        let jsonContent = content;
        
        // Remove markdown code blocks if present
        if (content.includes('```json')) {
          jsonContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (content.includes('```')) {
          jsonContent = content.replace(/```\n?/g, '');
        }
        
        // Clean up any remaining whitespace and fix common JSON issues
        jsonContent = jsonContent.trim();
        jsonContent = jsonContent.replace(/,\s*}/g, '}'); // Remove trailing commas
        jsonContent = jsonContent.replace(/,\s*]/g, ']'); // Remove trailing commas in arrays
 
         const nutrition = JSON.parse(jsonContent);
         
         // Validate nutrition data
         if (nutrition && typeof nutrition.calories === 'number' && nutrition.calories > 0) {
           nutritionData.push({
             name: foodName,
             nutrition: nutrition,
             confidence: food.confidence || 0.9,
             quantity: food.quantity || 1,
             unit: food.unit || 'serving',
             description: food.description || foodName
           });
         } else {
           console.error(`Invalid nutrition data for ${foodName}:`, nutrition);
           // Fallback to simulation
           const fallbackNutrition = await simulateNutritionAPI(foodName);
           nutritionData.push({
             name: foodName,
             nutrition: fallbackNutrition,
             confidence: food.confidence || 0.9,
             quantity: food.quantity || 1,
             unit: food.unit || 'serving',
             description: food.description || foodName
           });
         }
       } catch (parseError) {
         console.error(`Error parsing nutrition data for ${foodName}:`, parseError);
         console.error('Raw content:', content);
         // Fallback to simulation
         const fallbackNutrition = await simulateNutritionAPI(foodName);
         nutritionData.push({
           name: foodName,
           nutrition: fallbackNutrition,
           confidence: food.confidence || 0.9,
           quantity: food.quantity || 1,
           unit: food.unit || 'serving',
           description: food.description || foodName
         });
       }
     }
 
     return nutritionData;
 
   } catch (error) {
     console.error('OpenAI nutrition analysis error:', error);
     // Fallback to simulation
     return await getNutritionData(foods);
   }
 }

module.exports = router; 