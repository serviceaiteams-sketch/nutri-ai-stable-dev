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

            
            {/* Comprehensive Recovery Framework */}
            <div className="mt-6">
              <div className="font-semibold text-lg mb-4 text-emerald-700">📋 Comprehensive Recovery Framework</div>
              <RecoveryFramework addictionType={selected.key} />
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

// Comprehensive Recovery Framework Component
function RecoveryFramework({ addictionType }) {
  const recoveryData = {
    alcohol: {
      disadvantages: [
        "Liver damage and cirrhosis",
        "Poor sleep quality and insomnia",
        "Weakened immune system",
        "Relationship and family issues",
        "Financial strain and job loss",
        "Increased risk of accidents",
        "Mental health deterioration"
      ],
      strategies: [
        "Medical detox under professional supervision",
        "Therapy: CBT, group therapy, family counseling",
        "Join Alcoholics Anonymous (AA) or SMART Recovery",
        "Replace drinking with healthy routines and hobbies",
        "Build strong support network",
        "Medication-assisted treatment if needed"
      ],
      monitoring: {
        daily: [
          "Track cravings and triggers in recovery journal",
          "Practice mindfulness and stress management",
          "Attend daily support meetings if possible",
          "Check in with sponsor or accountability partner"
        ],
        weekly: [
          "Therapy or counseling session",
          "Support group attendance",
          "Review progress and challenges",
          "Plan activities for the week ahead"
        ],
        monthly: [
          "Health checkup (liver tests, counseling progress)",
          "Financial review and budgeting",
          "Relationship check-ins with family",
          "Celebrate milestones and achievements"
        ],
        relapsePrevention: [
          "Avoid high-risk environments and triggers",
          "Have emergency contact list ready",
          "Practice refusal skills regularly",
          "Keep recovery tools easily accessible"
        ]
      }
    },
    nicotine: {
      disadvantages: [
        "Lung damage and respiratory issues",
        "Increased risk of heart disease and stroke",
        "Poor circulation and skin aging",
        "Financial burden over time",
        "Social stigma and restrictions",
        "Dependency and withdrawal symptoms"
      ],
      strategies: [
        "Nicotine replacement therapy (patches, gum, lozenges)",
        "Prescription medications (Chantix, Zyban)",
        "Behavioral therapy and counseling",
        "Support groups and quit smoking programs",
        "Exercise and stress management techniques",
        "Identify and avoid smoking triggers"
      ],
      monitoring: {
        daily: [
          "Track nicotine cravings and intensity",
          "Use breathing exercises for stress",
          "Stay hydrated and exercise regularly",
          "Avoid alcohol and other triggers"
        ],
        weekly: [
          "Attend quit smoking support group",
          "Review progress and celebrate wins",
          "Plan smoke-free activities",
          "Check in with accountability partner"
        ],
        monthly: [
          "Lung function tests",
          "Financial savings calculation",
          "Health improvements assessment",
          "Plan rewards for milestones"
        ],
        relapsePrevention: [
          "Keep emergency quit kit ready",
          "Practice stress management daily",
          "Have backup support contacts",
          "Remember your 'why' for quitting"
        ]
      }
    },
    prescription_drugs: {
      disadvantages: [
        "Physical dependency and withdrawal",
        "Overdose risk and respiratory depression",
        "Cognitive impairment and memory issues",
        "Financial burden of prescriptions",
        "Legal issues and doctor shopping",
        "Relationship and trust problems"
      ],
      strategies: [
        "Medical detox in supervised facility",
        "Medication-assisted treatment (MAT)",
        "Individual and group therapy",
        "Pain management alternatives",
        "Support groups (Narcotics Anonymous)",
        "Address underlying mental health issues"
      ],
      monitoring: {
        daily: [
          "Track medication use and cravings",
          "Practice pain management techniques",
          "Attend therapy or support meetings",
          "Check in with treatment team"
        ],
        weekly: [
          "Therapy sessions",
          "Support group attendance",
          "Progress review and goal setting",
          "Family therapy if applicable"
        ],
        monthly: [
          "Medical evaluation and drug tests",
          "Treatment plan review",
          "Mental health assessment",
          "Recovery milestone celebration"
        ],
        relapsePrevention: [
          "Secure medication storage",
          "Regular drug testing",
          "Emergency contact protocols",
          "Crisis intervention plan"
        ]
      }
    },
    illicit_drugs: {
      disadvantages: [
        "Severe health consequences and overdose risk",
        "Legal problems and criminal charges",
        "Financial devastation",
        "Family and relationship destruction",
        "Mental health deterioration",
        "Social isolation and stigma"
      ],
      strategies: [
        "Inpatient rehabilitation program",
        "Medical detox and stabilization",
        "Intensive outpatient treatment",
        "12-step programs and support groups",
        "Family therapy and education",
        "Aftercare and sober living support"
      ],
      monitoring: {
        daily: [
          "Structured daily routine",
          "Attend treatment sessions",
          "Practice coping skills",
          "Check in with sponsor"
        ],
        weekly: [
          "Individual and group therapy",
          "Support group meetings",
          "Progress assessment",
          "Family therapy sessions"
        ],
        monthly: [
          "Drug testing and evaluation",
          "Treatment plan review",
          "Mental health assessment",
          "Recovery milestone tracking"
        ],
        relapsePrevention: [
          "Sober living environment",
          "Regular drug testing",
          "Emergency protocols",
          "Crisis intervention plan"
        ]
      }
    },
    gambling: {
      disadvantages: [
        "Financial ruin and debt",
        "Family and relationship breakdown",
        "Legal problems and job loss",
        "Mental health issues (depression, anxiety)",
        "Social isolation and stigma",
        "Physical health neglect"
      ],
      strategies: [
        "Gamblers Anonymous (GA) meetings",
        "Financial counseling and debt management",
        "Individual and family therapy",
        "Self-exclusion programs",
        "Financial control measures",
        "Address underlying mental health issues"
      ],
      monitoring: {
        daily: [
          "Track urges and triggers",
          "Practice financial mindfulness",
          "Attend support meetings",
          "Check in with accountability partner"
        ],
        weekly: [
          "GA meetings and therapy",
          "Financial review and budgeting",
          "Progress assessment",
          "Family check-ins"
        ],
        monthly: [
          "Financial health review",
          "Mental health assessment",
          "Recovery milestone celebration",
          "Plan future financial goals"
        ],
        relapsePrevention: [
          "Self-exclusion from gambling venues",
          "Financial control measures",
          "Emergency support contacts",
          "Crisis intervention plan"
        ]
      }
    },
    internet_social_media: {
      disadvantages: [
        "Reduced productivity and focus",
        "Sleep disruption and insomnia",
        "Social comparison and low self-esteem",
        "Reduced real-world social skills",
        "Time waste and procrastination",
        "Mental health issues (anxiety, depression)"
      ],
      strategies: [
        "Digital detox and screen time limits",
        "App blockers and website restrictions",
        "Mindfulness and meditation practices",
        "Real-world social activities",
        "Hobby development and skill building",
        "Professional help if needed"
      ],
      monitoring: {
        daily: [
          "Track screen time usage",
          "Practice digital mindfulness",
          "Engage in offline activities",
          "Set daily screen-free periods"
        ],
        weekly: [
          "Screen time review and adjustment",
          "Social activity planning",
          "Progress assessment",
          "Hobby development time"
        ],
        monthly: [
          "Digital wellness evaluation",
          "Social connection assessment",
          "Productivity improvement review",
          "Celebrate offline achievements"
        ],
        relapsePrevention: [
          "App blockers and restrictions",
          "Accountability partner check-ins",
          "Alternative activity planning",
          "Digital wellness reminders"
        ]
      }
    },
    gaming: {
      disadvantages: [
        "Excessive time consumption",
        "Reduced physical activity",
        "Sleep disruption and irregular patterns",
        "Social isolation and relationship issues",
        "Academic or work performance decline",
        "Mental health issues (depression, anxiety)"
      ],
      strategies: [
        "Set strict gaming time limits",
        "Develop alternative hobbies and interests",
        "Physical activity and exercise",
        "Social activities and real-world connections",
        "Professional help if gaming is compulsive",
        "Family therapy and education"
      ],
      monitoring: {
        daily: [
          "Track gaming time and triggers",
          "Practice time management",
          "Engage in physical activities",
          "Social interaction time"
        ],
        weekly: [
          "Gaming time review",
          "Alternative activity planning",
          "Progress assessment",
          "Family check-ins"
        ],
        monthly: [
          "Overall wellness evaluation",
          "Social connection assessment",
          "Academic/work performance review",
          "Celebrate non-gaming achievements"
        ],
        relapsePrevention: [
          "Gaming time restrictions",
          "Alternative activity planning",
          "Accountability partner system",
          "Wellness reminder system"
        ]
      }
    },
    pornography_sex: {
      disadvantages: [
        "Relationship and intimacy issues",
        "Unrealistic expectations and standards",
        "Mental health problems (anxiety, depression)",
        "Reduced motivation and productivity",
        "Social isolation and shame",
        "Potential legal issues"
      ],
      strategies: [
        "Professional therapy and counseling",
        "Support groups (Sex Addicts Anonymous)",
        "Relationship and intimacy counseling",
        "Mindfulness and meditation practices",
        "Healthy relationship building",
        "Address underlying trauma or issues"
      ],
      monitoring: {
        daily: [
          "Track triggers and urges",
          "Practice mindfulness techniques",
          "Engage in healthy activities",
          "Check in with accountability partner"
        ],
        weekly: [
          "Therapy sessions",
          "Support group attendance",
          "Progress assessment",
          "Relationship check-ins"
        ],
        monthly: [
          "Mental health evaluation",
          "Relationship health assessment",
          "Recovery progress review",
          "Celebrate relationship improvements"
        ],
        relapsePrevention: [
          "Accountability partner system",
          "Trigger avoidance strategies",
          "Emergency support contacts",
          "Crisis intervention plan"
        ]
      }
    },
    food: {
      disadvantages: [
        "Weight gain and obesity",
        "Type 2 diabetes risk",
        "Heart disease and high blood pressure",
        "Low self-esteem and body image issues",
        "Financial burden of food costs",
        "Social isolation and shame"
      ],
      strategies: [
        "Professional nutrition counseling",
        "Therapy for emotional eating",
        "Support groups (Overeaters Anonymous)",
        "Mindful eating practices",
        "Regular exercise and physical activity",
        "Address underlying emotional issues"
      ],
      monitoring: {
        daily: [
          "Track food intake and emotions",
          "Practice mindful eating",
          "Regular exercise routine",
          "Stress management techniques"
        ],
        weekly: [
          "Nutrition counseling sessions",
          "Progress assessment and goal setting",
          "Meal planning and preparation",
          "Support group attendance"
        ],
        monthly: [
          "Health checkup and weight monitoring",
          "Nutrition plan review",
          "Mental health assessment",
          "Celebrate health improvements"
        ],
        relapsePrevention: [
          "Healthy food availability",
          "Emotional support system",
          "Alternative coping strategies",
          "Regular health monitoring"
        ]
      }
    },
    smartphones: {
      disadvantages: [
        "Reduced attention span and focus",
        "Sleep disruption and blue light exposure",
        "Social isolation and reduced communication",
        "Productivity and work performance decline",
        "Physical health issues (text neck, eye strain)",
        "Mental health problems (anxiety, FOMO)"
      ],
      strategies: [
        "Digital wellness and screen time management",
        "App usage limits and restrictions",
        "Mindfulness and meditation practices",
        "Real-world social activities",
        "Hobby development and skill building",
        "Professional help if compulsive use"
      ],
      monitoring: {
        daily: [
          "Track screen time and app usage",
          "Practice digital mindfulness",
          "Set phone-free periods",
          "Engage in offline activities"
        ],
        weekly: [
          "Screen time review and adjustment",
          "Social activity planning",
          "Progress assessment",
          "Hobby development time"
        ],
        monthly: [
          "Digital wellness evaluation",
          "Social connection assessment",
          "Productivity improvement review",
          "Celebrate offline achievements"
        ],
        relapsePrevention: [
          "App blockers and restrictions",
          "Accountability partner system",
          "Alternative activity planning",
          "Digital wellness reminders"
        ]
      }
    }
  };

  const data = recoveryData[addictionType];
  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Disadvantages Section */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-3 flex items-center gap-2">
          ⚠️ Disadvantages & Negative Effects
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-red-700 mb-2">Physical Health</h4>
            <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
              {data.disadvantages.slice(0, 3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-red-700 mb-2">Mental & Social</h4>
            <ul className="list-disc ml-5 text-sm text-red-700 space-y-1">
              {data.disadvantages.slice(3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Overcoming Strategies Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
          🎯 Overcoming Strategies
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Professional Treatment</h4>
            <ul className="list-disc ml-5 text-sm text-blue-700 space-y-1">
              {data.strategies.slice(0, 3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-blue-700 mb-2">Lifestyle & Support</h4>
            <ul className="list-disc ml-5 text-sm text-blue-700 space-y-1">
              {data.strategies.slice(3).map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Monitoring Plan Section */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
          📊 Structured Monitoring Plan
        </h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Daily Actions</h4>
              <ul className="list-disc ml-5 text-sm text-green-700 space-y-1">
                {data.monitoring.daily.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-700 mb-2">Weekly Actions</h4>
              <ul className="list-disc ml-5 text-sm text-green-700 space-y-1">
                {data.monitoring.weekly.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">Monthly Actions</h4>
              <ul className="list-disc ml-5 text-sm text-green-700 space-y-1">
                {data.monitoring.monthly.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-700 mb-2">Relapse Prevention</h4>
              <ul className="list-disc ml-5 text-sm text-green-700 space-y-1">
                {data.monitoring.relapsePrevention.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 