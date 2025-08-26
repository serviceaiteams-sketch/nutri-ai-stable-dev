import React, { useState } from 'react';
import { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaPlus, FaBell,
  FaFire, FaCamera, FaBullseye,
  FaCog,
  FaMagic, FaClipboardList, FaRunning, FaExclamationCircle, FaMicroscope, FaMoon,
  FaChartLine, FaTrophy, FaPills, FaShieldAlt
} from 'react-icons/fa';
import { useViewMode } from '../context/ViewModeContext';
import { useAuth } from '../context/AuthContext';
import ViewModeToggle from './ViewModeToggle';
import AdvancedFeaturesCard from './AdvancedFeaturesCard';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const { isDesktopMode, isMobileMode } = useViewMode();
  const { user } = useAuth();
  
  // Trackers section removed per request

  // Macros feature removed per request

  const [showAddTracker, setShowAddTracker] = useState(false);
  const [unreadMessage, setUnreadMessage] = useState(false);
  const [trialExpired, setTrialExpired] = useState(true);





  const quickFeatures = [
    { to: '/health-analysis', label: 'Health Analysis', Icon: FaMicroscope, gradient: 'from-violet-500 to-purple-500' },
    { to: '/food-recognition', label: 'Food Recognition', Icon: FaMagic, gradient: 'from-fuchsia-500 to-pink-500' },
    { to: '/meal-tracking', label: 'Meal Tracking', Icon: FaClipboardList, gradient: 'from-emerald-500 to-green-400' },
    { to: '/workouts', label: 'Workouts', Icon: FaRunning, gradient: 'from-sky-500 to-indigo-500' },
    { to: '/health-warnings', label: 'Health Warnings', Icon: FaExclamationCircle, gradient: 'from-amber-500 to-orange-500' },
    { to: '/sleep-tracking', label: 'Sleep Tracking', Icon: FaMoon, gradient: 'from-cyan-500 to-teal-500' },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };



  // Desktop Layout Component
  const DesktopLayout = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Global Navbar renders above; header removed to avoid duplication */}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Main Content - now full width on desktop */}
          <div className="xl:col-span-4 space-y-8">
            {/* Alerts */}
            {unreadMessage && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-500 text-white p-4 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FaBell className="text-xl" />
                    <div>
                      <div className="font-semibold">You Have An Unread Message</div>
                      <div className="text-sm opacity-90">From a NutriAI Coach</div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Quick Features Row */}
            <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
              <div className="bg-white p-4 md:p-6 rounded-[14px] shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {quickFeatures.map(({ to, label, Icon, gradient }) => (
                    <Link key={to} to={to} className="block focus:outline-none">
                      <motion.div
                        whileHover={{ scale: 1.05, y: -2 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                        className="group relative rounded-xl p-4 bg-white shadow-sm hover:shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 2 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                            className={`h-10 w-10 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow`}
                          >
                            <Icon className="text-lg" />
                          </motion.div>
                          <div className="flex flex-col">
                            <span className="text-gray-800 font-semibold leading-tight">{label}</span>
                            <span className="text-xs text-gray-500 group-hover:text-gray-600">Open</span>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Advanced Features */}
            <div className="rounded-2xl p-[2px] bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500">
              <div className="rounded-[14px] bg-white">
                <AdvancedFeaturesCard />
              </div>
            </div>

            {/* Navigation Cards moved from navbar */}
            <div className="rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
              <div className="bg-white p-6 rounded-[14px] shadow-sm">
                <h3 className="font-bold text-lg text-gray-800 mb-6">Quick Access</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Analytics */}
                  <Link to="/analytics" className="group">
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 p-4 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FaChartLine className="text-white text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 transition-colors duration-300">Analytics</h4>
                          <p className="text-sm text-gray-600">Track your progress</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Gamification */}
                  <Link to="/gamification" className="group">
                    <div className="bg-gradient-to-br from-yellow-50 to-amber-100 p-4 rounded-xl border border-yellow-200 hover:border-yellow-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FaTrophy className="text-white text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-amber-600 transition-colors duration-300">Gamification</h4>
                          <p className="text-sm text-gray-600">Earn rewards</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Medicine Reminders */}
                  <Link to="/medicine-reminders" className="group">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-4 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FaPills className="text-white text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-green-600 transition-colors duration-300">Medicine</h4>
                          <p className="text-sm text-gray-600">Set reminders</p>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Addiction Control */}
                  <Link to="/addiction" className="group">
                    <div className="bg-gradient-to-br from-red-50 to-pink-100 p-4 rounded-xl border border-red-200 hover:border-red-300 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <FaShieldAlt className="text-white text-lg" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 group-hover:text-red-600 transition-colors duration-300">Addiction Control</h4>
                          <p className="text-sm text-gray-600">Recovery support</p>
                        </div>
                      </div>
                    </div>
                  </Link>


                </div>
              </div>
            </div>
          </div>

          {/* Right sidebar removed */}
        </div>
      </div>
    </div>
  );

  // Mobile Layout Component (simplified version of existing mobile design)
  const MobileLayout = () => (
    <div className="min-h-screen bg-gray-50">
      {/* Global Navbar renders above; header removed to avoid duplication */}

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Unread Message */}
        {unreadMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-500 text-white p-4 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <FaBell className="text-sm" />
                </div>
                <div>
                  <div className="font-semibold">You Have An Unread Message</div>
                  <div className="text-sm opacity-90">From a NutriAI Coach</div>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* Trackers list removed */}



        {/* Advanced Features */}
        <AdvancedFeaturesCard />

        {/* Navigation Cards (mobile) */}
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <div className="bg-white p-5 rounded-[14px] shadow-sm">
            <h3 className="font-bold text-base text-gray-800 mb-4">Quick Access</h3>
            <div className="space-y-3">
              {/* Analytics */}
              <Link to="/analytics" className="block">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-3 rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <FaChartLine className="text-white text-sm" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Analytics</h4>
                      <p className="text-xs text-gray-600">Track your progress</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Gamification */}
              <Link to="/gamification" className="block">
                <div className="bg-gradient-to-r from-yellow-50 to-amber-100 p-3 rounded-xl border border-yellow-200 hover:border-yellow-300 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center">
                      <FaTrophy className="text-white text-sm" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Gamification</h4>
                      <p className="text-xs text-gray-600">Earn rewards</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Medicine Reminders */}
              <Link to="/medicine-reminders" className="block">
                <div className="bg-gradient-to-r from-green-50 to-emerald-100 p-3 rounded-xl border border-green-200 hover:border-green-300 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                      <FaPills className="text-white text-sm" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Medicine</h4>
                      <p className="text-xs text-gray-600">Set reminders</p>
                    </div>
                  </div>
                </div>
              </Link>

              {/* Addiction Control */}
              <Link to="/addiction" className="block">
                <div className="bg-gradient-to-r from-red-50 to-pink-100 p-3 rounded-xl border border-red-200 hover:border-red-300 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                      <FaShieldAlt className="text-white text-sm" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-800">Addiction Control</h4>
                      <p className="text-xs text-gray-600">Recovery support</p>
                    </div>
                  </div>
                </div>
              </Link>


            </div>
          </div>
        </div>

        {/* View Settings */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FaCog className="text-gray-500 text-xl" />
              <div>
                <h3 className="font-semibold text-gray-800">View Settings</h3>
                <p className="text-sm text-gray-600">Customize your layout</p>
              </div>
            </div>
            <button className="text-green-600 text-sm font-medium">
              More Settings
            </button>
          </div>
          
          <ViewModeToggle isInSettings={true} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-md mx-auto px-4 py-2">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center space-y-1">
              <FaCamera className="text-gray-400 text-xl" />
              <span className="text-xs text-gray-400">Snap</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                <FaPlus className="text-white text-xl" />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <FaBullseye className="text-gray-400 text-xl" />
              <span className="text-xs text-gray-400">Plans</span>
            </div>
            <div className="flex flex-col items-center space-y-1">
              <FaFire className="text-gray-400 text-xl" />
              <span className="text-xs text-gray-400">Streaks</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {isDesktopMode ? <DesktopLayout /> : <MobileLayout />}
    </div>
  );
};

export default Dashboard; 