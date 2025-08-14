import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaRuler, 
  FaHandPaper, 
  FaUtensils, 
  FaEye, 
  FaCalculator,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCamera,
  FaUndo
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const PortionSizeEstimation = ({ foodImage, onPortionUpdate }) => {
  const [estimatedPortion, setEstimatedPortion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [referenceObject, setReferenceObject] = useState('hand');
  const [confidence, setConfidence] = useState(0);
  const [macroEstimates, setMacroEstimates] = useState({});
  const canvasRef = useRef(null);

  // Mock AI estimation - in real implementation, this would use computer vision
  const estimatePortionSize = (imageData, reference) => {
    const mockEstimates = {
      'hand': {
        'pizza': { weight: 180, volume: 250, confidence: 85 },
        'rice': { weight: 150, volume: 200, confidence: 78 },
        'salad': { weight: 120, volume: 180, confidence: 82 },
        'default': { weight: 150, volume: 200, confidence: 75 }
      },
      'fork': {
        'pizza': { weight: 160, volume: 220, confidence: 88 },
        'rice': { weight: 140, volume: 190, confidence: 81 },
        'salad': { weight: 110, volume: 170, confidence: 85 },
        'default': { weight: 140, volume: 190, confidence: 78 }
      },
      'spoon': {
        'pizza': { weight: 170, volume: 240, confidence: 82 },
        'rice': { weight: 145, volume: 195, confidence: 79 },
        'salad': { weight: 115, volume: 175, confidence: 83 },
        'default': { weight: 145, volume: 195, confidence: 76 }
      }
    };

    // Simulate AI analysis delay
    return new Promise((resolve) => {
      setTimeout(() => {
        const foodType = 'default'; // In real implementation, this would be detected from image
        const estimate = mockEstimates[reference][foodType] || mockEstimates[reference]['default'];
        resolve(estimate);
      }, 2000);
    });
  };

  const calculateMacros = (portionSize) => {
    // Mock macro calculation based on portion size
    const baseMacros = {
      calories: Math.round(portionSize.weight * 0.8),
      protein: Math.round(portionSize.weight * 0.05),
      carbs: Math.round(portionSize.weight * 0.12),
      fat: Math.round(portionSize.weight * 0.03),
      fiber: Math.round(portionSize.weight * 0.02),
      sugar: Math.round(portionSize.weight * 0.01),
      sodium: Math.round(portionSize.weight * 0.5)
    };

    return baseMacros;
  };

  const drawPortionOverlay = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (estimatedPortion && showOverlay) {
      // Draw portion size indicators
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      
      // Draw bounding box
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const boxWidth = 200;
      const boxHeight = 150;
      
      ctx.strokeRect(centerX - boxWidth/2, centerY - boxHeight/2, boxWidth, boxHeight);
      
      // Draw portion size text
      ctx.fillStyle = '#10B981';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${estimatedPortion.weight}g`, centerX, centerY - 10);
      ctx.fillText(`${estimatedPortion.volume}ml`, centerX, centerY + 10);
      
      // Draw confidence indicator
      const confidenceColor = confidence >= 80 ? '#10B981' : confidence >= 60 ? '#F59E0B' : '#EF4444';
      ctx.fillStyle = confidenceColor;
      ctx.fillText(`${confidence}% confident`, centerX, centerY + 30);
    }
  };

  useEffect(() => {
    if (foodImage) {
      setLoading(true);
      estimatePortionSize(foodImage, referenceObject)
        .then((estimate) => {
          setEstimatedPortion(estimate);
          setConfidence(estimate.confidence);
          const macros = calculateMacros(estimate);
          setMacroEstimates(macros);
          setLoading(false);
          toast.success('Portion size estimated successfully!');
        })
        .catch((error) => {
          console.error('Portion estimation failed:', error);
          setLoading(false);
          toast.error('Failed to estimate portion size');
        });
    }
  }, [foodImage, referenceObject]);

  useEffect(() => {
    drawPortionOverlay();
  }, [estimatedPortion, showOverlay, confidence]);

  const handlePortionAccept = () => {
    if (onPortionUpdate && estimatedPortion) {
      onPortionUpdate({
        ...estimatedPortion,
        macros: macroEstimates
      });
      toast.success('Portion size updated!');
    }
  };

  const getConfidenceColor = (conf) => {
    if (conf >= 80) return 'text-green-600';
    if (conf >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceIcon = (conf) => {
    if (conf >= 80) return <FaCheckCircle className="h-5 w-5 text-green-600" />;
    if (conf >= 60) return <FaExclamationTriangle className="h-5 w-5 text-yellow-600" />;
    return <FaInfoCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-2xl p-6 border-2 border-blue-200"
    >
      <div className="flex items-center space-x-3 mb-6">
        <FaRuler className="h-8 w-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-900">AI Portion Estimation</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Image Analysis Section */}
        <div className="space-y-4">
          <div className="relative">
            <div className="w-full h-64 bg-gray-100 rounded-2xl overflow-hidden relative">
              {foodImage ? (
                <>
                  <img 
                    src={foodImage} 
                    alt="Food for portion analysis"
                    className="w-full h-full object-cover"
                  />
                  <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full"
                    width={400}
                    height={256}
                  />
                </>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <FaCamera className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Reference:</span>
                <select
                  value={referenceObject}
                  onChange={(e) => setReferenceObject(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1"
                >
                  <option value="hand">Hand</option>
                  <option value="fork">Fork</option>
                  <option value="spoon">Spoon</option>
                </select>
              </div>

              <button
                onClick={() => setShowOverlay(!showOverlay)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  showOverlay 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FaEye className="inline mr-2" />
                {showOverlay ? 'Hide' : 'Show'} Overlay
              </button>
            </div>
          </div>
        </div>

        {/* Estimation Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Analyzing portion size...</span>
            </div>
          ) : estimatedPortion ? (
            <>
              {/* Confidence Score */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">AI Confidence</span>
                  {getConfidenceIcon(confidence)}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        confidence >= 80 ? 'bg-green-500' : confidence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                  <span className={`font-semibold ${getConfidenceColor(confidence)}`}>
                    {confidence}%
                  </span>
                </div>
              </div>

              {/* Portion Estimates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaUtensils className="h-5 w-5 text-blue-600" />
                    <span className="text-sm text-gray-600">Weight</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {estimatedPortion.weight}g
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaCalculator className="h-5 w-5 text-green-600" />
                    <span className="text-sm text-gray-600">Volume</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {estimatedPortion.volume}ml
                  </div>
                </div>
              </div>

              {/* Macro Estimates */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Estimated Nutrition</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Calories</span>
                    <span className="font-semibold">{macroEstimates.calories}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Protein</span>
                    <span className="font-semibold">{macroEstimates.protein}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Carbs</span>
                    <span className="font-semibold">{macroEstimates.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Fat</span>
                    <span className="font-semibold">{macroEstimates.fat}g</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handlePortionAccept}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                >
                  Accept Estimate
                </button>
                <button
                  onClick={() => {
                    setEstimatedPortion(null);
                    setMacroEstimates({});
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  <FaUndo className="h-5 w-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <FaRuler className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Upload a food image to estimate portion size</p>
            </div>
          )}
        </div>
      </div>

      {/* Tips Section */}
      <div className="mt-6 bg-yellow-50 rounded-2xl p-4">
        <div className="flex items-start space-x-3">
          <FaInfoCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Tips for accurate estimation:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Include a reference object (hand, fork, spoon) in the photo</li>
              <li>• Ensure good lighting and clear focus</li>
              <li>• Take the photo from directly above the food</li>
              <li>• Higher confidence scores indicate more reliable estimates</li>
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PortionSizeEstimation; 