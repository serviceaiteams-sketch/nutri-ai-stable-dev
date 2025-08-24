const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
require('dotenv').config();
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 5000;

// OpenAI API configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Configure multer for image uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${uuidv4()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Add a separate upload handler for reports (PDF/JPG/PNG) without image-only filter
const reportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NutriAI Oracle Server is running (minimal mode)',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Basic auth endpoint for testing
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@example.com' && password === 'password123') {
    res.json({
      success: true,
      message: 'Login successful',
      user: { id: 1, email: 'test@example.com', name: 'Test User' },
      token: 'test-token-123'
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// In-memory meals store for development
const DEV_MEALS = [];
let DEV_MEAL_ID = 1;

// In-memory stores for development (meals defined above)
const DEV_REPORTS = [];
const DEV_CONDITIONS = [];

// Profile endpoint for auth check
app.get('/api/auth/profile', (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token === 'test-token-123') {
    return res.json({ user: { id: 1, email: 'test@example.com', name: 'Test User' } });
  }
  return res.status(401).json({ error: 'Unauthorized' });
});

function ensureAuth(req, res) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token !== 'test-token-123') {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function normalizeDateToLocal(dateStr) {
  try {
    if (!dateStr) return new Date();
    return new Date(`${dateStr}T12:00:00`);
  } catch (_) {
    return new Date();
  }
}

// ------------------------------
// Addiction Control (dev mode)
// ------------------------------
const DEV_ADDICTION_CATALOG = [
  {
    key: 'sugar_reduction',
    name: 'Sugar Reduction',
    suggestedDays: 21,
    risks: [
      'Energy crashes and cravings',
      'Weight gain and insulin resistance',
      'Dental issues'
    ],
    guidelines: [
      'Swap sweetened drinks for water or unsweetened tea',
      'Choose fruit over desserts most days',
      'Add protein/fiber to meals to stabilize appetite'
    ]
  },
  {
    key: 'late_snacking',
    name: 'Late-night Snacking',
    suggestedDays: 30,
    risks: [
      'Poor sleep quality',
      'Excess calories late evening',
      'Reflux or indigestion'
    ],
    guidelines: [
      'Set a kitchen closed time',
      'Plan a satisfying dinner with fiber + protein',
      'Use herbal tea ritual to wind down'
    ]
  },
  {
    key: 'excess_caffeine',
    name: 'Excess Caffeine',
    suggestedDays: 14,
    risks: [
      'Anxiety, jitters, sleep disruption',
      'Dependence and headaches'
    ],
    guidelines: [
      'Taper by 25% every 3–4 days',
      'Switch afternoon coffee to decaf or tea',
      'Hydrate and include small snacks to avoid slumps'
    ]
  }
];

let DEV_PLAN_ID = 1;
const DEV_PLANS = []; // { id, user_id, addiction_key, start_date, end_date, duration_days, daily_reminder_time, status, checkins: [] }

function todayLocalISODate() {
  return new Date().toISOString().slice(0, 10);
}

function diffDays(aISO, bISO) {
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

// Public in dev so the page can render even before login
app.get('/api/addiction/list', (req, res) => {
  return res.json({ ok: true, addictions: DEV_ADDICTION_CATALOG });
});

app.get('/api/addiction/plan/current', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { addiction_key } = req.query || {};
  const plans = DEV_PLANS.filter(p => p.user_id === 1 && (!addiction_key || p.addiction_key === addiction_key));
  return res.json({ ok: true, plans });
});

app.post('/api/addiction/plan', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { addiction_key, duration_days = 30, daily_reminder_time = '09:00' } = req.body || {};
  if (!addiction_key) return res.status(400).json({ error: 'addiction_key required' });
  const start = todayLocalISODate();
  const end = new Date(Date.now() + Number(duration_days) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const plan = {
    id: DEV_PLAN_ID++,
    user_id: 1,
    addiction_key,
    start_date: start,
    end_date: end,
    duration_days: Number(duration_days),
    daily_reminder_time,
    status: 'active',
    checkins: []
  };
  DEV_PLANS.unshift(plan);
  return res.json({ ok: true, plan });
});

app.post('/api/addiction/checkin', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { plan_id, followed_steps = false, notes = '' } = req.body || {};
  const plan = DEV_PLANS.find(p => p.id === Number(plan_id) && p.user_id === 1);
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const date = todayLocalISODate();
  const existing = plan.checkins.find(c => c.checkin_date === date);
  const entry = { id: Date.now(), checkin_date: date, followed_steps: !!followed_steps, notes };
  if (existing) {
    existing.followed_steps = entry.followed_steps;
    existing.notes = entry.notes;
  } else {
    plan.checkins.push(entry);
  }
  return res.json({ ok: true });
});

