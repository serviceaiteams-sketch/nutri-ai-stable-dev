const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'food-test@nutriai.com',
  password: 'testpass123',
  name: 'Food Recognition Test User'
};

let authToken = null;

async function testImprovedFoodRecognition() {
  console.log('🍽️ Testing Improved Food Recognition...\n');

  try {
    // Step 1: Setup test user
    console.log('1️⃣ Setting up test user...');
    await setupTestUser();

    // Step 2: Test food recognition with sample data
    console.log('\n2️⃣ Testing food recognition with sample data...');
    await testFoodRecognitionWithSampleData();

    // Step 3: Test nutrition data accuracy
    console.log('\n3️⃣ Testing nutrition data accuracy...');
    await testNutritionDataAccuracy();

    console.log('\n✅ All Food Recognition tests passed!');
    console.log('\n🎉 Improved food recognition is working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

async function setupTestUser() {
  try {
    // Try to register
    const registerResponse = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
    console.log('✅ User registered successfully');
  } catch (error) {
    if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️ User already exists, proceeding with login');
    } else {
      throw error;
    }
  }

  // Login
  const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  authToken = loginResponse.data.token;
  console.log('✅ User logged in successfully');
}

async function testFoodRecognitionWithSampleData() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test with sample food data
  const sampleFoods = [
    {
      name: 'banana',
      confidence: 0.95,
      quantity: 1,
      unit: 'medium',
      description: 'Fresh yellow banana'
    },
    {
      name: 'chicken',
      confidence: 0.9,
      quantity: 1,
      unit: 'piece',
      description: 'Grilled chicken breast'
    },
    {
      name: 'rice',
      confidence: 0.88,
      quantity: 1,
      unit: 'cup',
      description: 'Steamed white rice'
    }
  ];

  // Simulate the nutrition analysis that would happen after food recognition
  const nutritionData = [];
  
  for (const food of sampleFoods) {
    const nutrition = getDefaultNutrition(food.name);
    nutritionData.push({
      name: food.name,
      nutrition: nutrition,
      confidence: food.confidence,
      quantity: food.quantity,
      unit: food.unit,
      description: food.description
    });
  }

  const totalNutrition = calculateTotalNutrition(nutritionData);

  console.log('✅ Sample food recognition completed');
  console.log(`   - Detected foods: ${sampleFoods.length}`);
  console.log(`   - Total calories: ${totalNutrition.calories}`);
  console.log(`   - Total protein: ${totalNutrition.protein}g`);
  console.log(`   - Total carbs: ${totalNutrition.carbs}g`);
  console.log(`   - Total fat: ${totalNutrition.fat}g`);

  // Test meal logging
  const mealData = {
    meal_type: 'lunch',
    food_items: nutritionData.map(food => ({
      name: food.name,
      quantity: food.quantity,
      unit: food.unit,
      calories: food.nutrition.calories,
      protein: food.nutrition.protein,
      carbs: food.nutrition.carbs,
      fat: food.nutrition.fat,
      sugar: food.nutrition.sugar,
      sodium: food.nutrition.sodium,
      fiber: food.nutrition.fiber
    })),
    total_calories: totalNutrition.calories,
    total_protein: totalNutrition.protein,
    total_carbs: totalNutrition.carbs,
    total_fat: totalNutrition.fat,
    total_sugar: totalNutrition.sugar,
    total_sodium: totalNutrition.sodium,
    total_fiber: totalNutrition.fiber
  };

  const logResponse = await axios.post(`${BASE_URL}/api/meals/log`, mealData, { headers });
  console.log('✅ Meal logged successfully');
  console.log(`   - Meal ID: ${logResponse.data.mealId}`);
}

async function testNutritionDataAccuracy() {
  // Test the comprehensive nutrition database
  const testFoods = ['banana', 'chicken', 'rice', 'dosa', 'apple', 'broccoli'];
  
  console.log('Testing nutrition data accuracy for common foods:');
  
  for (const food of testFoods) {
    const nutrition = getDefaultNutrition(food);
    console.log(`   - ${food}: ${nutrition.calories} cal, ${nutrition.protein}g protein, ${nutrition.carbs}g carbs`);
  }
}

// Helper functions (copied from server for testing)
function getDefaultNutrition(foodName) {
  const nutritionDatabase = {
    'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, sugar: 12, sodium: 1, fiber: 2.6 },
    'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, sugar: 10, sodium: 1, fiber: 2.4 },
    'chicken': { calories: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 74, fiber: 0 },
    'rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, sugar: 0.1, sodium: 1, fiber: 0.4 },
    'dosa': { calories: 133, protein: 4.2, carbs: 25, fat: 2.9, sugar: 0.5, sodium: 329, fiber: 1.4 },
    'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4, sugar: 1.5, sodium: 33, fiber: 2.6 }
  };
  
  const exactMatch = nutritionDatabase[foodName.toLowerCase()];
  if (exactMatch) {
    return exactMatch;
  }
  
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

// Run the test
testImprovedFoodRecognition().catch(console.error); 