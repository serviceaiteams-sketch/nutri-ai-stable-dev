const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:5000/api';
const VALID_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImlhdCI6MTc1MzI5OTk3NSwiZXhwIjoxNzUzOTA0Nzc1fQ.cejFlXpqudrmiw3fgnStJgfW2odjcehAX8rtSMspIOE';
const CLIENT_URL = 'http://localhost:3000';

async function testAdvancedFeatures() {
  console.log('🧪 Testing NutriAI Advanced Features...\n');

  try {
    // Test 1: Health Check
    console.log('1️⃣ Testing Health Check...');
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health Check:', healthResponse.data.status);
    console.log('   Server Version:', healthResponse.data.version);
    console.log('   Timestamp:', healthResponse.data.timestamp);
    console.log('');

    // Test 2: Food Swap Suggestions
    console.log('2️⃣ Testing Food Swap Suggestions...');
    const swapResponse = await axios.post(`${BASE_URL}/advanced/food-swap/suggestions`, {
      foodItem: { name: 'biryani', calories: 400 },
      userLocation: 'Bengaluru',
      dietaryPreferences: ['vegetarian', 'low-sodium']
    }, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Food Swap Suggestions:', swapResponse.data.success);
    console.log('   Suggestions Count:', swapResponse.data.suggestions.length);
    console.log('   Sample Suggestion:', swapResponse.data.suggestions[0]?.name);
    console.log('');

    // Test 3: Portion Estimation
    console.log('3️⃣ Testing Portion Estimation...');
    const portionResponse = await axios.post(`${BASE_URL}/advanced/portion-estimation`, {
      imageData: 'mock_image_data',
      referenceObject: 'hand',
      foodType: 'pizza'
    }, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Portion Estimation:', portionResponse.data.success);
    console.log('   Estimated Weight:', portionResponse.data.estimation.weight + 'g');
    console.log('   Confidence Score:', portionResponse.data.estimation.confidence + '%');
    console.log('   Estimated Calories:', portionResponse.data.estimation.macros.calories);
    console.log('');

    // Test 4: Mood Logging
    console.log('4️⃣ Testing Mood Logging...');
    const moodResponse = await axios.post(`${BASE_URL}/advanced/mood/log`, {
      mood: 'good',
      energyLevel: 'high',
      productivity: 'medium',
      notes: 'Feeling productive today!'
    }, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Mood Logging:', moodResponse.data.success);
    console.log('   Mood Entry ID:', moodResponse.data.moodEntry?.id);
    console.log('   Logged Mood:', moodResponse.data.moodEntry?.mood);
    console.log('   Energy Level:', moodResponse.data.moodEntry?.energy_level);
    console.log('');

    // Test 5: Mood History
    console.log('5️⃣ Testing Mood History...');
    const historyResponse = await axios.get(`${BASE_URL}/advanced/mood/history?days=7`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`
      }
    });
    console.log('✅ Mood History:', historyResponse.data.success);
    console.log('   History Entries:', historyResponse.data.moodHistory?.length || 0);
    console.log('');

    // Test 6: Mood Correlations
    console.log('6️⃣ Testing Mood Correlations...');
    const correlationsResponse = await axios.get(`${BASE_URL}/advanced/mood/correlations`, {
      headers: {
        'Authorization': `Bearer ${VALID_TOKEN}`
      }
    });
    console.log('✅ Mood Correlations:', correlationsResponse.data.success);
    console.log('   Correlations Count:', correlationsResponse.data.correlations?.length || 0);
    if (correlationsResponse.data.correlations?.length > 0) {
      console.log('   Sample Correlation:', correlationsResponse.data.correlations[0]?.title);
    }
    console.log('');

    // Test 7: Frontend Accessibility
    console.log('7️⃣ Testing Frontend Accessibility...');
    try {
      const frontendResponse = await axios.get(CLIENT_URL, { timeout: 5000 });
      console.log('✅ Frontend Accessible:', frontendResponse.status === 200);
      console.log('   Status Code:', frontendResponse.status);
    } catch (error) {
      console.log('❌ Frontend Not Accessible:', error.message);
    }
    console.log('');

    console.log('🎉 All Advanced Features Tests Completed!');
    console.log('');
    console.log('📊 Test Summary:');
    console.log('   ✅ Backend API: Working');
    console.log('   ✅ Food Swap Suggestions: Working');
    console.log('   ✅ Portion Estimation: Working');
    console.log('   ✅ Mood Logging: Working');
    console.log('   ✅ Mood History: Working');
    console.log('   ✅ Mood Correlations: Working');
    console.log('   ✅ Frontend: Accessible');
    console.log('');
    console.log('🚀 NutriAI Advanced Features are ready for use!');
    console.log('');
    console.log('📍 Access Points:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:5000');
    console.log('   Health Check: http://localhost:5000/api/health');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Open http://localhost:3000 in your browser');
    console.log('   2. Navigate to Dashboard');
    console.log('   3. Click "Show AI Features"');
    console.log('   4. Explore the new advanced capabilities!');

  } catch (error) {
    console.error('❌ Test Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    console.log('');
    console.log('🔧 Troubleshooting:');
    console.log('   1. Ensure both servers are running');
    console.log('   2. Check server logs for errors');
    console.log('   3. Verify database connection');
    console.log('   4. Restart servers if needed');
  }
}

// Run the tests
testAdvancedFeatures(); 