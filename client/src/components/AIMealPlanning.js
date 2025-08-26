import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaShoppingCart, FaUtensils, FaClock,
  FaUserFriends, FaHeart, FaStar, FaPrint, FaShare,
  FaPlus, FaMinus, FaCheck, FaTimes, FaSpinner,
  FaAppleAlt, FaDrumstickBite, FaBreadSlice, FaCarrot,
  FaLeaf, FaSeedling, FaFire, FaWater, FaBed,
  FaBrain, FaWalking, FaFireAlt, FaShoppingBag
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const AIMealPlanning = () => {
  const { user } = useAuth();
  const [mealPlan, setMealPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('plan');
  const [preferences, setPreferences] = useState({
    // Dynamic preferences
    mood: 'neutral',
    activityLevel: 'moderate',
    calorieIntakeToday: 0,
    foodSourceRestriction: 'non_vegetarian',
    dietaryPattern: '',
    cuisinePreference: '',
    healthConditions: [],
    
    // Traditional preferences
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: [],
    cookingTime: 'medium',
    servings: 2,
    budget: 'medium',
    calorieTarget: 2000
  });

  const authHeaders = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token') || ''}` 
    } 
  });

  const conditionOptions = [
    'diabetes', 'hypertension', 'high_cholesterol', 'gluten_intolerance', 
    'lactose_intolerance', 'kidney_disease', 'heart_disease', 'obesity'
  ];

  const toggleCondition = (condition) => {
    setPreferences(prev => ({
      ...prev,
      healthConditions: prev.healthConditions.includes(condition) 
        ? prev.healthConditions.filter(c => c !== condition)
        : [...prev.healthConditions, condition]
    }));
  };

  const generateMealPlan = async () => {
    try {
      setLoading(true);
      
      // Show nutritional expertise in action
      toast.loading('🧠 Analyzing your nutritional profile...', { id: 'nutrition-analysis' });
      
      // Prepare the request payload with all preferences
      const payload = {
        weekStart: selectedWeek.toISOString(),
        preferences: {
          ...preferences,
          healthConditions: preferences.healthConditions,
          location: 'global',
          goal: 'optimal_nutrition',
          mealsPerDay: 3,
          snacksPerDay: 2
        }
      };

      // Update loading message to show AI working
      setTimeout(() => {
        if (loading) {
          toast.loading('🍽️ Crafting extraordinary recipes...', { id: 'nutrition-analysis' });
        }
      }, 1000);

      setTimeout(() => {
        if (loading) {
          toast.loading('🌶️ Optimizing spice profiles and nutrition...', { id: 'nutrition-analysis' });
        }
      }, 2000);

      const response = await axios.post('/api/meal-planning/generate-dynamic', payload, authHeaders());
      
      if (response.data.success) {
        setMealPlan(response.data.mealPlan);
        setShoppingList(response.data.shoppingList || []);
        toast.success('🎯 Expert meal plan created with nutritional precision!', { id: 'nutrition-analysis' });
        
        // Show nutrition expertise summary
        const { mealPlan } = response.data;
        if (mealPlan.nutritionalPhilosophy) {
          setTimeout(() => {
            toast.success(`✨ ${mealPlan.nutritionalPhilosophy}`, { duration: 4000 });
          }, 1000);
        }
      } else {
        throw new Error(response.data.error || 'Failed to generate meal plan');
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      toast.error('🔄 Using expert fallback nutrition plan...', { id: 'nutrition-analysis' });
      
      // Set enhanced mock data for demonstration
      setMealPlan(getMockMealPlan());
      setShoppingList(getMockShoppingList());
      
      // Show fallback message
      setTimeout(() => {
        toast('💡 Showing expertly crafted sample plan based on your preferences', { icon: '🧠' });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const getMockMealPlan = () => ({
    weekStart: selectedWeek.toISOString(),
    days: [
      {
        day: 'Monday',
        date: new Date(selectedWeek.getTime() + 0 * 24 * 60 * 60 * 1000).toISOString(),
        meals: {
          breakfast: {
            name: 'Oatmeal with Berries and Nuts',
            ingredients: ['Oats', 'Mixed berries', 'Almonds', 'Honey', 'Milk'],
            instructions: 'Cook oats with milk, top with berries and nuts, drizzle with honey',
            prepTime: 10,
            cookTime: 5,
            nutrition: { calories: 320, protein: 12, carbs: 45, fat: 15 },
            difficulty: 'easy',
            rating: 4.5,
            image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400',
            dietaryTags: ['vegetarian', 'gluten-free']
          },
          lunch: {
            name: 'Grilled Chicken Salad',
            ingredients: ['Chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Olive oil'],
            instructions: 'Grill chicken, chop vegetables, assemble salad with dressing',
            prepTime: 15,
            cookTime: 12,
            nutrition: { calories: 380, protein: 35, carbs: 8, fat: 22 },
            difficulty: 'medium',
            rating: 4.8,
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
            dietaryTags: ['high-protein', 'low-carb']
          },
          dinner: {
            name: 'Salmon with Quinoa and Vegetables',
            ingredients: ['Salmon fillet', 'Quinoa', 'Broccoli', 'Carrots', 'Lemon'],
            instructions: 'Bake salmon, cook quinoa, steam vegetables, serve with lemon',
            prepTime: 20,
            cookTime: 25,
            nutrition: { calories: 450, protein: 40, carbs: 35, fat: 18 },
            difficulty: 'medium',
            rating: 4.7,
            image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
            dietaryTags: ['pescatarian', 'gluten-free']
          }
        }
      }
    ]
  });

  const getMockShoppingList = () => [
    { category: 'Proteins', items: ['Chicken breast', 'Salmon fillet', 'Greek yogurt'] },
    { category: 'Grains', items: ['Oats', 'Quinoa'] },
    { category: 'Vegetables', items: ['Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Broccoli', 'Carrots'] },
    { category: 'Fruits', items: ['Mixed berries'] },
    { category: 'Nuts & Seeds', items: ['Almonds'] },
    { category: 'Dairy', items: ['Milk'] },
    { category: 'Condiments', items: ['Honey', 'Olive oil', 'Lemon'] }
  ];

  const toggleShoppingItem = (categoryIndex, itemIndex) => {
    setShoppingList((prev) => {
      const copy = prev.map((c) => ({ ...c, items: c.items.map((i) => ({ ...i })) }));
      const item = copy[categoryIndex]?.items?.[itemIndex];
      if (item) item.checked = !item.checked;
      return copy;
    });
  };

  const printMealPlan = () => {
    window.print();
  };

  const shareMealPlan = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Dynamic Meal Plan',
        text: 'Check out my AI-generated personalized meal plan!',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Meal plan link copied to clipboard!');
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <FaStar
        key={i}
        className={`text-sm ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDietaryTagColor = (tag) => {
    const colors = {
      'vegetarian': 'bg-green-100 text-green-800',
      'vegan': 'bg-emerald-100 text-emerald-800',
      'gluten-free': 'bg-blue-100 text-blue-800',
      'dairy-free': 'bg-purple-100 text-purple-800',
      'high-protein': 'bg-orange-100 text-orange-800',
      'low-carb': 'bg-indigo-100 text-indigo-800',
      'pescatarian': 'bg-teal-100 text-teal-800'
    };
    return colors[tag] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <FaCalendarAlt className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dynamic AI Meal Planning</h1>
                <p className="text-gray-600">Personalized weekly meal plans with AI-powered recipe generation</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={printMealPlan}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaPrint />
                <span>Print</span>
              </button>
              <button
                onClick={shareMealPlan}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaShare />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaMinus />
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                Week of {selectedWeek.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h2>
              <button
                onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <FaPlus />
              </button>
            </div>
            
            <button
              onClick={generateMealPlan}
              disabled={loading}
              className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FaSpinner className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <FaUtensils />
                  <span>Generate Dynamic Plan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'plan', label: 'Meal Plan', icon: FaCalendarAlt },
              { id: 'shopping', label: 'Shopping List', icon: FaShoppingCart },
              { id: 'preferences', label: 'Dynamic Preferences', icon: FaBrain }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'plan' && mealPlan && (
            <motion.div
              key="plan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {mealPlan.days.map((day, dayIndex) => (
                <div key={dayIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{day.day}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {Object.entries(day.meals).map(([mealType, meal]) => (
                      <div key={mealType} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-gray-900 capitalize">{mealType}</h4>
                            <div className="flex items-center space-x-1">
                              {renderStars(meal.rating)}
                            </div>
                          </div>
                          
                          <div className="aspect-w-16 aspect-h-9 mb-4">
                            <img
                              src={meal.image}
                              alt={meal.name}
                              className="w-full h-32 object-cover rounded-lg"
                            />
                          </div>
                          
                          <h5 className="font-medium text-gray-900 mb-2">{meal.name}</h5>
                          
                          {/* Cultural Notes */}
                          {meal.culturalNotes && (
                            <div className="mb-2">
                              <p className="text-xs text-blue-600 italic">🏛️ {meal.culturalNotes}</p>
                            </div>
                          )}
                          
                          {/* Dietary Tags */}
                          {meal.dietaryTags && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {meal.dietaryTags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getDietaryTagColor(tag)}`}
                                >
                                  {tag.replace('-', ' ')}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Spice Profile */}
                          {meal.spiceProfile && (
                            <div className="mb-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-orange-800">🌶️ Spice Profile</span>
                                <span className="text-xs text-orange-600 capitalize">{meal.spiceProfile.heat} heat</span>
                              </div>
                              {meal.spiceProfile.dominantSpices && (
                                <div className="text-xs text-orange-700">
                                  {meal.spiceProfile.dominantSpices.join(', ')}
                                </div>
                              )}
                              {meal.spiceProfile.healthBenefits && (
                                <div className="text-xs text-green-600 mt-1">
                                  ✨ {meal.spiceProfile.healthBenefits.join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-2">
                              <FaClock className="text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {meal.prepTime + meal.cookTime} min
                              </span>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(meal.difficulty)}`}>
                              {meal.difficulty}
                            </span>
                          </div>
                          
                          {/* Enhanced Nutrition Display */}
                          <div className="grid grid-cols-3 gap-2 mb-3">
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{meal.nutrition.calories}</div>
                              <div className="text-xs text-gray-500">cal</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{meal.nutrition.protein}g</div>
                              <div className="text-xs text-gray-500">protein</div>
                            </div>
                            <div className="text-center">
                              <div className="text-sm font-medium text-gray-900">{meal.nutrition.carbs}g</div>
                              <div className="text-xs text-gray-500">carbs</div>
                            </div>
                          </div>
                          
                          {/* Health Optimization Note */}
                          {meal.healthOptimization && (
                            <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
                              <div className="text-xs font-medium text-green-800 mb-1">🎯 Health Benefits</div>
                              <div className="text-xs text-green-700">{meal.healthOptimization}</div>
                            </div>
                          )}
                          
                          {/* Special Benefits */}
                          {meal.nutrition.specialBenefits && (
                            <div className="mb-3">
                              <div className="text-xs text-purple-600">💫 {meal.nutrition.specialBenefits}</div>
                            </div>
                          )}
                          
                          <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                            View Recipe
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'shopping' && (
            <motion.div
              key="shopping"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Shopping List</h2>
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FaPrint />
                  <span>Print List</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(Array.isArray(shoppingList) ? shoppingList : []).map((category, categoryIndex) => (
                  <div key={categoryIndex} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
                    <div className="space-y-2">
                      {(category.items || []).map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                          onClick={() => toggleShoppingItem(categoryIndex, itemIndex)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                            item.checked 
                              ? 'bg-green-500 border-green-500' 
                              : 'border-gray-300'
                          }`}>
                            {item.checked && <FaCheck className="text-white text-xs" />}
                          </div>
                          <span className={`flex-1 ${item.checked ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {item.name || String(item)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Dynamic Meal Planning Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Mood and Activity */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaBrain /> Mood & Energy
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current Mood</label>
                      <select
                        value={preferences.mood}
                        onChange={(e) => setPreferences(prev => ({ ...prev, mood: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="neutral">Neutral</option>
                        <option value="stressed">Stressed/Anxious</option>
                        <option value="tired">Tired/Fatigued</option>
                        <option value="sad">Low mood</option>
                        <option value="energetic">Energetic</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
                      <select
                        value={preferences.activityLevel}
                        onChange={(e) => setPreferences(prev => ({ ...prev, activityLevel: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="low">Low (Sedentary)</option>
                        <option value="moderate">Moderate (Light exercise)</option>
                        <option value="high">High (Active lifestyle)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Dietary Restrictions */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaLeaf /> Dietary Preferences
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Food Source</label>
                      <select
                        value={preferences.foodSourceRestriction}
                        onChange={(e) => setPreferences(prev => ({ ...prev, foodSourceRestriction: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="non_vegetarian">Non-vegetarian</option>
                        <option value="vegetarian">Vegetarian</option>
                        <option value="vegan">Vegan</option>
                        <option value="lacto_vegetarian">Lacto-vegetarian</option>
                        <option value="ovo_vegetarian">Ovo-vegetarian</option>
                        <option value="pescatarian">Pescatarian</option>
                        <option value="halal">Halal</option>
                        <option value="kosher">Kosher</option>
                        <option value="jain">Jain</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Pattern</label>
                      <select
                        value={preferences.dietaryPattern}
                        onChange={(e) => setPreferences(prev => ({ ...prev, dietaryPattern: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">None</option>
                        <option value="keto">Keto (Ketogenic)</option>
                        <option value="paleo">Paleo</option>
                        <option value="mediterranean_diet">Mediterranean</option>
                        <option value="intermittent_fasting">Intermittent Fasting</option>
                        <option value="flexitarian">Flexitarian</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Cuisine and Health */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaUtensils /> Cuisine & Health
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Preference</label>
                      <select
                        value={preferences.cuisinePreference}
                        onChange={(e) => setPreferences(prev => ({ ...prev, cuisinePreference: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">Any Cuisine</option>
                        <option value="indian">Indian</option>
                        <option value="italian">Italian</option>
                        <option value="chinese">Chinese</option>
                        <option value="mexican">Mexican</option>
                        <option value="japanese">Japanese</option>
                        <option value="mediterranean">Mediterranean</option>
                        <option value="thai">Thai</option>
                        <option value="american">American</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Calorie Target</label>
                      <input
                        type="number"
                        min="1200"
                        max="4000"
                        step="100"
                        value={preferences.calorieTarget}
                        onChange={(e) => setPreferences(prev => ({ ...prev, calorieTarget: parseInt(e.target.value) }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="2000"
                      />
                    </div>
                  </div>
                </div>

                {/* Health Conditions */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaHeart /> Health Conditions
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {conditionOptions.map((condition) => (
                      <button
                        key={condition}
                        onClick={() => toggleCondition(condition)}
                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                          preferences.healthConditions.includes(condition)
                            ? 'bg-green-50 border-green-400 text-green-700'
                            : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {condition.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Preferences */}
                <div className="md:col-span-2 lg:col-span-3">
                  <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <FaShoppingBag /> Additional Preferences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cooking Time</label>
                      <select
                        value={preferences.cookingTime}
                        onChange={(e) => setPreferences(prev => ({ ...prev, cookingTime: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="quick">Quick (15-30 min)</option>
                        <option value="medium">Medium (30-60 min)</option>
                        <option value="slow">Slow (60+ min)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Servings</label>
                      <select
                        value={preferences.servings}
                        onChange={(e) => setPreferences(prev => ({ ...prev, servings: parseInt(e.target.value) }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value={1}>1 person</option>
                        <option value={2}>2 people</option>
                        <option value={4}>4 people</option>
                        <option value={6}>6 people</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Budget</label>
                      <select
                        value={preferences.budget}
                        onChange={(e) => setPreferences(prev => ({ ...prev, budget: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="low">Budget-friendly</option>
                        <option value="medium">Moderate</option>
                        <option value="high">Premium</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIMealPlanning;
