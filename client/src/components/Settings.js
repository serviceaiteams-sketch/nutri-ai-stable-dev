import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaUser, FaBell, FaLock, FaCreditCard, FaCog, FaLink, FaShieldAlt, 
  FaDesktop, FaQuestionCircle, FaEdit, FaTrash, FaDownload, FaEye, 
  FaEyeSlash, FaPlus, FaTimes, FaCheck, FaExclamationTriangle,
  FaApple, FaGoogle, FaHeart, FaCalendarAlt, FaLanguage, FaPalette,
  FaRuler, FaChartLine, FaRobot, FaBrain, FaHistory, FaTicketAlt,
  FaArrowRight
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  // User Profile State
  const [profile, setProfile] = useState({
    name: user?.name || 'Test User',
    age: 34,
    gender: 'Female',
    email: user?.email || 'test@example.com',
    phone: '+1 (555) 123-4567',
    height: 165,
    weight: 68,
    bmi: 24.8,
    avatar: null,
    chronicConditions: ['Hypertension'],
    dietaryRestrictions: ['Vegetarian'],
    addictionType: 'Alcohol',
    recoveryMilestones: 75,
    relapseHistory: 1
  });

  // Privacy & Data State
  const [privacy, setPrivacy] = useState({
    dataSharing: {
      clinicians: true,
      researchers: false,
      family: true
    },
    healthDataVisibility: {
      labs: true,
      reports: true,
      medications: false
    },
    compliance: {
      gdpr: true,
      hipaa: true
    }
  });

  // Subscription State
  const [subscription, setSubscription] = useState({
    plan: 'Gold',
    status: 'Active',
    nextBilling: '2024-02-15',
    amount: 14.99,
    paymentMethod: 'Visa ending in 1234',
    autoRenew: true
  });

  // Personalization State
  const [personalization, setPersonalization] = useState({
    aiFeedback: 'balanced',
    adaptiveLearning: true,
    aiModelVersion: 'gpt-4o-mini',
    predictionConfidence: 'medium'
  });

  // Integrations State
  const [integrations, setIntegrations] = useState({
    wearables: {
      fitbit: { connected: false, lastSync: null },
      appleHealth: { connected: false, lastSync: null },
      googleFit: { connected: false, lastSync: null }
    },
    medicalPortals: {
      labCorp: { connected: false, lastSync: null },
      quest: { connected: false, lastSync: null }
    },
    calendar: { connected: false, lastSync: null }
  });

  // Security State
  const [security, setSecurity] = useState({
    twoFactorEnabled: true,
    loginMethods: ['email', 'google'],
    biometricEnabled: false,
    sessionTimeout: 30
  });

  // System Preferences State
  const [system, setSystem] = useState({
    theme: 'light',
    language: 'en',
    units: 'metric',
    defaultView: 'dashboard'
  });

  const tabs = [
    { id: 'profile', name: 'Profile & Account', icon: FaUser },
    { id: 'privacy', name: 'Privacy & Data', icon: FaLock },
    { id: 'subscription', name: 'Subscription', icon: FaCreditCard },
    { id: 'personalization', name: 'Personalization', icon: FaCog },
    { id: 'integrations', name: 'Integrations', icon: FaLink },
    { id: 'security', name: 'Security', icon: FaShieldAlt },
    { id: 'system', name: 'System', icon: FaDesktop },
    { id: 'help', name: 'Help & Support', icon: FaQuestionCircle }
  ];

  const handleProfileUpdate = async (updatedProfile) => {
        setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setProfile(updatedProfile);
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error('Failed to update profile');
      } finally {
        setLoading(false);
      }
    };

  const handlePrivacyUpdate = async (updatedPrivacy) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      setPrivacy(updatedPrivacy);
      toast.success('Privacy settings updated!');
    } catch (error) {
      toast.error('Failed to update privacy settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscriptionChange = async (newPlan) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSubscription(prev => ({ ...prev, plan: newPlan }));
      toast.success(`Successfully upgraded to ${newPlan} plan!`);
    } catch (error) {
      toast.error('Failed to change subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleIntegrationToggle = async (type, provider) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      setIntegrations(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [provider]: {
            ...prev[type][provider],
            connected: !prev[type][provider].connected,
            lastSync: prev[type][provider].connected ? null : new Date().toISOString()
          }
        }
      }));
      toast.success(`${provider} ${integrations[type][provider].connected ? 'disconnected' : 'connected'} successfully!`);
    } catch (error) {
      toast.error('Failed to toggle integration');
    } finally {
      setLoading(false);
    }
  };

  const handleSecurityToggle = async (setting, value) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setSecurity(prev => ({ ...prev, [setting]: value }));
      toast.success(`${setting} ${value ? 'enabled' : 'disabled'} successfully!`);
    } catch (error) {
      toast.error('Failed to update security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSystemUpdate = async (setting, value) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      setSystem(prev => ({ ...prev, [setting]: value }));
      toast.success(`${setting} updated to ${value}!`);
    } catch (error) {
      toast.error('Failed to update system settings');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const data = { profile, privacy, personalization, integrations };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nutriai-data-export.json';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Data exported successfully!');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      setLoading(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        logout();
        toast.success('Account deleted successfully');
      } catch (error) {
        toast.error('Failed to delete account');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your account, privacy, and preferences</p>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:w-64 flex-shrink-0"
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span className="font-medium">{tab.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Main Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex-1"
          >
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <ProfileTab
                  key="profile"
                  profile={profile}
                  onUpdate={handleProfileUpdate}
                  loading={loading}
                />
              )}
              {activeTab === 'privacy' && (
                <PrivacyTab
                  key="privacy"
                  privacy={privacy}
                  onUpdate={handlePrivacyUpdate}
                  onExport={exportData}
                  onDelete={deleteAccount}
                  loading={loading}
                />
              )}
              {activeTab === 'subscription' && (
                <SubscriptionTab
                  key="subscription"
                  subscription={subscription}
                  onChange={handleSubscriptionChange}
                  loading={loading}
                />
              )}
              {activeTab === 'personalization' && (
                <PersonalizationTab
                  key="personalization"
                  personalization={personalization}
                  onUpdate={handleSystemUpdate}
                  loading={loading}
                />
              )}
              {activeTab === 'integrations' && (
                <IntegrationsTab
                  key="integrations"
                  integrations={integrations}
                  onToggle={handleIntegrationToggle}
                  loading={loading}
                />
              )}
              {activeTab === 'security' && (
                <SecurityTab
                  key="security"
                  security={security}
                  onToggle={handleSecurityToggle}
                  loading={loading}
                />
              )}
              {activeTab === 'system' && (
                <SystemTab
                  key="system"
                  system={system}
                  onUpdate={handleSystemUpdate}
                  loading={loading}
                />
              )}
              {activeTab === 'help' && (
                <HelpTab
                  key="help"
                  loading={loading}
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Profile Tab Component
const ProfileTab = ({ profile, onUpdate, loading }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const [avatarPreview, setAvatarPreview] = useState(null);

  useEffect(() => {
    setFormData(profile);
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onUpdate(formData);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarPreview(URL.createObjectURL(file));
      setFormData(prev => ({ ...prev, avatar: file }));
    }
  };

  const calculateBMI = (height, weight) => {
    if (height > 0 && weight > 0) {
      return (weight / Math.pow(height / 100, 2)).toFixed(1);
    }
    return null;
  };

  const handleHeightWeightChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    if (field === 'height' || field === 'weight') {
      newData.bmi = calculateBMI(newData.height, newData.weight);
    }
    setFormData(newData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
          <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Profile & Account</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 flex items-center space-x-2"
          >
            <FaEdit className="h-4 w-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Profile preview" className="w-full h-full object-cover" />
              ) : profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
              <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              </div>
            </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
                max="120"
                required
              />
          </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
      </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
                    </div>
          </div>

          {/* Health Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleHeightWeightChange('height', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="100"
                  max="250"
                />
                    </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleHeightWeightChange('weight', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="30"
                  max="300"
                />
                  </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">BMI</label>
                <input
                  type="text"
                  value={formData.bmi || 'Calculated automatically'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  disabled
                />
              </div>
            </div>
                  </div>

          {/* Recovery Information */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recovery Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Addiction Type</label>
                <select
                  value={formData.addictionType}
                  onChange={(e) => setFormData({ ...formData, addictionType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select addiction type</option>
                  <option value="Alcohol">Alcohol</option>
                  <option value="Nicotine">Nicotine</option>
                  <option value="Gambling">Gambling</option>
                  <option value="Food">Food</option>
                  <option value="None">None</option>
                </select>
                  </div>

                  <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recovery Milestones (%)</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.recoveryMilestones}
                  onChange={(e) => setFormData({ ...formData, recoveryMilestones: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>{formData.recoveryMilestones}%</span>
                  <span>100%</span>
                </div>
              </div>
                    </div>
                  </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FaCheck className="h-4 w-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-6">
          {/* Profile Summary */}
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-200">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile.name?.charAt(0) || 'U'}
                </div>
              )}
            </div>
                  <div>
              <h3 className="text-xl font-semibold text-gray-900">{profile.name}</h3>
              <p className="text-gray-600">{profile.email}</p>
              <p className="text-sm text-gray-500">{profile.age} years old • {profile.gender}</p>
                    </div>
                  </div>

          {/* Health Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Height</h4>
              <p className="text-2xl font-bold text-blue-900">{profile.height} cm</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 mb-2">Weight</h4>
              <p className="text-2xl font-bold text-green-900">{profile.weight} kg</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-purple-800 mb-2">BMI</h4>
              <p className="text-2xl font-bold text-purple-900">{profile.bmi}</p>
            </div>
          </div>

          {/* Recovery Progress */}
          {profile.addictionType && profile.addictionType !== 'None' && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-orange-800 mb-2">Recovery Progress</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Type: {profile.addictionType}</span>
                  <span>{profile.recoveryMilestones}% Complete</span>
                </div>
                <div className="w-full bg-orange-200 rounded-full h-2">
                  <div
                    className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${profile.recoveryMilestones}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// Privacy Tab Component
const PrivacyTab = ({ privacy, onUpdate, onExport, onDelete, loading }) => {
  const [localPrivacy, setLocalPrivacy] = useState(privacy);

  useEffect(() => {
    setLocalPrivacy(privacy);
  }, [privacy]);

  const handleSave = async () => {
    await onUpdate(localPrivacy);
  };

  const handleToggle = (category, setting) => {
    setLocalPrivacy(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [setting]: !prev[category][setting]
      }
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Privacy & Data Management</h2>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 flex items-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <FaCheck className="h-4 w-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-8">
        {/* Data Sharing Settings */}
                  <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Sharing Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Share with Clinicians</h4>
                <p className="text-sm text-gray-600">Allow healthcare providers to access your health data</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.dataSharing.clinicians}
                  onChange={() => handleToggle('dataSharing', 'clinicians')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
                  </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                <h4 className="font-medium text-gray-900">Share with Researchers</h4>
                <p className="text-sm text-gray-600">Contribute to medical research (anonymized)</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.dataSharing.researchers}
                  onChange={() => handleToggle('dataSharing', 'researchers')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
                  </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                <h4 className="font-medium text-gray-900">Share with Family</h4>
                <p className="text-sm text-gray-600">Allow family members to view your progress</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.dataSharing.family}
                  onChange={() => handleToggle('dataSharing', 'family')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
                  </div>

        {/* Health Data Visibility */}
                  <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Health Data Visibility</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Lab Results</h4>
                <p className="text-sm text-gray-600">Show laboratory test results in dashboards</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.healthDataVisibility.labs}
                  onChange={() => handleToggle('healthDataVisibility', 'labs')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
                  </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                <h4 className="font-medium text-gray-900">Health Reports</h4>
                <p className="text-sm text-gray-600">Display health analysis reports</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.healthDataVisibility.reports}
                  onChange={() => handleToggle('healthDataVisibility', 'reports')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
                  </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                <h4 className="font-medium text-gray-900">Medications</h4>
                <p className="text-sm text-gray-600">Show medication information</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.healthDataVisibility.medications}
                  onChange={() => handleToggle('healthDataVisibility', 'medications')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
                  </div>

        {/* Compliance Options */}
                  <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Options</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">GDPR Compliance</h4>
                <p className="text-sm text-gray-600">European data protection regulations</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.compliance.gdpr}
                  onChange={() => handleToggle('compliance', 'gdpr')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
                  </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">HIPAA Compliance</h4>
                <p className="text-sm text-gray-600">US healthcare privacy standards</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localPrivacy.compliance.hipaa}
                  onChange={() => handleToggle('compliance', 'hipaa')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
                  </div>

        {/* Data Actions */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Actions</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onExport}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <FaDownload className="h-4 w-4" />
              <span>Export My Data</span>
            </button>
            <button
              onClick={onDelete}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <FaTrash className="h-4 w-4" />
              <span>Delete Account</span>
            </button>
                  </div>
        </div>
      </div>
    </motion.div>
  );
};

// Subscription Tab Component
const SubscriptionTab = ({ subscription, onChange, loading }) => {
  const plans = [
    { name: 'Silver', price: 9.99, features: ['Basic AI recommendations', 'Standard meal plans', 'Email support'] },
    { name: 'Gold', price: 14.99, features: ['Advanced AI analysis', 'Custom meal plans', 'Priority support', 'Health tracking'] },
    { name: 'Platinum', price: 19.99, features: ['Premium AI features', 'Personal nutritionist', '24/7 support', 'All integrations'] }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Subscription & Billing</h2>
      
      <div className="space-y-6">
        {/* Current Plan */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-100 p-6 rounded-xl border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Current Plan</h3>
          <div className="flex items-center justify-between">
                  <div>
              <p className="text-2xl font-bold text-blue-900">{subscription.plan}</p>
              <p className="text-blue-700">${subscription.amount}/month</p>
              <p className="text-sm text-blue-600">Next billing: {subscription.nextBilling}</p>
                  </div>
            <div className="text-right">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {subscription.status}
              </span>
                </div>
                </div>
        </div>

        {/* Plan Comparison */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`p-6 rounded-xl border-2 ${
                  plan.name === subscription.plan
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <h4 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h4>
                <p className="text-3xl font-bold text-gray-900 mb-4">${plan.price}<span className="text-lg text-gray-500">/month</span></p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <FaCheck className="h-4 w-4 text-green-500 mr-2" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {plan.name === subscription.plan ? (
                  <button className="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed">
                    Current Plan
                  </button>
                ) : (
                  <button
                    onClick={() => onChange(plan.name)}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50"
                  >
                    {loading ? 'Upgrading...' : `Upgrade to ${plan.name}`}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Billing Information */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Billing Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Payment Method</h4>
              <p className="text-gray-600">{subscription.paymentMethod}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Auto-Renewal</h4>
              <p className="text-gray-600">{subscription.autoRenew ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Personalization Tab Component
const PersonalizationTab = ({ personalization, onUpdate, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Personalization & AI Settings</h2>
      
      <div className="space-y-6">
        {/* AI Feedback */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Feedback Preferences</h3>
                <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Recommendation Style</label>
              <select
                value={personalization.aiFeedback}
                onChange={(e) => onUpdate('aiFeedback', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="strict">Strict (Conservative recommendations)</option>
                <option value="balanced">Balanced (Moderate approach)</option>
                <option value="flexible">Flexible (More adventurous suggestions)</option>
              </select>
                </div>
          </div>
        </div>

        {/* Adaptive Learning */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Adaptive Learning</h3>
                <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Enable Adaptive Learning</h4>
                <p className="text-sm text-gray-600">AI learns from your preferences and adjusts recommendations</p>
                </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={personalization.adaptiveLearning}
                  onChange={(e) => onUpdate('adaptiveLearning', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
              </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced AI Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">AI Model Version</label>
              <select
                value={personalization.aiModelVersion}
                onChange={(e) => onUpdate('aiModelVersion', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Efficient)</option>
                <option value="gpt-4o">GPT-4o (High Quality)</option>
                <option value="gpt-4-turbo">GPT-4 Turbo (Balanced)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prediction Confidence</label>
              <select
                value={personalization.predictionConfidence}
                onChange={(e) => onUpdate('predictionConfidence', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low (More conservative)</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="high">High (More aggressive)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
          </motion.div>
  );
};

// Integrations Tab Component
const IntegrationsTab = ({ integrations, onToggle, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h2>
      
      <div className="space-y-8">
        {/* Wearables & Health Apps */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Wearables & Health Apps</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(integrations.wearables).map(([provider, data]) => (
              <div key={provider} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                    {provider === 'fitbit' && <FaHeart className="h-6 w-6 text-pink-500" />}
                    {provider === 'appleHealth' && <FaApple className="h-6 w-6 text-green-500" />}
                    {provider === 'googleFit' && <FaGoogle className="h-6 w-6 text-blue-500" />}
                    <span className="font-medium text-gray-900 capitalize">{provider.replace(/([A-Z])/g, ' $1')}</span>
        </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Status: {data.connected ? 'Connected' : 'Not connected'}
                  </p>
                  {data.lastSync && (
                    <p className="text-xs text-gray-500">
                      Last sync: {new Date(data.lastSync).toLocaleDateString()}
                    </p>
                  )}
                  <button
                    onClick={() => onToggle('wearables', provider)}
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      data.connected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : data.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Portals */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Medical Portals & Lab Integration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(integrations.medicalPortals).map(([provider, data]) => (
              <div key={provider} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-6 w-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">
                      {provider.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 capitalize">{provider.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Status: {data.connected ? 'Connected' : 'Not connected'}
                  </p>
                  <button
                    onClick={() => onToggle('medicalPortals', provider)}
                    disabled={loading}
                    className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                      data.connected
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } disabled:opacity-50`}
                  >
                    {loading ? 'Processing...' : data.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Sync */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calendar Integration</h3>
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <FaCalendarAlt className="h-6 w-6 text-blue-500" />
                <span className="font-medium text-gray-900">Google Calendar</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Status: {integrations.calendar.connected ? 'Connected' : 'Not connected'}
              </p>
              <button
                onClick={() => onToggle('calendar', 'google')}
                disabled={loading}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  integrations.calendar.connected
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                } disabled:opacity-50`}
              >
                {loading ? 'Processing...' : integrations.calendar.connected ? 'Disconnect' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Security Tab Component
const SecurityTab = ({ security, onToggle, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Security & Access</h2>
      
            <div className="space-y-6">
        {/* Two-Factor Authentication */}
                  <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Two-Factor Authentication</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">2FA Status</h4>
              <p className="text-sm text-gray-600">Add an extra layer of security to your account</p>
                  </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.twoFactorEnabled}
                onChange={(e) => onToggle('twoFactorEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
              </div>

        {/* Login Methods */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Login Methods</h3>
          <div className="space-y-3">
            {security.loginMethods.map((method) => (
              <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {method === 'email' && <FaUser className="h-5 w-5 text-blue-500" />}
                  {method === 'google' && <FaGoogle className="h-5 w-5 text-red-500" />}
                  <span className="font-medium text-gray-900 capitalize">{method}</span>
                </div>
                <span className="text-sm text-green-600 font-medium">Active</span>
              </div>
            ))}
                </div>
              </div>

        {/* Biometric Authentication */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Biometric Authentication</h3>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Fingerprint/Face ID</h4>
              <p className="text-sm text-gray-600">Use biometric authentication on supported devices</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={security.biometricEnabled}
                onChange={(e) => onToggle('biometricEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
                </div>
                        </div>

        {/* Session Management */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Management</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
              <select
                value={security.sessionTimeout}
                onChange={(e) => onToggle('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
              </select>
                </div>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200">
              Logout from All Devices
            </button>
                        </div>
        </div>
      </div>
    </motion.div>
  );
};

// System Tab Component
const SystemTab = ({ system, onUpdate, loading }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">System & App Preferences</h2>
      
      <div className="space-y-6">
        {/* Theme Settings */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Appearance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
              <select
                value={system.theme}
                onChange={(e) => onUpdate('theme', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="high-contrast">High Contrast</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
              <select
                value={system.language}
                onChange={(e) => onUpdate('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                    <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="hi">हिंदी</option>
                <option value="zh">中文</option>
                  </select>
            </div>
                </div>
              </div>

        {/* Units & Measurements */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Units & Measurements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Weight & Distance</label>
              <select
                value={system.units}
                onChange={(e) => onUpdate('units', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="metric">Metric (kg, cm)</option>
                <option value="imperial">Imperial (lbs, in)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Default Dashboard View</label>
              <select
                value={system.defaultView}
                onChange={(e) => onUpdate('defaultView', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dashboard">Main Dashboard</option>
                <option value="health">Health Overview</option>
                <option value="nutrition">Nutrition Tracker</option>
                <option value="recovery">Recovery Progress</option>
              </select>
            </div>
                        </div>
                      </div>

        {/* Notification Preferences */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notification Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">Push Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-900">Email Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
                </div>
              </div>
                </div>
              </motion.div>
  );
};

// Help Tab Component
const HelpTab = ({ loading }) => {
  const [activeSection, setActiveSection] = useState('faq');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const faqs = [
    {
      question: "How do I update my health information?",
      answer: "Go to the Profile & Account tab in Settings and click 'Edit Profile' to modify your health data."
    },
    {
      question: "Can I export my health data?",
      answer: "Yes! In the Privacy & Data tab, you can export all your data in JSON format for backup or transfer."
    },
    {
      question: "How do I connect my fitness tracker?",
      answer: "Visit the Integrations tab and click 'Connect' next to your device or app to sync your data."
    },
    {
      question: "What subscription plans are available?",
      answer: "We offer Silver ($9.99), Gold ($29.99), and Platinum ($49.99) plans with different feature sets."
    }
  ];

  // Chat functionality
  const startChat = () => {
    setIsChatOpen(true);
    // Add welcome message
    const welcomeMessage = {
      id: Date.now(),
      type: 'bot',
      message: "Hello! I'm NutriAI Assistant. How can I help you today? I can assist with nutrition advice, app features, health tracking, and more. What would you like to know?",
      timestamp: new Date().toISOString()
    };
    setChatMessages([welcomeMessage]);
  };

  const closeChat = () => {
    setIsChatOpen(false);
    setChatMessages([]);
    setChatInput('');
  };

  const sendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      message: chatInput.trim(),
      timestamp: new Date().toISOString()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(chatInput.trim());
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        message: aiResponse,
        timestamp: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000); // Random delay between 1-3 seconds
  };

  const generateAIResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    // Nutrition-related responses
    if (message.includes('nutrition') || message.includes('diet') || message.includes('food')) {
      const responses = [
        "Great question about nutrition! A balanced diet should include proteins, healthy fats, complex carbohydrates, and plenty of fruits and vegetables. What specific nutrition topic would you like to explore?",
        "Nutrition is key to health! I recommend focusing on whole foods, staying hydrated, and eating a variety of colorful fruits and vegetables. Do you have specific dietary goals?",
        "For optimal nutrition, aim for 3 balanced meals per day with healthy snacks. Include lean proteins, whole grains, and healthy fats. What's your current nutrition goal?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // App feature responses
    if (message.includes('app') || message.includes('feature') || message.includes('how to')) {
      const responses = [
        "I'd be happy to help you with app features! NutriAI offers food recognition, meal tracking, health analysis, and personalized recommendations. What specific feature would you like to learn about?",
        "Our app has many powerful features! You can track meals, analyze nutrition, get AI-powered recommendations, and monitor your health progress. Which feature interests you most?",
        "Let me guide you through our app features! We have food recognition, meal planning, health tracking, and AI-powered insights. What would you like to explore first?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Health tracking responses
    if (message.includes('health') || message.includes('track') || message.includes('monitor')) {
      const responses = [
        "Health tracking is essential! You can monitor your nutrition, water intake, exercise, and health metrics in our app. What health aspect would you like to focus on?",
        "Great question about health tracking! We offer comprehensive monitoring for nutrition, fitness, and wellness. You can set goals and track progress over time. What's your health priority?",
        "Health tracking helps you stay accountable! Monitor your daily nutrition, exercise routine, and wellness metrics. What health goal are you working towards?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // General help responses
    if (message.includes('help') || message.includes('support') || message.includes('problem')) {
      const responses = [
        "I'm here to help! I can assist with nutrition advice, app features, health tracking, and troubleshooting. What specific issue are you facing?",
        "No problem, I'm here to support you! Whether it's nutrition questions, app features, or health guidance, I'm ready to help. What do you need assistance with?",
        "I'm your NutriAI assistant and I'm here to help! I can provide nutrition advice, explain app features, and guide you through health tracking. What would you like to know?"
      ];
      return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // Default response
    const defaultResponses = [
      "That's an interesting question! I'm here to help with nutrition, health tracking, app features, and wellness advice. Could you tell me more about what you're looking for?",
      "Great question! I'm your NutriAI assistant and I can help with nutrition guidance, health tracking, app features, and wellness tips. What specific area would you like to explore?",
      "I'd love to help you with that! I'm knowledgeable about nutrition, health tracking, app features, and wellness. What would you like to learn more about?"
    ];
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Help & Support</h2>
      
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {['faq', 'contact', 'tutorials', 'feedback'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`flex-1 py-2 px-4 rounded-md transition-colors ${
                activeSection === section
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </div>

        {/* FAQ Section */}
        {activeSection === 'faq' && (
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">{faq.question}</h4>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
        </div>
      )}

        {/* Contact Support */}
        {activeSection === 'contact' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Email Support</h4>
              <p className="text-blue-700">support@nutriai.com</p>
              <p className="text-sm text-blue-600 mt-1">Response within 24 hours</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">Live Chat</h4>
              <p className="text-green-700">Available 9 AM - 6 PM EST</p>
              <button 
                onClick={startChat}
                className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
              >
                Start Chat
              </button>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Phone Support</h4>
              <p className="text-purple-700">1-800-NUTRI-AI</p>
              <p className="text-sm text-purple-600 mt-1">Monday - Friday, 9 AM - 5 PM EST</p>
            </div>
          </div>
        )}

        {/* Tutorials */}
        {activeSection === 'tutorials' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Getting Started</h4>
                <p className="text-sm text-gray-600 mb-3">Learn the basics of using NutriAI</p>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Watch Tutorial
                </button>
    </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Advanced Features</h4>
                <p className="text-sm text-gray-600 mb-3">Master advanced AI features</p>
                <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                  Watch Tutorial
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {activeSection === 'feedback' && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-medium text-yellow-900 mb-2">Report a Bug</h4>
              <p className="text-yellow-700 mb-3">Help us improve by reporting any issues you encounter</p>
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700">
                Report Bug
              </button>
            </div>
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h4 className="font-medium text-indigo-900 mb-2">Feature Request</h4>
              <p className="text-indigo-700 mb-3">Suggest new features you'd like to see</p>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Request Feature
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Live Chat Interface */}
      <AnimatePresence>
        {isChatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && closeChat()}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[600px] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Chat Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <FaRobot className="text-white text-lg" />
                    </div>
                    <div>
                      <h3 className="font-semibold">NutriAI Assistant</h3>
                      <p className="text-sm text-green-100">Live Chat Support</p>
                    </div>
                  </div>
                  <button
                    onClick={closeChat}
                    className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center hover:bg-opacity-30 transition-all duration-200"
                  >
                    <FaTimes className="text-white text-sm" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 max-h-[400px]">
                {chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl ${
                        msg.type === 'user'
                          ? 'bg-green-500 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.type === 'user' ? 'text-green-100' : 'text-gray-500'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 text-gray-800 p-3 rounded-2xl rounded-bl-md">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    <FaArrowRight className="text-sm" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Settings; 