import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { FaCheckCircle, FaClock, FaPlay, FaBell } from 'react-icons/fa';
import toast from 'react-hot-toast';
import AddictionChat from './AddictionChat';

const timeToHHMM = (d) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

export default function AddictionAssistant() {
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(null);
  const [plans, setPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [progress, setProgress] = useState(null);
  const [checkinNotes, setCheckinNotes] = useState('');
  const [followed, setFollowed] = useState(true);
  const [reminderTime, setReminderTime] = useState(timeToHHMM(new Date()));
  const [duration, setDuration] = useState(0);

  const loadCatalog = async () => {
    try {
      const { data } = await axios.get('/api/addiction/list', getAuthHeaders());
      if (data.ok) setCatalog(data.addictions || []);
    } catch {
      toast.error('Failed to load catalog');
    }
  };

  const loadPlans = async (key) => {
    try {
      const auth = getAuthHeaders();
      const { data } = await axios.get('/api/addiction/plan/current', { ...(auth || {}), params: key ? { addiction_key: key } : {} });
      if (data.ok) {
        setPlans(data.plans || []);
        setActivePlan((data.plans || [])[0] || null);
      }
    } catch {}
  };

  const loadProgress = async (planId) => {
    if (!planId) { setProgress(null); return; }
    try {
      const auth = getAuthHeaders();
      const { data } = await axios.get('/api/addiction/progress', { ...(auth || {}), params: { planId } });
      if (data.ok) setProgress(data);
    } catch {}
  };

  useEffect(() => { loadCatalog(); }, []);
  useEffect(() => { if (selected) loadPlans(selected.key); }, [selected]);
  useEffect(() => { if (activePlan) loadProgress(activePlan.id); }, [activePlan]);

  const startPlan = async () => {
    if (!selected) return;
    try {
      const days = duration > 0 ? duration : (selected.suggestedDays || 30);
      const { data } = await axios.post('/api/addiction/plan', { addiction_key: selected.key, duration_days: days, daily_reminder_time: reminderTime }, getAuthHeaders());
      if (data.ok) {
        toast.success('Plan started');
        setActivePlan(data.plan);
        scheduleReminder(data.plan);
        loadProgress(data.plan.id);
      }
    } catch {
      toast.error('Failed to start plan');
    }
  };

  const scheduleReminder = async (plan) => {
    try {
      if (!('Notification' in window)) return;
      if (Notification.permission !== 'granted') {
        await Notification.requestPermission();
      }
      localStorage.setItem('addictionReminder', JSON.stringify({ planId: plan.id, time: plan.daily_reminder_time, endDate: plan.end_date }));
    } catch {}
  };

  // Local reminder tick
  useEffect(() => {
    const t = setInterval(() => {
      try {
        const raw = localStorage.getItem('addictionReminder');
        if (!raw) return;
        const { planId, time, endDate } = JSON.parse(raw);
        if (!planId || !time) return;
        const now = new Date();
        if (new Date(endDate) < now) { localStorage.removeItem('addictionReminder'); return; }
        const hhmm = timeToHHMM(now);
        if (hhmm === time) {
          let hide;
          const ToastUI = () => (
            <div className="text-sm">
              <div className="font-medium">Daily Addiction Plan Check-in</div>
              <div className="mt-1">Did you follow steps today?</div>
              <div className="mt-2 flex gap-2">
                <button onClick={async()=>{ try { await axios.post('/api/addiction/checkin', { plan_id: planId, followed_steps: true }, getAuthHeaders()); toast.success('Saved'); } catch{} hide&&hide(); }} className="px-2 py-1 bg-emerald-600 text-white rounded">Yes</button>
                <button onClick={async()=>{ try { await axios.post('/api/addiction/checkin', { plan_id: planId, followed_steps: false }, getAuthHeaders()); toast.success('Saved'); } catch{} hide&&hide(); }} className="px-2 py-1 bg-gray-200 rounded">No</button>
              </div>
            </div>
          );
          hide = toast.custom(<ToastUI />);
          if (Notification.permission === 'granted') {
            try { navigator.serviceWorker?.ready?.then(reg => reg.showNotification('NutriAI Check-in', { body: 'Daily addiction plan check-in' })); } catch {}
          }
        }
      } catch {}
    }, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const checkInToday = async () => {
    if (!activePlan) return;
    try {
      const { data } = await axios.post('/api/addiction/checkin', { plan_id: activePlan.id, followed_steps: followed, notes: checkinNotes }, getAuthHeaders());
      if (data.ok) {
        toast.success('Check-in saved');
        setCheckinNotes('');
        loadProgress(activePlan.id);
      }
    } catch {
      toast.error('Failed to save check-in');
    }
  };

  const Summary = useMemo(() => {
    if (!progress?.summary) return null;
    const s = progress.summary;
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <div className="p-3 bg-white rounded border"><div className="text-xs text-gray-500">Days</div><div className="text-lg font-semibold">{s.totalDays}</div></div>
        <div className="p-3 bg-white rounded border"><div className="text-xs text-gray-500">Completed</div><div className="text-lg font-semibold">{s.completedDays}</div></div>
        <div className="p-3 bg-white rounded border"><div className="text-xs text-gray-500">Adherence</div><div className="text-lg font-semibold">{s.adherence}%</div></div>
        <div className="p-3 bg-white rounded border"><div className="text-xs text-gray-500">Streak</div><div className="text-lg font-semibold">{s.streak} days</div></div>
      </div>
    );
  }, [progress]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Addiction Control</h1>

      {/* List */}
      {!selected && (
        <div className="grid md:grid-cols-2 gap-4">
          {catalog.map(item => (
            <button key={item.key} onClick={() => { setSelected(item); setDuration(item.suggestedDays || 30); setReminderTime('09:00'); }} className="text-left p-4 bg-white rounded-xl border hover:border-emerald-400">
              <div className="text-lg font-semibold">{item.name}</div>
              <div className="text-xs text-gray-500">Suggested: {item.suggestedDays} days</div>
            </button>
          ))}
        </div>
      )}

      {/* Overview and Plan */}
      {selected && (
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-xl border">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xl font-semibold">{selected.name}</div>
                <div className="text-xs text-gray-500">Typical recovery timeframe: {selected.suggestedDays} days</div>
              </div>
              <button className="text-sm text-emerald-600" onClick={() => setSelected(null)}>Back</button>
            </div>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Key disadvantages/risks</div>
                <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                  {selected.risks.map((r,i)=>(<li key={i}>{r}</li>))}
                </ul>
              </div>
              <div>
                <div className="font-medium mb-2">How to overcome (overview)</div>
                <ul className="list-disc ml-5 text-sm text-gray-700 space-y-1">
                  {selected.guidelines.map((g,i)=>(<li key={i}>{g}</li>))}
                </ul>
              </div>
            </div>
          </div>

          {!activePlan && (
            <div className="p-4 bg-white rounded-xl border space-y-3">
              <div className="font-medium mb-1">Start personal monitoring plan</div>
              <div className="flex items-center gap-3 text-sm">
                <label className="text-gray-600">Daily reminder</label>
                <div className="flex items-center gap-2">
                  <FaBell className="text-gray-500" />
                  <input type="time" value={reminderTime} onChange={e=>setReminderTime(e.target.value)} className="border rounded px-2 py-1" />
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <label className="text-gray-600">Duration (days)</label>
                <input type="number" min={1} value={duration} onChange={e=>setDuration(Number(e.target.value))} className="border rounded px-2 py-1 w-24" />
                <span className="text-xs text-gray-500">Suggested: {selected.suggestedDays}</span>
              </div>
              <button onClick={startPlan} className="px-4 py-2 bg-emerald-600 text-white rounded-lg inline-flex items-center gap-2"><FaPlay /> Overcome</button>
              <div className="mt-4">
                <AddictionChat addiction={selected} plan={null} />
              </div>
            </div>
          )}

          {activePlan && (
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Daily self check-in</div>
                  <div className="text-xs text-gray-500 inline-flex items-center gap-1"><FaClock /> Ends {new Date(activePlan.end_date).toLocaleDateString()}</div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-sm">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={followed} onChange={e=>setFollowed(e.target.checked)} />
                    I followed the steps today
                  </label>
                </div>
                <textarea className="mt-3 w-full border rounded px-3 py-2 text-sm" rows={2} placeholder="Notes (optional)" value={checkinNotes} onChange={e=>setCheckinNotes(e.target.value)} />
                <div className="mt-3">
                  <button onClick={checkInToday} className="px-4 py-2 bg-emerald-600 text-white rounded inline-flex items-center gap-2"><FaCheckCircle /> Save Check-in</button>
                </div>
                {Summary}
              </div>

              <div className="p-4 bg-white rounded-xl border">
                <div className="font-medium mb-2">Your check-ins</div>
                <div className="text-xs text-gray-500">Progress and reminders</div>
                <div className="mt-3 space-y-2">
                  {(progress?.checkins || []).slice().reverse().map(c => (
                    <div key={c.id} className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2 border">
                      <div>{c.checkin_date}</div>
                      <div className={`text-xs ${c.followed_steps ? 'text-emerald-700' : 'text-gray-500'}`}>{c.followed_steps ? 'Followed' : 'Missed'}</div>
                    </div>
                  ))}
                  {!(progress?.checkins || []).length && (
                    <div className="text-xs text-gray-500">No check-ins yet. Start with your first one today.</div>
                  )}
                </div>
              </div>

              <AddictionChat addiction={selected} plan={activePlan} />

              {activePlan.status === 'completed' && (
                <PlanSummary planId={activePlan.id} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanSummary({ planId }) {
  const [summary, setSummary] = useState(null);
  useEffect(()=>{ (async()=>{ try { const auth = getAuthHeaders(); const { data } = await axios.get('/api/addiction/summary', { ...(auth || {}), params: { planId } }); if (data.ok) setSummary(data.summary); } catch{} })(); }, [planId]);
  if (!summary) return null;
  return (
    <div className="p-4 bg-white rounded-xl border">
      <div className="font-medium mb-2">Summary Report</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 bg-gray-50 rounded border"><div className="text-xs text-gray-500">Success rate</div><div className="text-lg font-semibold">{summary.success_rate}%</div></div>
        <div className="p-3 bg-gray-50 rounded border"><div className="text-xs text-gray-500">Longest streak</div><div className="text-lg font-semibold">{summary.longest_streak} days</div></div>
        <div className="p-3 bg-gray-50 rounded border"><div className="text-xs text-gray-500">Completed / Total</div><div className="text-lg font-semibold">{summary.completed_days}/{summary.total_days}</div></div>
      </div>
      {!!summary?.suggestions && (
        <div className="mt-3">
          <div className="text-xs text-gray-600 mb-1">Suggestions</div>
          <ul className="list-disc ml-5 text-sm text-gray-700">
            {JSON.parse(summary.suggestions || '[]').map((s, i)=>(<li key={i}>{s}</li>))}
          </ul>
        </div>
      )}
    </div>
  );
} 