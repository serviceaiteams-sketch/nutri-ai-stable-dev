import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FaPills, FaShieldAlt, FaUtensils,
  FaEye, FaBrain, FaArrowLeft, FaCheckCircle, FaExclamationTriangle,
  FaChartLine, FaDownload, FaShare, FaPlay
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import MicronutrientTracking from './MicronutrientTracking';
import AIAllergenDetection from './AIAllergenDetection';
import DynamicMealPlanning from './DynamicMealPlanning';
import MoodNutritionAnalysis from './MoodNutritionAnalysis';
import HealthApprovedIndia from './HealthApprovedIndia';

const AdvancedFeaturesPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('micronutrients');

  const features = [
    {
      id: 'micronutrients',
      name: 'Micronutrient Tracking',
      icon: FaPills,
      color: 'from-blue-500 to-blue-600',
      description: 'Track 22+ vitamins and minerals with deficiency alerts and personalized recommendations'
    },
    {
      id: 'allergen',
      name: 'AI Allergen Detection',
      icon: FaShieldAlt,
      color: 'from-red-500 to-red-600',
      description: 'Automatically detect hidden allergens in meal photos using advanced AI'
    },
    {
      id: 'meal-planning',
      name: 'Dynamic Meal Planning',
      icon: FaUtensils,
      color: 'from-green-500 to-green-600',
      description: 'Get adaptive weekly meal plans with auto-generated shopping lists'
    },
    {
      id: 'portion-ai',
      name: 'AI Portion Estimation',
      icon: FaEye,
      color: 'from-purple-500 to-purple-600',
      description: 'Accurate portion size estimation from photos with visual feedback'
    },
    {
      id: 'mood-analysis',
      name: 'Mood-Nutrition Analysis',
      icon: FaBrain,
      color: 'from-pink-500 to-pink-600',
      description: 'Discover correlations between your diet and mood patterns'
    },
    {
      id: 'health-approved',
      name: 'Health Approved (India)',
      icon: FaCheckCircle,
      color: 'from-emerald-500 to-teal-600',
      description: 'Scan barcodes, analyze ingredients, and get India-focused health approvals'
    }
  ];

  // Remove unused useEffect and fetchMicronutrientData function since we're now rendering the full component

  const renderFeatureContent = () => {
    const activeFeature = features.find(f => f.id === activeTab);
    
    switch (activeTab) {
      case 'micronutrients':
        return <MicronutrientTracking />;
      case 'allergen':
        return <AIAllergenDetection />;
      case 'meal-planning':
        return (
          <DynamicMealPlanning />
        );
      case 'portion-ai':
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4">AI Portion Estimation</h3>
              <p className="text-gray-600">Accurate portion size estimation from photos with visual feedback.</p>
              {/* Add portion estimation content here */}
            </div>
          </div>
        );
      case 'mood-analysis':
        return (
          <MoodNutritionAnalysis />
        );
      case 'health-approved':
        return <HealthApprovedIndia />;
      default:
        return (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-semibold mb-4">Select a Feature</h3>
              <p className="text-gray-600">Choose a feature from the sidebar to get started.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.history.back()}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <FaArrowLeft className="text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Advanced AI Features</h1>
                <p className="text-gray-600">Powered by cutting-edge nutrition AI</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg">
                <FaShare className="text-sm" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                <h3 className="text-white font-semibold">Features</h3>
              </div>
              <div className="p-2">
                {features.map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => setActiveTab(feature.id)}
                    className={`w-full text-left p-3 rounded-lg mb-2 transition-all duration-200 ${
                      activeTab === feature.id
                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`bg-gradient-to-r ${feature.color} rounded-lg p-2`}>
                        <feature.icon className="text-white text-sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {feature.name}
                        </div>
                        {activeTab === feature.id && (
                          <div className="flex items-center space-x-1 mt-1">
                            <FaCheckCircle className="text-green-500 text-xs" />
                            <span className="text-xs text-green-600">Active</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderFeatureContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeaturesPage; 