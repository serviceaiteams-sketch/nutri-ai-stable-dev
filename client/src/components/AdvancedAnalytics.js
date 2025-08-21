import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FaChartLine, FaChartBar, FaChartPie, FaCalendarAlt,
  FaAward, FaTrophy, FaBullseye,
  FaHeart, FaAppleAlt, FaFire, FaWater, FaBed,
  FaRunning, FaWeight, FaThermometerHalf, FaTint,
  FaExclamationTriangle, FaCheckCircle, FaInfoCircle,
  FaArrowUp, FaArrowDown, FaMinus
} from 'react-icons/fa';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const AdvancedAnalytics = () => {
  const { user } = useAuth();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');
  const [selectedMetric, setSelectedMetric] = useState('nutrition');

  const authHeaders = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token') || ''}` 
    } 
  });

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/analytics/dashboard?period=${selectedPeriod}`, authHeaders());
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
      // Set mock data for demonstration
      setAnalyticsData(getMockAnalyticsData());
    } finally {
      setLoading(false);
    }
  };

  const getMockAnalyticsData = () => ({
    nutrition: {
      calories: { current: 1850, target: 2000, trend: 'up', change: 7.5 },
      protein: { current: 85, target: 100, trend: 'down', change: -3.2 },
      carbs: { current: 220, target: 250, trend: 'up', change: 12.1 },
      fat: { current: 65, target: 70, trend: 'stable', change: 0 },
      fiber: { current: 28, target: 30, trend: 'up', change: 15.3 },
      sugar: { current: 45, target: 50, trend: 'down', change: -8.7 }
    },
    health: {
      weight: { current: 70.5, target: 68, trend: 'down', change: -2.1 },
      bloodPressure: { current: '120/80', target: '120/80', trend: 'stable', change: 0 },
      bloodSugar: { current: 95, target: 90, trend: 'down', change: -3.2 },
      sleep: { current: 7.5, target: 8, trend: 'up', change: 6.7 },
      hydration: { current: 2.1, target: 2.5, trend: 'up', change: 12.5 },
      steps: { current: 8500, target: 10000, trend: 'up', change: 8.9 }
    },
    trends: {
      weeklyNutrition: [
        { day: 'Mon', calories: 1850, protein: 85, carbs: 220, fat: 65 },
        { day: 'Tue', calories: 1920, protein: 92, carbs: 235, fat: 68 },
        { day: 'Wed', calories: 1780, protein: 78, carbs: 210, fat: 62 },
        { day: 'Thu', calories: 1950, protein: 88, carbs: 245, fat: 70 },
        { day: 'Fri', calories: 1820, protein: 82, carbs: 225, fat: 65 },
        { day: 'Sat', calories: 2100, protein: 95, carbs: 260, fat: 75 },
        { day: 'Sun', calories: 1750, protein: 80, carbs: 200, fat: 60 }
      ],
      healthMetrics: [
        { day: 'Mon', weight: 70.8, bloodSugar: 98, sleep: 7.2, steps: 8200 },
        { day: 'Tue', weight: 70.6, bloodSugar: 95, sleep: 7.8, steps: 8900 },
        { day: 'Wed', weight: 70.4, bloodSugar: 93, sleep: 8.1, steps: 9200 },
        { day: 'Thu', weight: 70.3, bloodSugar: 94, sleep: 7.5, steps: 8700 },
        { day: 'Fri', weight: 70.2, bloodSugar: 92, sleep: 8.3, steps: 9500 },
        { day: 'Sat', weight: 70.1, bloodSugar: 96, sleep: 7.9, steps: 7800 },
        { day: 'Sun', weight: 70.5, bloodSugar: 95, sleep: 8.0, steps: 8500 }
      ]
    },
    insights: [
      {
        type: 'success',
        title: 'Great Progress on Protein Intake',
        description: 'You\'ve increased your protein consumption by 15% this week',
        icon: FaChartLine,
        metric: 'protein'
      },
      {
        type: 'warning',
        title: 'Fiber Intake Below Target',
        description: 'Consider adding more fruits and vegetables to reach your fiber goal',
        icon: FaExclamationTriangle,
        metric: 'fiber'
      },
      {
        type: 'info',
        title: 'Sleep Quality Improving',
        description: 'Your sleep duration has increased by 6.7% this week',
        icon: FaBed,
        metric: 'sleep'
      }
    ],
    achievements: [
      { id: 1, title: '7-Day Streak', description: 'Logged meals for 7 consecutive days', icon: FaTrophy, earned: true },
      { id: 2, title: 'Protein Goal', description: 'Met protein target for 5 days', icon: FaAward, earned: true },
      { id: 3, title: 'Hydration Master', description: 'Drank 2L+ water for 3 days', icon: FaWater, earned: false },
      { id: 4, title: 'Step Counter', description: 'Reached 10k steps for 4 days', icon: FaRunning, earned: false }
    ]
  });

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return <FaArrowUp className="text-green-500" />;
      case 'down': return <FaArrowDown className="text-red-500" />;
      default: return <FaMinus className="text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <FaChartLine className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Advanced Analytics</h1>
                <p className="text-gray-600">Comprehensive health insights and progress tracking</p>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
              </select>
            </div>
          </div>
        </div>

        {/* Metric Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex space-x-4">
            {[
              { id: 'nutrition', label: 'Nutrition', icon: FaAppleAlt },
              { id: 'health', label: 'Health Metrics', icon: FaHeart },
              { id: 'trends', label: 'Trends', icon: FaChartLine }
            ].map((metric) => (
              <button
                key={metric.id}
                onClick={() => setSelectedMetric(metric.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMetric === metric.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {metric.icon && React.createElement(metric.icon)}
                <span>{metric.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {selectedMetric === 'nutrition' ? 'Nutrition Trends' : 
                 selectedMetric === 'health' ? 'Health Metrics' : 'Overall Trends'}
              </h2>
              
              <ResponsiveContainer width="100%" height={400}>
                {selectedMetric === 'nutrition' ? (
                  <LineChart data={analyticsData.trends.weeklyNutrition}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="calories" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="protein" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="carbs" stroke="#ffc658" strokeWidth={2} />
                    <Line type="monotone" dataKey="fat" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                ) : selectedMetric === 'health' ? (
                  <LineChart data={analyticsData.trends.healthMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="weight" stroke="#8884d8" strokeWidth={2} />
                    <Line type="monotone" dataKey="bloodSugar" stroke="#82ca9d" strokeWidth={2} />
                    <Line type="monotone" dataKey="sleep" stroke="#ffc658" strokeWidth={2} />
                    <Line type="monotone" dataKey="steps" stroke="#ff7300" strokeWidth={2} />
                  </LineChart>
                ) : (
                  <BarChart data={analyticsData.trends.weeklyNutrition}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calories" fill="#8884d8" />
                    <Bar dataKey="protein" fill="#82ca9d" />
                    <Bar dataKey="carbs" fill="#ffc658" />
                    <Bar dataKey="fat" fill="#ff7300" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Metrics Summary */}
          <div className="space-y-6">
            {/* Current Metrics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Status</h3>
              <div className="space-y-4">
                {selectedMetric === 'nutrition' && analyticsData.nutrition && 
                  Object.entries(analyticsData.nutrition).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="font-medium capitalize">{key}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{data.current}</span>
                        <span className="text-sm text-gray-500">/ {data.target}</span>
                        {getTrendIcon(data.trend)}
                        <span className={`text-sm ${getTrendColor(data.trend)}`}>
                          {data.change > 0 ? '+' : ''}{Math.round(data.change * 10) / 10}%
                        </span>
                      </div>
                    </div>
                  ))
                }
                
                {selectedMetric === 'health' && analyticsData.health &&
                  Object.entries(analyticsData.health).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold">{data.current}</span>
                        {data.target && <span className="text-sm text-gray-500">/ {data.target}</span>}
                        {getTrendIcon(data.trend)}
                        <span className={`text-sm ${getTrendColor(data.trend)}`}>
                          {data.change > 0 ? '+' : ''}{Math.round(data.change * 10) / 10}%
                        </span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Insights</h3>
              <div className="space-y-3">
                {analyticsData.insights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-3 rounded-lg border ${
                      insight.type === 'success' ? 'bg-green-50 border-green-200' :
                      insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {insight.icon && React.createElement(insight.icon, {
                        className: `mt-1 ${
                          insight.type === 'success' ? 'text-green-600' :
                          insight.type === 'warning' ? 'text-yellow-600' :
                          'text-blue-600'
                        }`
                      })}
                      <div>
                        <h4 className="font-medium text-gray-900">{insight.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Achievements</h3>
              <div className="space-y-3">
                {analyticsData.achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border ${
                      achievement.earned 
                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' 
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    {achievement.icon && React.createElement(achievement.icon, {
                      className: `text-lg ${
                        achievement.earned ? 'text-yellow-600' : 'text-gray-400'
                      }`
                    })}
                    <div className="flex-1">
                      <h4 className={`font-medium ${
                        achievement.earned ? 'text-gray-900' : 'text-gray-500'
                      }`}>{achievement.title}</h4>
                      <p className={`text-sm ${
                        achievement.earned ? 'text-gray-600' : 'text-gray-400'
                      }`}>{achievement.description}</p>
                    </div>
                    {achievement.earned && <FaCheckCircle className="text-green-600" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalytics;
