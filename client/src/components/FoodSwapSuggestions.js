import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaExchangeAlt, 
  FaMapMarkerAlt, 
  FaLeaf, 
  FaUtensils, 
  FaStar,
  FaHeart,
  FaInfoCircle,
  FaShoppingCart,
  FaClock
} from 'react-icons/fa';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const FoodSwapSuggestions = ({ loggedFood, userLocation, onSwapSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  // Mock data for demonstration - in real implementation, this would come from AI analysis
  const generateSwapSuggestions = (foodItem) => {
    const baseSuggestions = {
      'biryani': [
        {
          id: 1,
          name: 'Quinoa Biryani',
          calories: 280,
          protein: 12,
          carbs: 45,
          fat: 8,
          sugar: 3,
          sodium: 350,
          fiber: 8,
          healthScore: 85,
          availability: 'High',
          price: '₹120',
          location: 'Nearby restaurants',
          benefits: ['Higher protein', 'More fiber', 'Lower sodium'],
          image: 'https://images.unsplash.com/photo-1563379091339-3b21d238ccd5?w=400'
        },
        {
          id: 2,
          name: 'Brown Rice Biryani',
          calories: 320,
          protein: 10,
          carbs: 52,
          fat: 9,
          sugar: 2,
          sodium: 380,
          fiber: 6,
          healthScore: 78,
          availability: 'Medium',
          price: '₹100',
          location: 'Local markets',
          benefits: ['Whole grain', 'More nutrients', 'Better digestion'],
          image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400'
        }
      ],
      'pizza': [
        {
          id: 3,
          name: 'Cauliflower Crust Pizza',
          calories: 220,
          protein: 15,
          carbs: 18,
          fat: 12,
          sugar: 4,
          sodium: 420,
          fiber: 5,
          healthScore: 82,
          availability: 'High',
          price: '₹180',
          location: 'Health food stores',
          benefits: ['Lower carbs', 'More protein', 'Gluten-free'],
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'
        }
      ],
      'burger': [
        {
          id: 4,
          name: 'Portobello Mushroom Burger',
          calories: 180,
          protein: 8,
          carbs: 22,
          fat: 6,
          sugar: 3,
          sodium: 280,
          fiber: 7,
          healthScore: 88,
          availability: 'Medium',
          price: '₹140',
          location: 'Vegetarian restaurants',
          benefits: ['Lower calories', 'More fiber', 'Antioxidants'],
          image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400'
        }
      ]
    };

    return baseSuggestions[foodItem.name.toLowerCase()] || [];
  };

  useEffect(() => {
    if (loggedFood) {
      setLoading(true);
      // Simulate API call delay
      setTimeout(() => {
        const swapSuggestions = generateSwapSuggestions(loggedFood);
        setSuggestions(swapSuggestions);
        setLoading(false);
      }, 1000);
    }
  }, [loggedFood]);

  const handleSwapSelect = (suggestion) => {
    setSelectedSwap(suggestion);
    setShowDetails(true);
    if (onSwapSelect) {
      onSwapSelect(suggestion);
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAvailabilityColor = (availability) => {
    if (availability === 'High') return 'text-green-600';
    if (availability === 'Medium') return 'text-yellow-600';
    return 'text-red-600';
  };

  if (!loggedFood) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-green-200"
    >
      <div className="flex items-center space-x-3 mb-6">
        <FaExchangeAlt className="h-8 w-8 text-green-600" />
        <h2 className="text-2xl font-bold text-gray-900">Healthy Alternatives</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-3 text-gray-600">Finding healthy alternatives...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 mb-4">
            <FaMapMarkerAlt className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-gray-600">
              Based on your location in {userLocation || 'Bengaluru'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                whileHover={{ scale: 1.02, y: -2 }}
                className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border border-green-200 cursor-pointer"
                onClick={() => handleSwapSelect(suggestion)}
              >
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                    <img 
                      src={suggestion.image} 
                      alt={suggestion.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {suggestion.name}
                    </h3>
                    
                    <div className="flex items-center space-x-4 mb-2">
                      <div className="flex items-center space-x-1">
                        <FaStar className={`h-4 w-4 ${getHealthScoreColor(suggestion.healthScore)}`} />
                        <span className={`text-sm font-medium ${getHealthScoreColor(suggestion.healthScore)}`}>
                          {suggestion.healthScore}% healthy
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <FaShoppingCart className={`h-4 w-4 ${getAvailabilityColor(suggestion.availability)}`} />
                        <span className={`text-sm ${getAvailabilityColor(suggestion.availability)}`}>
                          {suggestion.availability}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>Calories: {suggestion.calories}</div>
                      <div>Protein: {suggestion.protein}g</div>
                      <div>Carbs: {suggestion.carbs}g</div>
                      <div>Fat: {suggestion.fat}g</div>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm font-medium text-green-600">
                        {suggestion.price}
                      </span>
                      <button className="px-3 py-1 bg-green-600 text-white text-xs rounded-full hover:bg-green-700 transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FaLeaf className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No alternatives found for this food item.</p>
        </div>
      )}

      {/* Detailed Modal */}
      <AnimatePresence>
        {showDetails && selectedSwap && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{selectedSwap.name}</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="w-full h-48 rounded-xl overflow-hidden mb-4">
                <img 
                  src={selectedSwap.image} 
                  alt={selectedSwap.name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Health Score</span>
                  <span className={`font-semibold ${getHealthScoreColor(selectedSwap.healthScore)}`}>
                    {selectedSwap.healthScore}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Calories</div>
                    <div className="font-semibold">{selectedSwap.calories}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Protein</div>
                    <div className="font-semibold">{selectedSwap.protein}g</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Carbs</div>
                    <div className="font-semibold">{selectedSwap.carbs}g</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">Fat</div>
                    <div className="font-semibold">{selectedSwap.fat}g</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Health Benefits</h4>
                  <div className="space-y-1">
                    {selectedSwap.benefits.map((benefit, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <FaHeart className="h-3 w-3 text-green-600" />
                        <span className="text-sm text-gray-700">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Price</div>
                    <div className="font-semibold text-green-600">{selectedSwap.price}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Availability</div>
                    <div className={`font-semibold ${getAvailabilityColor(selectedSwap.availability)}`}>
                      {selectedSwap.availability}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    toast.success(`Swapped to ${selectedSwap.name}!`);
                    setShowDetails(false);
                  }}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 transition-colors"
                >
                  Choose This Alternative
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default FoodSwapSuggestions; 