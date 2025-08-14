const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll, getRow } = require('../config/database');

// Static catalog for addictions (can be moved to DB later)
const ADDICTIONS = [
  {
    key: 'nicotine',
    name: 'Nicotine (Smoking/Vaping)',
    risks: [
      'Increased risk of heart disease and stroke',
      'Lung disease and reduced respiratory capacity',
      'Addiction, anxiety and sleep disruption'
    ],
    guidelines: [
      'Set a quit date and remove triggers',
      'Use evidence-based aids (NRT, prescription meds)',
      'Replace the habit with short walks, deep breathing',
      'Track urges and practice delay/avoid/replace'
    ],
    suggestedDays: 60
  },
  {
    key: 'alcohol',
    name: 'Alcohol',
    risks: [
      'Liver disease and cancer risk',
      'Depression, anxiety, and sleep issues',
      'Accidents, impaired judgment'
    ],
    guidelines: [
      'Set clear limits; remove alcohol from home',
      'Plan alcohol-free routines and social support',
      'Hydrate, improve sleep, and manage stress',
      'Seek counseling or support groups if needed'
    ],
    suggestedDays: 90
  },
  {
    key: 'sugar',
    name: 'Excess Sugar/Sweets',
    risks: [
      'Weight gain and metabolic issues',
      'Energy crashes and mood swings',
      'Increased cravings and overeating'
    ],
    guidelines: [
      'Gradual reduction; swap with fruits/protein',
      'Manage stress and sleep to reduce cravings',
      'Keep tempting foods out of sight',
      'Track triggers and plan balanced meals'
    ],
    suggestedDays: 30
  },
  {
    key: 'social_media',
    name: 'Social Media Overuse',
    risks: [
      'Reduced focus and productivity',
      'Anxiety and poor sleep',
      'Lower self-esteem due to comparisons'
    ],
    guidelines: [
      'Set app time limits and no-phone zones',
      'Schedule focused blocks and breaks',
      'Replace with hobbies, exercise, social time',
      'Disable non-essential notifications'
    ],
    suggestedDays: 21
  },
  {
    key: 'fast_food',
    name: 'Fast Food Dependency',
    risks: [
      'High sodium, unhealthy fats; weight gain',
      'Micronutrient deficiencies',
      'Elevated blood pressure and cholesterol'
    ],
    guidelines: [
      'Prep simple home meals; batch cook staples',
      'Use healthy swaps; keep quick options ready',
      'Plan weekly menus and shopping',
      'Carry healthy snacks to avoid impulse buys'
    ],
    suggestedDays: 45
  }
];

// List addictions
router.get('/list', async (req, res) => {
  res.json({ ok: true, addictions: ADDICTIONS });
});

// Create a plan
router.post('/plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { addiction_key, duration_days, daily_reminder_time } = req.body || {};
    if (!addiction_key) return res.status(400).json({ ok: false, error: 'addiction_key_required' });
    const cat = ADDICTIONS.find(a => a.key === addiction_key);
    if (!cat) return res.status(400).json({ ok: false, error: 'unknown_addiction' });
    const days = Math.max(1, Number(duration_days || cat.suggestedDays || 30));
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + days);
    const startStr = start.toISOString().slice(0,10);
    const endStr = end.toISOString().slice(0,10);
    const result = await runQuery(
      `INSERT INTO addiction_plans (user_id, addiction_key, start_date, end_date, daily_reminder_time, status) VALUES (?, ?, ?, ?, ?, 'active')`,
      [userId, addiction_key, startStr, endStr, daily_reminder_time || null]
    );
    const plan = await getRow('SELECT * FROM addiction_plans WHERE id = ?', [result.id]);
    res.json({ ok: true, plan });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_create_plan' });
  }
});

// Get current plan(s)
router.get('/plan/current', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { addiction_key } = req.query || {};
    let plans;
    if (addiction_key) {
      plans = await getAll('SELECT * FROM addiction_plans WHERE user_id = ? AND addiction_key = ? AND status = "active" ORDER BY id DESC', [userId, addiction_key]);
    } else {
      plans = await getAll('SELECT * FROM addiction_plans WHERE user_id = ? AND status = "active" ORDER BY id DESC', [userId]);
    }
    res.json({ ok: true, plans });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_get_plans' });
  }
});

