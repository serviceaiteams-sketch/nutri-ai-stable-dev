import React from 'react';
import { FaSpinner } from 'react-icons/fa';

const Loading = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
      <div className="text-center">
        <FaSpinner className="animate-spin mx-auto h-12 w-12 text-green-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Loading NutriAI...
        </h2>
        <p className="text-gray-600">
          Please wait while we prepare your personalized experience
        </p>
      </div>
    </div>
  );
};

export default Loading; 