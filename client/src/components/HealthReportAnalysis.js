import React, { useState, useEffect, useMemo } from 'react';
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

  // Format AI analysis text with visual highlights
  const formatAnalysisText = (text) => {
    if (!text) return null;
    
    const sections = text.split(/(?=^[A-Z\s]+:)/m);
    
    return sections.map((section, index) => {
      if (!section.trim()) return null;
      
      const lines = section.trim().split('\n');
      const title = lines[0].replace(':', '');
      const content = lines.slice(1).join('\n').trim();
      
      if (!content) return null;
      
      // Define section styles and icons
      const sectionConfig = {
        'SUMMARY': { icon: FaInfoCircle, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
        'KEY FINDINGS': { icon: FaExclamationTriangle, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
        'NUMBERS': { icon: FaChartLine, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
        'RECOMMENDATIONS': { icon: FaUserMd, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
        'ALERTS': { icon: FaBell, color: 'from-red-500 to-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' }
      };
      
      const config = sectionConfig[title] || { icon: FaInfoCircle, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
      const Icon = config.icon;
      
      return (
        <div key={index} className={`p-4 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
          <div className="flex items-center space-x-3 mb-3">
            <div className={`w-8 h-8 bg-gradient-to-r ${config.color} rounded-lg flex items-center justify-center`}>
              <Icon className="text-white text-sm" />
            </div>
            <h5 className="font-semibold text-gray-900 text-lg">{title}</h5>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">
            {content.split('\n').map((line, lineIndex) => {
              if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                return (
                  <div key={lineIndex} className="flex items-start space-x-2 mb-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{line.trim().substring(1).trim()}</span>
                  </div>
                );
              } else if (line.trim().match(/^\d+\./)) {
                return (
                  <div key={lineIndex} className="flex items-start space-x-2 mb-2">
                    <span className="text-blue-500 font-medium">{line.trim().split('.')[0]}.</span>
                    <span>{line.trim().split('.').slice(1).join('.').trim()}</span>
                  </div>
                );
              } else if (line.trim()) {
                return <p key={lineIndex} className="mb-2">{line.trim()}</p>;
              }
              return null;
            })}
          </div>
        </div>
      );
    });
  };

  // Lab styling helper functions
  const getLabCardStyle = (status) => {
    switch (status) {
      case 'high':
        return 'bg-red-50 border-red-300';
      case 'low':
        return 'bg-blue-50 border-blue-300';
      case 'normal':
        return 'bg-green-50 border-green-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getLabStatusColor = (status) => {
    switch (status) {
      case 'high':
        return 'bg-red-500';
      case 'low':
        return 'bg-blue-500';
      case 'normal':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getLabStatusBadge = (status) => {
    switch (status) {
      case 'high':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'normal':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
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

  // ===== Lab Parsing & Highlighting Helpers =====
  const extractNumbersSection = (text) => {
    if (!text) return '';
    const start = text.indexOf('**NUMBERS**');
    if (start === -1) return '';
    // section ends at next double asterisks heading or end of string
    const rest = text.slice(start + '**NUMBERS**'.length);
    const nextHeader = rest.indexOf('**');
    return nextHeader === -1 ? rest : rest.slice(0, nextHeader);
  };

  const parseRange = (s) => {
    // expects forms like 70-99, >59, >=59
    if (!s) return { min: undefined, max: undefined };
    const m = s.match(/([<>]=?)?\s*([\d.]+)/);
    if (m) {
      const op = m[1];
      const val = parseFloat(m[2]);
      if (op && op.includes('>')) return { min: val, max: undefined };
      if (op && op.includes('<')) return { min: undefined, max: val };
    }
    const range = s.split('-').map(v => parseFloat(v.trim()));
    if (range.length === 2 && !isNaN(range[0]) && !isNaN(range[1])) {
      return { min: range[0], max: range[1] };
    }
    return { min: undefined, max: undefined };
  };

  const parseLabLines = (section) => {
    if (!section) return [];
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.startsWith('- '));
    const items = [];
    for (const line of lines) {
      // e.g., - Glucose: 125 mg/dL (normal: 70-99)
      const m = line.match(/^\-\s*([^:]+):\s*([^()]+)\(normal:\s*([^\)]+)\)/i);
      if (m) {
        const name = m[1].trim();
        const valuePart = m[2].trim();
        const normalPart = m[3].trim();
        const valMatch = valuePart.match(/([\d.]+)\s*([a-zA-Z%\/]+)?|([+]+|positive|negative)/i);
        let valueNum = undefined; let unit = '';
        let qualitative = '';
        if (valMatch) {
          if (valMatch[1]) { valueNum = parseFloat(valMatch[1]); unit = (valMatch[2] || '').trim(); }
          else if (valMatch[3]) { qualitative = (valMatch[3] || '').toLowerCase(); }
        }
        const range = parseRange(normalPart);
        let status = 'normal';
        if (!isNaN(valueNum)) {
          if (typeof range.min === 'number' && valueNum < range.min) status = 'low';
          if (typeof range.max === 'number' && valueNum > range.max) status = 'high';
        } else if (normalPart.toLowerCase().includes('negative')) {
          status = (qualitative.includes('+') || qualitative.includes('positive')) ? 'high' : 'normal';
        }
        items.push({ name, value: isNaN(valueNum) ? (qualitative || valuePart.trim()) : valueNum, unit, range, status });
      }
    }
    return items;
  };

  const labBadges = {
    high: 'bg-red-100 text-red-700 border border-red-200',
    low: 'bg-blue-100 text-blue-700 border border-blue-200',
    normal: 'bg-green-100 text-green-700 border border-green-200'
  };

  const parsedLabs = useMemo(() => {
    const section = extractNumbersSection(analysisResults?.analysis || '');
    return parseLabLines(section);
  }, [analysisResults]);

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
                  <CuisineViewer markdown={foodRecommendations} />
                ) : (
                  <div className="text-center py-8">
                    <FaAppleAlt className="mx-auto text-gray-400 text-4xl mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Get Personalized Food Recommendations</h3>
                    <p className="text-gray-500">Click the button above to generate AI-powered food recommendations based on your health conditions</p>
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
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 p-6 rounded-r-lg shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                            <FaFileMedical className="text-white text-lg" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">Health Report Analysis</h3>
                            <p className="text-sm text-blue-600">AI-powered insights and recommendations</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                            {analysisResults.confidence || 'Analysis Complete'}
                          </span>
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        </div>
                      </div>
                      <div className="text-sm text-gray-700">
                        <div className="bg-white p-3 rounded-lg border border-blue-200 mb-4">
                          <div className="flex items-center space-x-2">
                            <FaInfoCircle className="text-blue-500 text-sm" />
                            <span className="font-semibold text-gray-900">Summary:</span>
                            <span>{analysisResults.message || 'Analysis completed'}</span>
                          </div>
                        </div>
                        {analysisResults.analysis ? (
                          <div className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                <FaMagic className="text-white text-lg" />
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900">AI Analysis</h4>
                                <p className="text-sm text-blue-600">Powered by advanced AI insights</p>
                              </div>
                            </div>
                            
                            <div className="space-y-4">
                              {formatAnalysisText(analysisResults.analysis)}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center space-x-2">
                              <FaCheckCircle className="text-green-600 text-lg" />
                              <p className="text-green-700 font-medium">Analysis completed successfully</p>
                            </div>
                          </div>
                        )}

                        {/* Lab Highlights */}
                        {parsedLabs.length > 0 && (
                          <div className="mt-6">
                            <div className="flex items-center space-x-3 mb-4">
                              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                                <FaMicroscope className="text-white text-sm" />
                              </div>
                              <h3 className="text-lg font-semibold text-gray-900">Highlighted Labs</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                              {parsedLabs.map((lab, idx) => (
                                <div key={idx} className={`rounded-xl p-4 border-2 shadow-sm transition-all duration-200 hover:shadow-md ${getLabCardStyle(lab.status)}`}>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      <div className={`w-3 h-3 rounded-full ${getLabStatusColor(lab.status)}`}></div>
                                      <span className="font-semibold text-gray-900 text-sm">{lab.name}</span>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getLabStatusBadge(lab.status)}`}>
                                      {lab.status.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="text-lg font-bold text-gray-900">
                                      {String(lab.value)} {lab.unit}
                                    </div>
                                    { (lab.range.min !== undefined || lab.range.max !== undefined) && (
                                      <div className="text-sm text-gray-600">
                                        Normal: {lab.range.min !== undefined ? lab.range.min : '–'}{(lab.range.min !== undefined || lab.range.max !== undefined) && '-'}{lab.range.max !== undefined ? lab.range.max : '–'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
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
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200 shadow-sm">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                          <FaChartLine className="text-white text-lg" />
                        </div>
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900">Analysis Summary</h3>
                          <p className="text-sm text-purple-600">Key metrics and insights overview</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-blue-100 hover:shadow-md transition-shadow duration-200">
                          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <FaFileMedical className="text-white text-lg" />
                          </div>
                          <div className="text-3xl font-bold text-blue-600 mb-1">{analysisResults.reportsCount || 0}</div>
                          <div className="text-sm text-gray-600 font-medium">Reports Analyzed</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-green-100 hover:shadow-md transition-shadow duration-200">
                          <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <FaHeart className="text-white text-lg" />
                          </div>
                          <div className="text-3xl font-bold text-green-600 mb-1">{analysisResults.conditionsCount || 0}</div>
                          <div className="text-sm text-gray-600 font-medium">Health Conditions</div>
                        </div>
                        <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-yellow-100 hover:shadow-md transition-shadow duration-200">
                          <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <FaCheckCircle className="text-white text-lg" />
                          </div>
                          <div className="text-3xl font-bold text-yellow-600 mb-1">{analysisResults.analysis ? 1 : 0}</div>
                          <div className="text-sm text-gray-600 font-medium">Analysis Complete</div>
                        </div>
                      </div>
                    </div>

                    {/* Key Findings */}
                    {/* Removed duplicate AI Analysis Results panel to avoid double display */}

                    {/* Food Recommendations from Health Conditions */}
                    {foodRecommendations && (
                      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <div className="flex items-center space-x-3 mb-6">
                          <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                            <FaAppleAlt className="text-white text-lg" />
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-gray-900">Food Recommendations</h3>
                            <p className="text-sm text-green-600">AI-powered dietary guidance based on your health profile</p>
                          </div>
                        </div>
                        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                          <div className="text-sm whitespace-pre-line text-gray-700 leading-relaxed">{foodRecommendations}</div>
                        </div>
                      </div>
                    )}
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

// Simple parser to split Top 10 cuisines out of markdown text
function CuisineViewer({ markdown }) {
  const [active, setActive] = React.useState(null);
  const sections = useMemo(() => {
    const topIndex = markdown.indexOf('TOP 10 CUISINES');
    if (topIndex === -1) return { intro: markdown, cuisines: [] };
    const intro = markdown.slice(0, topIndex).trim();
    const rest = markdown.slice(topIndex).trim();
    // collect bullet lines 1) .. 10)
    const lines = rest.split('\n');
    const cuisines = [];
    for (const line of lines) {
      const m = line.match(/^\d+\)\s*([^—\-:]+)[—\-:]+\s*(.*)$/);
      if (m) cuisines.push({ name: m[1].trim(), reason: m[2].trim() });
      if (cuisines.length === 10) break;
    }
    return { intro, cuisines };
  }, [markdown]);

  const cuisineContent = useMemo(() => {
    if (!active) return '';
    // naive slice from cuisine name to next cuisine marker or end
    const start = markdown.indexOf(active);
    if (start === -1) return '';
    const after = markdown.slice(start);
    const next = after.slice(active.length).search(/\n\d+\)\s/);
    return next === -1 ? after : after.slice(0, next + active.length);
  }, [active, markdown]);

  return (
    <div className="space-y-6">
      <div className="border border-green-200 rounded-lg p-6 bg-green-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">General Strategy</h3>
        <div className="whitespace-pre-line text-gray-700">{sections.intro}</div>
      </div>
      {sections.cuisines.length > 0 && (
        <div className="border border-green-200 rounded-lg p-6 bg-white">
          <h4 className="font-semibold text-gray-900 mb-3">Top Cuisines</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            {sections.cuisines.map(c => (
              <button
                key={c.name}
                onClick={() => setActive(c.name)}
                className={`px-3 py-1 rounded-full border text-sm ${active === c.name ? 'bg-green-600 text-white border-green-600' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
                title={c.reason}
              >
                {c.name}
              </button>
            ))}
          </div>
          {active ? (
            <div className="p-4 bg-green-50 rounded border border-green-200 whitespace-pre-line text-gray-800">
              {cuisineContent || 'Select a cuisine to view examples'}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Select a cuisine to view 3 sample meals with portions.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default HealthReportAnalysis; 