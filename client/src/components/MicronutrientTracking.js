import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaPills, FaHeartbeat, FaExclamationTriangle, FaCheckCircle,
  FaChartLine, FaAppleAlt, FaLeaf, FaEye, FaBullseye,
  FaShoppingCart, FaLightbulb, FaCalendarAlt,
  FaInfoCircle, FaLock, FaShieldAlt, FaUser, FaCog, FaDownload,
  FaShare, FaBookmark, FaHistory, FaArrowRight
} from 'react-icons/fa';
import axios from 'axios';

// Micronutrient daily requirements (RDA values) - matching backend
const MICRONUTRIENT_RDA = {
  vitamin_a: 900, // mcg
  vitamin_c: 90, // mg
  vitamin_d: 20, // mcg
  vitamin_e: 15, // mg
  vitamin_k: 120, // mcg
  thiamine_b1: 1.2, // mg
  riboflavin_b2: 1.3, // mg
  niacin_b3: 16, // mg
  pantothenic_acid_b5: 5, // mg
  pyridoxine_b6: 1.7, // mg
  biotin_b7: 30, // mcg
  folate_b9: 400, // mcg
  cobalamin_b12: 2.4, // mcg
  calcium: 1000, // mg
  iron: 8, // mg
  magnesium: 400, // mg
  phosphorus: 700, // mg
  potassium: 3500, // mg
  sodium: 2300, // mg (upper limit)
  zinc: 11, // mg
  copper: 900, // mcg
  manganese: 2.3, // mg
  selenium: 55, // mcg
  iodine: 150, // mcg
  chromium: 35, // mcg
  molybdenum: 45 // mcg
};

