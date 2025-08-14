import React, { useState } from 'react';
import { useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FaPlus, FaBell,
  FaFire, FaCamera, FaBullseye,
  FaCog,
  FaMagic, FaClipboardList, FaRunning, FaExclamationCircle, FaMicroscope, FaMoon
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

  // Hydration state
  const [hydration, setHydration] = useState({ current: 0, target: 9, unit: 'glasses', loading: false });
  const [steps, setSteps] = useState({ current: 0, target: 10000, loading: false });
  const [stepsInput, setStepsInput] = useState('0');

  // BMI calculator state
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [bmiValue, setBmiValue] = useState(null);
  const [bmiCategory, setBmiCategory] = useState('');

  // Medicine reminder state
  const [medicineName, setMedicineName] = useState('');
  const [medicineTime, setMedicineTime] = useState(''); // HH:MM
  const [medicines, setMedicines] = useState([]);
  const lastNotifiedRef = useRef({});

  const fetchHydration = useCallback(async () => {
    try {
      setHydration(h => ({ ...h, loading: true }));
      const { data } = await axios.get('/api/hydration/today');
      setHydration({ current: data.current || 0, target: data.target || 9, unit: data.unit || 'glasses', loading: false });
    } catch (e) {
      setHydration(h => ({ ...h, loading: false }));
      // ignore UI toast for now to keep dashboard clean
    }
  }, []);

  const fetchSteps = useCallback(async () => {
    try {
      setSteps(s => ({ ...s, loading: true }));
      const { data } = await axios.get('/api/steps/today');
      const current = data.current || 0;
      setSteps({ current, target: data.target || 10000, loading: false });
      setStepsInput(String(current));
    } catch (e) {
      setSteps(s => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    fetchHydration();
    fetchSteps();
  }, [fetchHydration]);

  const adjustWater = async (delta) => {
    try {
      await axios.post('/api/hydration/log', { amount: delta });
      setHydration(h => ({ ...h, current: Math.max(0, (h.current || 0) + delta) }));
    } catch (e) {
      // fallback to refetch on error
      fetchHydration();
    }
  };

  const adjustSteps = async (delta) => {
    try {
      await axios.post('/api/steps/log', { amount: delta });
      setSteps(s => ({ ...s, current: Math.max(0, (s.current || 0) + delta) }));
    } catch (e) {
      fetchSteps();
    }
  };

  const commitSteps = async () => {
    const desired = Number.parseInt(stepsInput.replace(/[^0-9]/g, ''), 10) || 0;
    const current = steps.current || 0;
    const delta = desired - current;
    if (delta !== 0) {
      await adjustSteps(delta);
    }
    setStepsInput(String(desired));
  };

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

  // BMI helpers
  const computeBmi = useCallback(() => {
    const h = parseFloat(String(heightCm).replace(',', '.'));
    const w = parseFloat(String(weightKg).replace(',', '.'));
    if (!h || !w || h <= 0 || w <= 0) {
      setBmiValue(null);
      setBmiCategory('');
      return;
    }
    const meters = h / 100;
    const bmi = +(w / (meters * meters)).toFixed(1);
    setBmiValue(bmi);
    if (bmi < 18.5) setBmiCategory('Underweight');
    else if (bmi < 25) setBmiCategory('Normal');
    else if (bmi < 30) setBmiCategory('Overweight');
    else setBmiCategory('Obese');
  }, [heightCm, weightKg]);

  useEffect(() => { computeBmi(); }, [heightCm, weightKg, computeBmi]);

  // Medicine reminders: load/save
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nao_medicines') || '[]');
      if (Array.isArray(saved)) setMedicines(saved);
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('nao_medicines', JSON.stringify(medicines));
  }, [medicines]);

  // Reminder interval (checks every 30s)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hhmm = now.toTimeString().slice(0, 5);
      const today = now.toISOString().slice(0, 10);
      medicines.forEach((m) => {
        if (!m?.time || !m?.name) return;
        if (m.time === hhmm) {
          const key = `${m.id}-${today}`;
          if (lastNotifiedRef.current[key]) return;
          lastNotifiedRef.current[key] = true;
          toast(
            (t) => (
              <div className="text-sm">
                Medicine Reminder
                <div className="mt-1"><span className="font-semibold">{m.name}</span> at {m.time}</div>
                <button className="mt-2 px-3 py-1 bg-emerald-500 text-white rounded-md" onClick={() => toast.dismiss(t.id)}>OK</button>
              </div>
            ),
            { duration: 7000 }
          );
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [medicines]);

  const addMedicine = () => {
    const name = medicineName.trim();
    const time = medicineTime;
    if (!name || !time) return;
    setMedicines((list) => [...list, { id: Date.now(), name, time }]);
    setMedicineName('');
    setMedicineTime('');
  };

  const removeMedicine = (id) => {
    setMedicines((list) => list.filter((m) => m.id !== id));
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

            {/* Quick Stats moved to bottom below Advanced Features */}
            <div className="rounded-2xl p-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500">
              <div className="bg-white p-6 rounded-[14px] shadow-sm">
                <h3 className="font-bold text-lg text-gray-800 mb-4">Quick Stats</h3>
                <div className="space-y-6">
                  {/* Water */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Water Intake</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => adjustWater(-1)} className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50" aria-label="Decrease water">
                        −
                      </button>
                      <span className="font-medium min-w-[120px] text-center">
                        {hydration.current}/{hydration.target} {hydration.unit}
                      </span>
                      <button onClick={() => adjustWater(1)} className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50" aria-label="Increase water">
                        +
                      </button>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Steps</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={100}
                        className="w-28 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                        aria-label="Steps today"
                        value={stepsInput}
                        onChange={(e) => setStepsInput(e.target.value)}
                        onBlur={commitSteps}
                        onKeyDown={(e) => { if (e.key === 'Enter') { commitSteps(); } }}
                      />
                      <span className="text-sm text-gray-600">/ {steps.target.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* BMI Calculator */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">BMI Calculator</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="Height (cm)"
                          aria-label="Height in centimeters"
                          className="w-32 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                          value={heightCm}
                          onChange={(e) => setHeightCm(e.target.value.replace(/[^0-9.,]/g, ''))}
                          onWheel={(e) => e.preventDefault()}
                        />
                        <input
                          type="text"
                          inputMode="decimal"
                          pattern="[0-9]*[.,]?[0-9]*"
                          placeholder="Weight (kg)"
                          aria-label="Weight in kilograms"
                          className="w-32 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                          value={weightKg}
                          onChange={(e) => setWeightKg(e.target.value.replace(/[^0-9.,]/g, ''))}
                          onWheel={(e) => e.preventDefault()}
                        />
                      </div>
                    </div>
                    <div className="text-sm text-gray-700">
                      {bmiValue ? (
                        <span>
                          BMI: <span className="font-semibold">{bmiValue}</span> (<span className="font-medium">{bmiCategory}</span>)
                        </span>
                      ) : (
                        <span className="text-gray-500">Enter height and weight to calculate BMI</span>
                      )}
                    </div>
                  </div>

                  {/* Medicine Reminder */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Medicine Reminder</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Medicine name"
                          aria-label="Medicine name"
                          className="w-40 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          value={medicineName}
                          onChange={(e) => setMedicineName(e.target.value)}
                        />
                        <input
                          type="time"
                          aria-label="Reminder time"
                          className="px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          value={medicineTime}
                          onChange={(e) => setMedicineTime(e.target.value)}
                        />
                        <button onClick={addMedicine} className="px-3 py-1 bg-amber-500 text-white rounded-md">Add</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {medicines.length === 0 ? (
                        <div className="text-sm text-gray-500">No medicines added</div>
                      ) : (
                        medicines.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm">
                            <div>
                              <span className="font-medium">{m.name}</span> • {m.time}
                            </div>
                            <button className="text-red-500 hover:underline" onClick={() => removeMedicine(m.id)} aria-label={`Remove ${m.name}`}>
                              Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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

        {/* Quick Features Row */}
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500">
          <div className="bg-white p-4 rounded-[14px] shadow-sm">
            <div className="grid grid-cols-2 gap-4">
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
        <AdvancedFeaturesCard />

        {/* Quick Stats (mobile) */}
        <div className="rounded-2xl p-[2px] bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500">
          <div className="bg-white p-5 rounded-[14px] shadow-sm">
            <h3 className="font-bold text-base text-gray-800 mb-3">Quick Stats</h3>
            <div className="space-y-6">
              {/* Water */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Water Intake</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjustWater(-1)} className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50" aria-label="Decrease water">
                    −
                  </button>
                  <span className="font-medium min-w-[100px] text-center">
                    {hydration.current}/{hydration.target} {hydration.unit}
                  </span>
                  <button onClick={() => adjustWater(1)} className="px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50" aria-label="Increase water">
                    +
                  </button>
                </div>
              </div>

              {/* Steps */}
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Steps</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={100}
                    className="w-24 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                    aria-label="Steps today"
                    value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                    onBlur={commitSteps}
                    onKeyDown={(e) => { if (e.key === 'Enter') { commitSteps(); } }}
                  />
                  <span className="text-xs text-gray-600">/ {steps.target.toLocaleString()}</span>
                </div>
              </div>

              {/* BMI Calculator */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">BMI Calculator</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Height (cm)"
                      aria-label="Height in centimeters"
                      className="w-28 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                      value={heightCm}
                      onChange={(e) => setHeightCm(e.target.value.replace(/[^0-9.,]/g, ''))}
                      onWheel={(e) => e.preventDefault()}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*[.,]?[0-9]*"
                      placeholder="Weight (kg)"
                      aria-label="Weight in kilograms"
                      className="w-28 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                      value={weightKg}
                      onChange={(e) => setWeightKg(e.target.value.replace(/[^0-9.,]/g, ''))}
                      onWheel={(e) => e.preventDefault()}
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-700">
                  {bmiValue ? (
                    <span>
                      BMI: <span className="font-semibold">{bmiValue}</span> (<span className="font-medium">{bmiCategory}</span>)
                    </span>
                  ) : (
                    <span className="text-gray-500">Enter height and weight to calculate BMI</span>
                  )}
                </div>
              </div>

              {/* Medicine Reminder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600">Medicine Reminder</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Medicine name"
                      aria-label="Medicine name"
                      className="w-36 px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={medicineName}
                      onChange={(e) => setMedicineName(e.target.value)}
                    />
                    <input
                      type="time"
                      aria-label="Reminder time"
                      className="px-3 py-1 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      value={medicineTime}
                      onChange={(e) => setMedicineTime(e.target.value)}
                    />
                    <button onClick={addMedicine} className="px-3 py-1 bg-amber-500 text-white rounded-md">Add</button>
                  </div>
                </div>
                <div className="space-y-2">
                  {medicines.length === 0 ? (
                    <div className="text-xs text-gray-500">No medicines added</div>
                  ) : (
                    medicines.map((m) => (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-medium">{m.name}</span> • {m.time}
                        </div>
                        <button className="text-red-500 hover:underline" onClick={() => removeMedicine(m.id)} aria-label={`Remove ${m.name}`}>
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
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