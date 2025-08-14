import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaBrain, 
  FaChartLine, 
  FaSmile, 
  FaMeh, 
  FaFrown,
  FaBatteryFull,
  FaBatteryHalf,
  FaBatteryEmpty,
  FaLightbulb,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const MoodNutritionAnalysis = ({ userId }) => {
  const [moodData, setMoodData] = useState([]);
  const [currentMood, setCurrentMood] = useState(null);
  const [energyLevel, setEnergyLevel] = useState(null);
  const [productivity, setProductivity] = useState(null);
  const [correlations, setCorrelations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showMoodLog, setShowMoodLog] = useState(false);
  const [cravings, setCravings] = useState('tangy, spicy');
  const [pantry, setPantry] = useState('');
  const [aiResult, setAiResult] = useState(null);

  const moodOptions = [
    { value: 'excellent', label: 'Excellent', icon: FaSmile, color: 'text-green-600', bgColor: 'bg-green-100' },
    { value: 'good', label: 'Good', icon: FaSmile, color: 'text-blue-600', bgColor: 'bg-blue-100' },
    { value: 'neutral', label: 'Neutral', icon: FaMeh, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
    { value: 'poor', label: 'Poor', icon: FaFrown, color: 'text-orange-600', bgColor: 'bg-orange-100' },
    { value: 'terrible', label: 'Terrible', icon: FaFrown, color: 'text-red-600', bgColor: 'bg-red-100' }
  ];

  const energyOptions = [
    { value: 'high', label: 'High Energy', icon: FaBatteryFull, color: 'text-green-600' },
    { value: 'medium', label: 'Medium Energy', icon: FaBatteryHalf, color: 'text-yellow-600' },
    { value: 'low', label: 'Low Energy', icon: FaBatteryEmpty, color: 'text-red-600' }
  ];

  const productivityOptions = [
    { value: 'high', label: 'Very Productive', icon: FaArrowUp, color: 'text-green-600' },
    { value: 'medium', label: 'Moderately Productive', icon: FaArrowUp, color: 'text-yellow-600' },
    { value: 'low', label: 'Low Productivity', icon: FaArrowDown, color: 'text-red-600' }
  ];

  // Mock AI correlation analysis
  const analyzeCorrelations = (moodData, nutritionData) => {
    const mockCorrelations = [
      {
        type: 'positive',
        title: 'High Protein = Better Mood',
        description: 'You reported 23% better mood on days with protein intake > 80g',
        confidence: 85,
        recommendation: 'Consider increasing protein intake to 80-100g daily',
        icon: FaArrowUp,
        color: 'text-green-600'
      },
      {
        type: 'negative',
        title: 'High Sugar = Low Energy',
        description: 'Energy levels dropped 31% on days with sugar intake > 50g',
        confidence: 78,
        recommendation: 'Limit added sugar to < 25g per day',
        icon: FaArrowDown,
        color: 'text-red-600'
      },
      {
        type: 'positive',
        title: 'Fiber-Rich Meals = Better Focus',
        description: 'Productivity increased 18% on days with fiber intake > 25g',
        confidence: 72,
        recommendation: 'Include more fruits, vegetables, and whole grains',
        icon: FaLightbulb,
        color: 'text-blue-600'
      }
    ];

    return mockCorrelations;
  };

  const logMoodEntry = async () => {
    if (!currentMood || !energyLevel || !productivity) {
      toast.error('Please select all mood indicators');
      return;
    }

    setLoading(true);
    try {
      const moodEntry = {
        userId,
        mood: currentMood,
        energyLevel,
        productivity,
        timestamp: new Date().toISOString(),
        notes: ''
      };

      // In real implementation, this would be an API call
      // await axios.post('/api/mood/log', moodEntry);
      
      setMoodData(prev => [...prev, moodEntry]);
      setCurrentMood(null);
      setEnergyLevel(null);
      setProductivity(null);
      setShowMoodLog(false);
      
      // Analyze correlations
      const newCorrelations = analyzeCorrelations(moodData, []);
      setCorrelations(newCorrelations);
      
      toast.success('Mood logged successfully!');
    } catch (error) {
      console.error('Failed to log mood:', error);
    } finally {
      setLoading(false);
    }
  };

  const callMoodChef = async () => {
    try {
      setLoading(true);
      const haveIngredients = pantry.split(',').map(s => s.trim()).filter(Boolean);
      const payload = {
        mood: currentMood || 'neutral',
        cravings: cravings.split(',').map(s=>s.trim()).filter(Boolean),
        haveIngredients,
        cookingMethodsAvailable: ['stovetop','oven','microwave'],
        dietaryRestrictions: [],
        allergies: [],
        intolerances: [],
        cuisinePreferences: []
      };
      const { data } = await axios.post('/api/enhanced-mood-analysis/mood/chef', payload);
      setAiResult(data.result);
      toast.success('AI suggestion ready');
    } catch (e) {
      console.error(e);
      toast.error('Failed to get AI suggestion');
    } finally {
      setLoading(false);
    }
  };

  const getMoodIcon = (mood) => {
    const option = moodOptions.find(opt => opt.value === mood);
    return option ? option.icon : FaMeh;
  };

  const getMoodColor = (mood) => {
    const option = moodOptions.find(opt => opt.value === mood);
    return option ? option.color : 'text-gray-600';
  };

  const getCorrelationIcon = (type) => {
    return type === 'positive' ? FaCheckCircle : FaExclamationTriangle;
  };

  const getCorrelationColor = (type) => {
    return type === 'positive' ? 'text-green-600' : 'text-red-600';
  };

  // Render AI result as bullet/numbered lists instead of raw JSON
  const renderAiResult = () => {
    if (!aiResult) return null;

    if (aiResult.mode === 'recommendations') {
      return (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-gray-900">{aiResult.mealIdeaTitle || 'Meal idea'}</div>

          <div>
            <div className="font-medium text-gray-800 mb-1">Ingredients</div>
            <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
              {(aiResult.ingredients || []).map((ing, idx) => (
                <li key={idx}>
                  <span className="font-medium">{ing.name}</span>
                  {ing.quantityRange ? ` — ${ing.quantityRange}` : null}
                  {ing.reason ? ` • ${ing.reason}` : null}
                  {ing.substitutes && ing.substitutes.length > 0 && (
                    <div className="text-xs text-gray-500">Substitutes: {(ing.substitutes || []).join(', ')}</div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {aiResult.flavorPairings && aiResult.flavorPairings.length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Flavor pairings</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.flavorPairings.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          )}

          {aiResult.notes && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Notes:</span> {aiResult.notes}
            </div>
          )}

          <div className="text-sm text-gray-700">
            <span className="font-medium">Approx calories/serving:</span> {aiResult.approxCaloriesPerServing ?? '—'}
          </div>

          {aiResult.whyThisFitsMood && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Why this fits mood:</span> {aiResult.whyThisFitsMood}
            </div>
          )}

          {aiResult.safetyChecks && aiResult.safetyChecks.length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Safety checks</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.safetyChecks.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    if (aiResult.mode === 'procedure') {
      return (
        <div className="space-y-3">
          <div className="text-lg font-semibold text-gray-900">{aiResult.recipeTitle || 'Recipe'}</div>
          <div className="text-sm text-gray-700">
            <span className="font-medium">Servings:</span> {aiResult.servings ?? '—'} •{' '}
            <span className="font-medium">Time:</span> {aiResult.timeMinutes ?? '—'} min
          </div>

          {(aiResult.ingredientsUsed || []).length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Ingredients used</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.ingredientsUsed.map((ing, i) => (
                  <li key={i}>
                    {ing.name}
                    {ing.quantity ? ` — ${ing.quantity}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(aiResult.extraIngredientsNeeded || []).length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Extra ingredients needed</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.extraIngredientsNeeded.map((ing, i) => (
                  <li key={i}>
                    {ing.name}
                    {ing.quantity ? ` — ${ing.quantity}` : ''}
                    {ing.substitutes && ing.substitutes.length > 0 && (
                      <div className="text-xs text-gray-500">Substitutes: {ing.substitutes.join(', ')}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(aiResult.steps || []).length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Steps</div>
              <ol className="list-decimal pl-6 text-sm text-gray-700 space-y-1">
                {aiResult.steps.map((s, i) => (
                  <li key={i}>{s.instruction || s}</li>
                ))}
              </ol>
            </div>
          )}

          {(aiResult.tips || []).length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Tips</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.tips.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm text-gray-700">
            <span className="font-medium">Approx calories/serving:</span> {aiResult.approxCaloriesPerServing ?? '—'}
          </div>

          {aiResult.whyThisFitsMood && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Why this fits mood:</span> {aiResult.whyThisFitsMood}
            </div>
          )}

          {aiResult.safetyChecks && aiResult.safetyChecks.length > 0 && (
            <div>
              <div className="font-medium text-gray-800 mb-1">Safety checks</div>
              <ul className="list-disc pl-6 text-sm text-gray-700">
                {aiResult.safetyChecks.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    return (
      <pre className="text-xs whitespace-pre-wrap text-gray-700">{JSON.stringify(aiResult, null, 2)}</pre>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-purple-200"
    >
      {/* Quick AI panel */}
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <input
          value={cravings}
          onChange={(e)=>setCravings(e.target.value)}
          placeholder="Cravings (e.g., tangy, spicy)"
          className="border rounded-lg px-3 py-2"
        />
        <input
          value={pantry}
          onChange={(e)=>setPantry(e.target.value)}
          placeholder="Pantry (comma separated: chicken, onion, lime)"
          className="border rounded-lg px-3 py-2"
        />
        <button onClick={callMoodChef} className="bg-purple-600 text-white rounded-lg px-4 py-2">Get AI Suggestion</button>
      </div>

      {aiResult && (
        <div className="mb-8 bg-gray-50 rounded-2xl p-4">
          <h3 className="font-semibold text-gray-900 mb-2">AI Result</h3>
          {renderAiResult()}
        </div>
      )}

      <div className="flex items-center space-x-3 mb-6">
        <FaBrain className="h-8 w-8 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900">Mood & Nutrition Analysis</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Logging Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">How are you feeling?</h3>
            <button
              onClick={() => setShowMoodLog(!showMoodLog)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              {showMoodLog ? 'Cancel' : 'Log Mood'}
            </button>
          </div>

          {showMoodLog && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-4"
            >
              {/* Mood Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Mood</label>
                <div className="grid grid-cols-5 gap-2">
                  {moodOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setCurrentMood(option.value)}
                        className={`p-3 rounded-xl transition-all ${
                          currentMood === option.value
                            ? `${option.bgColor} ${option.color}`
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-xs">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Energy Level */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Energy Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {energyOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setEnergyLevel(option.value)}
                        className={`p-3 rounded-xl transition-all ${
                          energyLevel === option.value
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-xs">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Productivity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Productivity</label>
                <div className="grid grid-cols-3 gap-2">
                  {productivityOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setProductivity(option.value)}
                        className={`p-3 rounded-xl transition-all ${
                          productivity === option.value
                            ? 'bg-green-100 text-green-600'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-6 w-6 mx-auto mb-1" />
                        <span className="text-xs">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={logMoodEntry}
                disabled={loading || !currentMood || !energyLevel || !productivity}
                className="w-full bg-purple-600 text-white py-3 rounded-xl font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Logging...' : 'Log Mood Entry'}
              </button>
            </motion.div>
          )}

          {/* Recent Mood History */}
          <div className="bg-gray-50 rounded-2xl p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Recent Mood History</h4>
            <div className="space-y-2">
              {moodData.slice(-5).reverse().map((entry, index) => {
                const MoodIcon = getMoodIcon(entry.mood);
                return (
                  <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3">
                    <div className="flex items-center space-x-3">
                      <MoodIcon className={`h-5 w-5 ${getMoodColor(entry.mood)}`} />
                      <div>
                        <div className="font-medium text-gray-900 capitalize">{entry.mood}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {entry.energyLevel} energy • {entry.productivity} productivity
                    </div>
                  </div>
                );
              })}
              {moodData.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No mood entries yet. Start logging to see patterns!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* AI Correlation Analysis */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          
          {correlations.length > 0 ? (
            <div className="space-y-4">
              {correlations.map((correlation, index) => {
                const Icon = correlation.icon;
                const CorrelationIcon = getCorrelationIcon(correlation.type);
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-4 border border-gray-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full ${correlation.type === 'positive' ? 'bg-green-100' : 'bg-red-100'}`}>
                        <CorrelationIcon className={`h-5 w-5 ${getCorrelationColor(correlation.type)}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Icon className={`h-4 w-4 ${correlation.color}`} />
                          <h4 className="font-semibold text-gray-900">{correlation.title}</h4>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-3">{correlation.description}</p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs text-gray-500">AI Confidence</span>
                          <span className="text-sm font-medium text-gray-900">{correlation.confidence}%</span>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-3">
                          <div className="flex items-start space-x-2">
                            <FaLightbulb className="h-4 w-4 text-blue-600 mt-0.5" />
                            <div>
                              <div className="text-sm font-medium text-blue-900">Recommendation</div>
                              <div className="text-sm text-blue-700">{correlation.recommendation}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaBrain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Log more mood entries to discover nutrition correlations</p>
            </div>
          )}

          {/* Tips Section */}
          <div className="bg-purple-50 rounded-2xl p-4">
            <div className="flex items-start space-x-3">
              <FaBrain className="h-5 w-5 text-purple-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">How it works:</p>
                <ul className="space-y-1 text-gray-600">
                  <li>• Log your mood, energy, and productivity daily</li>
                  <li>• AI analyzes patterns between your diet and well-being</li>
                  <li>• Get personalized recommendations for better health</li>
                  <li>• Track improvements over time</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MoodNutritionAnalysis; 