// Nutrient descriptions and health implications
const NUTRIENT_INFO = {
  vitamin_a: {
    name: 'Vitamin A',
    description: 'Essential for vision, immune function, and cell growth',
    benefits: ['Eye health', 'Immune system', 'Skin health', 'Bone growth'],
    deficiency_effects: ['Night blindness', 'Dry skin', 'Frequent infections', 'Delayed growth'],
    unit: 'mcg'
  },
  vitamin_c: {
    name: 'Vitamin C',
    description: 'Powerful antioxidant that supports immune function and collagen production',
    benefits: ['Immune support', 'Collagen synthesis', 'Antioxidant protection', 'Iron absorption'],
    deficiency_effects: ['Scurvy', 'Weak immune system', 'Slow wound healing', 'Bleeding gums'],
    unit: 'mg'
  },
  vitamin_d: {
    name: 'Vitamin D',
    description: 'Critical for bone health, immune function, and mood regulation',
    benefits: ['Bone health', 'Immune function', 'Mood regulation', 'Muscle strength'],
    deficiency_effects: ['Weak bones', 'Muscle weakness', 'Depression', 'Frequent illness'],
    unit: 'mcg'
  },
  vitamin_e: {
    name: 'Vitamin E',
    description: 'Antioxidant that protects cells from damage and supports immune function',
    benefits: ['Antioxidant protection', 'Immune support', 'Skin health', 'Eye health'],
    deficiency_effects: ['Nerve damage', 'Muscle weakness', 'Vision problems', 'Immune issues'],
    unit: 'mg'
  },
  vitamin_k: {
    name: 'Vitamin K',
    description: 'Essential for blood clotting and bone health',
    benefits: ['Blood clotting', 'Bone health', 'Heart health', 'Wound healing'],
    deficiency_effects: ['Easy bruising', 'Bleeding problems', 'Weak bones', 'Poor wound healing'],
    unit: 'mcg'
  },
  thiamine_b1: {
    name: 'Vitamin B1 (Thiamine)',
    description: 'Essential for energy metabolism and nerve function',
    benefits: ['Energy production', 'Nerve function', 'Heart health', 'Brain function'],
    deficiency_effects: ['Fatigue', 'Nerve damage', 'Heart problems', 'Memory issues'],
    unit: 'mg'
  },
  riboflavin_b2: {
    name: 'Vitamin B2 (Riboflavin)',
    description: 'Important for energy production and cellular function',
    benefits: ['Energy metabolism', 'Skin health', 'Eye health', 'Red blood cell production'],
    deficiency_effects: ['Cracked lips', 'Sore throat', 'Eye fatigue', 'Skin problems'],
    unit: 'mg'
  },
  niacin_b3: {
    name: 'Vitamin B3 (Niacin)',
    description: 'Supports energy production and cardiovascular health',
    benefits: ['Energy production', 'Heart health', 'Skin health', 'Brain function'],
    deficiency_effects: ['Pellagra', 'Digestive issues', 'Mental confusion', 'Skin problems'],
    unit: 'mg'
  },
  pyridoxine_b6: {
    name: 'Vitamin B6',
    description: 'Essential for brain development and immune function',
    benefits: ['Brain function', 'Immune support', 'Hormone regulation', 'Protein metabolism'],
    deficiency_effects: ['Depression', 'Confusion', 'Weak immune system', 'Anemia'],
    unit: 'mg'
  },
  cobalamin_b12: {
    name: 'Vitamin B12',
    description: 'Critical for nerve function and red blood cell formation',
    benefits: ['Nerve function', 'Red blood cells', 'DNA synthesis', 'Brain health'],
    deficiency_effects: ['Anemia', 'Nerve damage', 'Memory problems', 'Fatigue'],
    unit: 'mcg'
  },
  folate_b9: {
    name: 'Folate (B9)',
    description: 'Essential for DNA synthesis and cell division',
    benefits: ['DNA synthesis', 'Red blood cells', 'Pregnancy health', 'Heart health'],
    deficiency_effects: ['Anemia', 'Birth defects', 'Heart disease', 'Mental health issues'],
    unit: 'mcg'
  },
  calcium: {
    name: 'Calcium',
    description: 'Essential for strong bones, teeth, and muscle function',
    benefits: ['Bone strength', 'Muscle function', 'Nerve transmission', 'Heart health'],
    deficiency_effects: ['Weak bones', 'Muscle cramps', 'Dental problems', 'Osteoporosis'],
    unit: 'mg'
  },
  iron: {
    name: 'Iron',
    description: 'Critical for oxygen transport and energy production',
    benefits: ['Oxygen transport', 'Energy production', 'Immune function', 'Brain development'],
    deficiency_effects: ['Anemia', 'Fatigue', 'Weakness', 'Poor concentration'],
    unit: 'mg'
  },
  magnesium: {
    name: 'Magnesium',
    description: 'Important for muscle function, nerve transmission, and bone health',
    benefits: ['Muscle function', 'Nerve health', 'Bone strength', 'Heart rhythm'],
    deficiency_effects: ['Muscle cramps', 'Anxiety', 'Insomnia', 'Heart problems'],
    unit: 'mg'
  },
  zinc: {
    name: 'Zinc',
    description: 'Essential for immune function, wound healing, and protein synthesis',
    benefits: ['Immune function', 'Wound healing', 'Protein synthesis', 'Taste and smell'],
    deficiency_effects: ['Weak immune system', 'Slow healing', 'Loss of appetite', 'Hair loss'],
    unit: 'mg'
  }
};

