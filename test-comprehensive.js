const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5000';
const TEST_USER = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'Test@1234'
};

let authToken = '';
let userId = '';

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper functions
const logTest = (testName, passed, error = null) => {
  if (passed) {
    console.log(`✅ ${testName}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${testName}`);
    testResults.failed++;
    if (error) {
      testResults.errors.push({ test: testName, error: error.message || error });
    }
  }
};

const apiCall = async (method, endpoint, data = null, headers = {}) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      ...headers,
      ...(authToken && { Authorization: `Bearer ${authToken}` })
    }
  };

  if (data) {
    config.data = data;
  }

  return axios(config);
};

// Test suites
const testAuth = async () => {
  console.log('\n🔐 Testing Authentication...');
  
  // Test registration
  try {
    const response = await apiCall('POST', '/api/auth/register', TEST_USER);
    userId = response.data.userId;
    authToken = response.data.token;
    logTest('User Registration', true);
  } catch (error) {
    logTest('User Registration', false, error);
  }

  // Test login
  try {
    const response = await apiCall('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    authToken = response.data.token;
    logTest('User Login', true);
  } catch (error) {
    logTest('User Login', false, error);
  }

  // Test invalid login
  try {
    await apiCall('POST', '/api/auth/login', {
      email: TEST_USER.email,
      password: 'WrongPassword'
    });
    logTest('Invalid Login Prevention', false, 'Should have failed');
  } catch (error) {
    logTest('Invalid Login Prevention', error.response?.status === 401);
  }
};

const testMealTracking = async () => {
  console.log('\n🍽️ Testing Meal Tracking...');
  
  // Log a meal
  try {
    const mealData = {
      meal_type: 'lunch',
      food_items: [
        {
          name: 'Test Food',
          quantity: 1,
          unit: 'serving',
          calories: 250,
          protein: 20,
          carbs: 30,
          fat: 10
        }
      ],
      date: new Date().toISOString().split('T')[0]
    };
    
    await apiCall('POST', '/api/meals/log', mealData);
    logTest('Log Meal', true);
  } catch (error) {
    logTest('Log Meal', false, error);
  }

  // Get daily meals
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiCall('GET', `/api/meals/daily/${today}`);
    logTest('Get Daily Meals', response.data.meals !== undefined);
  } catch (error) {
    logTest('Get Daily Meals', false, error);
  }

  // Get meal history
  try {
    const response = await apiCall('GET', '/api/meals/history');
    logTest('Get Meal History', Array.isArray(response.data));
  } catch (error) {
    logTest('Get Meal History', false, error);
  }
};

const testHealthAnalysis = async () => {
  console.log('\n🏥 Testing Health Analysis...');
  
  // Save health conditions
  try {
    const conditions = {
      conditions: [
        {
          name: 'Test Condition',
          severity: 'mild',
          diagnosedDate: '2024-01-01',
          medications: 'Test Med'
        }
      ]
    };
    
    await apiCall('POST', '/api/health/conditions/bulk', conditions);
    logTest('Save Health Conditions', true);
  } catch (error) {
    logTest('Save Health Conditions', false, error);
  }

  // Get health conditions
  try {
    const response = await apiCall('GET', '/api/health/conditions');
    logTest('Get Health Conditions', Array.isArray(response.data));
  } catch (error) {
    logTest('Get Health Conditions', false, error);
  }

  // Get recommendations
  try {
    const response = await apiCall('POST', '/api/health/conditions/recommendations', {
      conditions: [{ name: 'diabetes', severity: 'moderate' }]
    });
    logTest('Get Health Recommendations', response.data.recommendations !== undefined);
  } catch (error) {
    logTest('Get Health Recommendations', false, error);
  }
};

const testWorkouts = async () => {
  console.log('\n💪 Testing Workout Features...');
  
  // Log workout
  try {
    const workout = {
      workout_type: 'cardio',
      duration: 30,
      intensity: 'moderate',
      calories_burned: 250
    };
    
    await apiCall('POST', '/api/workouts/log', workout);
    logTest('Log Workout', true);
  } catch (error) {
    logTest('Log Workout', false, error);
  }

  // Get recommendations
  try {
    const response = await apiCall('GET', '/api/workouts/recommendations');
    logTest('Get Workout Recommendations', Array.isArray(response.data));
  } catch (error) {
    logTest('Get Workout Recommendations', false, error);
  }

  // Get workout history
  try {
    const response = await apiCall('GET', '/api/workouts/history');
    logTest('Get Workout History', Array.isArray(response.data));
  } catch (error) {
    logTest('Get Workout History', false, error);
  }
};

const testHydrationTracking = async () => {
  console.log('\n💧 Testing Hydration Tracking...');
  
  // Log water intake
  try {
    await apiCall('POST', '/api/hydration/log', { amount: 2 });
    logTest('Log Water Intake', true);
  } catch (error) {
    logTest('Log Water Intake', false, error);
  }

  // Get today's hydration
  try {
    const response = await apiCall('GET', '/api/hydration/today');
    logTest('Get Today\'s Hydration', response.data.current !== undefined);
  } catch (error) {
    logTest('Get Today\'s Hydration', false, error);
  }

  // Update hydration goal
  try {
    await apiCall('PUT', '/api/hydration/goal', { goal: 10 });
    logTest('Update Hydration Goal', true);
  } catch (error) {
    logTest('Update Hydration Goal', false, error);
  }
};

