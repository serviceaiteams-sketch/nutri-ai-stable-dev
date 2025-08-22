import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaShieldAlt, FaExclamationTriangle, FaCheckCircle, FaUpload,
  FaCamera, FaEye, FaDownload, FaShare, FaHistory, FaInfoCircle,
  FaAllergies, FaBan, FaAppleAlt, FaLeaf, FaFish, FaEgg,
  FaTree, FaSeedling, FaTint, FaThermometerHalf
} from 'react-icons/fa';
import axios from 'axios';

const AIAllergenDetection = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [detectedAllergens, setDetectedAllergens] = useState([]);
  const [safetyScore, setSafetyScore] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const fileInputRef = useRef(null);

  // Load scan history on component mount
  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await axios.get('/api/allergen/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });

      if (response.data.success) {
        setScanHistory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load scan history:', error);
      // Continue with empty history if API fails
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Common allergens database
  const commonAllergens = {
    'nuts': { name: 'Tree Nuts', severity: 'high', icon: FaTree, description: 'Includes almonds, walnuts, cashews, etc.' },
    'peanuts': { name: 'Peanuts', severity: 'high', icon: FaSeedling, description: 'Legume, not a true nut' },
    'milk': { name: 'Dairy', severity: 'medium', icon: FaTint, description: 'Milk, cheese, yogurt, butter' },
    'eggs': { name: 'Eggs', severity: 'medium', icon: FaEgg, description: 'Chicken eggs and egg products' },
    'soy': { name: 'Soy', severity: 'medium', icon: FaSeedling, description: 'Soybeans and soy products' },
    'wheat': { name: 'Wheat', severity: 'medium', icon: FaLeaf, description: 'Wheat flour and wheat products' },
    'fish': { name: 'Fish', severity: 'high', icon: FaFish, description: 'All types of fish' },
    'shellfish': { name: 'Shellfish', severity: 'high', icon: FaFish, description: 'Crustaceans and mollusks' },
    'sesame': { name: 'Sesame', severity: 'medium', icon: FaSeedling, description: 'Sesame seeds and oil' },
    'sulfites': { name: 'Sulfites', severity: 'low', icon: FaThermometerHalf, description: 'Preservatives in dried fruits and wine' }
  };

  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = () => {
    // Simulate camera capture
    fileInputRef.current?.click();
  };

  const analyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Create FormData for image upload
      const formData = new FormData();
      formData.append('image', selectedImage);

      // Call the backend API
      const response = await axios.post('/api/allergen/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });

      if (response.data.success) {
        const result = response.data.data;

        // Enrich server response with local icon components and safe defaults
        const enrichedAllergens = (result.allergens || []).map(a => ({
          ...a,
          icon: (a.icon || (a.type && commonAllergens[a.type]?.icon)) || FaInfoCircle
        }));

        const getRecIcon = (type) => (
          type === 'warning' ? FaExclamationTriangle :
          type === 'caution' ? FaInfoCircle :
          type === 'safe' ? FaCheckCircle :
          FaBan
        );

        const enrichedRecommendations = (result.recommendations || []).map(r => ({
          ...r,
          icon: r.icon || getRecIcon(r.type)
        }));

        setDetectedAllergens(enrichedAllergens);
        setSafetyScore(result.safetyScore);
        setAnalysisResult({ ...result, allergens: enrichedAllergens, recommendations: enrichedRecommendations });
        
        // Add to history
        setScanHistory(prev => [result, ...prev.slice(0, 9)]);
        
        // Show success message
        alert('✅ Allergen analysis completed successfully!');
      } else {
        throw new Error(response.data.error || 'Analysis failed');
      }
      
    } catch (error) {
      console.error('Analysis failed:', error);
      
      // Fallback to simulation if API fails
      if (error.response?.status === 401) {
        alert('⚠️ Please log in to use this feature');
        return;
      }
      
      alert('⚠️ API analysis failed. Using simulation mode...');
      
      // Fallback simulation
      const detectedItems = generateAllergenAnalysis();
      const score = calculateSafetyScore(detectedItems);
      
      setDetectedAllergens(detectedItems);
      setSafetyScore(score);
      
      const result = {
        timestamp: new Date().toISOString(),
        imageName: selectedImage.name,
        allergens: detectedItems,
        safetyScore: score,
        recommendations: generateRecommendations(detectedItems, score)
      };
      
      setAnalysisResult(result);
      setScanHistory(prev => [result, ...prev.slice(0, 9)]);
      
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAllergenAnalysis = () => {
    const possibleAllergens = Object.keys(commonAllergens);
    const detected = [];
    
    // Randomly detect 1-3 allergens for demo
    const numToDetect = Math.floor(Math.random() * 3) + 1;
    const shuffled = possibleAllergens.sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < numToDetect && i < shuffled.length; i++) {
      const allergen = shuffled[i];
      const confidence = Math.random() * 0.4 + 0.6; // 60-100% confidence
      detected.push({
        type: allergen,
        ...commonAllergens[allergen],
        confidence: confidence,
        riskLevel: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low'
      });
    }
    
    return detected;
  };

  const calculateSafetyScore = (allergens) => {
    if (allergens.length === 0) return 100;
    
    let totalRisk = 0;
    allergens.forEach(allergen => {
      const severityWeight = allergen.severity === 'high' ? 0.5 : allergen.severity === 'medium' ? 0.3 : 0.2;
      totalRisk += allergen.confidence * severityWeight;
    });
    
    return Math.max(0, Math.round(100 - (totalRisk * 100)));
  };

  const generateRecommendations = (allergens, score) => {
    const recommendations = [];
    
    if (score < 30) {
      recommendations.push({
        type: 'warning',
        text: 'High risk detected. Avoid this food item completely.',
        icon: FaExclamationTriangle
      });
    } else if (score < 70) {
      recommendations.push({
        type: 'caution',
        text: 'Moderate risk. Consult with healthcare provider before consumption.',
        icon: FaInfoCircle
      });
    } else {
      recommendations.push({
        type: 'safe',
        text: 'Low risk. Generally safe for most people.',
        icon: FaCheckCircle
      });
    }
    
    allergens.forEach(allergen => {
      if (allergen.severity === 'high') {
        recommendations.push({
          type: 'danger',
          text: `Contains ${allergen.name}. Strict avoidance recommended.`,
          icon: FaBan
        });
      }
    });
    
    return recommendations;
  };

  const exportReport = async () => {
    if (!analysisResult) return;
    
    try {
      // Try to get a detailed report from the backend
      const response = await axios.post('/api/allergen/report', {
        analysisId: analysisResult.id,
        includeAlternatives: true,
        includeSymptoms: true
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });

      if (response.data.success) {
        const report = response.data.data;
        const dataStr = JSON.stringify(report, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `allergen-detailed-report-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ Detailed report exported successfully!');
      } else {
        throw new Error('Failed to generate detailed report');
      }
    } catch (error) {
      console.error('Failed to generate detailed report:', error);
      
      // Fallback to basic report
      const basicReport = {
        title: 'AI Allergen Detection Report',
        timestamp: analysisResult.timestamp,
        imageName: analysisResult.imageName,
        allergens: analysisResult.allergens,
        safetyScore: analysisResult.safetyScore,
        recommendations: analysisResult.recommendations
      };
      
      const dataStr = JSON.stringify(basicReport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `allergen-basic-report-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      alert('✅ Basic report exported successfully!');
    }
  };

  const generateDetailedReport = async () => {
    if (!analysisResult) return;
    
    try {
      const response = await axios.post('/api/allergen/report', {
        analysisId: analysisResult.id,
        includeAlternatives: true,
        includeSymptoms: true
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || 'demo-token'}`
        }
      });

      if (response.data.success) {
        const report = response.data.data;
        
        // Create a comprehensive HTML report
        const htmlReport = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${report.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
              .section { margin: 20px 0; }
              .allergen { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
              .high-risk { border-left: 4px solid #dc2626; }
              .medium-risk { border-left: 4px solid #ea580c; }
              .low-risk { border-left: 4px solid #ca8a04; }
              .safety-score { font-size: 24px; font-weight: bold; text-align: center; padding: 20px; }
              .green { color: #16a34a; }
              .orange { color: #ea580c; }
              .red { color: #dc2626; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${report.title}</h1>
              <p>Generated on: ${new Date(report.generatedAt).toLocaleString()}</p>
            </div>
            
            <div class="section">
              <h2>Safety Summary</h2>
              <div class="safety-score ${report.summary.safetyScore >= 70 ? 'green' : report.summary.safetyScore >= 40 ? 'orange' : 'red'}">
                Safety Score: ${report.summary.safetyScore}%
              </div>
              <p><strong>Risk Level:</strong> ${report.summary.riskLevel}</p>
              <p><strong>Total Allergens Detected:</strong> ${report.summary.totalAllergens}</p>
            </div>
            
            <div class="section">
              <h2>Detailed Analysis</h2>
              ${report.detailedAnalysis.allergens.map(allergen => `
                <div class="allergen ${allergen.severity === 'high' ? 'high-risk' : allergen.severity === 'medium' ? 'medium-risk' : 'low-risk'}">
                  <h3>${allergen.name}</h3>
                  <p><strong>Severity:</strong> ${allergen.severity}</p>
                  <p><strong>Confidence:</strong> ${Math.round(allergen.confidence * 100)}%</p>
                  <p><strong>Symptoms:</strong> ${allergen.symptoms.join(', ')}</p>
                  <p><strong>Common Foods:</strong> ${allergen.common_foods.join(', ')}</p>
                  <p><strong>Alternatives:</strong> ${allergen.alternatives.join(', ')}</p>
                </div>
              `).join('')}
            </div>
            
            <div class="section">
              <h2>Safety Assessment</h2>
              <p>${report.detailedAnalysis.safetyAssessment}</p>
              <p><strong>Medical Advice:</strong> ${report.detailedAnalysis.medicalAdvice}</p>
            </div>
            
            <div class="section">
              <h2>Emergency Information</h2>
              <p><strong>Watch for symptoms:</strong> ${report.detailedAnalysis.emergencyInfo.symptoms}</p>
              <p><strong>Action required:</strong> ${report.detailedAnalysis.emergencyInfo.action}</p>
            </div>
          </body>
          </html>
        `;
        
        const dataBlob = new Blob([htmlReport], { type: 'text/html' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `allergen-html-report-${new Date().toISOString().split('T')[0]}.html`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✅ HTML report generated successfully!');
      } else {
        throw new Error('Failed to generate detailed report');
      }
    } catch (error) {
      console.error('Failed to generate detailed report:', error);
      alert('⚠️ Failed to generate detailed report. Using basic export instead.');
      exportReport();
    }
  };

  const shareResults = () => {
    if (!analysisResult) return;
    
    const shareText = `AI Allergen Detection Results: Safety Score ${analysisResult.safetyScore}%. Detected allergens: ${analysisResult.allergens.map(a => a.name).join(', ')}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'Allergen Detection Results',
        text: shareText
      });
    } else {
      navigator.clipboard.writeText(shareText);
      alert('Results copied to clipboard!');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-orange-600 bg-orange-100';
      case 'low': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center mb-4">
            <FaShieldAlt className="text-4xl text-red-500 mr-4" />
            <h1 className="text-4xl font-bold text-gray-800">AI Allergen Detection</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Advanced AI-powered system to detect hidden allergens in your food photos. 
            Get instant safety assessments and detailed allergen information.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Panel - Image Upload & Analysis */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Upload Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaCamera className="mr-3 text-blue-500" />
                Upload Food Image
              </h2>
              
              <div className="space-y-4">
                {/* Image Preview */}
                {imagePreview && (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Food preview"
                      className="w-full h-64 object-cover rounded-lg border-2 border-gray-200"
                    />
                    <button
                      onClick={() => {
                        setImagePreview(null);
                        setSelectedImage(null);
                        setAnalysisResult(null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Upload Buttons */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-blue-500 text-white py-3 px-6 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaUpload className="text-lg" />
                    <span>Choose File</span>
                  </button>
                  
                  <button
                    onClick={handleCameraCapture}
                    className="flex-1 bg-green-500 text-white py-3 px-6 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaCamera className="text-lg" />
                    <span>Camera</span>
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Analysis Button */}
                {selectedImage && (
                  <button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all ${
                      isAnalyzing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    {isAnalyzing ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span>Analyzing Image...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <FaShieldAlt className="text-xl" />
                        <span>Detect Allergens</span>
                      </div>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
                <FaAllergies className="text-2xl text-red-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">{detectedAllergens.length}</div>
                <div className="text-sm text-gray-600">Allergens Found</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
                <FaShieldAlt className="text-2xl text-blue-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">{safetyScore}%</div>
                <div className="text-sm text-gray-600">Safety Score</div>
              </div>
              
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-200">
                <FaHistory className="text-2xl text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-800">{scanHistory.length}</div>
                <div className="text-sm text-gray-600">Scans Today</div>
              </div>
            </div>
          </motion.div>

          {/* Right Panel - Results & Analysis */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Analysis Results */}
            {analysisResult && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
                <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
                  <FaEye className="mr-3 text-green-500" />
                  Analysis Results
                </h2>

                {/* Safety Score */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-lg font-medium text-gray-700">Safety Score</span>
                    <span className={`text-2xl font-bold ${
                      safetyScore >= 70 ? 'text-green-600' : 
                      safetyScore >= 40 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {safetyScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-1000 ${
                        safetyScore >= 70 ? 'bg-green-500' : 
                        safetyScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${safetyScore}%` }}
                    ></div>
                  </div>
                </div>

                {/* Detected Allergens */}
                {detectedAllergens.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Detected Allergens</h3>
                    <div className="space-y-3">
                      {detectedAllergens.map((allergen, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <allergen.icon className={`text-xl ${getSeverityColor(allergen.severity)}`} />
                            <div>
                              <div className="font-medium text-gray-800">{allergen.name}</div>
                              <div className="text-sm text-gray-600">{allergen.description}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${getRiskLevelColor(allergen.riskLevel)}`}>
                              {allergen.riskLevel.toUpperCase()} RISK
                            </div>
                            <div className="text-xs text-gray-500">
                              {Math.round(allergen.confidence * 100)}% confidence
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Recommendations</h3>
                  <div className="space-y-2">
                    {analysisResult.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <rec.icon className={`text-lg mt-1 ${
                          rec.type === 'warning' ? 'text-red-500' :
                          rec.type === 'caution' ? 'text-orange-500' :
                          rec.type === 'safe' ? 'text-green-500' : 'text-red-600'
                        }`} />
                        <span className="text-gray-800">{rec.text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={exportReport}
                    className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaDownload className="text-sm" />
                    <span>Export JSON</span>
                  </button>
                  
                  <button
                    onClick={generateDetailedReport}
                    className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaDownload className="text-sm" />
                    <span>HTML Report</span>
                  </button>

                  <button
                    onClick={shareResults}
                    className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FaShare className="text-sm" />
                    <span>Share</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scan History */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                  <FaHistory className="mr-3 text-green-500" />
                  Recent Scans
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={loadScanHistory}
                    disabled={isLoadingHistory}
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium disabled:opacity-50"
                  >
                    {isLoadingHistory ? 'Loading...' : 'Refresh'}
                  </button>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                  >
                    {showHistory ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3"
                  >
                    {isLoadingHistory ? (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <span className="text-gray-500">Loading scan history...</span>
                      </div>
                    ) : scanHistory.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No scans yet. Upload an image to get started!</p>
                    ) : (
                      scanHistory.map((scan, index) => (
                        <div key={scan.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              scan.safetyScore >= 70 ? 'bg-green-500' : 
                              scan.safetyScore >= 40 ? 'bg-orange-500' : 'bg-red-500'
                            }`}></div>
                            <div>
                              <div className="font-medium text-gray-800">{scan.imageName}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(scan.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-bold ${
                              scan.safetyScore >= 70 ? 'text-green-600' : 
                              scan.safetyScore >= 40 ? 'text-orange-600' : 'text-red-600'
                            }`}>
                              {scan.safetyScore}%
                            </div>
                            <div className="text-xs text-gray-500">
                              {scan.allergens?.length || 0} allergens
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-12 bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
        >
          <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaInfoCircle className="mr-3 text-blue-500" />
            About AI Allergen Detection
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">How It Works</h3>
              <ul className="space-y-2 text-gray-600">
                <li className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  <span>Upload a clear photo of your food</span>
                </li>
                <li className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  <span>AI analyzes ingredients and identifies allergens</span>
                </li>
                <li className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  <span>Get instant safety score and recommendations</span>
                </li>
                <li className="flex items-start space-x-2">
                  <FaCheckCircle className="text-green-500 mt-1 flex-shrink-0" />
                  <span>Export detailed reports for medical professionals</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Supported Allergens</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(commonAllergens).map(([key, allergen]) => (
                  <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <allergen.icon className={`text-sm ${getSeverityColor(allergen.severity)}`} />
                    <span className="text-sm text-gray-700">{allergen.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <FaExclamationTriangle className="text-yellow-600 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-yellow-800">Important Disclaimer</h4>
                <p className="text-yellow-700 text-sm mt-1">
                  This AI system is designed to assist with allergen detection but should not replace professional medical advice. 
                  Always consult with healthcare providers for severe allergies and medical decisions.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AIAllergenDetection; 