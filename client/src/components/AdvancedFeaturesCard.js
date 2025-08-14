import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FaPills, FaShieldAlt, FaUtensils, FaExchangeAlt,
  FaEye, FaBrain, FaChevronRight, FaStar, FaCheckCircle,
  FaFileMedical
} from 'react-icons/fa';

const AdvancedFeaturesCard = () => {
  const [selectedFeature, setSelectedFeature] = useState(null);
  const navigate = useNavigate();

  const advancedFeatures = [
    {
      id: 'micronutrients',
      name: 'Micronutrient Tracking',
      description: 'Track vitamins & minerals, get deficiency alerts',
      icon: FaPills,
      color: 'from-blue-500 to-blue-600',
      status: 'active',
      stats: '22 nutrients tracked'
    },
    {
      id: 'allergen',
      name: 'AI Allergen Detection',
      description: 'Detect hidden allergens from meal photos',
      icon: FaShieldAlt,
      color: 'from-red-500 to-red-600',
      status: 'active',
      stats: '3 allergens detected'
    },
    {
      id: 'meal-planning',
      name: 'Dynamic Meal Planning',
      description: 'Adaptive meal plans with shopping lists',
      icon: FaUtensils,
      color: 'from-green-500 to-green-600',
      status: 'active',
      stats: '7-day plan ready'
    },
    {
      id: 'food-swaps',
      name: 'Food Swap Suggestions',
      description: 'Real-time healthier alternatives',
      icon: FaExchangeAlt,
      color: 'from-orange-500 to-orange-600',
      status: 'active',
      stats: '12 swaps suggested'
    },
    {
      id: 'portion-ai',
      name: 'AI Portion Estimation',
      description: 'Visual portion analysis from photos',
      icon: FaEye,
      color: 'from-purple-500 to-purple-600',
      status: 'active',
      stats: '98% accuracy'
    },
    {
      id: 'mood-analysis',
      name: 'Mood-Nutrition Analysis',
      description: 'Correlate mood patterns with nutrition',
      icon: FaBrain,
      color: 'from-pink-500 to-pink-600',
      status: 'active',
      stats: '90% confidence'
    },
    {
      id: 'health-analysis',
      name: 'Health Report Analysis',
      description: 'Upload lab reports for AI-powered health insights',
      icon: FaFileMedical,
      color: 'from-teal-500 to-teal-600',
      status: 'active',
      stats: 'AI-powered analysis'
    }
  ];

  const handleFeatureClick = (feature) => {
    setSelectedFeature(feature);
    
    // Navigate to specific feature pages
    if (feature.id === 'health-analysis') {
      navigate('/health-analysis');
    } else {
      navigate('/advanced-features');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Advanced AI Features</h3>
            <p className="text-indigo-100 text-sm mt-1">
              Powered by cutting-edge nutrition AI
            </p>
          </div>
          <div className="bg-white bg-opacity-20 rounded-full p-3">
            <FaStar className="text-white text-xl" />
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedFeatures.map((feature) => (
            <motion.div
              key={feature.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleFeatureClick(feature)}
              className="bg-gray-50 rounded-xl p-4 cursor-pointer border border-gray-200 hover:border-gray-300 transition-all duration-200"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-12 h-12 bg-gradient-to-r ${feature.color} rounded-xl flex items-center justify-center`}>
                  <feature.icon className="text-white text-xl" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-sm">{feature.name}</h4>
                  <p className="text-gray-600 text-xs mt-1">{feature.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{feature.stats}</span>
                    <div className="flex items-center space-x-1">
                      <FaCheckCircle className="text-green-500 text-xs" />
                      <span className="text-xs text-green-600 font-medium">{feature.status}</span>
                    </div>
                  </div>
                </div>
                <FaChevronRight className="text-gray-400 text-sm" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/advanced-features')}
          className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>View All Features</span>
          <FaChevronRight className="text-sm" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default AdvancedFeaturesCard; 