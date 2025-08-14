import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import {
  FaBed,
  FaMoon,
  FaSun,
  FaClock,
  FaEdit,
  FaPlus,
  FaStar,
  FaArrowLeft,
  FaCheck,
  FaTimes,
  FaBell,
  FaChartLine,
  FaCalendarAlt,
  FaHeart,
  FaZzz,
  FaAlarmClock,
  FaPillow,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';

const SleepTracking = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('today');
  const [sleepGoal, setSleepGoal] = useState(8);
  const [bedTime, setBedTime] = useState('23:30');
  const [wakeTime, setWakeTime] = useState('07:30');
  const [sleepDate, setSleepDate] = useState(new Date().toISOString().split('T')[0]);
  const [sleepData, setSleepData] = useState([]);
  const [todaySleep, setTodaySleep] = useState(0);
  const [showSetup, setShowSetup] = useState(false);
  const [showSleepConfirmation, setShowSleepConfirmation] = useState(false);
  const [reminders, setReminders] = useState({
    bedTime: true,
    trackSleep: true
  });
  const [sleepAnalysis, setSleepAnalysis] = useState({
    weeklyData: [0, 0, 0, 0, 0, 0, 0],
    weeklyDeficit: 56,
    tips: [
      "Avoid naps 😴, especially in the afternoon. Power napping may help you get through the day, but if you find that you can't fall asleep at bedtime, eliminating even short catnaps could help.",
      "Follow a schedule to keep your biological clock in check. Go to bed and wake up at the same time every day, even on weekends.",
      "Create a restful environment. Keep your room cool, quiet and dark. Consider using room-darkening shades, earplugs, a fan or other devices to create an environment that suits your needs.",
      "Limit daytime naps. Long daytime naps can interfere with nighttime sleep. If you choose to nap, limit yourself to up to 30 minutes and avoid doing so late in the day.",
      "Include physical activity in your daily routine. Regular physical activity can promote better sleep, helping you to fall asleep faster and to enjoy deeper sleep."
    ]
  });
  const [analysisPeriod, setAnalysisPeriod] = useState('week');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    console.log('SleepTracking component mounted, user:', user);
    if (user) {
      console.log('User authenticated, fetching sleep data...');
      fetchSleepData();
    } else {
      console.log('No user found, cannot fetch sleep data');
    }
  }, [user]);

  const fetchSleepData = async () => {
    try {
      console.log('Fetching sleep data...');
      const response = await axios.get('/api/sleep/data');
      console.log('Sleep data response:', response.data);
      setSleepData(response.data.sleepData || []);
      setTodaySleep(response.data.todaySleep || 0);
    } catch (error) {
      console.error('Error fetching sleep data:', error);
      console.error('Error response:', error.response?.data);
    }
  };

  const fetchSleepAnalysis = async (period = 'week', start = null, end = null) => {
    try {
      let url = `/api/sleep/analysis?period=${period}`;
      if (start && end) {
        url += `&start=${start}&end=${end}`;
      }
      
      const response = await axios.get(url);
      console.log('Sleep analysis response:', response.data);
      setSleepAnalysis(prev => ({
        ...prev,
        weeklyData: response.data.weeklyData || prev.weeklyData,
        weeklyDeficit: response.data.weeklyDeficit || prev.weeklyDeficit
      }));
    } catch (error) {
      console.error('Error fetching sleep analysis:', error);
    }
  };

  const handleSleepGoalChange = async (newGoal) => {
    try {
      await axios.post('/api/sleep/goal', { goal: newGoal });
      setSleepGoal(newGoal);
      toast.success('Sleep goal updated!');
    } catch (error) {
      toast.error('Failed to update sleep goal');
    }
  };

  const handleTimeChange = async (type, time) => {
    try {
      await axios.post('/api/sleep/times', { type, time });
      if (type === 'bedTime') {
        setBedTime(time);
      } else {
        setWakeTime(time);
      }
      toast.success(`${type === 'bedTime' ? 'Bed time' : 'Wake time'} updated!`);
    } catch (error) {
      toast.error('Failed to update time');
    }
  };

  const confirmSleep = async () => {
    try {
      console.log('Attempting to log sleep with data:', {
        bedTime,
        wakeTime,
        sleepDate,
        duration: calculateSleepDuration(bedTime, wakeTime)
      });
      
      const response = await axios.post('/api/sleep/log', {
        bedTime,
        wakeTime,
        sleepDate,
        duration: calculateSleepDuration(bedTime, wakeTime)
      });
      
      console.log('Sleep log response:', response.data);
      setTodaySleep(calculateSleepDuration(bedTime, wakeTime));
      setShowSleepConfirmation(false);
      toast.success('Sleep logged successfully!');
      fetchSleepData();
    } catch (error) {
      console.error('Sleep logging error:', error);
      console.error('Error response:', error.response?.data);
      toast.error('Failed to log sleep');
    }
  };

  const calculateSleepDuration = (bed, wake) => {
    const bedDate = new Date(`2000-01-01T${bed}:00`);
    const wakeDate = new Date(`2000-01-01T${wake}:00`);
    
    if (wakeDate < bedDate) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }
    
    const diffMs = wakeDate - bedDate;
    return Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
  };

  const toggleReminder = async (type) => {
    try {
      const newReminders = { ...reminders, [type]: !reminders[type] };
      await axios.post('/api/sleep/reminders', newReminders);
      setReminders(newReminders);
      toast.success(`${type === 'bedTime' ? 'Bed time' : 'Sleep tracking'} reminder ${newReminders[type] ? 'enabled' : 'disabled'}!`);
    } catch (error) {
      toast.error('Failed to update reminder');
    }
  };

  const getSleepStatus = () => {
    if (todaySleep >= sleepGoal) return 'excellent';
    if (todaySleep >= sleepGoal * 0.8) return 'good';
    if (todaySleep >= sleepGoal * 0.6) return 'fair';
    return 'poor';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'fair': return 'text-yellow-500';
      case 'poor': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getProgressColor = () => {
    const percentage = (todaySleep / sleepGoal) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-blue-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20"
      >
        {/* Header */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="flex items-center justify-center mb-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-3 rounded-full mr-3"
            >
              <FaBed className="text-white text-2xl" />
            </motion.div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sleep Tracker 🌙✨
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Track your sleep patterns and improve your rest quality
          </p>
        </motion.div>

        {/* Main Sleep Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-200"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FaBed className="text-white text-xl" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Sleep</h3>
                <p className="text-gray-600 text-sm">{todaySleep}h of {sleepGoal}h</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSetup(true)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaEdit className="text-lg" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSleepConfirmation(true)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FaPlus className="text-lg" />
              </motion.button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Progress</span>
              <span className={`text-sm font-medium ${getStatusColor(getSleepStatus())}`}>
                {getSleepStatus().charAt(0).toUpperCase() + getSleepStatus().slice(1)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full ${getProgressColor()}`}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((todaySleep / sleepGoal) * 100, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>

          {/* Sleep Status */}
          <div className="text-center">
            <div className={`text-2xl font-bold ${getStatusColor(getSleepStatus())}`}>
              {todaySleep}h
            </div>
            <div className="text-sm text-gray-600">
              {todaySleep >= sleepGoal ? 'Goal achieved! 🎉' : `${sleepGoal - todaySleep}h remaining`}
            </div>
          </div>
        </motion.div>

        {/* Setup Modal */}
        <AnimatePresence>
          {showSetup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowSetup(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">Setup your Sleep Tracker</h2>
                  <button
                    onClick={() => setShowSetup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>

                {/* Sleep Goal */}
                <div className="mb-6">
                  <div className="text-center mb-4">
                    <div className="text-4xl font-bold text-indigo-600 mb-2">{sleepGoal}hr</div>
                    <div className="text-sm text-gray-600">Sleep Goal - Recommended</div>
                    <div className="text-xs text-green-600 mt-1">Recommended</div>
                  </div>
                  <p className="text-sm text-gray-600 text-center mb-4">
                    7-9 hours is recommended amount of sleep for all adults from age 18-64, according to the sleepfoundation.org.
                  </p>
                  <div className="flex justify-center space-x-2">
                    {[6, 7, 8, 9, 10].map((goal) => (
                      <button
                        key={goal}
                        onClick={() => handleSleepGoalChange(goal)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          sleepGoal === goal
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {goal}h
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-6">
                  {/* Bed Time */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <FaMoon className="text-indigo-500" />
                      <div>
                        <div className="font-medium text-gray-800">Regular Sleep Time</div>
                        <div className="text-2xl font-bold text-gray-900">{bedTime}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newTime = prompt('Enter bed time (HH:MM):', bedTime);
                        if (newTime && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
                          handleTimeChange('bedTime', newTime);
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                  </div>

                  {/* Wake Time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <FaSun className="text-yellow-500" />
                      <div>
                        <div className="font-medium text-gray-800">Regular Wake Time</div>
                        <div className="text-2xl font-bold text-gray-900">{wakeTime}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const newTime = prompt('Enter wake time (HH:MM):', wakeTime);
                        if (newTime && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(newTime)) {
                          handleTimeChange('wakeTime', newTime);
                        }
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowSetup(false)}
                  className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                >
                  Done
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sleep Confirmation Modal */}
        <AnimatePresence>
          {showSleepConfirmation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
              onClick={() => setShowSleepConfirmation(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-2xl p-8 max-w-md w-full mx-4"
                onClick={(e) => e.stopPropagation()}
              >
                                     <div className="text-center mb-6">
                       <h2 className="text-2xl font-bold text-gray-800 mb-2">Hi {user?.name || 'there'}!</h2>
                       <p className="text-gray-600">Did you sleep at {bedTime}?</p>
                       <p className="text-gray-600">Did you wake up at {wakeTime}?</p>
                       
                       {/* Date Selection */}
                       <div className="mt-4">
                         <label className="block text-sm font-medium text-gray-700 mb-2">
                           Sleep Date
                         </label>
                         <input
                           type="date"
                           value={sleepDate}
                           onChange={(e) => setSleepDate(e.target.value)}
                           className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                           max={new Date().toISOString().split('T')[0]}
                         />
                       </div>
                     </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowSleepConfirmation(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={confirmSleep}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-600 hover:to-purple-700 transition-all duration-200"
                  >
                    Yes
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reminders Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 mb-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Reminders</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaBell className="text-indigo-500" />
                <div>
                  <div className="font-medium text-gray-800">Bed time</div>
                  <div className="text-sm text-gray-600">{bedTime}</div>
                </div>
              </div>
              <button
                onClick={() => toggleReminder('bedTime')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  reminders.bedTime ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  reminders.bedTime ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FaClock className="text-purple-500" />
                <div>
                  <div className="font-medium text-gray-800">Track Sleep</div>
                  <div className="text-sm text-gray-600">{wakeTime}</div>
                </div>
              </div>
              <button
                onClick={() => toggleReminder('trackSleep')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  reminders.trackSleep ? 'bg-purple-500' : 'bg-gray-300'
                }`}
              >
                <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                  reminders.trackSleep ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </motion.div>

                       {/* Sleep Analysis Section */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.4 }}
                 className="bg-white rounded-xl p-6 mb-6 border border-gray-200"
               >
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800">Sleep Analysis</h3>
                   <div className="flex items-center space-x-2">
                     <select
                       value={analysisPeriod}
                       onChange={(e) => {
                         setAnalysisPeriod(e.target.value);
                         fetchSleepAnalysis(e.target.value, startDate, endDate);
                       }}
                       className="text-sm border border-gray-300 rounded px-2 py-1"
                     >
                       <option value="week">Last 7 days</option>
                       <option value="month">Last 30 days</option>
                       <option value="custom">Custom Range</option>
                     </select>
                   </div>
                 </div>

                 {/* Custom Date Range */}
                 {analysisPeriod === 'custom' && (
                   <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                     <div className="flex items-center space-x-4">
                       <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                         <input
                           type="date"
                           value={startDate}
                           onChange={(e) => setStartDate(e.target.value)}
                           className="text-sm border border-gray-300 rounded px-2 py-1"
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                         <input
                           type="date"
                           value={endDate}
                           onChange={(e) => setEndDate(e.target.value)}
                           className="text-sm border border-gray-300 rounded px-2 py-1"
                         />
                       </div>
                       <button
                         onClick={() => fetchSleepAnalysis('custom', startDate, endDate)}
                         className="px-3 py-1 bg-indigo-500 text-white text-sm rounded hover:bg-indigo-600"
                       >
                         Apply
                       </button>
                     </div>
                   </div>
                 )}

          <div className="mb-4">
            <div className="text-sm text-gray-600 mb-2">Goal: {sleepGoal}h</div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div className="bg-indigo-500 h-2 rounded-full" style={{ width: '100%' }} />
            </div>
          </div>

          {/* Weekly Chart */}
          <div className="mb-4">
            <div className="flex justify-between items-end h-20">
              {['F', 'S', 'S', 'M', 'T', 'W', 'T'].map((day, index) => (
                <div key={day} className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 mb-1">{sleepAnalysis.weeklyData[index]}h</div>
                  <div className="w-4 bg-gray-300 rounded-t" style={{ height: `${(sleepAnalysis.weeklyData[index] / sleepGoal) * 40}px` }} />
                  <div className="text-xs text-gray-500 mt-1">{day}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2 text-sm text-pink-600">
            <div className="w-2 h-2 bg-pink-500 rounded-full" />
            <span>Not meeting your goal</span>
          </div>
        </motion.div>

        {/* Weekly Sleep Deficit */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl p-6 mb-6 border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Weekly Sleep Deficit</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Your Sleep Goal ({sleepGoal}h)</span>
            <div className="w-16 h-1 bg-purple-500 rounded" />
          </div>
        </motion.div>

                       {/* Sleep History Section */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.5 }}
                 className="bg-white rounded-xl p-6 mb-6 border border-gray-200"
               >
                 <div className="flex items-center justify-between mb-4">
                   <h3 className="text-lg font-semibold text-gray-800">Sleep History</h3>
                   <button 
                     onClick={() => fetchSleepData()}
                     className="text-indigo-600 text-sm font-medium hover:text-indigo-800"
                   >
                     Refresh
                   </button>
                 </div>
                 
                 <div className="space-y-3 max-h-64 overflow-y-auto">
                   {sleepData.length > 0 ? (
                     sleepData.map((entry, index) => (
                       <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                         <div className="flex items-center space-x-3">
                           <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                             <FaBed className="text-indigo-600 text-sm" />
                           </div>
                           <div>
                             <div className="font-medium text-gray-800">
                               {new Date(entry.recorded_at).toLocaleDateString()}
                             </div>
                             <div className="text-sm text-gray-600">
                               {entry.bed_time} - {entry.wake_time} ({entry.duration}h)
                             </div>
                           </div>
                         </div>
                         <div className="text-right">
                           <div className={`text-sm font-medium ${
                             entry.quality === 'excellent' ? 'text-green-600' :
                             entry.quality === 'good' ? 'text-blue-600' :
                             entry.quality === 'fair' ? 'text-yellow-600' :
                             'text-red-600'
                           }`}>
                             {entry.quality}
                           </div>
                         </div>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-8 text-gray-500">
                       <FaBed className="text-4xl mx-auto mb-2 text-gray-300" />
                       <p>No sleep data recorded yet</p>
                       <p className="text-sm">Log your first sleep entry to see your history here</p>
                     </div>
                   )}
                 </div>
               </motion.div>

               {/* Tips Section */}
               <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.6 }}
                 className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200"
               >
                 <h3 className="text-lg font-semibold text-gray-800 mb-4">Tips To Sleep Better</h3>
                 <div className="space-y-3">
                   {sleepAnalysis.tips.slice(0, 2).map((tip, index) => (
                     <div key={index} className="text-sm text-gray-700 leading-relaxed">
                       {tip}
                     </div>
                   ))}
                 </div>
               </motion.div>
      </motion.div>
    </div>
  );
};

export default SleepTracking; 