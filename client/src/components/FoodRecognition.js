import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { 
  FaCamera, 
  FaSpinner, 
  FaCheckCircle, 
  FaExclamationTriangle,
  FaMobile,
  FaDrumstickBite,
  FaBreadSlice,
  FaCarrot,
  FaUtensils,
  FaLeaf,
  FaSeedling,
  FaFire,
  FaHeart,
  FaMagic,
  FaAppleAlt
} from 'react-icons/fa';

const FoodRecognition = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploadedImage, setUploadedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('upload'); // upload, analyzing, results, no_food, recommendations, health-indicators
  const [mealType, setMealType] = useState('lunch');
  const [smartRecommendations, setSmartRecommendations] = useState(null);
  const [healthIndicators, setHealthIndicators] = useState(null);

  // Format any numeric value to 1 decimal place for UI
  const fmt = (n) => Number.parseFloat(n ?? 0).toFixed(1);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedImage(file);
      setStep('upload');
      setAnalysisResult(null);
    }
  }, []);
  
  const resetUpload = () => {
    setStep('upload');
    setAnalysisResult(null);
    setUploadedImage(null);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false
  });

  const analyzeImage = async () => {
    if (!uploadedImage) return;

    setLoading(true);
    setStep('analyzing');

    const formData = new FormData();
    formData.append('image', uploadedImage);

    try {
      const response = await axios.post('/api/ai/recognize-food', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Check if food was detected
      if (!response.data.success && response.data.error === 'no_food_detected') {
        setStep('no_food');
        setAnalysisResult({ message: response.data.message });
        return;
      }

      setAnalysisResult(response.data);
      setStep('results');
      toast.success('Food analysis completed!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze image. Please try again.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  const logMeal = async () => {
    if (!analysisResult) return;

    // Check if user is logged in
    if (!user) {
      toast.error('Please log in to save meals');
      return;
    }

    try {
      // Extract nutrition data from the analysis result
      const nutritionData = analysisResult.nutritionData || [];
      const totalNutrition = analysisResult.totalNutrition || {};
      
      const mealData = {
        meal_type: mealType,
        food_items: nutritionData.map(food => ({
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
        })),
        total_nutrition: {
          calories: Number(totalNutrition.calories || 0),
          protein: Number(totalNutrition.protein || 0),
          carbs: Number(totalNutrition.carbs || 0),
          fat: Number(totalNutrition.fat || 0),
          sugar: Number(totalNutrition.sugar || 0),
          sodium: Number(totalNutrition.sodium || 0),
          fiber: Number(totalNutrition.fiber || 0)
        },
        // ensure it appears for today in Meal Tracking (local timezone)
        date: new Date().toLocaleDateString('en-CA')
      };

      // Include Authorization header if token present
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/meals/log', mealData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      toast.success('Meal logged successfully!');
      
      // Show health indicators first if available
      if (response.data.healthIndicators) {
        setHealthIndicators(response.data.healthIndicators);
        setStep('health-indicators');
      }
      // Show smart recommendations if available (after health indicators)
      else if (response.data.recommendations) {
        setSmartRecommendations(response.data.recommendations);
        setStep('recommendations');
      } else {
        setStep('upload');
        setAnalysisResult(null);
        setUploadedImage(null);
        // take user to Meal Tracking for the same day to view the entry immediately
        navigate(`/meal-tracking?date=${mealData.date}`);
      }
    } catch (error) {
      console.error('Error logging meal:', error);
      toast.error('Failed to log meal. Please try again.');
    }
  };

  const getFoodIcon = (foodName) => {
    const name = foodName.toLowerCase();
    
    // South Indian foods
    if (name.includes('dosa')) return <FaUtensils className="text-amber-600" />;
    if (name.includes('idli')) return <FaSeedling className="text-white" />;
    if (name.includes('vada')) return <FaFire className="text-orange-500" />;
    if (name.includes('sambar')) return <FaLeaf className="text-red-600" />;
    if (name.includes('chutney')) return <FaLeaf className="text-green-600" />;
    if (name.includes('uttapam')) return <FaUtensils className="text-amber-500" />;
    if (name.includes('podi')) return <FaSeedling className="text-brown-600" />;
    if (name.includes('paniyaram')) return <FaFire className="text-orange-600" />;
    if (name.includes('kesari')) return <FaHeart className="text-pink-500" />;
    if (name.includes('upma')) return <FaUtensils className="text-yellow-600" />;
    if (name.includes('pongal')) return <FaUtensils className="text-yellow-700" />;
    if (name.includes('rasam')) return <FaLeaf className="text-red-500" />;
    if (name.includes('curd rice')) return <FaUtensils className="text-white" />;
    if (name.includes('lemon rice')) return <FaUtensils className="text-yellow-500" />;
    if (name.includes('tamarind rice')) return <FaUtensils className="text-brown-500" />;
    if (name.includes('coconut rice')) return <FaUtensils className="text-white" />;
    if (name.includes('peanut chutney')) return <FaSeedling className="text-brown-600" />;
    if (name.includes('mint chutney')) return <FaLeaf className="text-green-500" />;
    if (name.includes('ginger chutney')) return <FaLeaf className="text-orange-600" />;

    // Fruits
    if (name.includes('mango')) return <FaMobile className="text-orange-500" />;
    if (name.includes('grapes')) return <FaMobile className="text-purple-500" />;
    if (name.includes('apple')) return <FaMobile className="text-red-500" />;
    if (name.includes('banana')) return <FaMobile className="text-yellow-500" />;

    // Proteins
    if (name.includes('chicken') || name.includes('meat')) return <FaDrumstickBite className="text-orange-500" />;
    if (name.includes('fish')) return <FaMobile className="text-blue-500" />;
    if (name.includes('egg')) return <FaMobile className="text-yellow-600" />;

    // Grains
    if (name.includes('bread') || name.includes('rice')) return <FaBreadSlice className="text-yellow-500" />;
    if (name.includes('pasta')) return <FaUtensils className="text-yellow-400" />;

    // Vegetables
    if (name.includes('broccoli') || name.includes('vegetable')) return <FaCarrot className="text-green-500" />;
    if (name.includes('salad')) return <FaLeaf className="text-green-600" />;

    // Dairy
    if (name.includes('yogurt') || name.includes('curd')) return <FaMobile className="text-white" />;
    if (name.includes('milk')) return <FaMobile className="text-blue-100" />;

    return <FaUtensils className="text-gray-500" />;
  };

  const getHealthIcon = (isHealthy) => {
    return isHealthy ? <FaCheckCircle className="text-green-500" /> : <FaExclamationTriangle className="text-red-500" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="rounded-3xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-white rounded-3xl shadow-2xl p-8"
        >
          <motion.div 
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="flex items-center justify-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 rounded-full mr-3"
              >
                <FaMagic className="text-white text-2xl" />
              </motion.div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AI Food Recognition 🍽️✨
              </h1>
            </div>
            <p className="text-gray-600 text-lg">
              Take a photo of your meal and get instant nutritional analysis
            </p>
          </motion.div>

          {step === 'upload' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <motion.div
                {...getRootProps()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  isDragActive
                    ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg'
                    : 'border-gray-300 hover:border-indigo-400 hover:bg-gradient-to-br hover:from-indigo-50 hover:to-purple-50 hover:shadow-lg'
                }`}
              >
                <input {...getInputProps()} />
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                >
                  <FaCamera className="mx-auto h-16 w-16 text-indigo-400 mb-6" />
                </motion.div>
                {isDragActive ? (
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-indigo-600 font-semibold text-lg"
                  >
                    Drop the image here... ✨
                  </motion.p>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <p className="text-gray-700 mb-3 text-lg font-medium">
                      Drag & drop an image here, or click to select
                    </p>
                    <p className="text-sm text-gray-500">
                      Supports JPG, PNG, GIF up to 10MB
                    </p>
                  </motion.div>
                )}
              </motion.div>

              {uploadedImage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-6"
                >
                  <motion.div 
                    className="flex items-center justify-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <img
                      src={URL.createObjectURL(uploadedImage)}
                      alt="Uploaded food"
                      className="max-h-80 rounded-2xl shadow-2xl border-2 border-gray-200"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex gap-4 justify-center"
                  >
                    <motion.button
                      onClick={resetUpload}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium hover:border-indigo-400"
                    >
                      <FaCamera className="inline mr-2" />
                      Choose Another
                    </motion.button>
                    <motion.button
                      onClick={analyzeImage}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 transition-all duration-300"
                    >
                      <FaMagic className="inline mr-2" />
                      Analyze Food
                    </motion.button>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}

          {step === 'analyzing' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center space-y-8"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mx-auto w-20 h-20 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center"
              >
                <FaSpinner className="text-white text-3xl" />
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Analyzing Your Food... 🍽️
                </h3>
                <p className="text-gray-600 text-lg">
                  Our AI is identifying ingredients and calculating nutrition facts
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200"
              >
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-center">
                  <FaMagic className="mr-2 text-indigo-500" />
                  AI Analysis in Progress:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-gray-700">Food Recognition</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-gray-700">Nutrition Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span className="text-gray-700">Calorie Calculation</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-pink-500 rounded-full"></div>
                    <span className="text-gray-700">Health Insights</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {step === 'health-indicators' && healthIndicators && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`border-2 rounded-2xl p-6 ${
                  healthIndicators.overallHealth === 'good' 
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                    : healthIndicators.overallHealth === 'warning'
                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200'
                    : 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className={`p-3 rounded-full mr-3 ${
                      healthIndicators.overallHealth === 'good' 
                        ? 'bg-gradient-to-r from-green-400 to-emerald-500' 
                        : healthIndicators.overallHealth === 'warning'
                        ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                        : 'bg-gradient-to-r from-red-400 to-pink-500'
                    }`}
                  >
                    {healthIndicators.overallHealth === 'good' ? (
                      <FaCheckCircle className="text-white text-2xl" />
                    ) : healthIndicators.overallHealth === 'warning' ? (
                      <FaExclamationTriangle className="text-white text-2xl" />
                    ) : (
                      <FaExclamationTriangle className="text-white text-2xl" />
                    )}
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Health Analysis Results
                  </h3>
                </div>

                {/* Overall Health Status */}
                <div className="text-center mb-6">
                  <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                    healthIndicators.overallHealth === 'good' 
                      ? 'bg-green-100 text-green-800' 
                      : healthIndicators.overallHealth === 'warning'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {healthIndicators.overallHealth === 'good' ? (
                      <>
                        <FaCheckCircle className="mr-2" />
                        Overall Health: Good
                      </>
                    ) : healthIndicators.overallHealth === 'warning' ? (
                      <>
                        <FaExclamationTriangle className="mr-2" />
                        Overall Health: Warning
                      </>
                    ) : (
                      <>
                        <FaExclamationTriangle className="mr-2" />
                        Overall Health: Poor
                      </>
                    )}
                  </div>
                </div>

                {/* Food Health Indicators */}
                {healthIndicators.indicators && healthIndicators.indicators.length > 0 && (
                  <div className="space-y-4 mb-6">
                    <h4 className="text-lg font-semibold text-gray-800">Food Analysis</h4>
                    {healthIndicators.indicators.map((indicator, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index }}
                        className={`bg-white rounded-xl p-4 shadow-sm border ${
                          indicator.status === 'good' 
                            ? 'border-green-200' 
                            : indicator.status === 'warning'
                            ? 'border-yellow-200'
                            : 'border-red-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-full ${
                            indicator.status === 'good' 
                              ? 'bg-green-100' 
                              : indicator.status === 'warning'
                              ? 'bg-yellow-100'
                              : 'bg-red-100'
                          }`}>
                            {indicator.status === 'good' ? (
                              <FaCheckCircle className="text-green-600" />
                            ) : indicator.status === 'warning' ? (
                              <FaExclamationTriangle className="text-yellow-600" />
                            ) : (
                              <FaExclamationTriangle className="text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-800">{indicator.foodName}</h5>
                            <p className="text-sm text-gray-600 mt-1">{indicator.reason}</p>
                            {indicator.condition && (
                              <p className="text-xs text-gray-500 mt-1">
                                <strong>Affects:</strong> {indicator.condition}
                              </p>
                            )}
                            {indicator.suggestion && (
                              <p className="text-sm text-blue-600 mt-2">
                                <strong>Suggestion:</strong> {indicator.suggestion}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {healthIndicators.warnings && healthIndicators.warnings.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4"
                  >
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <FaExclamationTriangle className="text-yellow-600 mr-2" />
                      Warnings
                    </h4>
                    <ul className="list-disc ml-5 space-y-1">
                      {healthIndicators.warnings.map((warning, index) => (
                        <li key={index} className="text-gray-700">{warning}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Recommendations */}
                {healthIndicators.recommendations && healthIndicators.recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4"
                  >
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <FaHeart className="text-blue-600 mr-2" />
                      Recommendations
                    </h4>
                    <ul className="list-disc ml-5 space-y-1">
                      {healthIndicators.recommendations.map((rec, index) => (
                        <li key={index} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                <motion.div 
                  className="flex flex-col md:flex-row items-stretch gap-3 pt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <motion.button
                    onClick={() => {
                      setStep('recommendations');
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    View Smart Recommendations
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setStep('upload');
                      setAnalysisResult(null);
                      setUploadedImage(null);
                      setHealthIndicators(null);
                      setSmartRecommendations(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-gray-600 hover:to-gray-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Analyze Another Meal
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}

          {step === 'recommendations' && smartRecommendations && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6"
              >
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="bg-gradient-to-r from-blue-400 to-indigo-500 p-3 rounded-full mr-3"
                  >
                    <FaAppleAlt className="text-white text-2xl" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Smart Food Recommendations! 🍎
                  </h3>
                </div>

                <div className="space-y-4">
                  {/* Next Meal Suggestions */}
                  {smartRecommendations.nextMealSuggestions?.map((suggestion, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-white rounded-xl p-4 shadow-sm border border-blue-100"
                    >
                      <h4 className="font-semibold text-gray-800 mb-3 capitalize">{suggestion.mealType} Suggestions</h4>
                      <div className="space-y-2">
                        {suggestion.foods?.map((food, foodIndex) => (
                          <div key={foodIndex} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                            <FaAppleAlt className="text-blue-500 mt-1 flex-shrink-0" />
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-800">{food.name}</h5>
                              <p className="text-sm text-gray-600 mt-1">{food.reason}</p>
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Portion: {food.portion}</span>
                                <span>Benefit: {food.nutritionalBenefit}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}

                  {/* Nutritional Gaps */}
                  {smartRecommendations.nutritionalGaps?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">Nutritional Gaps to Address</h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {smartRecommendations.nutritionalGaps.map((gap, index) => (
                          <li key={index} className="text-gray-700">{gap}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Health Tips */}
                  {smartRecommendations.healthTips?.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-green-50 border border-green-200 rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">Health Tips</h4>
                      <ul className="list-disc ml-5 space-y-1">
                        {smartRecommendations.healthTips.map((tip, index) => (
                          <li key={index} className="text-gray-700">{tip}</li>
                        ))}
                      </ul>
                    </motion.div>
                  )}

                  {/* Timing */}
                  {smartRecommendations.timing && (
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-purple-50 border border-purple-200 rounded-xl p-4"
                    >
                      <h4 className="font-semibold text-gray-800 mb-2">Recommended Timing</h4>
                      <p className="text-gray-700">{smartRecommendations.timing}</p>
                    </motion.div>
                  )}
                </div>
              </motion.div>

              <motion.div 
                className="flex flex-col md:flex-row items-stretch gap-3 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                                  <motion.button
                    onClick={() => {
                      setStep('upload');
                      setAnalysisResult(null);
                      setUploadedImage(null);
                      setSmartRecommendations(null);
                      setHealthIndicators(null);
                    }}
                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-lg"
                  >
                    Analyze Another Meal
                  </motion.button>
                <motion.button
                  onClick={() => navigate('/meal-tracking')}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  View Meal Tracking
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {step === 'results' && analysisResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6"
              >
                <div className="flex items-center justify-center mb-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="bg-gradient-to-r from-green-400 to-emerald-500 p-3 rounded-full mr-3"
                  >
                    <FaCheckCircle className="text-white text-2xl" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-gray-800">
                    Analysis Complete! ✨
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-indigo-600">{fmt(analysisResult.totalNutrition?.calories)}</div>
                    <div className="text-sm text-gray-600">Calories</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-green-600">{fmt(analysisResult.totalNutrition?.protein)}g</div>
                    <div className="text-sm text-gray-600">Protein</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-orange-600">{fmt(analysisResult.totalNutrition?.carbs)}g</div>
                    <div className="text-sm text-gray-600">Carbs</div>
                  </div>
                  <div className="bg-white rounded-xl p-4 text-center shadow-sm">
                    <div className="text-2xl font-bold text-red-600">{fmt(analysisResult.totalNutrition?.fat)}g</div>
                    <div className="text-sm text-gray-600">Fat</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <h4 className="text-xl font-semibold text-gray-800 mb-4">Detected Foods:</h4>
                <div className="grid gap-4">
                  {analysisResult.nutritionData?.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                            {getFoodIcon(item.name)}
                          </div>
                          <div>
                            <h5 className="font-semibold text-gray-800">{item.name}</h5>
                            <p className="text-sm text-gray-600">{item.quantity} {item.unit}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-indigo-600">{fmt(item.nutrition?.calories)} cal</div>
                          <div className="text-xs text-gray-500">
                            P: {fmt(item.nutrition?.protein)}g | C: {fmt(item.nutrition?.carbs)}g | F: {fmt(item.nutrition?.fat)}g
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                className="flex flex-col md:flex-row items-stretch gap-3 pt-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 }}
              >
                <motion.button
                  onClick={() => setStep('upload')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-full md:flex-1 h-12 px-6 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-all duration-300 font-medium"
                >
                  Analyze Another
                </motion.button>
                <div className="md:w-60 w-full">
                  <label className="sr-only">Meal Type</label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full h-12 px-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white"
                  >
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                  </select>
                </div>
                <motion.button
                  onClick={logMeal}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  disabled={!user}
                  className={`w-full md:flex-1 h-12 px-6 rounded-xl transition-all duration-300 font-medium shadow-lg ${
                    user 
                      ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {user ? 'Log Meal' : 'Login to Save'}
                </motion.button>
              </motion.div>
            </motion.div>
          )}

          {step === 'no_food' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center space-y-6"
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-8"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="mx-auto w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4"
                >
                  <FaExclamationTriangle className="text-white text-2xl" />
                </motion.div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-3">
                  Oops! No Food Detected
                </h3>
                
                <p className="text-lg text-gray-700 mb-6 leading-relaxed">
                  {analysisResult?.message || "Hey, I can't really see the food in that picture. Could you send the meal photo again?"}
                </p>
                
                <div className="bg-white rounded-xl p-6 border border-yellow-200">
                  <h4 className="font-semibold text-gray-800 mb-3 flex items-center justify-center">
                    <FaCamera className="mr-2 text-blue-500" />
                    Tips for Better Food Photos:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-2 text-left">
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Make sure the food is clearly visible and well-lit
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Take the photo from directly above or at a slight angle
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Avoid photos with too much background or non-food objects
                    </li>
                    <li className="flex items-start">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Ensure the image is not blurry or too dark
                    </li>
                  </ul>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex gap-4 justify-center"
              >
                <motion.button
                  onClick={resetUpload}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
                >
                  <FaCamera className="inline mr-2" />
                  Try Another Photo
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default FoodRecognition; 