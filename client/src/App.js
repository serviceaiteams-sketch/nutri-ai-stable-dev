import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import axios from 'axios';

// Components
import Navbar from './components/Navbar';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/Dashboard';
import FoodRecognition from './components/FoodRecognition';
import MealTracking from './components/MealTracking';
import WorkoutRecommendations from './components/WorkoutRecommendations';
import HealthWarnings from './components/HealthWarnings';
// import Profile from './components/Profile';
import Loading from './components/Loading';
// import Onboarding from './components/Onboarding'; // Removed onboarding requirement
import AIAssistant from './components/AIAssistant';
import Settings from './components/Settings';
import AdvancedFeaturesPage from './components/AdvancedFeaturesPage';
import HealthReportAnalysis from './components/HealthReportAnalysis';
import SleepTracking from './components/SleepTracking';
import FeedbackChat from './components/FeedbackChat';
import AdminFeedback from './components/AdminFeedback';
import AddictionAssistant from './components/AddictionAssistant';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AIMealPlanning from './components/AIMealPlanning';
import SmartNotifications from './components/SmartNotifications';
import Gamification from './components/Gamification';

// Context
import { AuthProvider, useAuth } from './context/AuthContext';
import { ViewModeProvider } from './context/ViewModeContext';

// API configuration
// Use explicit API URL only if provided; otherwise rely on CRA proxy (client/package.json -> proxy)
const apiUrl = process.env.REACT_APP_API_URL;
if (apiUrl) {
  axios.defaults.baseURL = apiUrl;
} else {
  // Ensure relative requests go to http://localhost:3000 and are proxied to backend (http://localhost:5000)
  delete axios.defaults.baseURL;
}

function App() {
  return (
    <AuthProvider>
      <ViewModeProvider>
        <Router>
          <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            <Toaster position="top-right" />
            <AppContent />
          </div>
        </Router>
      </ViewModeProvider>
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {user && <Navbar />}
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/food-recognition" element={user ? <FoodRecognition /> : <Navigate to="/login" />} />
          <Route path="/meal-tracking" element={user ? <MealTracking /> : <Navigate to="/login" />} />
          <Route path="/workouts" element={user ? <WorkoutRecommendations /> : <Navigate to="/login" />} />
          <Route path="/health-warnings" element={user ? <HealthWarnings /> : <Navigate to="/login" />} />
          <Route path="/health-analysis" element={user ? <HealthReportAnalysis /> : <Navigate to="/login" />} />
          <Route path="/sleep-tracking" element={user ? <SleepTracking /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Navigate to="/settings" /> : <Navigate to="/login" />} />
          <Route path="/ai-assistant" element={user ? <AIAssistant /> : <Navigate to="/login" />} />
          <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
          <Route path="/advanced-features" element={user ? <AdvancedFeaturesPage /> : <Navigate to="/login" />} />
          <Route path="/analytics" element={user ? <AdvancedAnalytics /> : <Navigate to="/login" />} />
          <Route path="/meal-planning" element={user ? <AIMealPlanning /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={user ? <SmartNotifications /> : <Navigate to="/login" />} />
          <Route path="/gamification" element={user ? <Gamification /> : <Navigate to="/login" />} />
          <Route path="/admin/feedback" element={user ? <AdminFeedback /> : <Navigate to="/login" />} />
          <Route path="/addiction" element={user ? <AddictionAssistant /> : <Navigate to="/login" />} />
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        </Routes>
      </div>
      {user && <FeedbackChat />}
    </>
  );
}

export default App; 