const MicronutrientTracking = () => {
  const [loading, setLoading] = useState(false);
  const [deficiencies, setDeficiencies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [activeTab, setActiveTab] = useState('weekly-overview');
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [selectedNutrient, setSelectedNutrient] = useState(null);
  const [showNutrientModal, setShowNutrientModal] = useState(false);
  const [weeklyData, setWeeklyData] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [healthConditions, setHealthConditions] = useState([]);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    end: new Date()
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMicronutrientAnalysis();
    fetchWeeklyData();
    fetchUserProfile();
  }, [selectedPeriod]);

  const fetchMicronutrientAnalysis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/advanced-nutrition/micronutrients/analysis?period=${selectedPeriod}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      
      setAnalysisData(response.data);
      setDeficiencies(response.data.deficiencies || []);
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      console.error('Error fetching micronutrient analysis:', error);
    }
    setLoading(false);
  };

  const fetchWeeklyData = async () => {
    try {
      const response = await axios.get('/api/advanced-nutrition/micronutrients/weekly-data', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setWeeklyData(response.data.weeklyData || []);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
      // Generate mock weekly data for demonstration
      generateMockWeeklyData();
    }
  };

  const generateMockWeeklyData = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const mockData = days.map((day, index) => ({
      day,
      date: new Date(Date.now() - (6 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      nutrients: Object.keys(MICRONUTRIENT_RDA).reduce((acc, nutrient) => {
        acc[nutrient] = Math.random() * MICRONUTRIENT_RDA[nutrient] * 1.5;
        return acc;
      }, {})
    }));
    setWeeklyData(mockData);
  };

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUserProfile(response.data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'severe': return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'mild': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getNutrientDisplayName = (nutrient) => {
    return NUTRIENT_INFO[nutrient]?.name || nutrient.replace('_', ' ').toUpperCase();
  };

  const getNutrientDescription = (nutrient) => {
    return NUTRIENT_INFO[nutrient]?.description || 'Essential nutrient for health and wellness';
  };

  const getNutrientUnit = (nutrient) => {
    return NUTRIENT_INFO[nutrient]?.unit || 'units';
  };

  const calculateWeeklyProgress = (nutrient) => {
    if (!weeklyData.length) return 0;
    
    const totalIntake = weeklyData.reduce((sum, day) => sum + (day.nutrients[nutrient] || 0), 0);
    const weeklyRDA = MICRONUTRIENT_RDA[nutrient] * 7;
    return Math.min((totalIntake / weeklyRDA) * 100, 100);
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    try {
      // Create a comprehensive report
      const report = {
        title: 'Micronutrient Weekly Report',
        dateRange: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
        summary: {
          totalNutrients: Object.keys(MICRONUTRIENT_RDA).length,
          deficiencies: deficiencies.length,
          recommendations: recommendations.length
        },
        weeklyData: weeklyData,
        deficiencies: deficiencies,
        recommendations: recommendations
      };

      // Convert to JSON and download
      const dataStr = JSON.stringify(report, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `micronutrient-report-${dateRange.start.toISOString().split('T')[0]}-to-${dateRange.end.toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      // Show success message
      alert('Report exported successfully! 📊');
    } catch (error) {
      alert('Error exporting report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareProgress = async () => {
    setIsSharing(true);
    try {
      // Share functionality - can be expanded for social media
      if (navigator.share) {
        await navigator.share({
          title: 'My Micronutrient Progress',
          text: `Check out my micronutrient tracking progress! ${deficiencies.length} deficiencies identified with ${recommendations.length} personalized recommendations.`,
          url: window.location.href
        });
      } else {
        // Fallback: copy to clipboard
        const shareText = `My Micronutrient Progress: ${deficiencies.length} deficiencies, ${recommendations.length} recommendations. Progress: ${Object.keys(MICRONUTRIENT_RDA).slice(0, 5).map(n => `${getNutrientDisplayName(n)}: ${Math.round(calculateWeeklyProgress(n))}%`).join(', ')}`;
        await navigator.clipboard.writeText(shareText);
        alert('Progress copied to clipboard! 📋');
      }
    } catch (error) {
      alert('Error sharing progress. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSaveReport = async () => {
    setIsSaving(true);
    try {
      // Save to localStorage for now, can be expanded for cloud storage
      const savedReport = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        title: 'Micronutrient Report',
        data: {
          weeklyData: weeklyData,
          deficiencies: deficiencies,
          recommendations: recommendations
        }
      };

      const savedReports = JSON.parse(localStorage.getItem('micronutrientReports') || '[]');
      savedReports.push(savedReport);
      localStorage.setItem('micronutrientReports', JSON.stringify(savedReports));
      
      alert('Report saved successfully! 💾');
    } catch (error) {
      alert('Error saving report. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderWeeklyOverview = () => (
    <div className="space-y-6">
      {/* Weekly Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl border border-blue-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 font-medium">Weekly Average</p>
              <p className="text-2xl font-bold text-blue-800">
                {analysisData?.analyzedMeals || 0} meals
              </p>
            </div>
            <FaCalendarAlt className="text-3xl text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl border border-green-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 font-medium">Nutrients Tracked</p>
              <p className="text-2xl font-bold text-green-800">
                {analysisData?.totalNutrients || 0}
              </p>
            </div>
            <FaPills className="text-3xl text-green-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 font-medium">Deficiencies</p>
              <p className="text-2xl font-bold text-orange-800">
                {deficiencies.length}
              </p>
            </div>
            <FaExclamationTriangle className="text-3xl text-orange-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 font-medium">Recommendations</p>
              <p className="text-2xl font-bold text-purple-800">
                {recommendations.length}
              </p>
            </div>
            <FaLightbulb className="text-3xl text-purple-500" />
          </div>
        </motion.div>
      </div>

      {/* Weekly Progress Chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <FaChartLine className="mr-2 text-blue-500" />
          Weekly Micronutrient Progress
        </h3>
        
        {weeklyData.length > 0 ? (
          <div className="space-y-4">
            {Object.keys(MICRONUTRIENT_RDA).slice(0, 8).map((nutrient) => {
              const progress = calculateWeeklyProgress(nutrient);
              const isDeficient = progress < 70;
              
              return (
                <div key={nutrient} className="flex items-center space-x-4">
                  <div className="w-32">
                    <span className="text-sm font-medium text-gray-700">
                      {getNutrientDisplayName(nutrient)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Weekly Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress >= 100 ? 'bg-green-500' :
                          progress >= 70 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedNutrient(nutrient);
                      setShowNutrientModal(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    Details <FaArrowRight className="ml-1 text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaChartLine className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No weekly data available</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={handleExportReport} 
          disabled={isExporting}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
            isExporting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <FaDownload className="text-lg" />
          )}
          <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
        </button>
        
        <button 
          onClick={handleShareProgress} 
          disabled={isSharing}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
            isSharing 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-500 hover:bg-green-600 text-white'
          }`}
        >
          {isSharing ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <FaShare className="text-lg" />
          )}
          <span>{isSharing ? 'Sharing...' : 'Share Progress'}</span>
        </button>
        
        <button 
          onClick={handleSaveReport} 
          disabled={isSaving}
          className={`flex items-center justify-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
            isSaving 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-purple-500 hover:bg-purple-600 text-white'
          }`}
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <FaBookmark className="text-lg" />
          )}
          <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
        </button>
      </div>

      {/* Button Help Text */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center space-x-6 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <FaDownload className="text-blue-500" />
            <span>Export detailed JSON report</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaShare className="text-green-500" />
            <span>Share progress with others</span>
          </div>
          <div className="flex items-center space-x-2">
            <FaBookmark className="text-purple-500" />
            <span>Save report locally</span>
          </div>
        </div>
      </div>

      {/* Weekly Micronutrient Progress */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        {/* Date Range Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FaCalendarAlt className="text-blue-500 text-xl" />
              <div>
                <h4 className="font-semibold text-blue-800">Selected Date Range</h4>
                <p className="text-blue-600 text-sm">
                  {dateRange.start.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })} - {dateRange.end.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {Math.ceil((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24))} days
              </div>
              <div className="text-blue-500 text-sm">Analysis Period</div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-800 flex items-center">
            <FaChartLine className="mr-2 text-blue-500" />
            Weekly Micronutrient Progress
          </h3>
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-lg">
            {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
          </div>
        </div>
        
        {/* Date Range Selector */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">Date Range:</label>
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => {
                const today = new Date();
                const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
                setDateRange({ start: weekAgo, end: today });
              }}
              className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
            >
              Last 7 Days
            </button>
          </div>
        </div>
        
        {weeklyData.length > 0 ? (
          <div className="space-y-4">
            {Object.keys(MICRONUTRIENT_RDA).slice(0, 8).map((nutrient) => {
              const progress = calculateWeeklyProgress(nutrient);
              const isDeficient = progress < 70;
              
              return (
                <div key={nutrient} className="flex items-center space-x-4">
                  <div className="w-32">
                    <span className="text-sm font-medium text-gray-700">
                      {getNutrientDisplayName(nutrient)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Weekly Progress</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${
                          progress >= 100 ? 'bg-green-500' :
                          progress >= 70 ? 'bg-blue-500' :
                          progress >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedNutrient(nutrient);
                      setShowNutrientModal(true);
                    }}
                    className="text-blue-500 hover:text-blue-700 text-sm font-medium flex items-center"
                  >
                    Details <FaArrowRight className="ml-1 text-xs" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <FaChartLine className="text-4xl text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No weekly data available</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderNutrientDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Nutrient Details</h3>
        <span className="text-sm text-gray-600">
          Based on {selectedPeriod} analysis
        </span>
      </div>

      {Object.keys(MICRONUTRIENT_RDA).map((nutrient) => {
        const info = NUTRIENT_INFO[nutrient];
        const rda = MICRONUTRIENT_RDA[nutrient];
        const average = analysisData?.averages?.[nutrient] || 0;
        const percentage = (average / rda) * 100;
        const isDeficient = percentage < 70;
        const weeklyProgress = calculateWeeklyProgress(nutrient);
        
        return (
          <motion.div
            key={nutrient}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`border rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg ${
              isDeficient ? 'border-orange-200 bg-orange-50' : 'border-gray-200 bg-white'
            }`}
            onClick={() => {
              setSelectedNutrient(nutrient);
              setShowNutrientModal(true);
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-800 mb-2">
                  {info?.name || getNutrientDisplayName(nutrient)}
                </h4>
                <p className="text-gray-600 text-sm mb-3">
                  {info?.description || 'Essential nutrient for health and wellness'}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <span className="text-xs text-gray-500">Daily RDA</span>
                    <p className="font-medium">{rda} {info?.unit || 'units'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Your Average</span>
                    <p className="font-medium">{Math.round(average * 100) / 100} {info?.unit || 'units'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Daily %</span>
                    <p className="font-medium">{Math.round(percentage)}%</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Weekly Progress</span>
                    <p className="font-medium">{Math.round(weeklyProgress)}%</p>
                  </div>
                </div>
              </div>
              
              {isDeficient && (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                  Deficient
                </span>
              )}
            </div>

            {/* Progress Bars */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Daily Intake vs RDA</span>
                  <span>{Math.round(percentage)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      percentage >= 100 ? 'bg-green-500' :
                      percentage >= 70 ? 'bg-blue-500' :
                      percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Weekly Progress</span>
                  <span>{Math.round(weeklyProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      weeklyProgress >= 100 ? 'bg-green-500' :
                      weeklyProgress >= 70 ? 'bg-blue-500' :
                      weeklyProgress >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${weeklyProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Benefits and Effects */}
            {info && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaCheckCircle className="mr-2 text-green-500" />
                    Benefits
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {info.benefits?.slice(0, 3).map((benefit, index) => (
                      <li key={index} className="flex items-center">
                        <FaBullseye className="mr-2 text-green-400 text-xs" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium text-gray-800 mb-2 flex items-center">
                    <FaExclamationTriangle className="mr-2 text-orange-500" />
                    Deficiency Effects
                  </h5>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {info.deficiency_effects?.slice(0, 3).map((effect, index) => (
                      <li key={index} className="flex items-center">
                        <FaExclamationTriangle className="mr-2 text-orange-400 text-xs" />
                        {effect}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );

  const renderNutrientModal = () => (
    <AnimatePresence>
      {showNutrientModal && selectedNutrient && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowNutrientModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {getNutrientDisplayName(selectedNutrient)}
              </h2>
              <button
                onClick={() => setShowNutrientModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaEye className="text-xl" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Nutrient Information */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-blue-800 mb-2">About This Nutrient</h3>
                <p className="text-blue-700">
                  {getNutrientDescription(selectedNutrient)}
                </p>
              </div>

              {/* Current Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Daily RDA</p>
                  <p className="text-xl font-bold text-gray-800">
                    {MICRONUTRIENT_RDA[selectedNutrient]} {getNutrientUnit(selectedNutrient)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Your Average</p>
                  <p className="text-xl font-bold text-gray-800">
                    {Math.round((analysisData?.averages?.[selectedNutrient] || 0) * 100) / 100} {getNutrientUnit(selectedNutrient)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600">Weekly Progress</p>
                  <p className="text-xl font-bold text-gray-800">
                    {Math.round(calculateWeeklyProgress(selectedNutrient))}%
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {recommendations.find(r => r.nutrient === selectedNutrient) && (
                <div className="bg-green-50 rounded-xl p-4">
                  <h3 className="font-semibold text-green-800 mb-3 flex items-center">
                    <FaLightbulb className="mr-2" />
                    Personalized Recommendations
                  </h3>
                  {renderNutrientRecommendations(
                    recommendations.find(r => r.nutrient === selectedNutrient)
                  )}
                </div>
              )}

              {/* Food Sources */}
              {analysisData?.topFoodSources?.[selectedNutrient] && (
                <div className="bg-orange-50 rounded-xl p-4">
                  <h3 className="font-semibold text-orange-800 mb-3 flex items-center">
                    <FaAppleAlt className="mr-2" />
                    Top Food Sources
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analysisData.topFoodSources[selectedNutrient].map((source, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-orange-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-800">{source.food}</span>
                          <span className="text-sm text-gray-500">{source.amount}</span>
                        </div>
                        <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                          {source.category}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const renderNutrientRecommendations = (recommendation) => (
    <div className="space-y-4">
      {/* Food Sources with Categories */}
      {recommendation.foods && recommendation.foods.length > 0 && (
        <div>
          <h6 className="font-medium text-sm text-green-700 mb-3 flex items-center">
            <FaAppleAlt className="mr-2" />
            Top Food Sources
          </h6>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendation.foods.map((food, index) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-green-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-gray-800">{food.food}</span>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded-full">
                    {food.amount} per {food.serving}
                  </span>
                </div>
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                  {food.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supplements */}
      {recommendation.supplements && recommendation.supplements.length > 0 && (
        <div>
          <h6 className="font-medium text-sm text-green-700 mb-3 flex items-center">
            <FaPills className="mr-2" />
            Supplement Options
          </h6>
          <div className="flex flex-wrap gap-2">
            {recommendation.supplements.map((supplement, index) => (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {supplement}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Local Alternatives */}
      {recommendation.localAlternatives && recommendation.localAlternatives.length > 0 && (
        <div>
          <h6 className="font-medium text-sm text-green-700 mb-3 flex items-center">
            <FaLeaf className="mr-2" />
            Local Alternatives
          </h6>
          <div className="flex flex-wrap gap-2">
            {recommendation.localAlternatives.map((alternative, index) => (
              <span
                key={index}
                className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium"
              >
                {alternative}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDeficiencies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-800">Nutrient Deficiencies</h3>
        <span className="text-sm text-gray-600">
          Based on {selectedPeriod} analysis
        </span>
      </div>

      {deficiencies.length === 0 ? (
        <div className="text-center py-12">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            No Deficiencies Detected!
          </h3>
          <p className="text-gray-600">
            Your micronutrient levels appear to be within healthy ranges.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {deficiencies.map((deficiency, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`border rounded-xl p-6 ${getSeverityColor(deficiency.severity)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold mb-2">
                    {getNutrientDisplayName(deficiency.nutrient)}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm">
                    <span>Current: {Math.round(deficiency.average * 10) / 10}</span>
                    <span>RDA: {deficiency.rda}</span>
                    <span className="font-medium">
                      {deficiency.percentage}% of recommended
                    </span>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                  deficiency.severity === 'severe' ? 'bg-red-100 text-red-800' :
                  deficiency.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {deficiency.severity}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>Current Intake</span>
                  <span>{deficiency.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      deficiency.percentage >= 70 ? 'bg-green-500' :
                      deficiency.percentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(deficiency.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Recommendations for this nutrient */}
              {recommendations.find(r => r.nutrient === deficiency.nutrient) && (
                <div className="mt-4 p-4 bg-white rounded-lg">
                  <h5 className="font-medium mb-3 flex items-center">
                    <FaLightbulb className="mr-2 text-yellow-500" />
                    Recommendations
                  </h5>
                  {renderNutrientRecommendations(
                    recommendations.find(r => r.nutrient === deficiency.nutrient)
                  )}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-800">
        Personalized Recommendations
      </h3>

      {recommendations.length === 0 ? (
        <div className="text-center py-12">
          <FaCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            You're doing great!
          </h3>
          <p className="text-gray-600">
            No specific recommendations at this time. Keep up the good work!
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {recommendations.map((recommendation, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {getNutrientDisplayName(recommendation.nutrient)}
                  </h4>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${
                    recommendation.severity === 'severe' ? 'bg-red-100 text-red-800' :
                    recommendation.severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {recommendation.severity} deficiency
                  </span>
                </div>
                <FaShoppingCart className="text-gray-400 text-xl" />
              </div>

              {renderNutrientRecommendations(recommendation)}

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors mr-3">
                  Add to Meal Plan
                </button>
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
                  Create Shopping List
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  const renderDataPrivacy = () => (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <FaLock className="text-blue-500 text-xl" />
          <h3 className="text-lg font-semibold text-blue-800">Data Privacy & Security</h3>
        </div>
        <p className="text-blue-700 mb-4">
          Your health data is protected with enterprise-grade security measures and complies with data protection regulations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <FaShieldAlt className="text-blue-500 text-2xl mb-2" />
            <h4 className="font-medium text-gray-800 mb-1">End-to-End Encryption</h4>
            <p className="text-sm text-gray-600">All data is encrypted in transit and at rest</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <FaUser className="text-blue-500 text-2xl mb-2" />
            <h4 className="font-medium text-gray-800 mb-1">User Control</h4>
            <p className="text-sm text-gray-600">You have full control over your data</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <FaCog className="text-blue-500 text-2xl mb-2" />
            <h4 className="font-medium text-gray-800 mb-1">GDPR Compliant</h4>
            <p className="text-sm text-gray-600">Meets international data protection standards</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center">
            <FaPills className="mr-3 text-green-500" />
            Micronutrient Tracking & Analysis
          </h1>
          <p className="text-gray-600">
            Comprehensive weekly progress tracking for optimal micronutrient intake and health optimization
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-200 rounded-xl p-1 mb-8">
          {[
            { id: 'weekly-overview', label: 'Weekly Overview', icon: FaChartLine },
            { id: 'nutrient-details', label: 'Nutrient Details', icon: FaPills },
            { id: 'deficiencies', label: 'Deficiencies', icon: FaExclamationTriangle },
            { id: 'recommendations', label: 'Recommendations', icon: FaLightbulb },
            { id: 'data-privacy', label: 'Privacy & Security', icon: FaLock }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-green-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <>
                {activeTab === 'weekly-overview' && renderWeeklyOverview()}
                {activeTab === 'nutrient-details' && renderNutrientDetails()}
                {activeTab === 'deficiencies' && renderDeficiencies()}
                {activeTab === 'recommendations' && renderRecommendations()}
                {activeTab === 'data-privacy' && renderDataPrivacy()}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Nutrient Detail Modal */}
        {renderNutrientModal()}
      </div>
    </div>
  );
};

export default MicronutrientTracking; 