import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaExclamationTriangle,
  FaExclamationCircle,
  FaInfoCircle,
  FaCheckCircle,
  FaSpinner,
  FaChartLine,
  FaHeart,
  FaAppleAlt,
  FaCarrot,
  FaLeaf,
  FaWater,
  FaUtensils,
  FaUserMd,
  FaFish,
  FaEdit,
  FaTimes
} from 'react-icons/fa';

const HealthWarnings = () => {
  const [warnings, setWarnings] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [nutritionData, setNutritionData] = useState(null);
  const [goals, setGoals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [showGoalsForm, setShowGoalsForm] = useState(false);
  const [activeTab, setActiveTab] = useState('warnings'); // warnings, recommendations, goals

  const [goalsForm, setGoalsForm] = useState({
    daily_calories: 2000,
    daily_protein: 50,
    daily_carbs: 250,
    daily_fat: 65,
    daily_sugar: 25,
    daily_sodium: 2300,
    daily_fiber: 25
  });

  const fetchHealthData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch health warnings
      const warningsResponse = await axios.get(`/api/nutrition/health-warnings?days=${selectedPeriod}`);
      setWarnings(warningsResponse.data.warnings || []);
      setNutritionData(warningsResponse.data.nutrition_data);

      // Fetch dietary recommendations
      const recommendationsResponse = await axios.get('/api/nutrition/dietary-recommendations');
      setRecommendations(recommendationsResponse.data.recommendations || []);

      // Fetch nutrition goals
      const goalsResponse = await axios.get('/api/nutrition/goals');
      if (goalsResponse.data.goals) {
        setGoals(goalsResponse.data.goals);
        setGoalsForm({
          daily_calories: goalsResponse.data.goals.daily_calories || 2000,
          daily_protein: goalsResponse.data.goals.daily_protein || 50,
          daily_carbs: goalsResponse.data.goals.daily_carbs || 250,
          daily_fat: goalsResponse.data.goals.daily_fat || 65,
          daily_sugar: goalsResponse.data.goals.daily_sugar || 25,
          daily_sodium: goalsResponse.data.goals.daily_sodium || 2300,
          daily_fiber: goalsResponse.data.goals.daily_fiber || 25
        });
      }

    } catch (error) {
      console.error('Error fetching health data:', error);
      toast.error('Failed to load health data');
      // Generate fallback data
      setWarnings(generateFallbackWarnings());
      setRecommendations(generateFallbackRecommendations());
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    (async () => {
      await fetchHealthData();
    })();
  }, [fetchHealthData]);

  const generateFallbackWarnings = () => {
    return [
      {
        type: 'high_sugar',
        title: 'High Sugar Intake',
        message: 'Your average daily sugar intake is 65g, which is above the recommended 50g. High sugar consumption can increase the risk of diabetes and other health issues.',
        severity: 'high'
      },
      {
        type: 'low_fiber',
        title: 'Low Fiber Intake',
        message: 'Your average daily fiber intake is 18g, which is below the recommended 25g. Fiber is important for digestive health.',
        severity: 'medium'
      }
    ];
  };

  const generateFallbackRecommendations = () => {
    return [
      {
        type: 'sugar_reduction',
        title: 'Reduce Sugar Intake',
        suggestions: [
          'Replace sugary drinks with water or herbal tea',
          'Choose fresh fruits instead of desserts',
          'Read food labels and avoid products with added sugars'
        ],
        priority: 'high'
      },
      {
        type: 'fiber_increase',
        title: 'Increase Fiber Intake',
        suggestions: [
          'Add more vegetables to every meal',
          'Choose whole grains over refined grains',
          'Include fruits with skin (apples, pears)'
        ],
        priority: 'medium'
      }
    ];
  };

  const handleGoalsSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/nutrition/goals', goalsForm);
      toast.success('Nutrition goals updated successfully!');
      setShowGoalsForm(false);
      fetchHealthData();
    } catch (error) {
      console.error('Error updating goals:', error);
      toast.error('Failed to update goals');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'high': return <FaExclamationTriangle className="h-5 w-5 text-red-500" />;
      case 'medium': return <FaExclamationCircle className="h-5 w-5 text-yellow-500" />;
      case 'low': return <FaInfoCircle className="h-5 w-5 text-blue-500" />;
      default: return <FaInfoCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      case 'low': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getNutritionIcon = (type) => {
    switch (type) {
      case 'sugar_reduction': return <FaAppleAlt className="h-5 w-5 text-red-500" />;
      case 'protein_increase': return <FaFish className="h-5 w-5 text-blue-500" />;
      case 'fiber_increase': return <FaCarrot className="h-5 w-5 text-orange-500" />;
      case 'sodium_reduction': return <FaWater className="h-5 w-5 text-cyan-500" />;
      case 'calorie_reduction': return <FaChartLine className="h-5 w-5 text-purple-500" />;
      case 'muscle_building': return <FaHeart className="h-5 w-5 text-pink-500" />;
      case 'allergy_management': return <FaUserMd className="h-5 w-5 text-green-500" />;
      default: return <FaUtensils className="h-5 w-5 text-gray-500" />;
    }
  };

  const calculateProgress = (current, target) => {
    if (!target || target === 0) return 0;
    return Math.min(Math.max((current / target) * 100, 0), 100);
  };

  const getProgressColor = (progress) => {
    if (progress > 120) return 'bg-red-500';
    if (progress > 100) return 'bg-yellow-500';
    if (progress > 80) return 'bg-green-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <FaExclamationTriangle className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Health Warnings</h1>
              <p className="text-gray-600">Monitor your nutrition and get personalized health alerts</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={() => setShowGoalsForm(true)}
              className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <FaEdit className="h-4 w-4 inline mr-2" />
              Set Goals
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('warnings')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'warnings' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaExclamationTriangle className="h-4 w-4 inline mr-2" />
            Warnings ({warnings.length})
          </button>
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'recommendations' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaAppleAlt className="h-4 w-4 inline mr-2" />
            Recommendations ({recommendations.length})
          </button>
          <button
            onClick={() => setActiveTab('goals')}
            className={`flex-1 py-2 px-4 rounded-md transition-colors ${
              activeTab === 'goals' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FaChartLine className="h-4 w-4 inline mr-2" />
            Nutrition Goals
          </button>
        </div>
      </motion.div>

      {/* Warnings Tab */}
      {activeTab === 'warnings' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Alerts</h2>
          
          {warnings.length === 0 ? (
            <div className="text-center py-12">
              <FaCheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-600">Great! No health warnings detected.</p>
              <p className="text-sm text-gray-500 mt-2">Keep up the healthy eating habits!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {warnings.map((warning, index) => (
                <motion.div
                  key={warning.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 ${getSeverityColor(warning.severity)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getSeverityIcon(warning.severity)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{warning.title}</h3>
                      <p className="text-sm text-gray-700 mt-1">{warning.message}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Dietary Recommendations</h2>
          
          {recommendations.length === 0 ? (
            <div className="text-center py-12">
              <FaAppleAlt className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <p className="text-gray-600">No specific recommendations at this time.</p>
              <p className="text-sm text-gray-500 mt-2">Your nutrition looks balanced!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.type}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border rounded-lg p-4 ${getPriorityColor(rec.priority)}`}
                >
                  <div className="flex items-start space-x-3">
                    {getNutritionIcon(rec.type)}
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                      <div className="mt-2 space-y-1">
                        {rec.suggestions.map((suggestion, idx) => (
                          <div key={idx} className="flex items-start space-x-2">
                            <FaLeaf className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                            <span className="text-sm text-gray-700">{suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Goals Tab */}
      {activeTab === 'goals' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Nutrition Goals</h2>
          
          {nutritionData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { key: 'avg_calories', label: 'Calories', target: goals?.daily_calories, unit: 'cal' },
                { key: 'avg_protein', label: 'Protein', target: goals?.daily_protein, unit: 'g' },
                { key: 'avg_carbs', label: 'Carbs', target: goals?.daily_carbs, unit: 'g' },
                { key: 'avg_fat', label: 'Fat', target: goals?.daily_fat, unit: 'g' },
                { key: 'avg_sugar', label: 'Sugar', target: goals?.daily_sugar, unit: 'g' },
                { key: 'avg_sodium', label: 'Sodium', target: goals?.daily_sodium, unit: 'mg' },
                { key: 'avg_fiber', label: 'Fiber', target: goals?.daily_fiber, unit: 'g' }
              ].map((nutrient) => {
                const current = nutritionData[nutrient.key] || 0;
                const target = nutrient.target || 0;
                const progress = calculateProgress(current, target);
                
                return (
                  <div key={nutrient.key} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{nutrient.label}</span>
                      <span className="text-sm text-gray-500">
                        {Math.round(current)} / {target} {nutrient.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {progress > 100 ? `${Math.round(progress)}% above target` : `${Math.round(progress)}% of target`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="text-center">
            <button
              onClick={() => setShowGoalsForm(true)}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <FaEdit className="h-4 w-4 inline mr-2" />
              Update Nutrition Goals
            </button>
          </div>
        </motion.div>
      )}

      {/* Goals Form Modal */}
      {showGoalsForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Set Nutrition Goals</h3>
              <button
                onClick={() => setShowGoalsForm(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleGoalsSubmit} className="space-y-4">
              {[
                { key: 'daily_calories', label: 'Daily Calories', unit: 'cal' },
                { key: 'daily_protein', label: 'Daily Protein', unit: 'g' },
                { key: 'daily_carbs', label: 'Daily Carbs', unit: 'g' },
                { key: 'daily_fat', label: 'Daily Fat', unit: 'g' },
                { key: 'daily_sugar', label: 'Daily Sugar', unit: 'g' },
                { key: 'daily_sodium', label: 'Daily Sodium', unit: 'mg' },
                { key: 'daily_fiber', label: 'Daily Fiber', unit: 'g' }
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    value={goalsForm[field.key]}
                    onChange={(e) => setGoalsForm({
                      ...goalsForm,
                      [field.key]: Number(e.target.value)
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    min="0"
                  />
                </div>
              ))}

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowGoalsForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Save Goals
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default HealthWarnings; 