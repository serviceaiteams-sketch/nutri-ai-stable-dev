import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaPills, FaClock, FaUtensils, FaDumbbell, 
  FaPrayingHands, FaAppleAlt, FaEye, FaCamera, 
  FaClipboardList, FaWeightHanging, FaUser,
  FaChartLine, FaBullseye, FaTrophy, FaCheckCircle
} from 'react-icons/fa';

const GoalBasedFeatures = () => {
  const [userGoals, setUserGoals] = useState([]);
  const [activeGoal, setActiveGoal] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const savedGoals = localStorage.getItem('userGoals');
    if (savedGoals) {
      setUserGoals(JSON.parse(savedGoals));
    }
  }, []);

  const goalFeatures = {
    'glp1': {
      title: 'GLP-1 Support',
      description: 'Track your GLP-1 medication and monitor its effects',
      features: [
        'Medication Reminders',
        'Side Effect Tracking',
        'Progress Monitoring',
        'Doctor Communication'
      ],
      color: 'bg-purple-500'
    },
    'intermittent-fasting': {
      title: 'Intermittent Fasting',
      description: 'Track your fasting windows and eating periods',
      features: [
        'Fasting Timer',
        'Eating Window Tracker',
        'Progress Charts',
        'Fasting Tips'
      ],
      color: 'bg-blue-500'
    },
    'count-calories': {
      title: 'Calorie Counting',
      description: 'Track your daily calorie intake and expenditure',
      features: [
        'Food Database',
        'Calorie Calculator',
        'Daily Goals',
        'Progress Reports'
      ],
      color: 'bg-green-500'
    },
    'muscle-gain': {
      title: 'Muscle Gain',
      description: 'Build muscle with personalized workout plans',
      features: [
        'Strength Training',
        'Protein Tracking',
        'Progress Photos',
        'Workout Plans'
      ],
      color: 'bg-red-500'
    },
    'workout-yoga': {
      title: 'Workout & Yoga',
      description: 'Stay active with diverse fitness activities',
      features: [
        'Workout Videos',
        'Yoga Sessions',
        'Activity Tracking',
        'Fitness Challenges'
      ],
      color: 'bg-orange-500'
    },
    'healthy-foods': {
      title: 'Healthy Foods',
      description: 'Discover and track nutritious food options',
      features: [
        'Recipe Database',
        'Nutrition Facts',
        'Meal Planning',
        'Healthy Alternatives'
      ],
      color: 'bg-emerald-500'
    },
    'cgm': {
      title: 'CGM (Continuous Glucose Monitoring)',
      description: 'Monitor your glucose levels in real-time',
      features: [
        'Real-time Monitoring',
        'Glucose Trends',
        'Food Impact Analysis',
        'Alert System'
      ],
      color: 'bg-indigo-500'
    },
    'coach-guidance': {
      title: 'Coach Guidance',
      description: 'Get personalized coaching and support',
      features: [
        'Personal Coach',
        'Weekly Check-ins',
        'Goal Setting',
        'Progress Reviews'
      ],
      color: 'bg-pink-500'
    },
    'snap': {
      title: 'Snap Food Recognition',
      description: 'Instantly identify and log your meals',
      features: [
        'AI Food Recognition',
        'Instant Nutrition Facts',
        'Meal Logging',
        'Photo History'
      ],
      color: 'bg-cyan-500'
    },
    'diet-plan': {
      title: 'Diet Plans',
      description: 'Follow personalized meal plans',
      features: [
        'Custom Meal Plans',
        'Shopping Lists',
        'Recipe Instructions',
        'Nutrition Goals'
      ],
      color: 'bg-teal-500'
    },
    'weight-loss': {
      title: 'Weight Loss',
      description: 'Achieve your weight loss goals',
      features: [
        'Weight Tracking',
        'Calorie Deficit',
        'Progress Charts',
        'Motivation Tips'
      ],
      color: 'bg-yellow-500'
    }
  };

  const handleGoalClick = (goalId) => {
    setActiveGoal(goalId);
  };

  const getGoalIcon = (goalId) => {
    const icons = {
      'glp1': FaPills,
      'intermittent-fasting': FaClock,
      'count-calories': FaUtensils,
      'muscle-gain': FaDumbbell,
      'workout-yoga': FaPrayingHands,
      'healthy-foods': FaAppleAlt,
      'cgm': FaEye,
      'coach-guidance': FaUser,
      'snap': FaCamera,
      'diet-plan': FaClipboardList,
      'weight-loss': FaWeightHanging
    };
    return icons[goalId] || FaBullseye;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Health Goals</h2>
        <p className="text-gray-600">Track your progress and access personalized features</p>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userGoals.map((goalId) => {
          const goal = goalFeatures[goalId];
          const Icon = getGoalIcon(goalId);
          
          return (
            <motion.div
              key={goalId}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleGoalClick(goalId)}
              className={`
                bg-white rounded-xl p-6 cursor-pointer border-2 transition-all duration-300
                ${activeGoal === goalId 
                  ? 'border-indigo-500 shadow-lg' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-12 h-12 rounded-full ${goal.color} flex items-center justify-center`}>
                  <Icon className="text-white text-xl" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{goal.title}</h3>
                  <p className="text-sm text-gray-500">{goal.description}</p>
                </div>
              </div>

              <div className="space-y-2">
                {goal.features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <FaCheckCircle className="text-green-500 text-sm" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Progress</span>
                  <span className="text-sm font-semibold text-indigo-600">
                    {Math.floor(Math.random() * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                  ></div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Active Goal Details */}
      {activeGoal && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-200"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className={`w-16 h-16 rounded-full ${goalFeatures[activeGoal].color} flex items-center justify-center`}>
              {React.createElement(getGoalIcon(activeGoal), { className: "text-white text-2xl" })}
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{goalFeatures[activeGoal].title}</h3>
              <p className="text-gray-600">{goalFeatures[activeGoal].description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Available Features</h4>
              <div className="space-y-2">
                {goalFeatures[activeGoal].features.map((feature, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                    <FaCheckCircle className="text-green-500" />
                    <span className="text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-3">Quick Actions</h4>
              <div className="space-y-3">
                <button className="w-full bg-indigo-500 text-white py-2 px-4 rounded-lg hover:bg-indigo-600 transition-colors">
                  Start Today's Session
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  View Progress
                </button>
                <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
                  Set New Goal
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold">Overall Progress</h3>
          <FaTrophy className="text-2xl" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{userGoals.length}</div>
            <div className="text-sm opacity-90">Active Goals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">7</div>
            <div className="text-sm opacity-90">Day Streak</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">85%</div>
            <div className="text-sm opacity-90">Completion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">12</div>
            <div className="text-sm opacity-90">Achievements</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalBasedFeatures; 