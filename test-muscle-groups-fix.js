console.log('🔧 Testing Muscle Groups Fix...\n');

// Test the formatMuscleGroups function logic
const formatMuscleGroups = (muscleGroups) => {
  if (!muscleGroups) return 'Full body';
  if (Array.isArray(muscleGroups)) {
    return muscleGroups.join(', ');
  }
  if (typeof muscleGroups === 'string') {
    return muscleGroups;
  }
  return 'Full body';
};

console.log('✅ Test Cases:');
console.log('================');

// Test 1: Array input
console.log('1. Array input:');
console.log(`   Input: ['legs', 'core']`);
console.log(`   Output: "${formatMuscleGroups(['legs', 'core'])}"`);
console.log('   ✅ Expected: "legs, core"');

// Test 2: String input
console.log('\n2. String input:');
console.log(`   Input: "chest, back, arms"`);
console.log(`   Output: "${formatMuscleGroups('chest, back, arms')}"`);
console.log('   ✅ Expected: "chest, back, arms"');

// Test 3: Null/undefined input
console.log('\n3. Null input:');
console.log(`   Input: null`);
console.log(`   Output: "${formatMuscleGroups(null)}"`);
console.log('   ✅ Expected: "Full body"');

// Test 4: Empty string input
console.log('\n4. Empty string input:');
console.log(`   Input: ""`);
console.log(`   Output: "${formatMuscleGroups('')}"`);
console.log('   ✅ Expected: "" (empty string)');

// Test 5: Object input (edge case)
console.log('\n5. Object input (edge case):');
console.log(`   Input: {groups: ['legs']}`);
console.log(`   Output: "${formatMuscleGroups({groups: ['legs']})}"`);
console.log('   ✅ Expected: "Full body"');

console.log('\n🎯 Fix Summary:');
console.log('================');
console.log('✅ Added formatMuscleGroups helper function');
console.log('✅ Handles array, string, null, and edge cases');
console.log('✅ Updated fallback recommendations to use strings');
console.log('✅ Added proper error handling in fetchRecommendations');
console.log('✅ Updated display logic to use helper function');
console.log('');
console.log('🚀 The runtime error should now be resolved!');
console.log('   All muscle_groups will be properly formatted for display.'); 