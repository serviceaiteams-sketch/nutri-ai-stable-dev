import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FaEnvelope, FaFacebook, FaPhone, FaGoogle, 
  FaApple, FaEye, FaEyeSlash, FaArrowLeft,
  FaUser, FaLock, FaCheck
} from 'react-icons/fa';
import { Link } from 'react-router-dom';

const EnhancedLogin = () => {
  const [signInMethod, setSignInMethod] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    name: ''
  });

  const signInOptions = [
    { id: 'email', name: 'Email', icon: FaEnvelope, color: 'bg-blue-500' },
    { id: 'phone', name: 'Phone Number', icon: FaPhone, color: 'bg-green-500' },
    { id: 'google', name: 'Google', icon: FaGoogle, color: 'bg-red-500' },
    { id: 'facebook', name: 'Facebook', icon: FaFacebook, color: 'bg-blue-600' },
    { id: 'apple', name: 'Apple', icon: FaApple, color: 'bg-gray-800' }
  ];

  const handleSignInMethod = (method) => {
    setSignInMethod(method);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Handle form submission based on sign-in method
    console.log('Submitting with method:', signInMethod, formData);
  };

  const renderSignInForm = () => {
    switch (signInMethod) {
      case 'email':
        return (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              Sign In with Email
            </button>
          </motion.form>
        );

      case 'phone':
        return (
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Send OTP
            </button>
          </motion.form>
        );

      case 'google':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <button
              className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 transition-colors font-semibold flex items-center justify-center space-x-3"
            >
              <FaGoogle />
              <span>Continue with Google</span>
            </button>
          </motion.div>
        );

      case 'facebook':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <button
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center space-x-3"
            >
              <FaFacebook />
              <span>Continue with Facebook</span>
            </button>
          </motion.div>
        );

      case 'apple':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <button
              className="w-full bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition-colors font-semibold flex items-center justify-center space-x-3"
            >
              <FaApple />
              <span>Continue with Apple</span>
            </button>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-600 font-medium">Corporate User?</span>
            <span className="text-gray-600 font-medium">Already a user?</span>
          </div>
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-white text-3xl font-bold">N</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-800">NutriAI</h1>
          </motion.div>
        </div>

        {/* Sign In Options */}
        {!signInMethod ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
              Sign In to Your Account
            </h2>
            <p className="text-center text-gray-600 mb-8">
              Choose how you'd like to sign in to your account
            </p>

            {signInOptions.map((option, index) => (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSignInMethod(option.id)}
                className="w-full bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-gray-300 transition-all duration-300 flex items-center space-x-4"
              >
                <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}>
                  <option.icon className="text-white" />
                </div>
                <span className="font-semibold text-gray-800">{option.name}</span>
              </motion.button>
            ))}

            <div className="text-center mt-6">
              <p className="text-sm text-gray-500">
                Don't have an account?{' '}
                <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center space-x-4 mb-6">
              <button
                onClick={() => setSignInMethod('')}
                className="text-gray-600 hover:text-gray-800"
              >
                <FaArrowLeft />
              </button>
              <h2 className="text-xl font-bold text-gray-800">
                Sign In with {signInOptions.find(opt => opt.id === signInMethod)?.name}
              </h2>
            </div>

            {renderSignInForm()}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EnhancedLogin; 