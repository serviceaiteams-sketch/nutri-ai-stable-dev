#!/usr/bin/env node

/**
 * Comprehensive Test Script for NutriAI Oracle
 * Tests all major functionality after bug fixes
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test@nutriai.com',
  password: 'testpass123',
  name: 'Test User'
};

let authToken = null;
let userId = null;

// Test utilities
const log = (message, type = 'INFO') => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`);
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
};

const test = async (name, testFn) => {
  try {
    log(`🧪 Testing: ${name}`);
    await testFn();
    log(`✅ PASS: ${name}`, 'PASS');
    return true;
  } catch (error) {
    log(`❌ FAIL: ${name} - ${error.message}`, 'FAIL');
    return false;
  }
};

// Test functions
const testServerHealth = async () => {
  const response = await axios.get(`${BASE_URL}/api/health`);
  assert(response.status === 200, 'Health check should return 200');
  assert(response.data.status === 'OK', 'Health status should be OK');
};

const testUserRegistration = async () => {
  const response = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
  assert(response.status === 201, 'Registration should return 201');
  assert(response.data.token, 'Registration should return a token');
  assert(response.data.user, 'Registration should return user data');
  
  authToken = response.data.token;
  userId = response.data.user.id;
};

const testUserLogin = async () => {
  const response = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  assert(response.status === 200, 'Login should return 200');
  assert(response.data.token, 'Login should return a token');
  assert(response.data.user, 'Login should return user data');
  
  authToken = response.data.token;
};

const testHealthRecommendations = async () => {
  // First add a health condition
  const conditionResponse = await axios.post(`${BASE_URL}/api/health/conditions`, {
    condition_name: 'Diabetes',
    severity: 'mild',
    diagnosed_date: '2024-01-01'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(conditionResponse.status === 201, 'Health condition creation should return 201');
  
  // Now test recommendations
  const response = await axios.get(`${BASE_URL}/api/health/recommendations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(response.status === 200, 'Health recommendations should return 200');
  assert(Array.isArray(response.data.recommendations), 'Recommendations should be an array');
};

const testAdvancedFeatures = async () => {
  // Test food swap suggestions
  const swapResponse = await axios.post(`${BASE_URL}/api/advanced/food-swap/suggestions`, {
    foodItem: { name: 'biryani' },
    userLocation: 'India',
    dietaryPreferences: ['vegetarian']
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(swapResponse.status === 200, 'Food swap suggestions should return 200');
  assert(swapResponse.data.success, 'Food swap should be successful');
  
  // Test mood logging
  const moodResponse = await axios.post(`${BASE_URL}/api/advanced/mood/log`, {
    mood: 'happy',
    energyLevel: 'high',
    productivity: 'good',
    notes: 'Feeling great today!'
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(moodResponse.status === 200, 'Mood logging should return 200');
  assert(moodResponse.data.success, 'Mood logging should be successful');
};

const testMealLogging = async () => {
  const mealData = {
    meal_type: 'lunch',
    food_items: [
      {
        name: 'Grilled Chicken Salad',
        quantity: 1,
        unit: 'bowl',
        calories: 350,
        protein: 35,
        carbs: 15,
        fat: 12,
        sugar: 8,
        sodium: 450,
        fiber: 8
      }
    ],
    total_nutrition: {
      calories: 350,
      protein: 35,
      carbs: 15,
      fat: 12,
      sugar: 8,
      sodium: 450,
      fiber: 8
    },
    date: new Date().toISOString().split('T')[0]
  };
  
  const response = await axios.post(`${BASE_URL}/api/meals/log`, mealData, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(response.status === 201, 'Meal logging should return 201');
  assert(response.data.success, 'Meal logging should be successful');
};

const testAIEndpoints = async () => {
  // Test AI chat
  const chatResponse = await axios.post(`${BASE_URL}/api/ai/chat`, {
    messages: [
      { type: 'user', content: 'What are the benefits of eating vegetables?' }
    ]
  }, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(chatResponse.status === 200, 'AI chat should return 200');
  assert(chatResponse.data.reply, 'AI chat should return a reply');
};

const testWorkoutRecommendations = async () => {
  const response = await axios.get(`${BASE_URL}/api/workouts/recommendations`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(response.status === 200, 'Workout recommendations should return 200');
  assert(response.data.recommendations, 'Workout recommendations should exist');
};

const testUserProfile = async () => {
  const response = await axios.get(`${BASE_URL}/api/users/profile`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  
  assert(response.status === 200, 'User profile should return 200');
  assert(response.data.user, 'User profile should return user data');
  assert(response.data.user.id === userId, 'User profile should match logged in user');
};

const testTokenValidation = async () => {
  // Test with invalid token
  try {
    await axios.get(`${BASE_URL}/api/users/profile`, {
      headers: { Authorization: 'Bearer invalid-token' }
    });
    throw new Error('Should have failed with invalid token');
  } catch (error) {
    assert(error.response.status === 403, 'Invalid token should return 403');
  }
  
  // Test with no token
  try {
    await axios.get(`${BASE_URL}/api/users/profile`);
    throw new Error('Should have failed with no token');
  } catch (error) {
    assert(error.response.status === 401, 'No token should return 401');
  }
};

// Main test runner
const runTests = async () => {
  log('🚀 Starting Comprehensive NutriAI Oracle Tests');
  log('===============================================');
  
  const tests = [
    { name: 'Server Health Check', fn: testServerHealth },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Token Validation', fn: testTokenValidation },
    { name: 'Health Recommendations', fn: testHealthRecommendations },
    { name: 'Advanced Features', fn: testAdvancedFeatures },
    { name: 'Meal Logging', fn: testMealLogging },
    { name: 'AI Endpoints', fn: testAIEndpoints },
    { name: 'Workout Recommendations', fn: testWorkoutRecommendations },
    { name: 'User Profile', fn: testUserProfile }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of tests) {
    const result = await test(testCase.name, testCase.fn);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }
  
  log('===============================================');
  log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    log('🎉 All tests passed! NutriAI Oracle is working correctly.');
  } else {
    log('⚠️  Some tests failed. Please check the implementation.');
  }
  
  process.exit(failed === 0 ? 0 : 1);
};

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  log(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'ERROR');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught Exception: ${error.message}`, 'ERROR');
  process.exit(1);
});

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(error => {
    log(`Test runner failed: ${error.message}`, 'ERROR');
    process.exit(1);
  });
}

module.exports = {
  test,
  assert,
  log,
  runTests
}; 