import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import { 
  FaHome, 
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaCog,
  FaBell,
  FaShieldAlt,
  FaChartLine,
  FaCalendarAlt,
  FaTrophy,
  FaAppleAlt,
  FaHeart
} from 'react-icons/fa';
import AIAssistantButton from './AIAssistantButton';
import ViewModeToggle from './ViewModeToggle';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: FaHome },
    { name: 'Food Recognition', href: '/food-recognition', icon: FaAppleAlt },
    { name: 'Meal Planning', href: '/meal-planning', icon: FaCalendarAlt },
    { name: 'Analytics', href: '/analytics', icon: FaChartLine },
    { name: 'Gamification', href: '/gamification', icon: FaTrophy },
    { name: 'Health Analysis', href: '/health-analysis', icon: FaHeart },
    { name: 'Settings', href: '/settings', icon: FaCog },
    { name: 'Addiction Control', href: '/addiction', icon: FaShieldAlt },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-bold text-gray-900">NutriAI</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive(item.href)
                        ? 'border-green-500 text-green-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Menu and Mobile Menu Button */}
          <div className="flex items-center">
            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-4">
              {/* View Mode Toggle */}
              <ViewModeToggle />
              <AIAssistantButton isInline={true} />
              <FaBell className="text-gray-500 text-xl cursor-pointer hover:text-gray-700" />
              
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {`Welcome, ${user?.name || 'User'}`}
                </span>
              </div>
              
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
              >
                <FaSignOutAlt className="mr-2 h-4 w-4" />
                Logout
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-green-500"
              >
                {isMobileMenuOpen ? (
                  <FaTimes className="h-6 w-6" />
                ) : (
                  <FaBars className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
            <div className="px-3 py-2">
              <AIAssistantButton isInline={true} />
            </div>
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-green-50 text-green-600 border-l-4 border-green-500'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
            
            {/* Mobile User Info and Logout */}
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-3 py-2">
                <div className="h-8 w-8 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="ml-3">
                  <p className="text-base font-medium text-gray-800">{`Welcome, ${user?.name || 'User'}`}</p>
                  <p className="text-sm font-medium text-gray-500">{user?.email}</p>
                </div>
              </div>
              
              <button
                onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                className="flex items-center w-full px-3 py-2 text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200"
              >
                <FaSignOutAlt className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar; 