app.get('/api/addiction/progress', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { planId } = req.query || {};
  const plan = DEV_PLANS.find(p => p.id === Number(planId) && p.user_id === 1);
  if (!plan) return res.json({ ok: true, checkins: [], summary: null });
  const today = todayLocalISODate();
  const daysElapsed = Math.max(1, diffDays(plan.start_date, today) + 1);
  const completedDays = plan.checkins.filter(c => c.followed_steps).length;
  // compute streak ending today or last checkin day
  const sorted = plan.checkins.slice().sort((a,b)=>a.checkin_date.localeCompare(b.checkin_date));
  let streak = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const d = sorted[i].checkin_date;
    const expected = new Date();
    expected.setDate(new Date().getDate() - (sorted.length - 1 - i));
    const expectedISO = expected.toISOString().slice(0, 10);
    if (d === expectedISO && sorted[i].followed_steps) streak++;
    else break;
  }
  const summary = {
    totalDays: plan.duration_days,
    completedDays,
    adherence: Math.min(100, Math.round((completedDays / daysElapsed) * 100)),
    streak
  };
  return res.json({ ok: true, checkins: plan.checkins, summary });
});

app.get('/api/addiction/summary', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { planId } = req.query || {};
  const plan = DEV_PLANS.find(p => p.id === Number(planId) && p.user_id === 1);
  if (!plan) return res.json({ ok: true, summary: null });
  const completed = plan.checkins.filter(c => c.followed_steps).length;
  const total = plan.duration_days;
  // longest streak
  const dates = plan.checkins
    .filter(c => c.followed_steps)
    .map(c => c.checkin_date)
    .sort();
  let longest = 0, current = 0, prev = null;
  for (const d of dates) {
    if (!prev) { current = 1; longest = 1; prev = d; continue; }
    const cont = diffDays(prev, d) === 1;
    current = cont ? current + 1 : 1;
    if (current > longest) longest = current;
    prev = d;
  }
  const summary = {
    success_rate: Math.round((completed / Math.max(1, total)) * 100),
    longest_streak: longest,
    completed_days: completed,
    total_days: total,
    suggestions: JSON.stringify([
      'Keep a consistent reminder time',
      'Plan snacks with protein + fiber to curb cravings',
      'Use a simple nightly routine to signal kitchen closed'
    ])
  };
  return res.json({ ok: true, summary });
});

