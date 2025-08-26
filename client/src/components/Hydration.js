import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaRobot, FaPlus, FaMinus, FaTint, FaHistory, FaChartLine } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Hydration = () => {
  const [waterIntake, setWaterIntake] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(9); // glasses
  const [hydrationHistory, setHydrationHistory] = useState([]);
  const [aiTip, setAiTip] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Glass size in ml (standard glass = 250ml)
  const GLASS_SIZE_ML = 250;
  const DAILY_GOAL_ML = dailyGoal * GLASS_SIZE_ML;

  useEffect(() => {
    fetchTodayHydration();
    generateAiTip();
  }, []);

  const fetchTodayHydration = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/hydration/today');
      const { todayHydration, goal } = response.data;
      
      // Convert ml to glasses
      const glassesConsumed = Math.round(todayHydration / GLASS_SIZE_ML);
      setWaterIntake(glassesConsumed);
      
      // Update daily goal based on server response
      const goalGlasses = Math.round(goal / GLASS_SIZE_ML);
      setDailyGoal(goalGlasses);
    } catch (error) {
      console.error('Error fetching hydration data:', error);
      // Use mock data for development
      setWaterIntake(0);
      setDailyGoal(9);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAiTip = async () => {
    try {
      // Generate personalized hydration tip based on time, weather, and activity
      const hour = new Date().getHours();
      const tips = [
        "Based on your activity level and weather, aim for 8-10 glasses today. Consider adding lemon or cucumber for flavor!",
        "It's morning! Start your day with a glass of water to boost metabolism and energy levels.",
        "Afternoon reminder: Stay hydrated to maintain focus and prevent afternoon fatigue.",
        "Evening hydration: Drink water but avoid excessive amounts close to bedtime.",
        "Hot weather alert: Increase your water intake by 2-3 glasses to stay properly hydrated.",
        "Exercise day: Drink an extra glass of water before, during, and after your workout.",
        "Office work: Keep a water bottle on your desk and take regular sips throughout the day."
      ];
      
      let tipIndex = 0;
      if (hour < 12) tipIndex = 1; // Morning
      else if (hour < 17) tipIndex = 2; // Afternoon
      else tipIndex = 3; // Evening
      
      setAiTip(tips[tipIndex]);
    } catch (error) {
      setAiTip("Stay hydrated! Aim for 8-10 glasses of water daily for optimal health.");
    }
  };

  const addWater = async () => {
    if (waterIntake >= dailyGoal) {
      toast.success('Great job! You\'ve reached your daily goal! 🎉');
      return;
    }

    try {
      const newIntake = waterIntake + 1;
      setWaterIntake(newIntake);
      
      // Log to server
      await axios.post('/api/hydration/log', {
        amount: GLASS_SIZE_ML,
        type: 'water',
        notes: 'Glass of water'
      });
      
      toast.success('Water intake logged! 💧');
      
      // Update history
      updateLocalHistory(newIntake);
    } catch (error) {
      console.error('Error logging water intake:', error);
      toast.error('Failed to log water intake');
      // Revert on error
      setWaterIntake(waterIntake);
    }
  };

  const removeWater = async () => {
    if (waterIntake <= 0) {
      toast.error('Water intake cannot go below 0');
      return;
    }

    try {
      const newIntake = waterIntake - 1;
      setWaterIntake(newIntake);
      
      // Log removal to server
      await axios.post('/api/hydration/log', {
        amount: -GLASS_SIZE_ML,
        type: 'water',
        notes: 'Water intake removed'
      });
      
      toast.success('Water intake adjusted! 💧');
      
      // Update history
      updateLocalHistory(newIntake);
    } catch (error) {
      console.error('Error adjusting water intake:', error);
      toast.error('Failed to adjust water intake');
      // Revert on error
      setWaterIntake(waterIntake);
    }
  };

  const updateLocalHistory = (currentIntake) => {
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = hydrationHistory.findIndex(entry => entry.date === today);
    
    if (existingIndex >= 0) {
      const updatedHistory = [...hydrationHistory];
      updatedHistory[existingIndex].glasses = currentIntake;
      setHydrationHistory(updatedHistory);
    } else {
      setHydrationHistory(prev => [...prev, { date: today, glasses: currentIntake }]);
    }
  };

  const calculateProgress = () => {
    return Math.min((waterIntake / dailyGoal) * 100, 100);
  };

  const getProgressColor = () => {
    const progress = calculateProgress();
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-300';
  };

  const getMotivationalMessage = () => {
    const progress = calculateProgress();
    if (progress >= 100) return '🎉 Excellent! You\'ve reached your goal!';
    if (progress >= 75) return '💪 Almost there! Keep going!';
    if (progress >= 50) return '👍 Halfway there! You\'re doing great!';
    if (progress >= 25) return '🌱 Good start! Keep hydrating!';
    return '💧 Time to start your hydration journey!';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Water Intake Tracking</h1>
          <p className="text-lg text-gray-600">Smart hydration tracking with AI-powered reminders and personalized water goals</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Hydration Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border-2 border-blue-200 p-8 shadow-lg">
              {/* Today's Hydration Section */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Today's Hydration</h2>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{waterIntake}/{dailyGoal} glasses</p>
                    <p className="text-sm text-gray-500">{waterIntake * GLASS_SIZE_ML}ml / {DAILY_GOAL_ML}ml</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                    <motion.div
                      className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                      initial={{ width: 0 }}
                      animate={{ width: `${calculateProgress()}%` }}
                    />
                  </div>
                  <p className="text-center mt-2 text-sm text-gray-600">
                    {getMotivationalMessage()}
                  </p>
                </div>

                {/* Water Counter */}
                <div className="flex items-center justify-center space-x-8 mb-6">
                  <button
                    onClick={removeWater}
                    disabled={waterIntake <= 0 || isLoading}
                    className="w-16 h-16 rounded-full border-2 border-blue-300 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <FaMinus className="text-xl" />
                  </button>
                  
                  <div className="text-center">
                    <div className="text-6xl font-bold text-blue-600 mb-2">{waterIntake}</div>
                    <div className="text-lg text-gray-600">glasses</div>
                  </div>
                  
                  <button
                    onClick={addWater}
                    disabled={waterIntake >= dailyGoal || isLoading}
                    className="w-16 h-16 rounded-full bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <FaPlus className="text-xl" />
                  </button>
                </div>

                {/* Quick Add Buttons */}
                <div className="flex justify-center space-x-4">
                  {[1, 2, 3].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        for (let i = 0; i < amount; i++) {
                          setTimeout(() => addWater(), i * 100);
                        }
                      }}
                      disabled={waterIntake + amount > dailyGoal || isLoading}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      +{amount} Glass{amount > 1 ? 'es' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Hydration Tips */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center mb-3">
                  <FaRobot className="text-blue-500 text-xl mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">AI Hydration Tips</h3>
                </div>
                <p className="text-gray-700 leading-relaxed">{aiTip}</p>
                <button
                  onClick={generateAiTip}
                  className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors duration-200"
                >
                  Get New Tip →
                </button>
              </div>
            </div>
          </motion.div>

          {/* Sidebar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Daily Goal Card */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaTint className="text-blue-500 mr-2" />
                Daily Goal
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Target:</span>
                  <span className="font-semibold text-gray-900">{dailyGoal} glasses</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Volume:</span>
                  <span className="font-semibold text-gray-900">{DAILY_GOAL_ML}ml</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining:</span>
                  <span className="font-semibold text-gray-900">{Math.max(0, dailyGoal - waterIntake)} glasses</span>
                </div>
              </div>
            </div>

            {/* History Toggle */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                <FaHistory className="text-lg" />
                <span>{showHistory ? 'Hide' : 'Show'} History</span>
              </button>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FaChartLine className="text-blue-500 mr-2" />
                Quick Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">This Week:</span>
                  <span className="font-semibold text-gray-900">
                    {hydrationHistory.slice(0, 7).reduce((sum, day) => sum + day.glasses, 0)} glasses
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Average:</span>
                  <span className="font-semibold text-gray-900">
                    {hydrationHistory.length > 0 
                      ? Math.round(hydrationHistory.slice(0, 7).reduce((sum, day) => sum + day.glasses, 0) / Math.min(hydrationHistory.length, 7))
                      : 0} glasses/day
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Best Day:</span>
                  <span className="font-semibold text-gray-900">
                    {hydrationHistory.length > 0 
                      ? Math.max(...hydrationHistory.map(day => day.glasses))
                      : 0} glasses
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Hydration History */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-8"
            >
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-4">Hydration History</h3>
                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {Array.from({ length: 7 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - i);
                    const dateStr = date.toISOString().split('T')[0];
                    const dayData = hydrationHistory.find(entry => entry.date === dateStr);
                    const glasses = dayData ? dayData.glasses : 0;
                    const isToday = i === 0;
                    
                    return (
                      <div key={dateStr} className="text-center">
                        <div className="text-sm text-gray-500 mb-2">
                          {date.toLocaleDateString('en-US', { weekday: 'short' })}
                        </div>
                        <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center text-sm font-semibold ${
                          isToday ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' :
                          glasses > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {glasses}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Hydration;