// Complete plan
router.post('/plan/:id/complete', authenticateToken, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user.id;
    const plan = await getRow('SELECT * FROM addiction_plans WHERE id = ? AND user_id = ?', [id, userId]);
    if (!plan) return res.status(404).json({ ok: false, error: 'plan_not_found' });
    await runQuery('UPDATE addiction_plans SET status = "completed" WHERE id = ?', [id]);
    // Compute summary
    const checkins = await getAll('SELECT * FROM addiction_checkins WHERE plan_id = ? ORDER BY checkin_date ASC', [id]);
    const totalDays = Math.max(1, Math.round((new Date(plan.end_date) - new Date(plan.start_date)) / (1000*60*60*24)));
    const completedDays = checkins.filter(c => c.followed_steps).length;
    const missedDays = Math.max(0, totalDays - completedDays);
    const successRate = Math.round((completedDays / totalDays) * 100);
    // Longest streak
    let longest = 0, current = 0;
    const byDate = new Set(checkins.filter(c=>c.followed_steps).map(c=>c.checkin_date));
    for (let d = new Date(plan.start_date); d <= new Date(plan.end_date); d.setDate(d.getDate()+1)) {
      const ds = new Date(d).toISOString().slice(0,10);
      if (byDate.has(ds)) { current += 1; longest = Math.max(longest, current); } else { current = 0; }
    }
    const suggestions = [];
    if (successRate < 70) suggestions.push('Consider shorter goals and more frequent reminders.');
    if (longest < 7) suggestions.push('Aim for a 7-day streak by planning for triggers ahead of time.');
    if (missedDays > 0) suggestions.push('Review missed days to adjust routines and supports.');
    await runQuery(
      `INSERT INTO addiction_plan_summaries (plan_id, success_rate, longest_streak, total_days, completed_days, missed_days, suggestions)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, successRate, longest, totalDays, completedDays, missedDays, JSON.stringify(suggestions)]
    );
    res.json({ ok: true, summary: { successRate, longestStreak: longest, totalDays, completedDays, missedDays, suggestions } });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_complete_plan' });
  }
});

// Add a daily check-in
router.post('/checkin', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan_id, checkin_date, followed_steps, notes } = req.body || {};
    if (!plan_id) return res.status(400).json({ ok: false, error: 'plan_id_required' });
    const plan = await getRow('SELECT * FROM addiction_plans WHERE id = ? AND user_id = ?', [plan_id, userId]);
    if (!plan) return res.status(404).json({ ok: false, error: 'plan_not_found' });
    const dateStr = (checkin_date ? new Date(checkin_date) : new Date()).toISOString().slice(0,10);
    // Upsert: try update first
    const existing = await getRow('SELECT * FROM addiction_checkins WHERE plan_id = ? AND checkin_date = ?', [plan_id, dateStr]);
    if (existing) {
      await runQuery('UPDATE addiction_checkins SET followed_steps = ?, notes = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?', [followed_steps ? 1 : 0, notes || null, existing.id]);
      const updated = await getRow('SELECT * FROM addiction_checkins WHERE id = ?', [existing.id]);
      return res.json({ ok: true, checkin: updated });
    }
    const result = await runQuery('INSERT INTO addiction_checkins (plan_id, checkin_date, followed_steps, notes) VALUES (?, ?, ?, ?)', [plan_id, dateStr, followed_steps ? 1 : 0, notes || null]);
    const created = await getRow('SELECT * FROM addiction_checkins WHERE id = ?', [result.id]);
    res.json({ ok: true, checkin: created });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_add_checkin' });
  }
});

// Progress for a plan
router.get('/progress', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.query || {};
    const plan = await getRow('SELECT * FROM addiction_plans WHERE id = ? AND user_id = ?', [Number(planId), userId]);
    if (!plan) return res.status(404).json({ ok: false, error: 'plan_not_found' });
    const checkins = await getAll('SELECT * FROM addiction_checkins WHERE plan_id = ? ORDER BY checkin_date ASC', [plan.id]);
    const totalDays = Math.max(1, Math.round((new Date(plan.end_date) - new Date(plan.start_date)) / (1000*60*60*24)));
    const completedDays = checkins.filter(c => c.followed_steps).length;
    const adherence = Math.round((completedDays / totalDays) * 100);

    // Streak calculation
    let streak = 0;
    const byDate = new Set(checkins.filter(c=>c.followed_steps).map(c=>c.checkin_date));
    for (let d = new Date(); d >= new Date(plan.start_date); d.setDate(d.getDate()-1)) {
      const ds = new Date(d).toISOString().slice(0,10);
      if (byDate.has(ds)) streak += 1; else break;
    }

    res.json({ ok: true, plan, checkins, summary: { totalDays, completedDays, adherence, streak } });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_get_progress' });
  }
});

// Get stored summary (if exists)
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.query || {};
    const plan = await getRow('SELECT * FROM addiction_plans WHERE id = ? AND user_id = ?', [Number(planId), userId]);
    if (!plan) return res.status(404).json({ ok: false, error: 'plan_not_found' });
    const summary = await getRow('SELECT * FROM addiction_plan_summaries WHERE plan_id = ?', [plan.id]);
    res.json({ ok: true, summary });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_get_summary' });
  }
});

module.exports = router; 