// Minimal meal logging (no DB) for development
app.post('/api/meals/log', (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const {
      meal_type = 'lunch',
      food_items = [],
      total_nutrition,
      date,
      image_url,
      notes
    } = req.body || {};

    if (!Array.isArray(food_items) || food_items.length === 0) {
      return res.status(400).json({ error: 'food_items array required' });
    }

    const totals = total_nutrition || calculateTotals(food_items.map(f => ({ nutrition: {
      calories: Number(f.calories) || 0,
      protein: Number(f.protein) || 0,
      carbs: Number(f.carbs) || 0,
      fat: Number(f.fat) || 0,
      sugar: Number(f.sugar) || 0,
      sodium: Number(f.sodium) || 0,
      fiber: Number(f.fiber) || 0,
    }})));

    const createdAt = normalizeDateToLocal(date).toISOString();
    const meal = {
      id: DEV_MEAL_ID++,
      user_id: 1,
      meal_type,
      image_url: image_url || null,
      total_calories: totals.calories,
      total_protein: totals.protein,
      total_carbs: totals.carbs,
      total_fat: totals.fat,
      total_sugar: totals.sugar,
      total_sodium: totals.sodium,
      total_fiber: totals.fiber,
      is_healthy: true,
      notes: notes || '',
      created_at: createdAt,
      food_items
    };
    DEV_MEALS.push(meal);

    // Very simple mock health indicators
    const indicators = food_items.slice(0, 5).map(it => ({
      foodName: it.name,
      status: (Number(it.sugar) > 20 || Number(it.sodium) > 400) ? 'warning' : 'good',
      reason: Number(it.sugar) > 20 ? 'High sugar content' : 'Looks balanced in macros',
      condition: Number(it.sodium) > 400 ? 'Hypertension risk' : undefined,
      suggestion: Number(it.sugar) > 20 ? 'Reduce added sugars or portion size' : 'Keep portion moderate'
    }));

    const healthIndicators = {
      overallHealth: (totals.sugar > 50 || totals.sodium > 1200) ? 'warning' : 'good',
      indicators,
      warnings: totals.sugar > 50 ? ['Total sugar for this meal is on the higher side'] : [],
      recommendations: totals.fiber < 5 ? ['Add a side salad or fruit to increase fiber'] : []
    };

    const recommendations = {
      nextMealSuggestions: [
        {
          mealType: 'snack',
          foods: [
            { name: 'Greek yogurt with berries', reason: 'Protein and probiotics', portion: '1 cup', nutritionalBenefit: 'Satiety and gut health' }
          ]
        }
      ],
      nutritionalGaps: totals.fiber < 5 ? ['fiber'] : [],
      healthTips: ['Stay hydrated and aim for balanced macros'],
      timing: '2-3 hours from now'
    };

    return res.status(201).json({
      message: 'Meal logged successfully (dev mode)',
      meal,
      recommendations,
      healthIndicators
    });
  } catch (e) {
    console.error('Minimal meal log error:', e);
    return res.status(500).json({ error: 'Failed to log meal' });
  }
});

// Minimal daily fetch
app.get('/api/meals/daily/:date', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { date } = req.params;
  const start = normalizeDateToLocal(date);
  const day = start.toISOString().slice(0, 10); // YYYY-MM-DD
  const meals = DEV_MEALS.filter(m => (m.created_at || '').slice(0, 10) === day);
  return res.json({ meals });
});

// Minimal delete
app.delete('/api/meals/:id', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const id = Number(req.params.id);
  const idx = DEV_MEALS.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Meal not found' });
  DEV_MEALS.splice(idx, 1);
  return res.json({ message: 'Meal deleted (dev mode)' });
});

// Minimal update
app.put('/api/meals/:id', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const id = Number(req.params.id);
  const meal = DEV_MEALS.find(m => m.id === id);
  if (!meal) return res.status(404).json({ error: 'Meal not found' });

  const { meal_type, food_items, total_nutrition, notes } = req.body || {};
  if (meal_type) meal.meal_type = meal_type;
  if (Array.isArray(food_items)) meal.food_items = food_items;
  const totals = total_nutrition || calculateTotals((meal.food_items || []).map(f => ({ nutrition: {
    calories: Number(f.calories) || 0,
    protein: Number(f.protein) || 0,
    carbs: Number(f.carbs) || 0,
    fat: Number(f.fat) || 0,
    sugar: Number(f.sugar) || 0,
    sodium: Number(f.sodium) || 0,
    fiber: Number(f.fiber) || 0,
  }})));
  meal.total_calories = totals.calories;
  meal.total_protein = totals.protein;
  meal.total_carbs = totals.carbs;
  meal.total_fat = totals.fat;
  meal.total_sugar = totals.sugar;
  meal.total_sodium = totals.sodium;
  meal.total_fiber = totals.fiber;
  meal.notes = notes ?? meal.notes;

  return res.json({ message: 'Meal updated (dev mode)', meal });
});

