const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'frontend-sleep@nutriai.com',
  password: 'testpass123',
  name: 'Frontend Sleep Test User'
};

async function testFrontendSleepLog() {
  console.log('🌙 Testing Frontend Sleep Logging Simulation...\n');

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

    // Set axios defaults like the frontend does
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    // Step 2: Simulate frontend sleep logging
    console.log('\n2️⃣ Simulating frontend sleep logging...');
    
    const bedTime = '22:30';
    const wakeTime = '06:30';
    const duration = 7.5; // This is what the frontend calculates

    console.log('Frontend data being sent:', {
      bedTime,
      wakeTime,
      duration
    });

    const response = await axios.post(`${BASE_URL}/api/sleep/log`, {
      bedTime,
      wakeTime,
      duration
    });

    console.log('✅ Sleep logged successfully');
    console.log('Response:', response.data);

    // Step 3: Verify the sleep was logged
    console.log('\n3️⃣ Verifying sleep was logged...');
    const sleepData = await axios.get(`${BASE_URL}/api/sleep/data`);
    console.log('Current sleep data:', sleepData.data);

    console.log('\n✅ Frontend sleep logging simulation successful!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testFrontendSleepLog().catch(console.error); 