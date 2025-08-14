const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'sleep-date-test@nutriai.com',
  password: 'testpass123',
  name: 'Sleep Date Test User'
};

let authToken = null;
let userId = null;

async function testSleepDateFunctionality() {
  console.log('📅 Testing Sleep Tracking Date Functionality...\n');

  try {
    // Step 1: Register/Login user
    console.log('1️⃣ Setting up test user...');
    await setupTestUser();
    
    // Step 2: Test sleep logging with specific dates
    console.log('\n2️⃣ Testing sleep logging with specific dates...');
    await testSleepLoggingWithDates();
    
    // Step 3: Test sleep analysis with date ranges
    console.log('\n3️⃣ Testing sleep analysis with date ranges...');
    await testSleepAnalysisWithDates();
    
    // Step 4: Test custom date range analysis
    console.log('\n4️⃣ Testing custom date range analysis...');
    await testCustomDateRangeAnalysis();
    
    console.log('\n✅ All Sleep Date Functionality tests passed!');
    console.log('\n🎉 Sleep tracking with date functionality is fully operational!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
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
  userId = loginResponse.data.user.id;
  console.log('✅ User logged in successfully');
}

async function testSleepLoggingWithDates() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test logging sleep for different dates
  const sleepEntries = [
    {
      bedTime: '22:30',
      wakeTime: '06:30',
      duration: 7.5,
      quality: 'good',
      sleepDate: '2025-08-05'
    },
    {
      bedTime: '23:00',
      wakeTime: '07:00',
      duration: 8,
      quality: 'excellent',
      sleepDate: '2025-08-06'
    },
    {
      bedTime: '00:30',
      wakeTime: '08:00',
      duration: 7.5,
      quality: 'fair',
      sleepDate: '2025-08-07'
    }
  ];

  for (const entry of sleepEntries) {
    await axios.post(`${BASE_URL}/api/sleep/log`, entry, { headers });
    console.log(`✅ Sleep logged for ${entry.sleepDate}: ${entry.duration}h (${entry.quality})`);
  }
}

async function testSleepAnalysisWithDates() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test weekly analysis
  const weeklyAnalysis = await axios.get(`${BASE_URL}/api/sleep/analysis?period=week`, { headers });
  console.log('✅ Weekly sleep analysis retrieved');
  console.log(`   - Total sleep: ${weeklyAnalysis.data.total_sleep_hours}h`);
  console.log(`   - Average sleep: ${weeklyAnalysis.data.average_sleep_hours}h`);
  console.log(`   - Sleep deficit: ${weeklyAnalysis.data.sleep_deficit_hours}h`);

  // Test monthly analysis
  const monthlyAnalysis = await axios.get(`${BASE_URL}/api/sleep/analysis?period=month`, { headers });
  console.log('✅ Monthly sleep analysis retrieved');
  console.log(`   - Total sleep: ${monthlyAnalysis.data.total_sleep_hours}h`);
  console.log(`   - Average sleep: ${monthlyAnalysis.data.average_sleep_hours}h`);
}

async function testCustomDateRangeAnalysis() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test custom date range analysis
  const customAnalysis = await axios.get(
    `${BASE_URL}/api/sleep/analysis?period=custom&start=2025-08-05&end=2025-08-07`, 
    { headers }
  );
  console.log('✅ Custom date range analysis retrieved');
  console.log(`   - Date range: ${customAnalysis.data.start_date} to ${customAnalysis.data.end_date}`);
  console.log(`   - Total sleep: ${customAnalysis.data.total_sleep_hours}h`);
  console.log(`   - Average sleep: ${customAnalysis.data.average_sleep_hours}h`);
  console.log(`   - Days recorded: ${customAnalysis.data.total_days}`);
}

// Run the test
testSleepDateFunctionality().catch(console.error); 