// AI Health Check
app.get('/api/ai/health', async (req, res) => {
  try {
    const healthStatus = {
      service: 'NutriAI AI Service',
      status: 'operational',
      timestamp: new Date().toISOString(),
      openai: {
        configured: !!OPENAI_API_KEY,
        valid_key: !!OPENAI_API_KEY,
        key_format: OPENAI_API_KEY ? 'valid' : 'missing'
      },
      features: {
        chat: 'enabled',
        food_recognition: 'enabled',
        nutrition_analysis: 'enabled'
      }
    };
    res.json(healthStatus);
  } catch (error) {
    res.status(500).json({ error: 'Health check failed' });
  }
});

// Health Analysis (dev-mode)
app.get('/api/health-analysis/conditions', (req, res) => {
  if (!ensureAuth(req, res)) return;
  return res.json({ conditions: DEV_CONDITIONS });
});

app.post('/api/health-analysis/conditions/bulk', (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { conditions } = req.body || {};
  if (!Array.isArray(conditions)) {
    return res.status(400).json({ error: 'Conditions must be an array' });
  }
  // Normalize minimal schema { condition, severity }
  DEV_CONDITIONS.length = 0;
  for (const c of conditions) {
    DEV_CONDITIONS.push({
      condition: c.condition || c.condition_name || 'unspecified',
      severity: c.severity || 'mild'
    });
  }
  return res.json({ message: 'Health conditions saved (dev mode)' });
});

// Extend DEV_REPORTS to include buffer
app.post('/api/health-analysis/upload-reports', reportUpload.single('reports'), (req, res) => {
  if (!ensureAuth(req, res)) return;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    DEV_REPORTS.push({
      id: DEV_REPORTS.length + 1,
      filename: req.file.originalname || 'report.pdf',
      mimetype: req.file.mimetype || 'application/octet-stream',
      size: req.file.size || 0,
      uploaded_at: new Date().toISOString(),
      buffer: req.file.buffer
    });
    return res.json({ message: 'Health report uploaded (dev mode)' });
  } catch (e) {
    console.error('Dev upload report error:', e);
    return res.status(500).json({ error: 'Failed to upload health report' });
  }
});

async function extractTextFromReport(report) {
  try {
    if ((report.mimetype || '').includes('pdf')) {
      const data = await pdfParse(report.buffer);
      return data.text?.slice(0, 20000) || '';
    }
    // For images: try OpenAI OCR via GPT-4o image if key exists, else return placeholder
    if (OPENAI_API_KEY && (report.mimetype || '').startsWith('image/')) {
      const axios = require('axios');
      const base64 = report.buffer.toString('base64');
      const resp = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Extract text from this medical document image. Return plain text only.' },
            { type: 'image_url', image_url: { url: `data:${report.mimetype};base64,${base64}` } }
          ]
        }],
        max_tokens: 1200
      }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
      return resp.data.choices?.[0]?.message?.content || '';
    }
  } catch (e) {
    console.error('extractTextFromReport error:', e.response?.data || e.message);
  }
  return '';
}

function buildSummarizePrompt(text, conditionsSummary) {
  return `You are a clinician. Read the following health report text and produce a short, accurate summary for a non-expert. Use simple words.\n\nHealth Conditions (context):\n${conditionsSummary}\n\nREPORT TEXT (may be noisy):\n"""\n${text}\n"""\n\nReturn the result in this exact layout:\n**SUMMARY**: one paragraph in plain language\n**KEY FINDINGS**: 3-6 bullet points\n**NUMBERS**: list important labs with values and normal ranges when present (format: Name: value (ref))\n**RECOMMENDATIONS**: 3-5 concrete next steps\n**ALERTS**: any red flags that require urgent follow-up (or 'none').`;
}

