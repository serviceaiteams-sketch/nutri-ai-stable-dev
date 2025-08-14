import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaDumbbell, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSpinner,
  FaSearch,
  FaPlay,
  FaPause,
  FaStop,
  FaClock,
  FaFire,
  FaHeart,
  FaRunning,
  FaBicycle,
  FaPrayingHands,
  FaUser
} from 'react-icons/fa';

// Unified workout categories for selection and filtering
const WORKOUT_CATEGORIES = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'core', label: 'Core/Abs' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'strength', label: 'Strength Training' },
  { value: 'flexibility', label: 'Flexibility & Stretching' },
  { value: 'balance', label: 'Balance & Stability' },
  { value: 'plyometrics', label: 'Plyometrics & Power' },
  { value: 'functional', label: 'Functional Fitness' },
  { value: 'mobility', label: 'Mobility & Recovery' },
  { value: 'sports_specific', label: 'Sports-Specific' },
  { value: 'low_impact', label: 'Specialty/Low Impact' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'dance_fitness', label: 'Dance Fitness' },
  { value: 'meditation', label: 'Meditation & Mindfulness' },
  { value: 'tai_chi', label: 'Tai Chi' },
  { value: 'aerobics', label: 'Aerobics & Step' },
  { value: 'kickboxing', label: 'Kickboxing & Boxing' },
  { value: 'boot_camp', label: 'Boot Camp' },
  { value: 'crossfit', label: 'CrossFit' }
];

