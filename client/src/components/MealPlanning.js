import React, { useState } from 'react';
import { 
  FaUtensils, 
  FaShoppingCart, 
  FaCalendarAlt, 
  FaPlus, 
  FaLeaf,
  FaFish,
  FaDrumstickBite
} from 'react-icons/fa';
import axios from 'axios';

const MealPlanning = () => {
  const [mealPlan, setMealPlan] = useState(null);
  const [shoppingList, setShoppingList] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [planSettings, setPlanSettings] = useState({
    days: 7,
    dietaryPreferences: ['vegetarian'],
    healthGoals: ['weight-loss']
  });

  const generateMealPlan = async () => {
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/meal-planning/generate', planSettings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMealPlan(response.data.mealPlan);
    } catch (error) {
      console.error('Error generating meal plan:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateShoppingList = async () => {
    if (!mealPlan) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/meal-planning/shopping-list', {
        mealPlanId: mealPlan.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShoppingList(response.data.shoppingList);
    } catch (error) {
      console.error('Error generating shopping list:', error);
    }
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return <FaUtensils className="text-yellow-500" />;
      case 'lunch': return <FaDrumstickBite className="text-orange-500" />;
      case 'dinner': return <FaFish className="text-blue-500" />;
      case 'snack': return <FaLeaf className="text-green-500" />;
      default: return <FaUtensils className="text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Personalized Meal Planning</h2>
        <button
          onClick={generateMealPlan}
          disabled={isGenerating}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          <FaPlus />
          <span>{isGenerating ? 'Generating...' : 'Generate Plan'}</span>
        </button>
      </div>

      {/* Plan Settings */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">Plan Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
            <select
              value={planSettings.days}
              onChange={(e) => setPlanSettings({...planSettings, days: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value={3}>3 days</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Preferences</label>
            <select
              value={planSettings.dietaryPreferences[0]}
              onChange={(e) => setPlanSettings({...planSettings, dietaryPreferences: [e.target.value]})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="keto">Keto</option>
              <option value="paleo">Paleo</option>
              <option value="mediterranean">Mediterranean</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Goals</label>
            <input
              type="text"
              value={planSettings.healthGoals.join(', ')}
              onChange={(e) => setPlanSettings({...planSettings, healthGoals: e.target.value.split(',').map(s=>s.trim())})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Generated Plan & Shopping List (UI not fully shown) */}
      {mealPlan && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Plan Generated</h4>
          <button onClick={generateShoppingList} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Generate Shopping List</button>
        </div>
      )}

      {shoppingList && (
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Shopping List</h4>
          {/* Render list items */}
        </div>
      )}
    </div>
  );
};

export default MealPlanning; 