import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaUpload, FaFileMedical, FaChartLine, FaHeart,
  FaExclamationTriangle, FaCheckCircle, FaEye,
  FaDownload, FaShare, FaHistory, FaCalendarAlt,
  FaUserMd, FaStethoscope, FaThermometerHalf,
  FaTint, FaWeight, FaBed, FaRunning, FaAppleAlt,
  FaPills, FaSyringe, FaMicroscope, FaFileAlt,
  FaArrowRight, FaPlus, FaTimes, FaSpinner,
  FaBell, FaClock, FaInfoCircle, FaShieldAlt, FaMagic
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const HealthReportAnalysis = () => {
  const { user } = useAuth();
  const authHeaders = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [healthConditions, setHealthConditions] = useState([]);
  const [liveRecs, setLiveRecs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('upload');
  const [foodRecommendations, setFoodRecommendations] = useState(null);
  const [isLoadingFoodRecs, setIsLoadingFoodRecs] = useState(false);
  const [healthMetrics, setHealthMetrics] = useState({
    bloodPressure: { systolic: 120, diastolic: 80, status: 'normal' },
    bloodSugar: { fasting: 95, postprandial: 140, status: 'normal' },
    cholesterol: { total: 180, hdl: 50, ldl: 100, triglycerides: 150, status: 'normal' },
    kidneyFunction: { creatinine: 1.0, egfr: 90, status: 'normal' },
    liverFunction: { alt: 25, ast: 25, bilirubin: 1.0, status: 'normal' },
    thyroid: { tsh: 2.5, t3: 120, t4: 1.2, status: 'normal' },
    hemoglobin: { value: 14, status: 'normal' },
    vitaminD: { value: 30, status: 'normal' }
  });

  const [healthTrends, setHealthTrends] = useState([
    { date: '2024-01-15', metric: 'Blood Pressure', value: '120/80', status: 'normal' },
    { date: '2024-01-20', metric: 'Blood Sugar', value: '95 mg/dL', status: 'normal' },
    { date: '2024-01-25', metric: 'Cholesterol', value: '180 mg/dL', status: 'normal' },
    { date: '2024-02-01', metric: 'Vitamin D', value: '30 ng/mL', status: 'normal' }
  ]);

  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'Blood pressure slightly elevated', metric: 'Blood Pressure', severity: 'medium' },
    { id: 2, type: 'info', message: 'Vitamin D levels improving', metric: 'Vitamin D', severity: 'low' },
    { id: 3, type: 'success', message: 'Cholesterol levels optimal', metric: 'Cholesterol', severity: 'low' }
  ]);

  // Normalize API recommendations into the UI shape and guard against non-array values
  const normalizeRecs = (recs) => {
    if (!Array.isArray(recs)) return [];
    return recs.map((r) => ({
      condition: r.condition || r.title || 'General',
      severity: r.severity || 'mild',
      foods: r.foods || r.foodRecommendations || (r.diet?.include || []),
      avoid: r.avoid || r.limit || (r.diet?.avoid || []),
      exercises: r.exercises || r.exerciseRecommendations || [],
      notes: r.notes || (Array.isArray(r.lifestyleRecommendations) ? r.lifestyleRecommendations.join(', ') : ''),
      treatment: r.treatment || [],
      care: r.care || (Array.isArray(r.lifestyleRecommendations) ? r.lifestyleRecommendations : [])
    }));
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      type: file.type,
      size: file.size,
      file: file,
      uploadedAt: new Date().toISOString()
    }));
    setUploadedFiles(prev => [...prev, ...newFiles]);
    toast.success(`${files.length} file(s) uploaded successfully!`);
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    toast.success('File removed successfully!');
  };

  const addHealthCondition = () => {
    const newCondition = {
      id: Date.now(),
      condition: '',
      diagnosedDate: '',
      medications: [],
      symptoms: [],
      severity: 'mild'
    };
    setHealthConditions(prev => [...prev, newCondition]);
  };

  const updateHealthCondition = (id, field, value) => {
    setHealthConditions(prev => prev.map(condition => 
      condition.id === id ? { ...condition, [field]: value } : condition
    ));
  };

  const removeHealthCondition = (id) => {
    setHealthConditions(prev => prev.filter(condition => condition.id !== id));
    toast.success('Condition removed');
  };

  const saveConditions = async () => {
    try {
      setSaving(true);
      const payload = {
        conditions: healthConditions.map(({ condition, diagnosedDate, severity, medications = [], symptoms = [] }) => ({
          condition,
          diagnosedDate,
          severity,
          medications,
          symptoms
        }))
      };
      await axios.post('/api/health-analysis/conditions/bulk', payload, authHeaders());
      const { data } = await axios.post('/api/health-analysis/conditions/recommendations', payload, authHeaders());
      setLiveRecs(normalizeRecs(data.recommendations));
      toast.success('Health conditions saved');
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to save conditions';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Fetch existing conditions on mount and when user opens the Conditions tab
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/health-analysis/conditions', authHeaders());
        if (Array.isArray(data.conditions)) {
          // Attach temporary ids for client-side editing if missing
          const withIds = data.conditions.map(c => ({ id: c.id || Date.now() + Math.random(), ...c }));
          setHealthConditions(withIds);
        }
      } catch (e) {
        const msg = e.response?.data?.error || 'Failed to load conditions';
        // Keep silent to avoid noisy UI, but log for debugging
        console.debug('Load conditions error:', msg);
      }
    };
    load();
  }, []);

  // Debounced save and recommendations when conditions change
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setSaving(true);
        const payload = {
          conditions: healthConditions.map(({ condition, diagnosedDate, severity, medications = [], symptoms = [] }) => ({
            condition,
            diagnosedDate,
            severity,
            medications,
            symptoms
          }))
        };
        await axios.post('/api/health-analysis/conditions/bulk', payload, authHeaders());
        const { data: rec } = await axios.post('/api/health-analysis/conditions/recommendations', payload, authHeaders());
        setLiveRecs(normalizeRecs(rec.recommendations));
      } catch (e) {
        console.debug('Autosave error:', e.response?.data?.error || e.message);
      } finally {
        setSaving(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [healthConditions]);

  // Ensure recommendations are visible in the AI Analysis tab immediately
  useEffect(() => {
    const loadRecsForAnalysis = async () => {
      try {
        const payload = {
          conditions: healthConditions.map(({ condition, diagnosedDate, severity, medications = [], symptoms = [] }) => ({
            condition,
            diagnosedDate,
            severity,
            medications,
            symptoms
          }))
        };
        const { data } = await axios.post('/api/health-analysis/conditions/recommendations', payload, authHeaders());
        setLiveRecs(normalizeRecs(data.recommendations));
      } catch {}
    };
    if (selectedTab === 'analysis') {
      loadRecsForAnalysis();
    }
  }, [selectedTab, healthConditions]);

  const analyzeHealthReports = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload at least one health report to analyze');
      return;
    }

    setIsAnalyzing(true);
    try {
      // First, upload the files
      const formData = new FormData();
      uploadedFiles.forEach(file => {
        formData.append('reports', file.file);
      });
      formData.append('healthConditions', JSON.stringify(healthConditions));

      // Upload files first
      await axios.post('/api/health-analysis/upload-reports', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Then analyze the uploaded reports
      const response = await axios.post('/api/health-analysis/analyze-reports', {}, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      setAnalysisResults(response.data);
      toast.success('Health reports analyzed successfully!');
      setSelectedTab('analysis');
      
      // Automatically generate food recommendations after analysis
      setTimeout(() => {
        fetchFoodRecommendations();
      }, 2000);
    } catch (error) {
      console.error('Error analyzing health reports:', error);
      toast.error('Failed to analyze health reports. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchFoodRecommendations = async () => {
    setIsLoadingFoodRecs(true);
    try {
      const response = await axios.post('/api/health-analysis/food-recommendations', {}, {
        ...authHeaders(),
        timeout: 35000 // 35 second timeout
      });
      setFoodRecommendations(response.data.recommendations);
      if (response.data.note) {
        toast.info(response.data.note);
      } else {
        toast.success('Food recommendations generated successfully!');
      }
    } catch (error) {
      console.error('Error fetching food recommendations:', error);
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        toast.error('Request timed out. Please try again.');
      } else if (error.response?.status === 401) {
        toast.error('Please log in again to access this feature.');
      } else {
        toast.error('Failed to generate food recommendations. Please try again.');
      }
    } finally {
      setIsLoadingFoodRecs(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-100';
      case 'elevated': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'danger': return <FaExclamationTriangle className="text-red-500" />;
      case 'success': return <FaCheckCircle className="text-green-500" />;
      case 'info': return <FaInfoCircle className="text-blue-500" />;
      default: return <FaBell className="text-gray-500" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <FaFileMedical className="text-white text-xl" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Health Report Analysis</h1>
              <p className="text-gray-600">Upload your health reports and get AI-powered analysis</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'upload', label: 'Upload Reports', icon: FaUpload },
              { id: 'conditions', label: 'Health Conditions', icon: FaUserMd },
              { id: 'analysis', label: 'AI Analysis', icon: FaChartLine },
              { id: 'food-recommendations', label: 'Food Recommendations', icon: FaAppleAlt },
              { id: 'monitoring', label: 'Health Monitoring', icon: FaHeart },
              { id: 'trends', label: 'Health Trends', icon: FaHistory }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {selectedTab === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* File Upload Section */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <FaUpload className="text-blue-500 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Upload Health Reports</h2>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                  <FaFileMedical className="mx-auto text-gray-400 text-4xl mb-4" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-900">Upload your health reports</p>
                    <p className="text-gray-600">Support for PDF, JPG, PNG files (Max 10MB each)</p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <FaUpload className="mr-2" />
                      Choose Files
                    </label>
                  </div>
                </div>

                {/* Uploaded Files */}
                {uploadedFiles.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Uploaded Files</h3>
                    <div className="space-y-3">
                      {uploadedFiles.map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center space-x-3">
                            <FaFileAlt className="text-blue-500 text-xl" />
                            <div>
                              <p className="font-medium text-gray-900">{file.name}</p>
                              <p className="text-sm text-gray-600">
                                {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploadedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(file.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <FaTimes />
                          </button>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Analyze Button */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} ready for analysis
                        </div>
                        <button
                          onClick={analyzeHealthReports}
                          disabled={isAnalyzing || uploadedFiles.length === 0}
                          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
                        >
                          {isAnalyzing ? (
                            <>
                              <FaSpinner className="animate-spin" />
                              <span>Analyzing...</span>
                            </>
                          ) : (
                            <>
                              <FaMagic />
                              <span>Analyze Reports</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {selectedTab === 'conditions' && (
            <motion.div
              key="conditions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FaUserMd className="text-blue-500 text-xl" />
                    <h2 className="text-xl font-semibold text-gray-900">Health Conditions</h2>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={addHealthCondition}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      <FaPlus />
                      <span>Add Condition</span>
                    </button>
                    <button
                      onClick={saveConditions}
                      disabled={saving}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {saving ? <FaSpinner className="animate-spin" /> : <FaCheckCircle />}
                      <span>{saving ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {healthConditions.map((condition, index) => (
                    <motion.div
                      key={condition.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center justify-end mb-2">
                        <button
                          onClick={() => removeHealthCondition(condition.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete condition"
                          aria-label="Delete condition"
                        >
                          <FaTimes />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Health Condition
                          </label>
                          <input
                            type="text"
                            value={condition.condition}
                            onChange={(e) => updateHealthCondition(condition.id, 'condition', e.target.value)}
                            placeholder="e.g., Diabetes, Hypertension"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Diagnosed Date
                          </label>
                          <input
                            type="date"
                            value={condition.diagnosedDate}
                            onChange={(e) => updateHealthCondition(condition.id, 'diagnosedDate', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Severity
                          </label>
                          <select
                            value={condition.severity}
                            onChange={(e) => updateHealthCondition(condition.id, 'severity', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="mild">Mild</option>
                            <option value="moderate">Moderate</option>
                            <option value="severe">Severe</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Medications
                          </label>
                          <input
                            type="text"
                            value={condition.medications.join(', ')}
                            onChange={(e) => updateHealthCondition(condition.id, 'medications', e.target.value.split(', '))}
                            placeholder="e.g., Metformin, Insulin"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Live Recommendations */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">Live Food & Exercise Recommendations</h3>
                    {saving && (
                      <span className="text-sm text-gray-500 flex items-center gap-2"><FaSpinner className="animate-spin"/> Updating...</span>
                    )}
                  </div>
                  {liveRecs.length === 0 ? (
                    <p className="text-sm text-gray-600">Start adding your conditions to see tailored diet and exercise suggestions.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {liveRecs.map((r, idx) => (
                        <div key={idx} className="border border-green-200 rounded-lg p-4 bg-green-50">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900">{r.condition}</p>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-green-300 text-green-700">{r.severity}</span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <p className="font-medium mt-1">Treatment</p>
                            <ul className="list-disc ml-5">
                              {r.treatment?.map((t,i)=> <li key={i}>{t}</li>)}
                            </ul>
                            <p className="font-medium mt-2">Diet - Include</p>
                            <ul className="list-disc ml-5">
                              {r.foods?.map((f,i)=> <li key={i}>{f}</li>)}
                            </ul>
                            {r.avoid?.length ? (
                              <>
                                <p className="font-medium mt-2">Diet - Avoid/Limit</p>
                                <ul className="list-disc ml-5">
                                  {r.avoid.map((f,i)=> <li key={i}>{f}</li>)}
                                </ul>
                              </>
                            ) : null}
                            <p className="font-medium mt-2">Care & Self-care</p>
                            <ul className="list-disc ml-5">
                              {r.care?.map((c,i)=> <li key={i}>{c}</li>)}
                            </ul>
                            <p className="font-medium mt-2">Exercises</p>
                            <ul className="list-disc ml-5">
                              {r.exercises?.map((ex,i)=> <li key={i}>{ex}</li>)}
                            </ul>
                            <p className="text-xs text-gray-500 mt-2">{r.notes}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {selectedTab === 'food-recommendations' && (
            <motion.div
              key="food-recommendations"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FaAppleAlt className="text-green-500 text-xl" />
                    <h2 className="text-xl font-semibold text-gray-900">AI Food Recommendations</h2>
                  </div>
                  <button
                    onClick={fetchFoodRecommendations}
                    disabled={isLoadingFoodRecs}
                    className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoadingFoodRecs ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <FaAppleAlt />
                        <span>Get Food Recommendations</span>
                      </>
                    )}
                  </button>
                </div>

                {foodRecommendations ? (
                  <div className="space-y-6">
                    {/* Food Recommendations by Category */}
                    {foodRecommendations.recommendations?.map((category, index) => (
                      <div key={index} className="border border-green-200 rounded-lg p-4 bg-green-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3 capitalize">{category.category} Recommendations</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {category.foods?.map((food, foodIndex) => (
                            <div key={foodIndex} className="bg-white rounded-lg p-3 border border-green-100">
                              <h4 className="font-medium text-gray-900">{food.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{food.benefit}</p>
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Portion: {food.portion}</span>
                                <span>Frequency: {food.frequency}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}

                    {/* General Guidelines */}
                    {foodRecommendations.generalGuidelines?.length > 0 && (
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">General Dietary Guidelines</h3>
                        <ul className="list-disc ml-5 space-y-1">
                          {foodRecommendations.generalGuidelines.map((guideline, index) => (
                            <li key={index} className="text-gray-700">{guideline}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Foods to Limit */}
                    {foodRecommendations.foodsToLimit?.length > 0 && (
                      <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Foods to Limit</h3>
                        <div className="space-y-2">
                          {foodRecommendations.foodsToLimit.map((food, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-yellow-100">
                              <h4 className="font-medium text-gray-900">{food.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{food.reason}</p>
                              {food.alternative && (
                                <p className="text-sm text-green-600 mt-1">
                                  <strong>Alternative:</strong> {food.alternative}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Supplements */}
                    {foodRecommendations.supplements?.length > 0 && (
                      <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Supplement Recommendations</h3>
                        <div className="space-y-2">
                          {foodRecommendations.supplements.map((supplement, index) => (
                            <div key={index} className="bg-white rounded-lg p-3 border border-purple-100">
                              <h4 className="font-medium text-gray-900">{supplement.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{supplement.benefit}</p>
                              <div className="flex justify-between text-xs text-gray-500 mt-2">
                                <span>Dosage: {supplement.dosage}</span>
                                {supplement.note && <span className="text-purple-600">{supplement.note}</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FaAppleAlt className="mx-auto text-gray-400 text-4xl mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Get Personalized Food Recommendations</h3>
                    <p className="text-gray-600 mb-4">
                      Based on your health reports and conditions, we'll provide personalized food recommendations to support your health goals.
                    </p>
                    <button
                      onClick={fetchFoodRecommendations}
                      disabled={isLoadingFoodRecs}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingFoodRecs ? (
                        <>
                          <FaSpinner className="animate-spin" />
                          <span>Generating Recommendations...</span>
                        </>
                      ) : (
                        <>
                          <FaAppleAlt />
                          <span>Generate Food Recommendations</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {selectedTab === 'analysis' && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <FaChartLine className="text-blue-500 text-xl" />
                    <h2 className="text-xl font-semibold text-gray-900">AI Health Analysis</h2>
                  </div>
                  <button
                    onClick={analyzeHealthReports}
                    disabled={isAnalyzing || uploadedFiles.length === 0}
                    className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAnalyzing ? (
                      <>
                        <FaSpinner className="animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <FaEye />
                        <span>Analyze Reports</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Show report analysis first if available, otherwise show condition-based recommendations */}
                {analysisResults ? (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Report Analysis Results</h3>
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">Health Report Analysis</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                          {analysisResults.confidence || 'Analysis Complete'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <p className="mb-2"><strong>Summary:</strong> {analysisResults.analysisSummary || 'Analysis completed'}</p>
                        {analysisResults.findings && analysisResults.findings.length > 0 ? (
                          <div>
                            <p className="font-medium mt-2">Key Findings:</p>
                            <ul className="list-disc ml-5">
                              {analysisResults.findings.map((finding, i) => (
                                <li key={i} className={`${
                                  finding.type === 'warning' ? 'text-yellow-700' :
                                  finding.type === 'danger' ? 'text-red-700' :
                                  finding.type === 'success' ? 'text-green-700' : 'text-blue-700'
                                }`}>
                                  {finding.title}: {finding.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-green-700">✅ No significant findings - results appear normal</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Recommendations Based on Your Conditions</h3>
                    {liveRecs.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {liveRecs.map((r, idx) => (
                          <div key={idx} className="border border-green-200 rounded-lg p-4 bg-green-50">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold text-gray-900">{r.condition}</p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-green-300 text-green-700">{r.severity}</span>
                            </div>
                            <div className="text-sm text-gray-700">
                              <p className="font-medium mt-1">Treatment</p>
                              <ul className="list-disc ml-5">
                                {r.treatment?.map((t,i)=> <li key={i}>{t}</li>)}
                              </ul>
                              <p className="font-medium mt-2">Diet - Include</p>
                              <ul className="list-disc ml-5">
                                {r.foods?.map((f,i)=> <li key={i}>{f}</li>)}
                              </ul>
                              {r.avoid?.length ? (
                                <>
                                  <p className="font-medium mt-2">Diet - Avoid/Limit</p>
                                  <ul className="list-disc ml-5">
                                    {r.avoid.map((f,i)=> <li key={i}>{f}</li>)}
                                  </ul>
                                </>
                              ) : null}
                              <p className="font-medium mt-2">Care & Self-care</p>
                              <ul className="list-disc ml-5">
                                {r.care?.map((c,i)=> <li key={i}>{c}</li>)}
                              </ul>
                              <p className="font-medium mt-2">Exercises</p>
                              <ul className="list-disc ml-5">
                                {r.exercises?.map((ex,i)=> <li key={i}>{ex}</li>)}
                              </ul>
                              <p className="text-xs text-gray-500 mt-2">{r.notes}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">Add your health conditions to instantly see tailored diet and exercise guidance here.</p>
                    )}
                  </div>
                )}

                {analysisResults ? (
                  <div className="space-y-6">
                    {/* Analysis Summary */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Analysis Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{analysisResults.totalReports || 0}</div>
                          <div className="text-sm text-gray-600">Reports Analyzed</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{analysisResults.normalMetrics || 0}</div>
                          <div className="text-sm text-gray-600">Normal Metrics</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-yellow-600">{analysisResults.attentionNeeded || 0}</div>
                          <div className="text-sm text-gray-600">Need Attention</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Findings */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Findings</h3>
                      <div className="space-y-4">
                        {analysisResults.findings?.map((finding, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg"
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              finding.type === 'warning' ? 'bg-yellow-500' :
                              finding.type === 'danger' ? 'bg-red-500' :
                              finding.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                            }`} />
                            <div>
                              <p className="font-medium text-gray-900">{finding.title}</p>
                              <p className="text-gray-600 text-sm">{finding.description}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
                      <div className="space-y-4">
                        {analysisResults.recommendations?.map((rec, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200"
                          >
                            <FaShieldAlt className="text-blue-500 mt-1" />
                            <div>
                              <p className="font-medium text-gray-900">{rec.title}</p>
                              <p className="text-gray-600 text-sm">{rec.description}</p>
                              {rec.action && (
                                <button className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium">
                                  {rec.action}
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <FaChartLine className="mx-auto text-gray-400 text-4xl mb-4" />
                    <p className="text-gray-600">Upload health reports and click "Analyze Reports" to get AI-powered insights</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {selectedTab === 'monitoring' && (
            <motion.div
              key="monitoring"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Health Metrics */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <FaHeart className="text-red-500 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Health Metrics</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.entries(healthMetrics).map(([metric, data]) => (
                    <motion.div
                      key={metric}
                      whileHover={{ scale: 1.02 }}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 capitalize">
                          {metric.replace(/([A-Z])/g, ' $1').trim()}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                          {data.status}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {Object.entries(data).filter(([key]) => key !== 'status').map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-gray-600 capitalize">{key}:</span>
                            <span className="font-medium">{value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Health Alerts */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <FaBell className="text-yellow-500 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Health Alerts</h2>
                </div>

                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <motion.div
                      key={alert.id}
                      whileHover={{ scale: 1.01 }}
                      className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}
                    >
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.type)}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{alert.message}</p>
                          <p className="text-sm text-gray-600">Metric: {alert.metric}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          alert.severity === 'high' ? 'bg-red-100 text-red-600' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                          'bg-green-100 text-green-600'
                        }`}>
                          {alert.severity}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {selectedTab === 'trends' && (
            <motion.div
              key="trends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <FaHistory className="text-purple-500 text-xl" />
                  <h2 className="text-xl font-semibold text-gray-900">Health Trends</h2>
                </div>

                <div className="space-y-4">
                  {healthTrends.map((trend, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <FaCalendarAlt className="text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{trend.metric}</p>
                          <p className="text-sm text-gray-600">{trend.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{trend.value}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trend.status)}`}>
                          {trend.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default HealthReportAnalysis; 