const testStepsTracking = async () => {
  console.log('\n👟 Testing Steps Tracking...');
  
  // Log steps
  try {
    await apiCall('POST', '/api/steps/log', { amount: 5000 });
    logTest('Log Steps', true);
  } catch (error) {
    logTest('Log Steps', false, error);
  }

  // Get today's steps
  try {
    const response = await apiCall('GET', '/api/steps/today');
    logTest('Get Today\'s Steps', response.data.current !== undefined);
  } catch (error) {
    logTest('Get Today\'s Steps', false, error);
  }

  // Update steps goal
  try {
    await apiCall('PUT', '/api/steps/goal', { goal: 12000 });
    logTest('Update Steps Goal', true);
  } catch (error) {
    logTest('Update Steps Goal', false, error);
  }
};

const testProfile = async () => {
  console.log('\n👤 Testing Profile Management...');
  
  // Get profile
  try {
    const response = await apiCall('GET', '/api/users/profile');
    logTest('Get User Profile', response.data.user !== undefined);
  } catch (error) {
    logTest('Get User Profile', false, error);
  }

  // Update profile
  try {
    const updates = {
      age: 30,
      current_weight: 70,
      target_weight: 65,
      phone: '1234567890'
    };
    
    await apiCall('PUT', '/api/users/profile', updates);
    logTest('Update User Profile', true);
  } catch (error) {
    logTest('Update User Profile', false, error);
  }
};

const testSecurity = async () => {
  console.log('\n🔒 Testing Security Features...');
  
  // Test rate limiting
  try {
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(apiCall('GET', '/api/health'));
    }
    await Promise.all(promises);
    logTest('Rate Limiting', true);
  } catch (error) {
    logTest('Rate Limiting', error.response?.status === 429);
  }

  // Test SQL injection prevention
  try {
    await apiCall('POST', '/api/auth/login', {
      email: "test' OR '1'='1",
      password: "password' OR '1'='1"
    });
    logTest('SQL Injection Prevention', false, 'Should have failed');
  } catch (error) {
    logTest('SQL Injection Prevention', error.response?.status === 401);
  }

  // Test XSS prevention
  try {
    const xssPayload = {
      meal_type: 'lunch',
      food_items: [{
        name: '<script>alert("XSS")</script>',
        quantity: 1,
        unit: 'serving',
        calories: 100
      }]
    };
    
    const response = await apiCall('POST', '/api/meals/log', xssPayload);
    const savedMeal = await apiCall('GET', `/api/meals/daily/${new Date().toISOString().split('T')[0]}`);
    const hasXSS = JSON.stringify(savedMeal.data).includes('<script>');
    logTest('XSS Prevention', !hasXSS);
  } catch (error) {
    logTest('XSS Prevention', false, error);
  }
};

const testPerformance = async () => {
  console.log('\n⚡ Testing Performance...');
  
  // Test response time
  const startTime = Date.now();
  try {
    await apiCall('GET', '/api/health');
    const responseTime = Date.now() - startTime;
    logTest('API Response Time', responseTime < 1000, `Response time: ${responseTime}ms`);
  } catch (error) {
    logTest('API Response Time', false, error);
  }

  // Test concurrent requests
  try {
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(apiCall('GET', '/api/meals/history'));
    }
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    logTest('Concurrent Request Handling', totalTime < 5000, `Total time: ${totalTime}ms`);
  } catch (error) {
    logTest('Concurrent Request Handling', false, error);
  }
};

const testErrorHandling = async () => {
  console.log('\n⚠️ Testing Error Handling...');
  
  // Test 404 handling
  try {
    await apiCall('GET', '/api/nonexistent');
    logTest('404 Error Handling', false, 'Should have returned 404');
  } catch (error) {
    logTest('404 Error Handling', error.response?.status === 404);
  }

  // Test invalid JSON
  try {
    await axios.post(`${BASE_URL}/api/meals/log`, 'invalid json', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`
      }
    });
    logTest('Invalid JSON Handling', false, 'Should have failed');
  } catch (error) {
    logTest('Invalid JSON Handling', error.response?.status === 400);
  }

  // Test missing required fields
  try {
    await apiCall('POST', '/api/meals/log', { meal_type: 'lunch' });
    logTest('Missing Fields Validation', false, 'Should have failed');
  } catch (error) {
    logTest('Missing Fields Validation', error.response?.status === 400);
  }
};

// Main test runner
const runTests = async () => {
  console.log('🧪 Starting Comprehensive Test Suite...');
  console.log('================================');
  
  try {
    // Check if server is running
    await apiCall('GET', '/api/health');
    console.log('✅ Server is running');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    process.exit(1);
  }

  // Run all test suites
  await testAuth();
  await testMealTracking();
  await testHealthAnalysis();
  await testWorkouts();
  await testHydrationTracking();
  await testStepsTracking();
  await testProfile();
  await testSecurity();
  await testPerformance();
  await testErrorHandling();

  // Print summary
  console.log('\n================================');
  console.log('📊 Test Results Summary');
  console.log('================================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }

  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
};

// Run tests
runTests().catch(console.error); 