import React from 'react';
import { motion } from 'framer-motion';
import { 
  FaDesktop, 
  FaMobile, 
  FaMagic,
  FaCog
} from 'react-icons/fa';
import { useViewMode } from '../context/ViewModeContext';

const ViewModeToggle = ({ isInSettings = false }) => {
  const { viewMode, changeViewMode, effectiveViewMode } = useViewMode();

  const modes = [
    { 
      id: 'auto', 
      label: 'Auto', 
      icon: FaMagic, 
      description: 'Automatically adapt to screen size' 
    },
    { 
      id: 'desktop', 
      label: 'Desktop', 
      icon: FaDesktop, 
      description: 'Desktop layout with sidebar navigation' 
    },
    { 
      id: 'mobile', 
      label: 'Mobile', 
      icon: FaMobile, 
      description: 'Mobile-optimized layout' 
    }
  ];

  if (!isInSettings) {
    // Quick toggle in navbar - more compact for mobile
    return (
      <div className="flex items-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = viewMode === mode.id;
            
            return (
              <motion.button
                key={mode.id}
                onClick={() => changeViewMode(mode.id)}
                className={`p-1.5 rounded-md transition-all duration-200 ${
                  isActive 
                    ? 'bg-green-500 text-white shadow-md' 
                    : 'text-gray-600 hover:bg-gray-200'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={`${mode.label}: ${mode.description}`}
              >
                <Icon className="text-xs" />
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  // Detailed view for settings page
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-800">View Mode</h3>
      <p className="text-gray-600 text-sm">
        Choose how you want to view the application. Auto mode adapts to your screen size.
      </p>
      
      <div className="grid grid-cols-1 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = viewMode === mode.id;
          
          return (
            <motion.div
              key={mode.id}
              onClick={() => changeViewMode(mode.id)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                isActive 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${
                  isActive ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  <Icon className="text-lg" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-800">{mode.label}</div>
                  <div className="text-sm text-gray-600">{mode.description}</div>
                </div>
                {isActive && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-3 h-3 bg-green-500 rounded-full"
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>Current mode:</strong> {effectiveViewMode === 'desktop' ? 'Desktop' : 'Mobile'}
        </div>
      </div>
    </div>
  );
};

export default ViewModeToggle; 