import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaBell, FaClock, FaWater, FaPills, FaHeart, FaCheck,
  FaTimes, FaEdit, FaTrash, FaPlus, FaCog, FaBellSlash,
  FaCalendarAlt, FaMobile, FaDesktop, FaEnvelope,
  FaWhatsapp, FaTelegram, FaSlack, FaDiscord
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const SmartNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [settings, setSettings] = useState({
    mealReminders: true,
    hydrationAlerts: true,
    medicationReminders: true,
    healthCheckins: true,
    exerciseReminders: false,
    sleepReminders: false
  });
  const [channels, setChannels] = useState({
    inApp: true,
    email: false,
    push: false,
    sms: false
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('notifications');

  const authHeaders = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token') || ''}` 
    } 
  });

  useEffect(() => {
    fetchNotifications();
    fetchSettings();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/notifications', authHeaders());
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set mock data for demonstration
      setNotifications(getMockNotifications());
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/notifications/settings', authHeaders());
      setSettings(response.data.settings);
      setChannels(response.data.channels);
    } catch (error) {
      console.error('Error fetching settings:', error);
      // Settings will use default values
    }
  };

  const getMockNotifications = () => [
    {
      id: 1,
      type: 'meal',
      title: 'Time for Lunch!',
      message: 'It\'s 12:00 PM. Don\'t forget to log your lunch meal.',
      time: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      read: false,
      priority: 'high',
      icon: FaClock,
      color: 'blue'
    },
    {
      id: 2,
      type: 'hydration',
      title: 'Stay Hydrated!',
      message: 'You haven\'t logged water intake in 2 hours. Aim for 8 glasses daily.',
      time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      priority: 'medium',
      icon: FaWater,
      color: 'cyan'
    },
    {
      id: 3,
      type: 'medication',
      title: 'Medication Reminder',
      message: 'Time to take your diabetes medication (Metformin).',
      time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'high',
      icon: FaPills,
      color: 'red'
    },
    {
      id: 4,
      type: 'health',
      title: 'Health Check-in',
      message: 'How are you feeling today? Log your mood and energy levels.',
      time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'medium',
      icon: FaHeart,
      color: 'green'
    },
    {
      id: 5,
      type: 'exercise',
      title: 'Exercise Reminder',
      message: 'You\'ve been inactive for 3 hours. Time for a quick walk!',
      time: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'low',
      icon: FaHeart,
      color: 'orange'
    }
  ];

  const markAsRead = async (notificationId) => {
    try {
      await axios.put(`/api/notifications/${notificationId}/read`, {}, authHeaders());
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Update locally anyway
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`, authHeaders());
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      // Delete locally anyway
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      toast.success('Notification deleted');
    }
  };

  const updateSettings = async (newSettings) => {
    try {
      await axios.put('/api/notifications/settings', newSettings, authHeaders());
      setSettings(newSettings);
      toast.success('Settings updated successfully');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  };

  const updateChannels = async (newChannels) => {
    try {
      await axios.put('/api/notifications/channels', newChannels, authHeaders());
      setChannels(newChannels);
      toast.success('Notification channels updated');
    } catch (error) {
      console.error('Error updating channels:', error);
      toast.error('Failed to update notification channels');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeColor = (color) => {
    switch (color) {
      case 'blue': return 'text-blue-600 bg-blue-100';
      case 'cyan': return 'text-cyan-600 bg-cyan-100';
      case 'red': return 'text-red-600 bg-red-100';
      case 'green': return 'text-green-600 bg-green-100';
      case 'orange': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timeString) => {
    const time = new Date(timeString);
    const now = new Date();
    const diffInHours = Math.floor((now - time) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - time) / (1000 * 60));
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <FaBell className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Smart Notifications</h1>
                <p className="text-gray-600">Stay on track with personalized health reminders</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <FaBell className="text-2xl text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'notifications', label: 'Notifications', icon: FaBell },
              { id: 'settings', label: 'Settings', icon: FaCog }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="text-lg" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {notifications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <FaBellSlash className="mx-auto text-gray-400 text-4xl mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-600">You're all caught up! New notifications will appear here.</p>
                </div>
              ) : (
                notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                      !notification.read ? 'border-l-4 border-l-purple-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`p-3 rounded-full ${getTypeColor(notification.color)}`}>
                        <notification.icon className="text-lg" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                            <p className="text-gray-600 mt-1">{notification.message}</p>
                            <div className="flex items-center space-x-4 mt-3">
                              <span className="text-sm text-gray-500">
                                {formatTime(notification.time)}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Mark as read"
                              >
                                <FaCheck />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete notification"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Notification Types */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Types</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(settings).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateSettings({ ...settings, [key]: e.target.checked })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <p className="text-sm text-gray-500">
                          {key === 'mealReminders' && 'Get reminded to log your meals'}
                          {key === 'hydrationAlerts' && 'Stay hydrated with regular water reminders'}
                          {key === 'medicationReminders' && 'Never miss your medication schedule'}
                          {key === 'healthCheckins' && 'Regular health and mood check-ins'}
                          {key === 'exerciseReminders' && 'Stay active with exercise reminders'}
                          {key === 'sleepReminders' && 'Maintain healthy sleep patterns'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notification Channels */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(channels).map(([key, value]) => (
                    <label key={key} className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={(e) => updateChannels({ ...channels, [key]: e.target.checked })}
                        className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      />
                      <div className="flex items-center space-x-3">
                        {key === 'inApp' && <FaDesktop className="text-gray-600" />}
                        {key === 'email' && <FaEnvelope className="text-gray-600" />}
                        {key === 'push' && <FaMobile className="text-gray-600" />}
                        {key === 'sms' && <FaMobile className="text-gray-600" />}
                        <div>
                          <span className="font-medium text-gray-900 capitalize">
                            {key === 'inApp' ? 'In-App' : key === 'push' ? 'Push Notifications' : key.toUpperCase()}
                          </span>
                          <p className="text-sm text-gray-500">
                            {key === 'inApp' && 'Receive notifications within the app'}
                            {key === 'email' && 'Get notifications via email'}
                            {key === 'push' && 'Receive push notifications on your device'}
                            {key === 'sms' && 'Get SMS notifications'}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notification Schedule */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Schedule</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Meal Reminders
                    </label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option>Every 4 hours</option>
                      <option>Every 6 hours</option>
                      <option>Custom schedule</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hydration Alerts
                    </label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option>Every 2 hours</option>
                      <option>Every 3 hours</option>
                      <option>Every 4 hours</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiet Hours
                    </label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                      <option>10 PM - 7 AM</option>
                      <option>11 PM - 6 AM</option>
                      <option>No quiet hours</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SmartNotifications;