app.post('/api/health-analysis/analyze-reports', async (req, res) => {
  if (!ensureAuth(req, res)) return;
  try {
    if (DEV_REPORTS.length === 0) {
      return res.status(404).json({ error: 'No health reports found for analysis' });
    }

    const conditionsSummary = DEV_CONDITIONS.length
      ? DEV_CONDITIONS.map(c => `- ${c.condition} (${c.severity})`).join('\n')
      : 'No specific conditions reported';

    // Extract text from all uploaded reports
    const texts = [];
    for (const r of DEV_REPORTS.slice(-3)) { // last 3 for speed
      const t = await extractTextFromReport(r);
      texts.push(`FILE: ${r.filename}\n${t}`);
    }
    const combinedText = texts.join('\n\n---\n\n').slice(0, 35000);

    let analysis;
    if (OPENAI_API_KEY && combinedText.trim()) {
      try {
        const axios = require('axios');
        const prompt = buildSummarizePrompt(combinedText, conditionsSummary);
        const ai = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 900
        }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
        analysis = ai.data.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.error('OpenAI refined analysis error:', e.response?.data || e.message);
      }
    }

    if (!analysis) {
      analysis = `**SUMMARY**: Reports uploaded but detailed text could not be extracted in dev mode.\n\n**KEY FINDINGS**:\n- Ensure reports are clear PDFs for best results\n- Add your conditions for more specific guidance\n\n**NUMBERS**:\n- (Not available)\n\n**RECOMMENDATIONS**:\n- Upload clearer PDFs or images\n- Re-run analysis\n\n**ALERTS**: none`;
    }

    return res.json({
      analysis,
      reportsCount: DEV_REPORTS.length,
      conditionsCount: DEV_CONDITIONS.length,
      message: 'Health reports analyzed successfully (refined)'
    });
  } catch (e) {
    console.error('Dev analyze reports error:', e);
    return res.status(500).json({ error: 'Failed to analyze health reports' });
  }
});

function buildCuisinePrompt(text, conditionsSummary) {
  return `You are a clinical nutritionist. Using the patient's health context and recent report text, create personalized diet guidance.\n\nHEALTH CONDITIONS:\n${conditionsSummary}\n\nREPORT TEXT (may include labs, diagnoses):\n"""\n${text.slice(0, 12000)}\n"""\n\nTasks:\n1) Provide a concise general dietary strategy (3-5 bullets).\n2) List TOP 10 CUISINES suitable for the patient (e.g., Mediterranean, South Indian, Japanese, Mexican, Thai, Middle Eastern, North Indian, Mediterranean-veg, Korean, Vietnamese). Rank by suitability; include a one-line reason each.\n3) For EACH of the 10 cuisines, give 3 sample meals with portion guidance.\n4) Highlight foods to LIMIT/AVOID based on conditions.\nReturn clear markdown text.`;
}

app.post('/api/health-analysis/food-recommendations', async (req, res) => {
  if (!ensureAuth(req, res)) return;
  try {
    const conditionsSummary = DEV_CONDITIONS.length
      ? DEV_CONDITIONS.map(c => `- ${c.condition} (${c.severity})`).join('\n')
      : 'No specific conditions reported';

    // Use previously extracted report text if available; if not, try to build from buffers
    let text = '';
    for (const r of DEV_REPORTS.slice(-3)) {
      const t = await extractTextFromReport(r);
      if (t) text += `\n\nFILE: ${r.filename}\n${t}`;
    }

    let recommendations;
    if (OPENAI_API_KEY) {
      try {
        const axios = require('axios');
        const prompt = buildCuisinePrompt(text || 'No report text available', conditionsSummary);
        const ai = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 1300
        }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
        recommendations = ai.data.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.error('OpenAI food recs error:', e.response?.data || e.message);
      }
    }

    if (!recommendations) {
      recommendations = `General Strategy:\n- Emphasize vegetables, legumes, whole grains, lean proteins.\n- Limit refined sugar, processed meats, and deep-fried foods.\n- Prefer low-sodium, low-added-sugar preparations.\n\nTOP 10 CUISINES (dev fallback):\n1) Mediterranean — balanced, cardio-friendly\n2) South Indian — idli/dosa with sambar, fiber-rich\n3) Japanese — fish, rice, veggies; light sauces\n4) Mexican — beans, grilled meats, salsas; avoid heavy cheese\n5) Thai — focus on steamed/grilled, light coconut\n6) Middle Eastern — legumes, salads, grilled kebabs\n7) North Indian — dal, roti, tandoori; limit creamy curries\n8) Korean — kimchi, grilled proteins; moderate sodium\n9) Vietnamese — pho with lean meats, herbs; low oil\n10) Mediterranean-veg — plant-forward variations\n\nExamples by Cuisine:\n- Mediterranean: Grilled fish + greek salad; Lentil soup + whole grain bread; Chickpea salad + olive oil/lemon.\n- South Indian: Idli + sambar; Plain dosa + podi, minimal oil; Lemon rice (small portion) + curd.\n- Japanese: Salmon sashimi + seaweed salad; Miso soup + tofu + rice (small); Chirashi bowl (half rice).\n(…and so on for others)\n\nAvoid/Limit:\n- Excessive sugar, refined carbs; high-sodium pickles; heavy cream-based gravies; deep-fried snacks.`;
    }

    return res.json({ recommendations });
  } catch (e) {
    console.error('Dev food recs error:', e);
    return res.status(500).json({ error: 'Failed to generate food recommendations' });
  }
});