const WorkoutRecommendations = () => {
  const [workouts, setWorkouts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [workoutTimer, setWorkoutTimer] = useState(0);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);

  const [formData, setFormData] = useState({
    workout_type: 'strength',
    title: '',
    description: '',
    duration: 30,
    intensity: 'moderate',
    calories_burn: 0,
    muscle_groups: [],
    exercises: [{ name: '', sets: 3, reps: 10, weight: 0, duration: 0 }]
  });

  useEffect(() => {
    (async () => {
      await fetchWorkouts();
      await fetchRecommendations();
    })();
  }, [selectedDate]);

  useEffect(() => {
    let interval;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setWorkoutTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive]);

  const authHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchWorkouts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/workouts/history?date=${selectedDate}`, { headers: authHeaders() });
      setWorkouts(response.data.workouts || []);
    } catch (error) {
      console.error('Error fetching workouts:', error);
      toast.error('Failed to load workouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const response = await axios.get(`/api/workouts/recommendations?date=${selectedDate}`, { headers: authHeaders() });
      const recommendations = response.data.recommendations || [];
      // Ensure all recommendations have properly formatted muscle_groups
      const formattedRecommendations = recommendations.map(rec => ({
        ...rec,
        muscle_groups: formatMuscleGroups(rec.muscle_groups)
      }));
      setRecommendations(formattedRecommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Generate fallback recommendations
      setRecommendations(generateFallbackRecommendations());
    }
  };

  const generateFallbackRecommendations = () => {
    return [
      {
        id: 1,
        type: 'cardio',
        title: 'Morning Cardio Session',
        description: 'Start your day with a 30-minute cardio workout to boost metabolism',
        duration: 30,
        intensity: 'moderate',
        calories_burn: 250,
        muscle_groups: 'legs, core',
        icon: <FaRunning className="h-6 w-6" />
      },
      {
        id: 2,
        type: 'strength',
        title: 'Upper Body Strength',
        description: 'Focus on chest, back, and arms with this comprehensive workout',
        duration: 45,
        intensity: 'high',
        calories_burn: 300,
        muscle_groups: 'chest, back, arms',
        icon: <FaDumbbell className="h-6 w-6" />
      },
      {
        id: 3,
        type: 'flexibility',
        title: 'Yoga Flow',
        description: 'Improve flexibility and reduce stress with this gentle yoga session',
        duration: 20,
        intensity: 'low',
        calories_burn: 100,
        muscle_groups: 'full body',
        icon: <FaPrayingHands className="h-6 w-6" />
      },
      {
        id: 4,
        type: 'cardio',
        title: 'Cycling Workout',
        description: 'High-intensity cycling session for cardiovascular health',
        duration: 25,
        intensity: 'high',
        calories_burn: 200,
        muscle_groups: 'legs',
        icon: <FaBicycle className="h-6 w-6" />
      }
    ];
  };

  const handleAddExercise = () => {
    setFormData({
      ...formData,
      exercises: [...formData.exercises, { name: '', sets: 3, reps: 10, weight: 0, duration: 0 }]
    });
  };

  const handleRemoveExercise = (index) => {
    const newExercises = formData.exercises.filter((_, i) => i !== index);
    setFormData({ ...formData, exercises: newExercises });
  };

  const handleExerciseChange = (index, field, value) => {
    const newExercises = [...formData.exercises];
    newExercises[index][field] = value;
    setFormData({ ...formData, exercises: newExercises });
  };

  const calculateTotalCalories = (exercises) => {
    return exercises.reduce((total, exercise) => {
      const exerciseCalories = (exercise.duration * 0.1) + (exercise.sets * exercise.reps * 0.05);
      return total + exerciseCalories;
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.exercises[0].name.trim()) {
      toast.error('Please add a title and at least one exercise');
      return;
    }

    try {
      const totalCalories = calculateTotalCalories(formData.exercises);
      const workoutData = {
        ...formData,
        calories_burn: totalCalories,
        date: selectedDate
      };

      if (editingWorkout) {
        await axios.put(`/api/workouts/${editingWorkout.id}`, workoutData, { headers: authHeaders() });
        toast.success('Workout updated successfully!');
      } else {
        await axios.post('/api/workouts/log', workoutData, { headers: authHeaders() });
        toast.success('Workout logged successfully!');
      }

      setFormData({
        workout_type: 'strength',
        title: '',
        description: '',
        duration: 30,
        intensity: 'moderate',
        calories_burn: 0,
        muscle_groups: [],
        exercises: [{ name: '', sets: 3, reps: 10, weight: 0, duration: 0 }]
      });
      setShowAddForm(false);
      setEditingWorkout(null);
      fetchWorkouts();
    } catch (error) {
      console.error('Error saving workout:', error);
      toast.error('Failed to save workout');
    }
  };

  const handleEdit = (workout) => {
    setEditingWorkout(workout);
    setFormData({
      workout_type: workout.workout_type || 'strength',
      title: workout.title || '',
      description: workout.description || '',
      duration: workout.duration || 30,
      intensity: workout.intensity || 'moderate',
      calories_burn: workout.calories_burn || 0,
      muscle_groups: workout.muscle_groups || [],
      exercises: workout.exercises || [{ name: '', sets: 3, reps: 10, weight: 0, duration: 0 }]
    });
    setShowAddForm(true);
  };

  const handleDelete = async (workoutId) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      try {
        await axios.delete(`/api/workouts/${workoutId}`, { headers: authHeaders() });
        toast.success('Workout deleted successfully!');
        fetchWorkouts();
      } catch (error) {
        console.error('Error deleting workout:', error);
        toast.error('Failed to delete workout');
      }
    }
  };

  const startWorkout = (workout) => {
    setActiveWorkout(workout);
    setIsWorkoutActive(true);
    setWorkoutTimer(0);
    toast.success(`Started ${workout.title}!`);
  };

  const pauseWorkout = () => {
    setIsWorkoutActive(false);
    toast('Workout paused');
  };

  const stopWorkout = async () => {
    setIsWorkoutActive(false);
    const finished = activeWorkout;
    const elapsedMinutes = Math.max(1, Math.round(workoutTimer / 60));
    const payload = {
      workout_type: (finished?.type || 'mixed'),
      title: finished?.title || 'Completed Workout',
      description: finished?.description || '',
      duration: elapsedMinutes,
      intensity: finished?.intensity || 'moderate',
      calories_burn: Math.round((finished?.calories_burn || 200) * (elapsedMinutes / (finished?.duration || 30))),
      muscle_groups: typeof finished?.muscle_groups === 'string' ? finished.muscle_groups.split(',') : (finished?.muscle_groups || []),
      exercises: [],
      date: selectedDate
    };
    try {
      await axios.post('/api/workouts/log', payload, { headers: authHeaders() });
      toast.success('Workout completed and logged!');
      fetchWorkouts();
    } catch (e) {
      console.error('Auto-log workout failed:', e);
      toast.error('Workout finished, but failed to log');
    }
    setWorkoutTimer(0);
    setActiveWorkout(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getWorkoutIcon = (type) => {
    switch (type) {
      case 'cardio':
      case 'aerobics':
      case 'boot_camp':
      case 'crossfit':
      case 'sports_specific':
        return <FaRunning className="h-6 w-6 text-red-500" />;
      case 'strength':
      case 'full_body':
      case 'upper_body':
      case 'lower_body':
      case 'core':
      case 'functional':
      case 'low_impact':
        return <FaDumbbell className="h-6 w-6 text-blue-500" />;
      case 'flexibility':
      case 'yoga':
      case 'pilates':
      case 'mobility':
      case 'balance':
      case 'tai_chi':
      case 'dance_fitness':
      case 'meditation':
        return <FaPrayingHands className="h-6 w-6 text-purple-500" />;
      case 'kickboxing':
        return <FaUser className="h-6 w-6 text-cyan-500" />;
      case 'plyometrics':
        return <FaBicycle className="h-6 w-6 text-orange-500" />;
      case 'swimming':
        return <FaUser className="h-6 w-6 text-cyan-500" />;
      default: return <FaDumbbell className="h-6 w-6 text-gray-500" />;
    }
  };

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMuscleGroups = (muscleGroups) => {
    if (!muscleGroups) return 'Full body';
    if (Array.isArray(muscleGroups)) {
      return muscleGroups.join(', ');
    }
    if (typeof muscleGroups === 'string') {
      return muscleGroups;
    }
    return 'Full body';
  };

  const filteredWorkouts = workouts.filter(workout => {
    const matchesFilter = filter === 'all' || workout.workout_type === filter;
    const matchesSearch = workout.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workout.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalCalories = filteredWorkouts.reduce((total, workout) => 
    total + (workout.calories_burn || 0), 0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <FaSpinner className="animate-spin h-8 w-8 text-purple-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <FaDumbbell className="h-8 w-8 text-purple-500" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workout Recommendations</h1>
              <p className="text-gray-600">Get personalized exercise recommendations based on your nutrition</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-purple-400 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-purple-500 hover:to-pink-600 transition-all duration-200 flex items-center space-x-2"
          >
            <FaPlus className="h-4 w-4" />
            <span>Add Workout</span>
          </button>
        </div>

        {/* Active Workout Timer */}
        {activeWorkout && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg mb-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Active Workout: {activeWorkout.title}</h3>
                <p className="text-sm opacity-90">{activeWorkout.description}</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTime(workoutTimer)}</div>
                <div className="text-sm opacity-90">Duration</div>
              </div>
              <div className="flex space-x-2">
                {isWorkoutActive ? (
                  <button
                    onClick={pauseWorkout}
                    className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                  >
                    <FaPause className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setIsWorkoutActive(true)}
                    className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                  >
                    <FaPlay className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={stopWorkout}
                  className="px-4 py-2 bg-white bg-opacity-20 rounded hover:bg-opacity-30"
                >
                  <FaStop className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Workouts</option>
              {WORKOUT_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search workouts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Workout Summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Workout Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{filteredWorkouts.length}</div>
            <div className="text-sm text-gray-600">Workouts</div>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{Math.round(totalCalories)}</div>
            <div className="text-sm text-gray-600">Calories Burned</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">
              {filteredWorkouts.reduce((total, w) => total + (w.duration || 0), 0)}
            </div>
            <div className="text-sm text-gray-600">Total Minutes</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {filteredWorkouts.filter(w => w.intensity === 'high').length}
            </div>
            <div className="text-sm text-gray-600">High Intensity</div>
          </div>
        </div>
      </motion.div>

      {/* AI Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">AI-Powered Recommendations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, index) => (
            <motion.div
              key={rec.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  {rec.icon}
                  <div>
                    <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntensityColor(rec.intensity)}`}>
                      {rec.intensity}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => startWorkout(rec)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <FaPlay className="h-4 w-4" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">{rec.description}</p>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="flex items-center">
                  <FaClock className="h-4 w-4 mr-1" />
                  {rec.duration} min
                </span>
                <span className="flex items-center">
                  <FaFire className="h-4 w-4 mr-1" />
                  {rec.calories_burn} cal
                </span>
                <span className="flex items-center">
                  <FaHeart className="h-4 w-4 mr-1" />
                  {formatMuscleGroups(rec.muscle_groups)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Add/Edit Workout Form */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingWorkout ? 'Edit Workout' : 'Add New Workout'}
            </h2>
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingWorkout(null);
                setFormData({
                  workout_type: 'strength',
                  title: '',
                  description: '',
                  duration: 30,
                  intensity: 'moderate',
                  calories_burn: 0,
                  muscle_groups: [],
                  exercises: [{ name: '', sets: 3, reps: 10, weight: 0, duration: 0 }]
                });
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Workout Type</label>
                <select
                  value={formData.workout_type}
                  onChange={(e) => setFormData({ ...formData, workout_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  {WORKOUT_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Intensity</label>
                <select
                  value={formData.intensity}
                  onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter workout title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Describe your workout"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Exercises</label>
              <div className="space-y-4">
                {formData.exercises.map((exercise, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        placeholder="Exercise name"
                        value={exercise.name}
                        onChange={(e) => handleExerciseChange(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Sets"
                        value={exercise.sets}
                        onChange={(e) => handleExerciseChange(index, 'sets', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Reps"
                        value={exercise.reps}
                        onChange={(e) => handleExerciseChange(index, 'reps', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                        min="1"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                        disabled={formData.exercises.length === 1}
                      >
                        <FaTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddExercise}
                  className="text-purple-600 hover:text-purple-800 flex items-center space-x-2"
                >
                  <FaPlus className="h-4 w-4" />
                  <span>Add Exercise</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingWorkout(null);
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              >
                {editingWorkout ? 'Update Workout' : 'Log Workout'}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Workouts List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white rounded-2xl shadow-xl p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Today's Workouts</h2>
        
        {filteredWorkouts.length === 0 ? (
          <div className="text-center py-12">
            <FaDumbbell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No workouts logged for this date</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-4 text-purple-600 hover:text-purple-800"
            >
              Add your first workout
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredWorkouts.map((workout, index) => (
              <motion.div
                key={workout.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getWorkoutIcon(workout.workout_type)}
                    <div>
                      <h3 className="font-semibold text-gray-900">{workout.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getIntensityColor(workout.intensity)}`}>
                        {workout.intensity}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startWorkout(workout)}
                      className="text-green-600 hover:text-green-800"
                    >
                      <FaPlay className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(workout)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(workout.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {workout.description && (
                  <p className="text-sm text-gray-600 mb-3">{workout.description}</p>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Duration:</span>
                    <span className="ml-2 font-medium">{workout.duration} min</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Calories:</span>
                    <span className="ml-2 font-medium">{Math.round(workout.calories_burn || 0)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium capitalize">{workout.workout_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Time:</span>
                    <span className="ml-2 font-medium">
                      {new Date(workout.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {workout.exercises && workout.exercises.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-2">Exercises:</h4>
                    <div className="space-y-1">
                      {workout.exercises.map((exercise, exIndex) => (
                        <div key={exIndex} className="text-sm text-gray-600">
                          • {exercise.name} ({exercise.sets} sets × {exercise.reps} reps)
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default WorkoutRecommendations; 