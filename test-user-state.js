// Test to check user authentication state in localStorage
console.log('🔍 Checking User Authentication State...\n');

// Check localStorage for token
const token = localStorage.getItem('token');
console.log('1️⃣ Token in localStorage:', token ? `${token.substring(0, 20)}...` : 'No token found');

// Check if user is logged in
const user = JSON.parse(localStorage.getItem('user') || 'null');
console.log('2️⃣ User in localStorage:', user ? user.name : 'No user found');

// Check axios default headers
console.log('3️⃣ Axios Authorization header:', axios.defaults.headers.common['Authorization'] ? 'Set' : 'Not set');

// Test API call
async function testAPI() {
  try {
    console.log('\n4️⃣ Testing API call...');
    const response = await axios.get('/api/auth/profile');
    console.log('✅ API call successful');
    console.log('   - User:', response.data.user.name);
  } catch (error) {
    console.error('❌ API call failed:', error.response?.data || error.message);
  }
}

// Run the test
testAPI(); 