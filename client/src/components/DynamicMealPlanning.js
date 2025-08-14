import React, { useState } from 'react';
import { FaUtensils, FaHeartbeat, FaWalking, FaFire, FaShoppingCart, FaCalendarAlt, FaLightbulb } from 'react-icons/fa';
import axios from 'axios';

const DynamicMealPlanning = () => {
  const [mood, setMood] = useState('neutral');
  const [activityLevel, setActivityLevel] = useState('moderate');
  const [calorieIntakeToday, setCalorieIntakeToday] = useState(0);
  const [healthConditions, setHealthConditions] = useState([]);
  const [foodSourceRestriction, setFoodSourceRestriction] = useState('non_vegetarian'); // Renamed from dietaryPreferences
  const [dietaryPattern, setDietaryPattern] = useState(''); // New state for dietary pattern
  const [cuisinePreference, setCuisinePreference] = useState(''); // Existing state for cuisine
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const conditionOptions = [
    'diabetes', 'hypertension', 'high_cholesterol', 'gluten_intolerance', 'lactose_intolerance', 'kidney_disease'
  ];

  const toggleCondition = (c) => {
    setHealthConditions(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const generate = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const body = {
        planType: 'weekly',
        location: 'south_asia',
        goal: 'maintenance',
        calorieTarget: 2000,
        mealsPerDay: 3,
        snacksPerDay: 2,
        mood,
        activityLevel,
        calorieIntakeToday: Number(calorieIntakeToday) || 0,
        healthConditions,
        foodSourceRestriction, // Send food source restriction
        dietaryPattern, // Send dietary pattern
        cuisinePreference // Send cuisine preference
      };
      const { data } = await axios.post('/api/dynamic-meal-planning/generate', body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResult(data);
    } catch (e) {
      console.error(e);
      setError('Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const MealCard = ({ item }) => (
    <div className="p-3 border rounded-lg bg-white">
      <div className="font-semibold text-gray-800">{item.name}</div>
      <div className="text-xs text-gray-500">{item.mealType || 'snack'} • {item.nutrition?.calories || 0} kcal</div>
      {item.seasonalIngredients?.length > 0 && (
        <div className="text-xs text-gray-400 mt-1">Seasonal: {item.seasonalIngredients.join(', ')}</div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><FaUtensils /> Dynamic Meal Planning</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mood</label>
            <select value={mood} onChange={(e) => setMood(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="neutral">Neutral</option>
              <option value="stressed">Stressed/Anxious</option>
              <option value="tired">Tired/Fatigued</option>
              <option value="sad">Low mood</option>
              <option value="energetic">Energetic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Activity Level</label>
            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calories eaten today</label>
            <input type="number" min="0" value={calorieIntakeToday} onChange={(e)=>setCalorieIntakeToday(e.target.value)} className="w-full px-3 py-2 border rounded-md" placeholder="e.g., 850" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Source Restrictions</label>
            <select value={foodSourceRestriction} onChange={(e)=>setFoodSourceRestriction(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="non_vegetarian">Non-vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="lacto_vegetarian">Lacto-vegetarian</option>
              <option value="ovo_vegetarian">Ovo-vegetarian</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="halal">Halal</option>
              <option value="kosher">Kosher</option>
              <option value="jain">Jain</option>
              <option value="raw_vegan">Raw Vegan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dietary Patterns</label>
            <select value={dietaryPattern} onChange={(e)=>setDietaryPattern(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="">None</option>
              <option value="keto">Keto (Ketogenic)</option>
              <option value="atkins">Atkins</option>
              <option value="paleo">Paleo</option>
              <option value="whole30">Whole30</option>
              <option value="mediterranean_diet">Mediterranean Diet</option>
              <option value="intermittent_fasting">Intermittent Fasting</option>
              <option value="flexitarian">Flexitarian</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Preference</label>
            <select value={cuisinePreference} onChange={(e)=>setCuisinePreference(e.target.value)} className="w-full px-3 py-2 border rounded-md">
              <option value="">None</option>
              <option value="italian">Italian</option>
              <option value="chinese">Chinese</option>
              <option value="indian">Indian</option>
              <option value="mexican">Mexican</option>
              <option value="japanese">Japanese</option>
              <option value="french">French</option>
              <option value="thai">Thai</option>
              <option value="mediterranean">Mediterranean</option>
              <option value="american">American</option>
              <option value="spanish">Spanish</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Health Conditions</label>
            <div className="flex flex-wrap gap-2">
              {conditionOptions.map(c => (
                <button key={c} onClick={()=>toggleCondition(c)} className={`px-3 py-1 rounded-full text-sm border ${healthConditions.includes(c) ? 'bg-green-50 border-green-400 text-green-700' : 'bg-white border-gray-300 text-gray-600'}`}>
                  {c.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5">
          <button onClick={generate} disabled={isGenerating} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            {isGenerating ? 'Generating...' : 'Generate Plan'}
          </button>
        </div>
        {error && <div className="mt-3 text-red-600 text-sm">{error}</div>}
      </div>

      {result?.mealPlan && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><FaCalendarAlt /> Weekly Plan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.mealPlan.meals.map((day) => (
                <div key={day.date} className="border rounded-xl p-4">
                  <div className="font-semibold text-gray-800 mb-2">Day {day.day} • {day.date}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {day.meals.map((m, idx) => <MealCard key={idx} item={m} />)}
                    {day.snacks.map((s, idx) => <MealCard key={`s-${idx}`} item={{...s, mealType:'snack'}} />)}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Total: {Math.round(day.dailyNutrition.calories)} kcal, P {Math.round(day.dailyNutrition.protein)} • C {Math.round(day.dailyNutrition.carbs)} • F {Math.round(day.dailyNutrition.fat)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold mb-3 flex items-center gap-2"><FaShoppingCart /> Shopping List</h4>
            <div className="text-sm text-gray-700">Estimated cost: ${result.shoppingList?.estimatedCost || 0}</div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="font-semibold mb-2 flex items-center gap-2"><FaLightbulb /> Recommendations</h4>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {(result.recommendations || []).map((r,i)=> (
                <li key={i}>{r.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicMealPlanning; 