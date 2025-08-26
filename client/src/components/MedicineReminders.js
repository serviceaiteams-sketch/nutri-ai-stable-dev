import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaPills, FaClock, FaPlus, FaEdit, FaTrash, FaBell } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

const MedicineReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: '',
    time: '',
    frequency: 'daily',
    notes: ''
  });

  useEffect(() => {
    // Load reminders from localStorage for demo purposes
    const savedReminders = localStorage.getItem('medicineReminders');
    if (savedReminders) {
      setReminders(JSON.parse(savedReminders));
    }
  }, []);

  const saveReminders = (newReminders) => {
    localStorage.setItem('medicineReminders', JSON.stringify(newReminders));
    setReminders(newReminders);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingReminder) {
      const updatedReminders = reminders.map(r => 
        r.id === editingReminder.id ? { ...r, ...formData } : r
      );
      saveReminders(updatedReminders);
      setEditingReminder(null);
    } else {
      const newReminder = {
        id: Date.now(),
        ...formData,
        createdAt: new Date().toISOString(),
        isActive: true
      };
      saveReminders([...reminders, newReminder]);
    }
    setFormData({ medicineName: '', dosage: '', time: '', frequency: 'daily', notes: '' });
    setShowAddForm(false);
  };

  const deleteReminder = (id) => {
    const updatedReminders = reminders.filter(r => r.id !== id);
    saveReminders(updatedReminders);
  };

  const toggleReminder = (id) => {
    const updatedReminders = reminders.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    saveReminders(updatedReminders);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6 mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <FaPills className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Medicine Reminders</h1>
                <p className="text-gray-600">Never miss your medication with smart reminders</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
            >
              <FaPlus className="text-sm" />
              <span>Add Reminder</span>
            </button>
          </div>
        </motion.div>

        {/* Add/Edit Form */}
        {(showAddForm || editingReminder) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-xl p-6 mb-8"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingReminder ? 'Edit Reminder' : 'Add New Reminder'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Medicine Name</label>
                  <input
                    type="text"
                    value={formData.medicineName}
                    onChange={(e) => setFormData({ ...formData, medicineName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., Aspirin, Vitamin D"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                  <input
                    type="text"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., 1 tablet, 500mg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="twice_daily">Twice Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="as_needed">As Needed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  rows="3"
                  placeholder="Additional notes or instructions..."
                />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                >
                  {editingReminder ? 'Update Reminder' : 'Add Reminder'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingReminder(null);
                    setFormData({ medicineName: '', dosage: '', time: '', frequency: 'daily', notes: '' });
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Reminders List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Reminders</h2>
          {reminders.length === 0 ? (
            <div className="text-center py-12">
              <FaBell className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reminders yet</h3>
              <p className="text-gray-600">Add your first medicine reminder to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reminders.map((reminder) => (
                <motion.div
                  key={reminder.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`border rounded-xl p-4 transition-all duration-200 ${
                    reminder.isActive 
                      ? 'border-purple-200 bg-purple-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${
                        reminder.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}></div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{reminder.medicineName}</h3>
                        <p className="text-sm text-gray-600">{reminder.dosage}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="flex items-center text-sm text-gray-500">
                            <FaClock className="h-3 w-3 mr-1" />
                            {reminder.time}
                          </span>
                          <span className="text-sm text-gray-500 capitalize">{reminder.frequency}</span>
                        </div>
                        {reminder.notes && (
                          <p className="text-sm text-gray-500 mt-1">{reminder.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleReminder(reminder.id)}
                        className={`p-2 rounded-lg transition-colors duration-200 ${
                          reminder.isActive 
                            ? 'text-green-600 hover:bg-green-100' 
                            : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title={reminder.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <FaBell className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingReminder(reminder);
                          setFormData(reminder);
                          setShowAddForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        title="Edit"
                      >
                        <FaEdit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => deleteReminder(reminder.id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors duration-200"
                        title="Delete"
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MedicineReminders;
