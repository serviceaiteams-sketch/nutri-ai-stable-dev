import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaCalendarAlt, FaShoppingCart, FaUtensils, FaClock,
  FaUserFriends, FaHeart, FaStar, FaPrint, FaShare,
  FaPlus, FaMinus, FaCheck, FaTimes, FaSpinner,
  FaAppleAlt, FaDrumstickBite, FaBreadSlice, FaCarrot,
  FaLeaf, FaSeedling, FaFire, FaWater, FaBed
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
    dietaryRestrictions: [],
    allergies: [],
    cuisinePreferences: [],
    cookingTime: 'medium',
    servings: 2,
    budget: 'medium'
  });

  const authHeaders = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token') || ''}` 
    } 
  });

  useEffect(() => {
    generateMealPlan();
  }, [selectedWeek, preferences]);

  const normalizeShoppingList = (raw) => {
    try {
      // Case 1: Already an array of categories
      if (Array.isArray(raw)) {
        return raw.map((cat) => ({
          category: cat.category || 'Other',
          items: (cat.items || []).map((it) => (
            typeof it === 'string' ? { name: it, checked: false } : { name: it.name || String(it), checked: !!it.checked }
          ))
        }));
      }
      // Case 2: Object map of category -> items
      if (raw && typeof raw === 'object') {
        return Object.entries(raw).map(([category, items]) => ({
          category,
          items: (items || []).map((it) => (
            typeof it === 'string' ? { name: it, checked: false } : { name: it.name || String(it), checked: !!it.checked }
          ))
        }));
      }
    } catch {}
    return [];
  };

  const generateMealPlan = async () => {
    try {
      setLoading(true);
      const response = await axios.post('/api/meal-planning/generate', {
        weekStart: selectedWeek.toISOString(),
        preferences: preferences
      }, authHeaders());

      setMealPlan(response.data.mealPlan);
      setShoppingList(normalizeShoppingList(response.data.shoppingList));
      toast.success('Meal plan generated successfully!');
    } catch (error) {
      console.error('Error generating meal plan:', error);
      toast.error('Failed to generate meal plan');
      // Set mock data for demonstration
      setMealPlan(getMockMealPlan());
      setShoppingList(normalizeShoppingList(getMockShoppingList()));
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
            image: 'https://images.unsplash.com/photo-1517686469429-8bdb88b9f907?w=400'
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
            image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
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
            image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400'
          }
        }
      },
      {
        day: 'Tuesday',
        date: new Date(selectedWeek.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        meals: {
          breakfast: {
            name: 'Greek Yogurt Parfait',
            ingredients: ['Greek yogurt', 'Granola', 'Honey', 'Fresh fruit'],
            instructions: 'Layer yogurt, granola, and fruit in a glass, drizzle with honey',
            prepTime: 5,
            cookTime: 0,
            nutrition: { calories: 280, protein: 18, carbs: 35, fat: 8 },
            difficulty: 'easy',
            rating: 4.3,
            image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400'
          },
          lunch: {
            name: 'Turkey and Avocado Wrap',
            ingredients: ['Turkey breast', 'Avocado', 'Whole wheat tortilla', 'Spinach', 'Mustard'],
            instructions: 'Spread avocado on tortilla, add turkey and spinach, roll up',
            prepTime: 8,
            cookTime: 0,
            nutrition: { calories: 320, protein: 25, carbs: 28, fat: 16 },
            difficulty: 'easy',
            rating: 4.4,
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'
          },
          dinner: {
            name: 'Vegetarian Stir Fry',
            ingredients: ['Tofu', 'Mixed vegetables', 'Soy sauce', 'Ginger', 'Garlic'],
            instructions: 'Stir fry tofu and vegetables with soy sauce and aromatics',
            prepTime: 15,
            cookTime: 10,
            nutrition: { calories: 380, protein: 22, carbs: 25, fat: 20 },
            difficulty: 'medium',
            rating: 4.2,
            image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400'
          }
        }
      }
    ]
  });

  const getMockShoppingList = () => [
    { category: 'Proteins', items: ['Chicken breast', 'Salmon fillet', 'Turkey breast', 'Tofu', 'Greek yogurt'] },
    { category: 'Grains', items: ['Oats', 'Quinoa', 'Whole wheat tortillas', 'Granola'] },
    { category: 'Vegetables', items: ['Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Broccoli', 'Carrots', 'Spinach', 'Mixed vegetables'] },
    { category: 'Fruits', items: ['Mixed berries', 'Fresh fruit'] },
    { category: 'Nuts & Seeds', items: ['Almonds'] },
    { category: 'Dairy', items: ['Milk'] },
    { category: 'Condiments', items: ['Honey', 'Olive oil', 'Lemon', 'Soy sauce', 'Mustard'] },
    { category: 'Herbs & Spices', items: ['Ginger', 'Garlic'] }
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
        title: 'My Meal Plan',
        text: 'Check out my AI-generated meal plan!',
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
                <h1 className="text-3xl font-bold text-gray-900">AI Meal Planning</h1>
                <p className="text-gray-600">Smart weekly meal plans with shopping lists and recipes</p>
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
                  <span>Generate New Plan</span>
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
              { id: 'preferences', label: 'Preferences', icon: FaHeart }
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
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Meal Planning Preferences</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Dietary Restrictions</h3>
                  <div className="space-y-2">
                    {['Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Paleo'].map((restriction) => (
                      <label key={restriction} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={preferences.dietaryRestrictions.includes(restriction)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPreferences(prev => ({
                                ...prev,
                                dietaryRestrictions: [...prev.dietaryRestrictions, restriction]
                              }));
                            } else {
                              setPreferences(prev => ({
                                ...prev,
                                dietaryRestrictions: prev.dietaryRestrictions.filter(r => r !== restriction)
                              }));
                            }
                          }}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-gray-700">{restriction}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Cooking Time</h3>
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
                  <h3 className="font-medium text-gray-900 mb-3">Servings</h3>
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
                  <h3 className="font-medium text-gray-900 mb-3">Budget</h3>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AIMealPlanning;