// Simple AI chat endpoint for AddictionCoach
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { systemPrompt, messages = [] } = req.body || {};
    let reply = '';
    if (OPENAI_API_KEY) {
      try {
        const ai = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages.map(m => ({ role: m.role, content: String(m.content || '').slice(0, 1000) }))
          ],
          temperature: 0.4,
          max_tokens: 300
        }, { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' } });
        reply = ai.data.choices?.[0]?.message?.content || '';
      } catch (e) {
        console.error('AI chat error:', e.response?.data || e.message);
      }
    }
    if (!reply) {
      // Dev fallback 3–5 lines
      const last = String((messages.slice(-1)[0] || {}).content || 'your goal').slice(0, 140);
      reply = `Focus: ${last}\nTriggers: Identify 1–2 common moments and plan swaps.\nSupport: Tell a friend and set a daily reminder.\nToday's micro-goal: One small action within 15 minutes.\nSafety note: If you feel unwell, reach out to a professional.`;
    }
    return res.json({ reply });
  } catch (e) {
    return res.status(500).json({ error: 'chat_failed' });
  }
});

// Simple nutrition lookup and helpers
function getDefaultNutritionFor(foodName) {
  const db = {
    pancakes: { calories: 227, protein: 6, carbs: 28, fat: 9, sugar: 9, sodium: 430, fiber: 1.2 },
    berries: { calories: 57, protein: 0.7, carbs: 14, fat: 0.3, sugar: 10, sodium: 1, fiber: 2.4 },
    syrup: { calories: 260, protein: 0, carbs: 67, fat: 0, sugar: 60, sodium: 9, fiber: 0 },
    dosa: { calories: 133, protein: 4.2, carbs: 25, fat: 2.9, sugar: 0.5, sodium: 329, fiber: 1.4 },
    idli: { calories: 39, protein: 2.2, carbs: 7.9, fat: 0.2, sugar: 0.2, sodium: 113, fiber: 0.6 },
    vada: { calories: 266, protein: 8.2, carbs: 35, fat: 10, sugar: 1.2, sodium: 329, fiber: 2.1 },
    sambar: { calories: 73, protein: 3.2, carbs: 12, fat: 1.8, sugar: 2.1, sodium: 245, fiber: 2.8 },
    mango: { calories: 60, protein: 0.8, carbs: 15, fat: 0.4, sugar: 14, sodium: 1, fiber: 1.6 },
    grapes: { calories: 62, protein: 0.6, carbs: 16, fat: 0.2, sugar: 16, sodium: 2, fiber: 0.9 },
    apple: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3, sugar: 19, sodium: 2, fiber: 4.4 },
    banana: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4, sugar: 14, sodium: 1, fiber: 3.1 },
    chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6, sugar: 0, sodium: 74, fiber: 0 },
    rice: { calories: 205, protein: 4.3, carbs: 45, fat: 0.4, sugar: 0.1, sodium: 2, fiber: 0.6 },
    salad: { calories: 20, protein: 2, carbs: 4, fat: 0.2, sugar: 2, sodium: 15, fiber: 1.5 }
  };
  const key = String(foodName || '').toLowerCase();
  // try exact key, else partial match, else generic
  if (db[key]) return db[key];
  for (const [k, v] of Object.entries(db)) {
    if (key.includes(k)) return v;
  }
  return { calories: 100, protein: 3, carbs: 15, fat: 2, sugar: 5, sodium: 50, fiber: 2 };
}

