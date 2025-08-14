import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { 
  FaPills, FaClock, FaUtensils, FaDumbbell, 
  FaPrayingHands, FaAppleAlt, FaEye, FaCamera, 
  FaClipboardList, FaWeightHanging, FaUser, 
  FaEnvelope, FaFacebook, FaPhone, FaCheck,
  FaCalculator, FaBullseye, FaHeart, FaBrain,
  FaBed, FaSmile, FaFrown, FaAngry, FaUserFriends,
  FaChevronLeft, FaChevronRight,
  FaWhatsapp, FaTimes, FaArrowRight, FaWeight,
  FaRuler, FaThermometerHalf, FaShieldAlt,
  FaCheckCircle, FaCircle, FaArrowLeft
} from 'react-icons/fa';

const Onboarding = () => {
  const { user, login } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    goals: [],
    phone: '',
    age: '',
    currentWeight: '',
    targetWeight: '',
    weightUnit: 'kg',
    medicalConditions: [],
    sleepTime: '23:30',
    wakeTime: '07:30',
    waterGoal: 9,
    stepGoal: 10000
  });

  const goals = [
    { id: 'glp1', name: 'GLP-1', icon: FaPills, description: 'Weight loss medication support' },
    { id: 'fasting', name: 'Intermittent Fasting', icon: FaClock, description: 'Time-restricted eating' },
    { id: 'coach', name: 'Coach Guidance', icon: FaUser, description: 'Personal coaching support' },
    { id: 'snap', name: 'Snap', icon: FaCamera, description: 'Photo-based food tracking' },
    { id: 'calories', name: 'Count Calories', icon: FaCalculator, description: 'Calorie counting' },
    { id: 'muscle', name: 'Muscle Gain', icon: FaDumbbell, description: 'Build muscle mass' },
    { id: 'diet', name: 'Diet Plan', icon: FaUtensils, description: 'Customized meal plans' },
    { id: 'weightloss', name: 'Weight Loss', icon: FaWeight, description: 'Lose weight effectively' },
    { id: 'workout', name: 'Workout/Yoga', icon: FaPrayingHands, description: 'Fitness and flexibility' },
    { id: 'healthy', name: 'Healthy Foods', icon: FaAppleAlt, description: 'Nutrition guidance' },
    { id: 'cgm', name: 'CGM (NutriAI Pro)', icon: FaEye, description: 'Continuous glucose monitoring' }
  ];

  const medicalConditions = [
    { id: 'diabetes', name: 'Diabetes', icon: FaThermometerHalf },
    { id: 'hypertension', name: 'Hypertension', icon: FaShieldAlt },
    { id: 'heart', name: 'Heart Disease', icon: FaHeart },
    { id: 'thyroid', name: 'Thyroid Issues', icon: FaBrain },
    { id: 'none', name: 'None', icon: FaCheckCircle }
  ];

  const handleGoalToggle = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(id => id !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const handleMedicalConditionToggle = (conditionId) => {
    setFormData(prev => ({
      ...prev,
      medicalConditions: prev.medicalConditions.includes(conditionId)
        ? prev.medicalConditions.filter(id => id !== conditionId)
        : [...prev.medicalConditions, conditionId]
    }));
  };

  const nextStep = () => {
    if (currentStep < 8) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Save onboarding data to backend
      const response = await fetch('/api/users/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        localStorage.setItem('onboardingComplete', 'true');
        localStorage.setItem('userGoals', JSON.stringify(formData.goals));
        window.location.reload();
      }
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-3xl font-bold">N</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">What brings you to NutriAI?</h1>
            <p className="text-gray-600 mb-8">Select all that apply</p>
            
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
              {goals.map((goal) => {
                const Icon = goal.icon;
                const isSelected = formData.goals.includes(goal.id);
                
                return (
                  <motion.button
                    key={goal.id}
                    onClick={() => handleGoalToggle(goal.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`text-xl ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
                      <div className="text-left">
                        <div className="font-semibold">{goal.name}</div>
                        <div className="text-sm opacity-75">{goal.description}</div>
                      </div>
                      {isSelected && <FaCheck className="text-green-600 ml-auto" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Let's Create Your Account</h1>
            <p className="text-gray-600 mb-8">Enter your phone number to get started</p>
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center space-x-2 p-4 border-2 border-gray-200 rounded-xl">
                <select className="bg-transparent text-gray-700 font-medium">
                  <option>+91</option>
                  <option>+1</option>
                  <option>+44</option>
                </select>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="flex-1 bg-transparent outline-none text-gray-700"
                />
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl">
                <FaWhatsapp className="text-green-600 text-xl" />
                <div className="text-left">
                  <div className="font-semibold text-green-700">WhatsApp Notifications</div>
                  <div className="text-sm text-green-600">Get updates on WhatsApp</div>
                </div>
                <input type="checkbox" className="ml-auto" defaultChecked />
              </div>
              
              <div className="text-xs text-gray-500">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </div>
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">How old are you?</h1>
            <p className="text-gray-600 mb-8">This helps us personalize your experience</p>
            
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="number"
                  placeholder="Enter your age"
                  value={formData.age}
                  onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                  className="w-full p-4 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  years
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">What's your current weight?</h1>
            <p className="text-gray-600 mb-8">This helps us track your progress</p>
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'kg' }))}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    formData.weightUnit === 'kg'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Kg
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'lbs' }))}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    formData.weightUnit === 'lbs'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Lbs
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  placeholder="Enter your weight"
                  value={formData.currentWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentWeight: e.target.value }))}
                  className="w-full p-4 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {formData.weightUnit}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">What's your target weight?</h1>
            <p className="text-gray-600 mb-8">Set a realistic goal for yourself</p>
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'kg' }))}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    formData.weightUnit === 'kg'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Kg
                </button>
                <button
                  onClick={() => setFormData(prev => ({ ...prev, weightUnit: 'lbs' }))}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    formData.weightUnit === 'lbs'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Lbs
                </button>
              </div>
              
              <div className="relative">
                <input
                  type="number"
                  placeholder="Enter your target weight"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData(prev => ({ ...prev, targetWeight: e.target.value }))}
                  className="w-full p-4 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                />
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  {formData.weightUnit}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Any medical conditions?</h1>
            <p className="text-gray-600 mb-8">This helps us provide better recommendations</p>
            
            <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
              {medicalConditions.map((condition) => {
                const Icon = condition.icon;
                const isSelected = formData.medicalConditions.includes(condition.id);
                
                return (
                  <motion.button
                    key={condition.id}
                    onClick={() => handleMedicalConditionToggle(condition.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`text-xl ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
                      <div className="font-semibold">{condition.name}</div>
                      {isSelected && <FaCheck className="text-green-600 ml-auto" />}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        );

      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Setup your Sleep Tracker</h1>
            <p className="text-gray-600 mb-8">7-9 hours is the recommended amount of sleep for all adults from age 18-64, according to the sleepfoundation.org.</p>
            
            <div className="max-w-md mx-auto space-y-6">
              <div className="bg-green-50 p-6 rounded-xl">
                <div className="text-3xl font-bold text-green-700 mb-2">8h 0m</div>
                <div className="text-green-600">Sleep Goal - Recommended</div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaBed className="text-gray-500" />
                    <span className="text-sm text-gray-600">Regular Sleep Time</span>
                  </div>
                  <div className="text-xl font-bold">{formData.sleepTime}</div>
                </div>
                
                <div className="p-4 border-2 border-gray-200 rounded-xl">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaSmile className="text-gray-500" />
                    <span className="text-sm text-gray-600">Regular Wake Time</span>
                  </div>
                  <div className="text-xl font-bold">{formData.wakeTime}</div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 8:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
              <FaCheck className="text-white text-3xl" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Welcome to NutriAI!</h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Your personalized nutrition assistant is ready to help you achieve your health goals. 
              Let's start your journey towards a healthier lifestyle!
            </p>
            
            <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-center space-x-3 p-4 bg-green-50 rounded-xl">
                <FaUser className="text-green-600" />
                <div className="text-left">
                  <div className="font-semibold text-green-700">Personalized Plans</div>
                  <div className="text-sm text-green-600">Customized to your goals</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-blue-50 rounded-xl">
                <FaCamera className="text-blue-600" />
                <div className="text-left">
                  <div className="font-semibold text-blue-700">Smart Food Recognition</div>
                  <div className="text-sm text-blue-600">Just snap and track</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-purple-50 rounded-xl">
                <FaUser className="text-purple-600" />
                <div className="text-left">
                  <div className="font-semibold text-purple-700">AI Assistant</div>
                  <div className="text-sm text-purple-600">24/7 guidance and support</div>
                </div>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
        
        <div className="flex justify-between items-center mt-8">
          {currentStep > 1 && (
            <motion.button
              onClick={prevStep}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <FaArrowLeft />
              <span>Back</span>
            </motion.button>
          )}
          
          <div className="flex space-x-2">
            {Array.from({ length: 8 }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i + 1 === currentStep ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          {currentStep < 8 ? (
            <motion.button
              onClick={nextStep}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <span>Next</span>
              <FaArrowRight />
            </motion.button>
          ) : (
            <motion.button
              onClick={handleComplete}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <span>Get Started</span>
              <FaArrowRight />
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding; 