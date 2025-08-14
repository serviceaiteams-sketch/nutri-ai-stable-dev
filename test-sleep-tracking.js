const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const TEST_USER = {
  email: 'test-sleep@nutriai.com',
  password: 'testpass123',
  name: 'Sleep Test User'
};

let authToken = null;
let userId = null;

async function testSleepTracking() {
  console.log('🌙 Testing Sleep Tracking Feature...\n');

  try {
    // Step 1: Register/Login user
    console.log('1️⃣ Setting up test user...');
    await setupTestUser();
    
    // Step 2: Test sleep data endpoints
    console.log('\n2️⃣ Testing sleep data endpoints...');
    await testSleepData();
    
    // Step 3: Test sleep goal management
    console.log('\n3️⃣ Testing sleep goal management...');
    await testSleepGoal();
    
    // Step 4: Test sleep time management
    console.log('\n4️⃣ Testing sleep time management...');
    await testSleepTimes();
    
    // Step 5: Test sleep logging
    console.log('\n5️⃣ Testing sleep logging...');
    await testSleepLogging();
    
    // Step 6: Test reminders
    console.log('\n6️⃣ Testing reminders...');
    await testReminders();
    
    // Step 7: Test sleep analysis
    console.log('\n7️⃣ Testing sleep analysis...');
    await testSleepAnalysis();
    
    // Step 8: Test sleep history
    console.log('\n8️⃣ Testing sleep history...');
    await testSleepHistory();
    
    console.log('\n✅ All Sleep Tracking tests passed!');
    console.log('\n🎉 Sleep Tracking Feature is fully functional!');
    
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

async function testSleepData() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get sleep data
  const response = await axios.get(`${BASE_URL}/api/sleep/data`, { headers });
  console.log('✅ Sleep data retrieved successfully');
  console.log(`   - Today's sleep: ${response.data.todaySleep}h`);
  console.log(`   - Sleep goal: ${response.data.settings.sleepGoal}h`);
  console.log(`   - Bed time: ${response.data.settings.bedTime}`);
  console.log(`   - Wake time: ${response.data.settings.wakeTime}`);
}

async function testSleepGoal() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test different sleep goals
  const goals = [7, 8, 9];
  
  for (const goal of goals) {
    await axios.post(`${BASE_URL}/api/sleep/goal`, { goal }, { headers });
    console.log(`✅ Sleep goal updated to ${goal}h`);
  }

  // Test invalid goal
  try {
    await axios.post(`${BASE_URL}/api/sleep/goal`, { goal: 25 }, { headers });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid sleep goal properly rejected');
    }
  }
}

async function testSleepTimes() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test bed time update
  await axios.post(`${BASE_URL}/api/sleep/times`, {
    type: 'bedTime',
    time: '22:30'
  }, { headers });
  console.log('✅ Bed time updated to 22:30');

  // Test wake time update
  await axios.post(`${BASE_URL}/api/sleep/times`, {
    type: 'wakeTime',
    time: '06:30'
  }, { headers });
  console.log('✅ Wake time updated to 06:30');

  // Test invalid time
  try {
    await axios.post(`${BASE_URL}/api/sleep/times`, {
      type: 'bedTime',
      time: '25:00'
    }, { headers });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Invalid time properly rejected');
    }
  }
}

async function testSleepLogging() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Log sleep entries
  const sleepEntries = [
    {
      bedTime: '22:30',
      wakeTime: '06:30',
      duration: 7.5,
      quality: 'good',
      notes: 'Slept well, felt refreshed'
    },
    {
      bedTime: '23:00',
      wakeTime: '07:00',
      duration: 8,
      quality: 'excellent',
      notes: 'Perfect sleep cycle'
    },
    {
      bedTime: '00:30',
      wakeTime: '08:00',
      duration: 7.5,
      quality: 'fair',
      notes: 'Late night, but good duration'
    }
  ];

  for (const entry of sleepEntries) {
    await axios.post(`${BASE_URL}/api/sleep/log`, entry, { headers });
    console.log(`✅ Sleep logged: ${entry.duration}h (${entry.quality})`);
  }
}

async function testReminders() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test reminder updates
  const reminderConfigs = [
    { bedTimeReminder: true, trackSleepReminder: true },
    { bedTimeReminder: false, trackSleepReminder: true },
    { bedTimeReminder: true, trackSleepReminder: false },
    { bedTimeReminder: false, trackSleepReminder: false }
  ];

  for (const config of reminderConfigs) {
    await axios.post(`${BASE_URL}/api/sleep/reminders`, config, { headers });
    console.log(`✅ Reminders updated: Bed=${config.bedTimeReminder}, Track=${config.trackSleepReminder}`);
  }
}

async function testSleepAnalysis() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Test weekly analysis
  const weeklyAnalysis = await axios.get(`${BASE_URL}/api/sleep/analysis?period=week`, { headers });
  console.log('✅ Weekly sleep analysis retrieved');
  console.log(`   - Total sleep: ${weeklyAnalysis.data.total_sleep_hours}h`);
  console.log(`   - Average sleep: ${weeklyAnalysis.data.average_sleep_hours}h`);
  console.log(`   - Sleep deficit: ${weeklyAnalysis.data.sleep_deficit_hours}h`);
  console.log(`   - Days meeting goal: ${weeklyAnalysis.data.days_meeting_goal}`);

  // Test monthly analysis
  const monthlyAnalysis = await axios.get(`${BASE_URL}/api/sleep/analysis?period=month`, { headers });
  console.log('✅ Monthly sleep analysis retrieved');
  console.log(`   - Total sleep: ${monthlyAnalysis.data.total_sleep_hours}h`);
  console.log(`   - Average sleep: ${monthlyAnalysis.data.average_sleep_hours}h`);
}

async function testSleepHistory() {
  const headers = { Authorization: `Bearer ${authToken}` };

  // Get sleep history
  const history = await axios.get(`${BASE_URL}/api/sleep/history?days=30`, { headers });
  console.log(`✅ Sleep history retrieved: ${history.data.history.length} entries`);

  if (history.data.history.length > 0) {
    const latestEntry = history.data.history[0];
    console.log(`   - Latest entry: ${latestEntry.duration}h on ${latestEntry.recorded_at}`);
    console.log(`   - Bed time: ${latestEntry.bed_time}, Wake time: ${latestEntry.wake_time}`);
    console.log(`   - Quality: ${latestEntry.quality}`);
  }
}

// Run the test
testSleepTracking().catch(console.error); 