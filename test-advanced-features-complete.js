const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test-features@nutriai.com',
  password: 'testpassword123',
  name: 'Test User'
};

let authToken = '';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Setup authentication
async function setupAuth() {
  try {
    log('\n🔐 Setting up authentication...', 'cyan');
    
    // Try to login first
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      authToken = loginResponse.data.token;
      success('Logged in with existing user');
    } catch (loginError) {
      // If login fails, try to register
      info('User not found, registering new user...');
      await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
      
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      authToken = loginResponse.data.token;
      success('Registered and logged in new user');
    }
    
    return true;
  } catch (err) {
    error(`Authentication setup failed: ${err.message}`);
    return false;
  }
}

// Test 1: Micronutrient Tracking & Deficiency Analysis
async function testMicronutrientTracking() {
  log('\n🧪 Testing Micronutrient Tracking & Deficiency Analysis...', 'cyan');
  
  try {
    // Test tracking micronutrients
    const trackingData = {
      date: new Date().toISOString().split('T')[0],
      nutrients: {
        vitamin_c: 45.2,
        vitamin_d: 8.5,
        iron: 6.2,
        calcium: 750,
        cobalamin_b12: 1.8,
        folate_b9: 280
      }
    };
    
    const trackResponse = await axios.post(
      `${BASE_URL}/api/advanced-nutrition/micronutrients/track`,
      trackingData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Micronutrient tracking successful');
    
    // Test deficiency analysis
    const analysisResponse = await axios.get(
      `${BASE_URL}/api/advanced-nutrition/micronutrients/analysis?period=weekly`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Deficiency analysis completed');
    
    if (analysisResponse.data.deficiencies && analysisResponse.data.deficiencies.length > 0) {
      info(`Found ${analysisResponse.data.deficiencies.length} potential deficiencies`);
      analysisResponse.data.deficiencies.forEach(def => {
        warning(`- ${def.nutrient}: ${def.percentage}% of RDA (${def.severity})`);
      });
    } else {
      success('No deficiencies detected');
    }
    
    if (analysisResponse.data.recommendations && analysisResponse.data.recommendations.length > 0) {
      info(`Generated ${analysisResponse.data.recommendations.length} recommendations`);
    }
    
    return true;
  } catch (err) {
    error(`Micronutrient tracking test failed: ${err.message}`);
    return false;
  }
}

// Test 2: Allergen Detection
async function testAllergenDetection() {
  log('\n🔍 Testing AI-Powered Allergen Detection...', 'cyan');
  
  try {
    // Add user allergens
    const allergens = [
      { allergenName: 'peanuts', severity: 'severe', notes: 'Severe reaction' },
      { allergenName: 'milk', severity: 'moderate', notes: 'Lactose intolerant' },
      { allergenName: 'gluten', severity: 'mild', notes: 'Digestive issues' }
    ];
    
    for (const allergen of allergens) {
      try {
        await axios.post(
          `${BASE_URL}/api/advanced-nutrition/allergens/add`,
          allergen,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
      } catch (error) {
        // Handle case where allergen already exists
        if (error.response && error.response.status === 400 && error.response.data.error === 'Allergen already exists') {
          // Allergen already exists, continue
        } else {
          throw error; // Re-throw other errors
        }
      }
    }
    
    success('✅ User allergens added successfully');
    
    // Test allergen detection from food items
    const foodItems = [
      { name: 'Peanut Butter Sandwich', confidence: 0.95 },
      { name: 'Cheese Pizza', confidence: 0.90 },
      { name: 'Wheat Bread', confidence: 0.88 },
      { name: 'Almond Milk', confidence: 0.85 }
    ];
    
    const detectionResponse = await axios.post(
      `${BASE_URL}/api/advanced-nutrition/allergens/detect`,
      { foodItems, mealId: 1 },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Allergen detection completed');
    
    if (detectionResponse.data.detectedAllergens && detectionResponse.data.detectedAllergens.length > 0) {
      warning(`Detected ${detectionResponse.data.detectedAllergens.length} potential allergens:`);
      detectionResponse.data.detectedAllergens.forEach(allergen => {
        error(`- ${allergen.allergen} in ${allergen.food} (${allergen.severity} severity)`);
      });
    } else {
      success('No allergens detected in food items');
    }
    
    if (detectionResponse.data.warnings && detectionResponse.data.warnings.length > 0) {
      warning(`Generated ${detectionResponse.data.warnings.length} safety warnings`);
    }
    
    return true;
  } catch (err) {
    error(`Allergen detection test failed: ${err.message}`);
    return false;
  }
}

// Test 3: Dynamic Meal Planning
async function testDynamicMealPlanning() {
  log('\n🍽️ Testing Dynamic Meal Planning & Shopping Lists...', 'cyan');
  
  try {
    // Generate adaptive meal plan
    const mealPlanRequest = {
      planType: 'weekly',
      dietaryPreferences: ['vegetarian', 'low_sodium'],
      location: 'north_america',
      goal: 'weight_loss',
      calorieTarget: 1800,
      mealsPerDay: 3,
      snacksPerDay: 2
    };
    
    const mealPlanResponse = await axios.post(
      `${BASE_URL}/api/dynamic-meal-planning/generate`,
      mealPlanRequest,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Dynamic meal plan generated successfully');
    
    const mealPlanId = mealPlanResponse.data.mealPlanId;
    info(`Generated meal plan ID: ${mealPlanId}`);
    
    if (mealPlanResponse.data.mealPlan && mealPlanResponse.data.mealPlan.meals) {
      info(`Meal plan contains ${mealPlanResponse.data.mealPlan.meals.length} days`);
    }
    
    if (mealPlanResponse.data.shoppingList) {
      info(`Shopping list with ${mealPlanResponse.data.shoppingList.totalItems} items generated`);
      info(`Estimated cost: $${mealPlanResponse.data.shoppingList.estimatedCost}`);
    }
    
    // Test meal plan adaptation
    const adaptationData = {
      deviations: [
        { type: 'meal_skip', mealType: 'breakfast', date: '2024-01-15' },
        { type: 'substitution', original: 'quinoa', substitute: 'rice', reason: 'preference' }
      ],
      feedback: 'User prefers simpler breakfast options'
    };
    
    const adaptationResponse = await axios.post(
      `${BASE_URL}/api/dynamic-meal-planning/adapt/${mealPlanId}`,
      adaptationData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Meal plan adaptation completed');
    
    // Test shopping list optimization
    const shoppingListResponse = await axios.get(
      `${BASE_URL}/api/dynamic-meal-planning/shopping-list/${mealPlanId}?location=north_america&marketType=supermarket`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Optimized shopping list retrieved');
    
    return true;
  } catch (err) {
    error(`Dynamic meal planning test failed: ${err.message}`);
    return false;
  }
}

// Test 4: Enhanced Food Swap Suggestions
async function testEnhancedFoodSwaps() {
  log('\n🔄 Testing Real-Time Food Swap Suggestions...', 'cyan');
  
  try {
    // Test real-time food swap suggestions
    const detectedFoods = [
      { name: 'White Rice', confidence: 0.95 },
      { name: 'Ground Beef', confidence: 0.90 },
      { name: 'White Bread', confidence: 0.88 },
      { name: 'Regular Pasta', confidence: 0.85 }
    ];
    
    const swapRequest = {
      detectedFoods,
      userLocation: 'north_america',
      dietaryRestrictions: ['gluten'],
      healthGoals: ['weight_loss', 'heart_health'],
      culturalPreferences: ['traditional']
    };
    
    const swapResponse = await axios.post(
      `${BASE_URL}/api/enhanced-food-swaps/suggest`,
      swapRequest,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Food swap suggestions generated');
    
    if (swapResponse.data.swapSuggestions && swapResponse.data.swapSuggestions.length > 0) {
      info(`Generated suggestions for ${swapResponse.data.swapSuggestions.length} foods`);
      
      swapResponse.data.swapSuggestions.forEach(swap => {
        info(`- ${swap.originalFood.name}:`);
        swap.suggestions.slice(0, 2).forEach(suggestion => {
          success(`  → ${suggestion.name} (Health Score: ${suggestion.healthScore})`);
        });
      });
    }
    
    // Test feedback on suggestions
    const feedbackData = {
      originalFood: 'White Rice',
      suggestedFood: 'Quinoa',
      accepted: true,
      feedback: 'Great suggestion, will try this!'
    };
    
    const feedbackResponse = await axios.post(
      `${BASE_URL}/api/enhanced-food-swaps/feedback`,
      feedbackData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Swap feedback recorded');
    
    // Test analytics
    const analyticsResponse = await axios.get(
      `${BASE_URL}/api/enhanced-food-swaps/analytics?period=monthly`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Swap analytics retrieved');
    
    return true;
  } catch (err) {
    error(`Enhanced food swaps test failed: ${err.message}`);
    return false;
  }
}

// Test 5: AI Portion Estimation with Visual Feedback
async function testAIPortionEstimation() {
  log('\n📏 Testing AI-Driven Portion Size Estimation...', 'cyan');
  
  try {
    // Create a mock image file for testing
    const testImagePath = path.join(__dirname, 'test-food-image.jpg');
    
    // Check if test image exists, if not create a simple one
    if (!fs.existsSync(testImagePath)) {
      // Create a small test file (in real scenario, would be an actual image)
      fs.writeFileSync(testImagePath, 'Mock image data for testing');
      info('Created mock test image');
    }
    
    // Test portion estimation
    const FormData = require('form-data');
    const formData = new FormData();
    
    formData.append('image', fs.createReadStream(testImagePath));
    formData.append('foodItems', JSON.stringify([
      { name: 'Grilled Chicken Breast' },
      { name: 'Steamed Broccoli' },
      { name: 'Brown Rice' }
    ]));
    formData.append('mealId', '1');
    
    const estimationResponse = await axios.post(
      `${BASE_URL}/api/ai-portion-estimation/estimate`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          ...formData.getHeaders()
        }
      }
    );
    
    success('✅ AI portion estimation completed');
    
    if (estimationResponse.data.analysisResults) {
      const results = estimationResponse.data.analysisResults;
      info(`Overall confidence: ${Math.round(results.overallConfidence * 100)}%`);
      info(`Detected ${results.detectedReferenceObjects.length} reference objects`);
      info(`Analyzed ${results.portionAnalysis.length} food items`);
      
      if (results.portionAnalysis.length > 0) {
        results.portionAnalysis.forEach(portion => {
          info(`- ${portion.foodName}: ${portion.estimatedMass}g (${portion.portionSize})`);
        });
      }
    }
    
    // Test feedback on estimation
    const estimationId = estimationResponse.data.estimationId;
    const feedbackData = {
      accuracyRating: 4.2,
      actualPortions: [
        { food: 'Grilled Chicken Breast', actualMass: 150 },
        { food: 'Steamed Broccoli', actualMass: 80 },
        { food: 'Brown Rice', actualMass: 120 }
      ],
      feedback: 'Pretty accurate estimates!'
    };
    
    const feedbackResponse = await axios.post(
      `${BASE_URL}/api/ai-portion-estimation/feedback/${estimationId}`,
      feedbackData,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Portion estimation feedback recorded');
    
    // Test analytics
    const analyticsResponse = await axios.get(
      `${BASE_URL}/api/ai-portion-estimation/analytics?period=monthly`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Portion estimation analytics retrieved');
    
    // Clean up test file
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    
    return true;
  } catch (err) {
    error(`AI portion estimation test failed: ${err.message}`);
    return false;
  }
}

// Test 6: Enhanced Mood & Nutrition Correlation Analysis
async function testEnhancedMoodAnalysis() {
  log('\n🧠 Testing Enhanced Mood & Nutrition Correlation Analysis...', 'cyan');
  
  try {
    // Log multiple mood entries
    const moodEntries = [
      {
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeOfDay: '08:30',
        moodScore: 7,
        energyLevel: 6,
        productivityScore: 8,
        stressLevel: 4,
        sleepQuality: 8,
        physicalSymptoms: ['headache'],
        mentalClarity: 7,
        socialEngagement: 6,
        exerciseCompleted: true,
        notes: 'Good morning, exercised before work'
      },
      {
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        timeOfDay: '14:30',
        moodScore: 5,
        energyLevel: 4,
        productivityScore: 5,
        stressLevel: 7,
        sleepQuality: 5,
        physicalSymptoms: ['fatigue', 'difficulty_concentrating'],
        mentalClarity: 4,
        socialEngagement: 3,
        exerciseCompleted: false,
        notes: 'Feeling tired after lunch'
      },
      {
        date: new Date().toISOString().split('T')[0],
        timeOfDay: '19:00',
        moodScore: 8,
        energyLevel: 7,
        productivityScore: 7,
        stressLevel: 3,
        sleepQuality: 7,
        physicalSymptoms: [],
        mentalClarity: 8,
        socialEngagement: 8,
        exerciseCompleted: true,
        notes: 'Great evening, feeling energetic'
      }
    ];
    
    // Log each mood entry
    for (const entry of moodEntries) {
      await axios.post(
        `${BASE_URL}/api/enhanced-mood-analysis/log`,
        entry,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
    }
    
    success('✅ Mood entries logged successfully');
    
    // Perform comprehensive correlation analysis
    const analysisRequest = {
      analysisPeriod: 'weekly',
      focusAreas: ['mood', 'energy', 'productivity'],
      includeNutrition: true,
      includeTiming: true,
      includeExercise: true
    };
    
    const analysisResponse = await axios.post(
      `${BASE_URL}/api/enhanced-mood-analysis/analyze`,
      analysisRequest,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Comprehensive correlation analysis completed');
    
    if (analysisResponse.data.correlationAnalysis) {
      const analysis = analysisResponse.data.correlationAnalysis;
      info(`Analysis confidence: ${Math.round(analysis.overallConfidence * 100)}%`);
      info(`Found ${analysis.significantPatterns.length} significant patterns`);
      
      if (analysis.significantPatterns.length > 0) {
        analysis.significantPatterns.forEach(pattern => {
          warning(`- ${pattern.type}: ${pattern.description}`);
        });
      }
    }
    
    if (analysisResponse.data.recommendations && analysisResponse.data.recommendations.length > 0) {
      info(`Generated ${analysisResponse.data.recommendations.length} personalized recommendations`);
      analysisResponse.data.recommendations.forEach(rec => {
        success(`- ${rec.title}: ${rec.description}`);
      });
    }
    
    // Test mood history and trends
    const historyResponse = await axios.get(
      `${BASE_URL}/api/enhanced-mood-analysis/history?period=weekly&metric=mood_score`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Mood history and trends retrieved');
    
    // Test real-time alerts
    const alertsResponse = await axios.get(
      `${BASE_URL}/api/enhanced-mood-analysis/alerts`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Real-time mood alerts checked');
    
    if (alertsResponse.data.alerts && alertsResponse.data.alerts.length > 0) {
      warning(`Found ${alertsResponse.data.alerts.length} mood alerts`);
    } else {
      success('No concerning mood patterns detected');
    }
    
    return true;
  } catch (err) {
    error(`Enhanced mood analysis test failed: ${err.message}`);
    return false;
  }
}

// Test 7: Integration Test - Full Workflow
async function testFullWorkflow() {
  log('\n🔗 Testing Full Integrated Workflow...', 'cyan');
  
  try {
    info('Simulating complete user journey...');
    
    // 1. User logs a meal with potential allergens
    info('1. Logging meal with allergen detection...');
    const foodItems = [
      { name: 'Peanut Thai Curry', confidence: 0.9 },
      { name: 'Jasmine Rice', confidence: 0.95 }
    ];
    
    const allergenCheck = await axios.post(
      `${BASE_URL}/api/advanced-nutrition/allergens/detect`,
      { foodItems, mealId: 2 },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    // 2. Get food swap suggestions if allergens detected
    if (allergenCheck.data.detectedAllergens && allergenCheck.data.detectedAllergens.length > 0) {
      info('2. Getting safe food alternatives...');
      const swapResponse = await axios.post(
        `${BASE_URL}/api/enhanced-food-swaps/suggest`,
        {
          detectedFoods: foodItems,
          userLocation: 'south_asia',
          healthGoals: ['allergen_free'],
          culturalPreferences: ['traditional']
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      info('Safe alternatives suggested');
    }
    
    // 3. Track micronutrients from the meal
    info('3. Tracking micronutrients...');
    await axios.post(
      `${BASE_URL}/api/advanced-nutrition/micronutrients/track`,
      {
        date: new Date().toISOString().split('T')[0],
        nutrients: {
          vitamin_a: 120,
          vitamin_c: 75,
          iron: 8.5,
          calcium: 450
        }
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    // 4. Log mood after meal
    info('4. Logging post-meal mood...');
    await axios.post(
      `${BASE_URL}/api/enhanced-mood-analysis/log`,
      {
        moodScore: 8,
        energyLevel: 7,
        productivityScore: 8,
        stressLevel: 3,
        notes: 'Feeling great after meal'
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    // 5. Generate personalized meal plan based on data
    info('5. Generating personalized meal plan...');
    await axios.post(
      `${BASE_URL}/api/dynamic-meal-planning/generate`,
      {
        planType: 'weekly',
        dietaryPreferences: ['allergen_free'],
        location: 'south_asia',
        goal: 'maintenance',
        calorieTarget: 2000
      },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    success('✅ Full integrated workflow completed successfully');
    return true;
  } catch (err) {
    error(`Integrated workflow test failed: ${err.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  log('🚀 Starting NutriAI Oracle Advanced Features Test Suite', 'magenta');
  log('================================================================', 'magenta');
  
  // Setup
  const authSuccess = await setupAuth();
  if (!authSuccess) {
    error('Authentication setup failed. Aborting tests.');
    return;
  }
  
  let passed = 0;
  let total = 0;
  
  // Run all tests
  const tests = [
    { name: 'Micronutrient Tracking & Deficiency Analysis', func: testMicronutrientTracking },
    { name: 'AI-Powered Allergen Detection', func: testAllergenDetection },
    { name: 'Dynamic Meal Planning & Shopping Lists', func: testDynamicMealPlanning },
    { name: 'Real-Time Food Swap Suggestions', func: testEnhancedFoodSwaps },
    { name: 'AI Portion Estimation with Visual Feedback', func: testAIPortionEstimation },
    { name: 'Enhanced Mood & Nutrition Correlation', func: testEnhancedMoodAnalysis },
    { name: 'Full Integrated Workflow', func: testFullWorkflow }
  ];
  
  for (const test of tests) {
    total++;
    const result = await test.func();
    if (result) {
      passed++;
      success(`${test.name} - PASSED`);
    } else {
      error(`${test.name} - FAILED`);
    }
    log(''); // Empty line for readability
  }
  
  // Final summary
  log('================================================================', 'magenta');
  log('🎯 TEST SUMMARY', 'magenta');
  log('================================================================', 'magenta');
  log(`Total Tests: ${total}`, 'white');
  log(`Passed: ${passed}`, passed === total ? 'green' : 'yellow');
  log(`Failed: ${total - passed}`, total - passed === 0 ? 'green' : 'red');
  log(`Success Rate: ${Math.round((passed / total) * 100)}%`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 All advanced features are working correctly!', 'green');
    log('✅ NutriAI Oracle is ready for production with advanced AI capabilities!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Please check the errors above.', 'yellow');
  }
  
  log('\n🏁 Advanced Features Testing Complete', 'magenta');
}

// Run tests
runAllTests().catch(err => {
  error(`Test runner failed: ${err.message}`);
  process.exit(1);
}); 