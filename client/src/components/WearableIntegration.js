import React, { useState, useEffect } from 'react';
import { 
  FaApple, 
  FaGoogle, 
  FaHeartbeat, 
  FaWalking, 
  FaFire, 
  FaBed,
  FaSync,
  FaChartLine,
  FaDumbbell,
  FaRunning,
  FaBicycle
} from 'react-icons/fa';
import axios from 'axios';

const WearableIntegration = () => {
  const [activityData, setActivityData] = useState(null);
  const [workoutRecommendations, setWorkoutRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [selectedPlatform, setSelectedPlatform] = useState('healthkit');

  useEffect(() => {
    fetchActivityData();
    fetchWorkoutRecommendations();
  }, []);

  const fetchActivityData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wearable/activity/current', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivityData(response.data.activityData);
    } catch (error) {
      console.error('Error fetching activity data:', error);
    }
  };

  const fetchWorkoutRecommendations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/wearable/workout/recommendations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkoutRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Error fetching workout recommendations:', error);
    }
  };

  const syncWearableData = async () => {
    setIsLoading(true);
    setSyncStatus('syncing');
    
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/wearable/sync', {
        platform: selectedPlatform,
        data: {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSyncStatus('success');
      fetchActivityData();
      fetchWorkoutRecommendations();
      
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (error) {
      console.error('Error syncing wearable data:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getWorkoutIcon = (type) => {
    switch (type) {
      case 'cardio': return <FaRunning className="text-red-500" />;
      case 'strength': return <FaDumbbell className="text-blue-500" />;
      case 'walking': return <FaWalking className="text-green-500" />;
      case 'recovery': return <FaHeartbeat className="text-purple-500" />;
      default: return <FaDumbbell className="text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Wearable Integration</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="healthkit">Apple HealthKit</option>
            <option value="googlefit">Google Fit</option>
          </select>
          <button
            onClick={syncWearableData}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <FaSync className={isLoading ? 'animate-spin' : ''} />
            <span>{isLoading ? 'Syncing...' : 'Sync Data'}</span>
          </button>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus !== 'idle' && (
        <div className={`mb-4 p-3 rounded-md ${
          syncStatus === 'success' ? 'bg-green-100 text-green-700' :
          syncStatus === 'error' ? 'bg-red-100 text-red-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {syncStatus === 'success' && '✅ Data synced successfully!'}
          {syncStatus === 'error' && '❌ Failed to sync data. Please try again.'}
          {syncStatus === 'syncing' && '🔄 Syncing with wearable device...'}
        </div>
      )}

      {/* Activity Data */}
      {activityData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Steps Today</p>
                <p className="text-3xl font-bold">{activityData.steps.toLocaleString()}</p>
              </div>
              <FaWalking className="text-4xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Calories Burned</p>
                <p className="text-3xl font-bold">{activityData.caloriesBurned}</p>
              </div>
              <FaFire className="text-4xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Active Minutes</p>
                <p className="text-3xl font-bold">{activityData.activeMinutes}</p>
              </div>
              <FaChartLine className="text-4xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Heart Rate</p>
                <p className="text-3xl font-bold">{activityData.heartRate} BPM</p>
              </div>
              <FaHeartbeat className="text-4xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-100 text-sm">Distance</p>
                <p className="text-3xl font-bold">{activityData.distance} km</p>
              </div>
              <FaBicycle className="text-4xl opacity-80" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-indigo-100 text-sm">Sleep Hours</p>
                <p className="text-3xl font-bold">{activityData.sleepHours}h</p>
              </div>
              <FaBed className="text-4xl opacity-80" />
            </div>
          </div>
        </div>
      )}

      {/* Workout Recommendations */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Dynamic Workout Recommendations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workoutRecommendations.map((workout, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {getWorkoutIcon(workout.type)}
                  <div>
                    <h4 className="font-semibold text-gray-800">{workout.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntensityColor(workout.intensity)}`}>
                      {workout.intensity} intensity
                    </span>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  workout.priority === 'high' ? 'bg-red-100 text-red-700' :
                  workout.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {workout.priority} priority
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-3">{workout.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>⏱️ {workout.duration} min</span>
                <span>🔥 {workout.caloriesBurn} cal</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Integration */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Platform Integration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
            <FaApple className="text-2xl text-gray-600" />
            <div>
              <p className="font-medium text-gray-800">Apple HealthKit</p>
              <p className="text-sm text-gray-500">Sync with iPhone and Apple Watch</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 p-3 bg-white rounded-lg border">
            <FaGoogle className="text-2xl text-gray-600" />
            <div>
              <p className="font-medium text-gray-800">Google Fit</p>
              <p className="text-sm text-gray-500">Sync with Android devices</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WearableIntegration; 