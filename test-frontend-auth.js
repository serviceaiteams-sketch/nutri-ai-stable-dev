const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'frontend-test@nutriai.com',
  password: 'testpass123',
  name: 'Frontend Test User'
};

async function testFrontendAuth() {
  console.log('🔐 Testing Frontend Authentication...\n');

  try {
    // Step 1: Register/Login user
    console.log('1️⃣ Setting up test user...');
    
    // Try to register
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
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

    const token = loginResponse.data.token;
    console.log('✅ User logged in successfully');
    console.log(`   - Token: ${token.substring(0, 20)}...`);

    // Step 2: Test profile endpoint with token
    console.log('\n2️⃣ Testing profile endpoint...');
    const profileResponse = await axios.get(`${BASE_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Profile retrieved successfully');
    console.log(`   - User: ${profileResponse.data.user.name}`);
    console.log(`   - Email: ${profileResponse.data.user.email}`);

    // Step 3: Test sleep data endpoint with token
    console.log('\n3️⃣ Testing sleep data endpoint...');
    const sleepResponse = await axios.get(`${BASE_URL}/api/sleep/data`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Sleep data retrieved successfully');
    console.log(`   - Today's sleep: ${sleepResponse.data.todaySleep}h`);
    console.log(`   - Sleep goal: ${sleepResponse.data.settings.sleepGoal}h`);

    // Step 4: Test sleep logging with token
    console.log('\n4️⃣ Testing sleep logging...');
    const logResponse = await axios.post(`${BASE_URL}/api/sleep/log`, {
      bedTime: '22:30',
      wakeTime: '06:30',
      duration: 7.5
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Sleep logged successfully');
    console.log(`   - Response: ${JSON.stringify(logResponse.data)}`);

    console.log('\n✅ All Frontend Authentication tests passed!');
    console.log('\n🎉 Frontend authentication is working correctly!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testFrontendAuth().catch(console.error); 