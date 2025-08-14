import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaUtensils, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSpinner,
  FaSearch,
  FaFire,
  FaDrumstickBite,
  FaBreadSlice,
  FaCheese,
  FaLeaf,
  FaHeart,
  FaBullseye,
  FaChartLine,
  FaCalculator,
  FaBirthdayCake,
  FaWater,
  FaGem
} from 'react-icons/fa';

const MealTracking = () => {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA'));
  // Pick up ?date=YYYY-MM-DD if provided (e.g., after logging from FoodRecognition)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');
    if (dateParam) {
      setSelectedDate(dateParam);
    }
  }, []);
  const [filter, setFilter] = useState('all'); // all, breakfast, lunch, dinner, snack
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    meal_type: 'lunch',
    food_items: [{ name: '', quantity: 1, unit: 'piece', calories: 0, protein: 0, carbs: 0, fat: 0 }],
    notes: ''
  });
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const formRef = useRef(null);

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/meals/daily/${selectedDate}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      console.log('Fetched meals response:', response.data);
      console.log('Meals array:', response.data.meals);
      setMeals(response.data.meals || []);
    } catch (error) {
      console.error('Error fetching meals:', error);
      toast.error('Failed to load meals');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    (async () => {
      await fetchMeals();
    })();
  }, [fetchMeals]);

  const handleAddFoodItem = () => {
    setFormData({
      ...formData,
      food_items: [...formData.food_items, { name: '', quantity: 1, unit: 'piece', calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 }]
    });
  };

  const handleRemoveFoodItem = (index) => {
    const newFoodItems = formData.food_items.filter((_, i) => i !== index);
    setFormData({ ...formData, food_items: newFoodItems });
  };

  const handleFoodItemChange = (index, field, value) => {
    const newFoodItems = [...formData.food_items];
    newFoodItems[index][field] = value;
    setFormData({ ...formData, food_items: newFoodItems });
  };

  const calculateTotalNutrition = (foodItems) => {
    return foodItems.reduce((total, item) => ({
      calories: total.calories + (parseFloat(item.calories) || 0),
      protein: total.protein + (parseFloat(item.protein) || 0),
      carbs: total.carbs + (parseFloat(item.carbs) || 0),
      fat: total.fat + (parseFloat(item.fat) || 0),
      sugar: total.sugar + (parseFloat(item.sugar) || 0),
      sodium: total.sodium + (parseFloat(item.sodium) || 0),
      fiber: total.fiber + (parseFloat(item.fiber) || 0)
    }), { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 });
  };

  const handleAnalyzePhoto = async (file) => {
    if (!file) return;
    setAnalyzingPhoto(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/ai/recognize-food', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.data || (response.data.error === 'no_food_detected')) {
        toast.error(response.data?.message || 'No food detected in the image');
        return;
      }

      const nutritionData = response.data.nutritionData || [];
      const mappedItems = nutritionData.map(food => ({
        name: food.name,
        quantity: food.quantity || 1,
        unit: food.unit || 'serving',
        calories: Number(food.nutrition?.calories || 0),
        protein: Number(food.nutrition?.protein || 0),
        carbs: Number(food.nutrition?.carbs || 0),
        fat: Number(food.nutrition?.fat || 0),
        sugar: Number(food.nutrition?.sugar || 0),
        sodium: Number(food.nutrition?.sodium || 0),
        fiber: Number(food.nutrition?.fiber || 0)
      }));

      if (mappedItems.length === 0) {
        toast.error('Could not extract items from the photo');
        return;
      }

      setFormData(prev => ({ ...prev, food_items: mappedItems }));
      toast.success('Analyzed photo and filled items');
    } catch (err) {
      console.error('Analyze photo error:', err);
      toast.error('Failed to analyze photo');
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.food_items[0].name.trim()) {
      toast.error('Please add at least one food item');
      return;
    }

    try {
      const totalNutrition = calculateTotalNutrition(formData.food_items);
      const mealData = {
        ...formData,
        total_nutrition: totalNutrition,
        date: selectedDate
      };

      if (editingMeal) {
        const token = localStorage.getItem('token');
        await axios.put(`/api/meals/${editingMeal.id}`, mealData, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        toast.success('Meal updated successfully!');
      } else {
        const token = localStorage.getItem('token');
        await axios.post('/api/meals/log', mealData, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        toast.success('Meal logged successfully!');
      }

      setFormData({
        meal_type: 'lunch',
        food_items: [{ name: '', quantity: 1, unit: 'piece', calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 }],
        notes: ''
      });
      setShowAddForm(false);
      setEditingMeal(null);
      await fetchMeals();
    } catch (error) {
      console.error('Error saving meal:', error);
      toast.error('Failed to save meal');
    }
  };

  const handleEdit = (meal) => {
    setEditingMeal(meal);
    setFormData({
      meal_type: meal.meal_type,
      food_items: meal.food_items || [{ name: '', quantity: 1, unit: 'piece', calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 }],
      notes: meal.notes || ''
    });
    // Set the date picker to the meal's date
    try {
      const d = new Date(meal.created_at);
      if (!isNaN(d)) {
        setSelectedDate(d.toLocaleDateString('en-CA'));
      }
    } catch (_) {}
    setShowAddForm(true);
    // Scroll form into view and focus first input
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const firstInput = document.querySelector('input[aria-label="Food name"]');
      firstInput?.focus();
    }, 0);
  };

  const handleDelete = async (mealId) => {
    if (window.confirm('Are you sure you want to delete this meal?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/meals/${mealId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        toast.success('Meal deleted successfully!');
        fetchMeals();
      } catch (error) {
        console.error('Error deleting meal:', error);
        toast.error('Failed to delete meal');
      }
    }
  };

  const filteredMeals = meals.filter(meal => {
    const matchesFilter = filter === 'all' || meal.meal_type === filter;
    // If no search term, show the meal
    if (!searchTerm.trim()) return matchesFilter;
    const term = searchTerm.toLowerCase();
    const matchesMealType = (meal.meal_type || '').toLowerCase().includes(term);
    const matchesFoods = (meal.food_items || []).some(item => {
      const name = (item.name || item.food_name || '').toLowerCase();
      return name.includes(term);
    });
    const matchesNotes = (meal.notes || '').toLowerCase().includes(term);
    return matchesFilter && (matchesMealType || matchesFoods || matchesNotes);
  });

  const toNum = (v) => Number.parseFloat(v || 0) || 0;
  const fmt1 = (v) => (Math.round((toNum(v)) * 10) / 10).toFixed(1);
  const totalNutrition = filteredMeals.reduce((total, meal) => {
    console.log('Processing meal:', meal);
    console.log('Meal nutritional data:', {
      calories: meal.total_calories,
      protein: meal.total_protein,
      carbs: meal.total_carbs,
      fat: meal.total_fat,
      sugar: meal.total_sugar,
      sodium: meal.total_sodium,
      fiber: meal.total_fiber
    });
    
    return {
      calories: total.calories + toNum(meal.total_calories),
      protein: total.protein + toNum(meal.total_protein),
      carbs: total.carbs + toNum(meal.total_carbs),
      fat: total.fat + toNum(meal.total_fat),
      sugar: total.sugar + toNum(meal.total_sugar),
      sodium: total.sodium + toNum(meal.total_sodium),
      fiber: total.fiber + toNum(meal.total_fiber)
    };
  }, { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 });

  console.log('Final totalNutrition:', totalNutrition);

  // Calculate additional metrics
  const weeklyStats = {
    mealsTracked: filteredMeals.length,
    daysTracked: new Set(filteredMeals.map(m => new Date(m.created_at).toDateString())).size,
    successRate: filteredMeals.filter(m => m.is_healthy).length / Math.max(filteredMeals.length, 1) * 100,
    avgCalories: totalNutrition.calories / Math.max(filteredMeals.length, 1)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <FaSpinner className="h-8 w-8 text-gradient-to-r from-green-400 to-blue-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Enhanced Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 rounded-3xl shadow-2xl p-8 border border-white/20"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-6">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-4 bg-gradient-to-r from-green-400 to-blue-500 rounded-2xl shadow-lg"
            >
              <FaUtensils className="h-10 w-10 text-white" />
            </motion.div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Meal Tracking
              </h1>
              <p className="text-gray-600 text-lg">Track your meals and monitor your nutrition progress</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-green-500 hover:via-blue-600 hover:to-purple-700 transition-all duration-300 flex items-center space-x-3 shadow-lg hover:shadow-xl"
          >
            <FaPlus className="h-5 w-5" />
            <span className="font-semibold">Add Meal</span>
          </motion.button>
        </div>

        {/* Enhanced Date Selector and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-3">📅 Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            />
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-3">🍽️ Filter by Meal</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-3">🔍 Search</label>
            <div className="relative">
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by meal type, food or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
              />
              {searchTerm && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Today's Nutrition Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 border-2 border-green-200"
      >
        <div className="flex items-center space-x-3 mb-6">
          <FaCalculator className="h-8 w-8 text-green-600" />
          <h2 className="text-2xl font-bold text-gray-900">Today's Nutrition</h2>
        </div>
        
        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4 mb-6">
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl shadow-lg text-white"
          >
            <FaFire className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.calories)}</div>
            <div className="text-sm opacity-90">Calories</div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-2xl shadow-lg text-white"
          >
            <FaDrumstickBite className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.protein)}g</div>
            <div className="text-sm opacity-90">Protein</div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-pink-400 to-rose-500 rounded-2xl shadow-lg text-white"
          >
            <FaBreadSlice className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.carbs)}g</div>
            <div className="text-sm opacity-90">Carbs</div>
          </motion.div>
          
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl shadow-lg text-white"
          >
            <FaCheese className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.fat)}g</div>
            <div className="text-sm opacity-90">Fat</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl shadow-lg text-white"
          >
            <FaBirthdayCake className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.sugar)}g</div>
            <div className="text-sm opacity-90">Sugar</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-2xl shadow-lg text-white"
          >
            <FaWater className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.sodium)}mg</div>
            <div className="text-sm opacity-90">Sodium</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="text-center p-6 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl shadow-lg text-white"
          >
            <FaLeaf className="h-8 w-8 mx-auto mb-2" />
            <div className="text-3xl font-bold">{fmt1(totalNutrition.fiber)}g</div>
            <div className="text-sm opacity-90">Fiber</div>
          </motion.div>
        </div>
      </motion.div>

      {/* This Week's Progress */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 border-2 border-blue-200"
      >
        <div className="flex items-center space-x-3 mb-6">
          <FaChartLine className="h-8 w-8 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">This Week's Progress</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Meals Tracked</h3>
              <div className="p-2 bg-green-100 rounded-full">
                <FaHeart className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-green-600 mb-2">{weeklyStats.mealsTracked}</div>
            <div className="text-sm text-gray-600">{weeklyStats.daysTracked} days tracked</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Success Rate</h3>
              <div className="p-2 bg-blue-100 rounded-full">
                <FaBullseye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-2">{Math.round(weeklyStats.successRate)}%</div>
            <div className="text-sm text-gray-600">Healthy meal choices</div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Avg Calories</h3>
              <div className="p-2 bg-purple-100 rounded-full">
                <FaGem className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="text-4xl font-bold text-purple-600 mb-2">{fmt1(weeklyStats.avgCalories)}</div>
            <div className="text-sm text-gray-600">Per day this week</div>
          </motion.div>
        </div>
      </motion.div>

      {/* Enhanced Add/Edit Meal Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingMeal ? 'Edit Meal' : 'Add New Meal'}
              </h2>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  setShowAddForm(false);
                  setEditingMeal(null);
                  setFormData({
                    meal_type: 'lunch',
                    food_items: [{ name: '', quantity: 1, unit: 'piece', calories: 0, protein: 0, carbs: 0, fat: 0 }],
                    notes: ''
                  });
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ✕
              </motion.button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                >
                  <label className="block text-sm font-semibold text-gray-700 mb-3">🍽️ Meal Type</label>
                  <select
                    value={formData.meal_type}
                    onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
                >
                  <label className="block text-sm font-semibold text-gray-700 mb-3">📅 Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </motion.div>
              </div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg"
              >
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-semibold text-gray-700">🥗 Food Items</label>
                  <div>
                    <input
                      id="meal-photo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files && e.target.files[0] && handleAnalyzePhoto(e.target.files[0])}
                    />
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      type="button"
                      disabled={analyzingPhoto}
                      onClick={() => document.getElementById('meal-photo-input').click()}
                      className={`px-4 py-2 rounded-xl text-white font-semibold shadow ${analyzingPhoto ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {analyzingPhoto ? 'Analyzing…' : 'Analyze from Photo'}
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-4">
                  {/* Column headers for clarity */}
                  <div className="hidden md:grid grid-cols-1 md:grid-cols-10 gap-3 text-xs font-semibold text-gray-500 px-1">
                    <div className="md:col-span-2">Food name</div>
                    <div>Qty</div>
                    <div>Unit</div>
                    <div>Calories (kcal)</div>
                    <div>Protein (g)</div>
                    <div>Carbs (g)</div>
                    <div>Fat (g)</div>
                    <div>Sugar (g)</div>
                    <div>Sodium (mg)</div>
                    <div>Fiber (g)</div>
                  </div>
                  {formData.food_items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="grid grid-cols-1 md:grid-cols-10 gap-3 items-end"
                    >
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          placeholder="Food name"
                          aria-label="Food name"
                          value={item.name}
                          onChange={(e) => handleFoodItemChange(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          required
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Qty"
                          aria-label="Quantity"
                          value={item.quantity}
                          onChange={(e) => handleFoodItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <select
                          aria-label="Unit"
                          value={item.unit}
                          onChange={(e) => handleFoodItemChange(index, 'unit', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="piece">piece</option>
                          <option value="cup">cup</option>
                          <option value="gram">gram</option>
                          <option value="ounce">ounce</option>
                          <option value="tablespoon">tbsp</option>
                          <option value="teaspoon">tsp</option>
                        </select>
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Cal"
                          aria-label="Calories"
                          value={item.calories}
                          onChange={(e) => handleFoodItemChange(index, 'calories', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Protein"
                          aria-label="Protein"
                          value={item.protein}
                          onChange={(e) => handleFoodItemChange(index, 'protein', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Carbs"
                          aria-label="Carbs"
                          value={item.carbs}
                          onChange={(e) => handleFoodItemChange(index, 'carbs', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Fat"
                          aria-label="Fat"
                          value={item.fat}
                          onChange={(e) => handleFoodItemChange(index, 'fat', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Sugar"
                          aria-label="Sugar"
                          value={item.sugar}
                          onChange={(e) => handleFoodItemChange(index, 'sugar', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Sodium"
                          aria-label="Sodium"
                          value={item.sodium}
                          onChange={(e) => handleFoodItemChange(index, 'sodium', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          placeholder="Fiber"
                          aria-label="Fiber"
                          value={item.fiber}
                          onChange={(e) => handleFoodItemChange(index, 'fiber', e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => handleRemoveFoodItem(index)}
                          className="px-4 py-3 text-red-600 hover:text-red-800 bg-red-50 rounded-xl hover:bg-red-100 transition-all duration-200"
                          disabled={formData.food_items.length === 1}
                        >
                          <FaTrash className="h-4 w-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={handleAddFoodItem}
                    className="text-green-600 hover:text-green-800 flex items-center space-x-2 bg-green-50 px-4 py-3 rounded-xl hover:bg-green-100 transition-all duration-200"
                  >
                    <FaPlus className="h-4 w-4" />
                    <span>Add Food Item</span>
                  </motion.button>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-3">📝 Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this meal..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                />
              </motion.div>

              <div className="flex justify-end space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingMeal(null);
                  }}
                  className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 transition-all duration-200 font-semibold shadow-lg"
                >
                  {editingMeal ? 'Update Meal' : 'Log Meal'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Enhanced Meals List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 border border-white/20"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Today's Meals</h2>
        
        {filteredMeals.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <FaUtensils className="mx-auto h-16 w-16 text-gray-400 mb-6" />
            </motion.div>
            <p className="text-gray-600 text-lg mb-4">No meals logged for this date</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAddForm(true)}
              className="text-green-600 hover:text-green-800 font-semibold text-lg"
            >
              Add your first meal
            </motion.button>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {filteredMeals.map((meal, index) => (
              <motion.div
                key={meal.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="px-4 py-2 bg-gradient-to-r from-green-400 to-blue-500 text-white rounded-full text-sm font-semibold capitalize">
                      {meal.meal_type}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(meal.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex space-x-3">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEdit(meal)}
                      className="text-blue-600 hover:text-blue-800 p-2 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200"
                    >
                      <FaEdit className="h-4 w-4" title="Edit" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDelete(meal.id)}
                      className="text-red-600 hover:text-red-800 p-2 bg-red-50 rounded-lg hover:bg-red-100 transition-all duration-200"
                    >
                      <FaTrash className="h-4 w-4" title="Delete" />
                    </motion.button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Food Items</h3>
                    <div className="space-y-2">
                      {meal.food_items?.map((item, itemIndex) => (
                        <div key={itemIndex} className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                          • {(item.name || item.food_name || 'Item')} ({item.quantity} {item.unit})
                        </div>
                      )) || (
                        <div className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">No food items listed</div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Nutrition</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-orange-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Calories:</span>
                        <span className="ml-2 font-semibold text-orange-600">{fmt1(meal.total_calories || 0)}</span>
                      </div>
                      <div className="bg-purple-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Protein:</span>
                        <span className="ml-2 font-semibold text-purple-600">{fmt1(meal.total_protein || 0)}g</span>
                      </div>
                      <div className="bg-pink-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Carbs:</span>
                        <span className="ml-2 font-semibold text-pink-600">{fmt1(meal.total_carbs || 0)}g</span>
                      </div>
                      <div className="bg-yellow-50 px-3 py-2 rounded-lg">
                        <span className="text-gray-600">Fat:</span>
                        <span className="ml-2 font-semibold text-yellow-600">{fmt1(meal.total_fat || 0)}g</span>
                      </div>
                    </div>
                  </div>
                </div>

                {meal.notes && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">{meal.notes}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MealTracking; 