function calculateTotals(items) {
  const total = { calories: 0, protein: 0, carbs: 0, fat: 0, sugar: 0, sodium: 0, fiber: 0 };
  items.forEach(item => {
    const n = item.nutrition || {};
    total.calories += Number(n.calories || 0);
    total.protein += Number(n.protein || 0);
    total.carbs += Number(n.carbs || 0);
    total.fat += Number(n.fat || 0);
    total.sugar += Number(n.sugar || 0);
    total.sodium += Number(n.sodium || 0);
    total.fiber += Number(n.fiber || 0);
  });
  return total;
}

// Food Recognition Endpoint
app.post('/api/ai/recognize-food', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const imagePath = req.file.path;
    console.log('Processing image:', imagePath);

    // Use OpenAI for food recognition if API key is configured
    if (OPENAI_API_KEY) {
      try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const openaiResponse = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `Identify foods and respond ONLY JSON: {"foods": [{"name": string, "quantity": number, "unit": string, "confidence": number}]}`
              },
              {
                role: 'user',
                content: [
                  { type: 'text', text: 'Analyze this food image.' },
                  { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                ]
              }
            ],
            max_tokens: 400
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENAI_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        const content = openaiResponse.data.choices[0].message.content || '{}';
        let foodsJson;
        try {
          foodsJson = JSON.parse(content);
        } catch {
          // attempt to extract array
          const start = content.indexOf('[');
          const end = content.lastIndexOf(']');
          foodsJson = start !== -1 && end !== -1 ? { foods: JSON.parse(content.slice(start, end + 1)) } : { foods: [] };
        }

        const recognizedFoods = Array.isArray(foodsJson.foods) ? foodsJson.foods : [];
        const nutritionData = recognizedFoods.map(f => ({
          name: f.name || 'food',
          quantity: f.quantity || 1,
          unit: f.unit || 'serving',
          confidence: f.confidence || 0.8,
          nutrition: getDefaultNutritionFor(f.name)
        }));
        const totalNutrition = calculateTotals(nutritionData);

        fs.unlinkSync(imagePath);
        return res.json({ success: true, recognizedFoods, nutritionData, totalNutrition });

      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError.response?.data || openaiError.message);
        // continue to fallback below
      }
    }

    // Fallback (no key or OpenAI error): return deterministic example
    const recognizedFoods = [
      { name: 'Pancakes', quantity: 2, unit: 'pieces', confidence: 0.9 },
      { name: 'Berries', quantity: 0.5, unit: 'cup', confidence: 0.8 },
      { name: 'Syrup', quantity: 2, unit: 'tablespoons', confidence: 0.7 }
    ];
    const nutritionData = recognizedFoods.map(f => ({
      name: f.name,
      quantity: f.quantity,
      unit: f.unit,
      confidence: f.confidence,
      nutrition: getDefaultNutritionFor(f.name)
    }));
    const totalNutrition = calculateTotals(nutritionData);

    fs.unlinkSync(imagePath);
    return res.json({ success: true, recognizedFoods, nutritionData, totalNutrition, fallback: true });

  } catch (error) {
    console.error('Food recognition error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Food recognition failed', message: error.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: 'An error occurred' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 NutriAI Oracle Server (minimal) running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 AI endpoints: /api/ai/health, /api/ai/recognize-food`);
});
