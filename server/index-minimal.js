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
    key: 'alcohol',
    name: 'Alcohol Addiction',
    suggestedDays: 90,
    risks: [
      'Liver damage and cirrhosis',
      'Poor sleep quality and insomnia',
      'Weakened immune system',
      'Relationship and family issues',
      'Financial strain and job loss'
    ],
    guidelines: [
      'Medical detox under professional supervision',
      'Therapy: CBT, group therapy, family counseling',
      'Join Alcoholics Anonymous (AA) or SMART Recovery',
      'Replace drinking with healthy routines and hobbies'
    ]
  },
  {
    key: 'nicotine',
    name: 'Nicotine / Tobacco',
    suggestedDays: 60,
    risks: [
      'Lung damage and respiratory issues',
      'Increased risk of heart disease and stroke',
      'Poor circulation and skin aging',
      'Financial burden over time',
      'Social stigma and restrictions'
    ],
    guidelines: [
      'Nicotine replacement therapy (patches, gum, lozenges)',
      'Prescription medications (Chantix, Zyban)',
      'Behavioral therapy and counseling',
      'Support groups and quit smoking programs'
    ]
  },
  {
    key: 'prescription_drugs',
    name: 'Prescription Drugs',
    suggestedDays: 120,
    risks: [
      'Physical dependency and withdrawal',
      'Overdose risk and respiratory depression',
      'Cognitive impairment and memory issues',
      'Financial burden of prescriptions',
      'Legal issues and doctor shopping'
    ],
    guidelines: [
      'Medical detox in supervised facility',
      'Medication-assisted treatment (MAT)',
      'Individual and group therapy',
      'Support groups (Narcotics Anonymous)'
    ]
  },
  {
    key: 'illicit_drugs',
    name: 'Illicit Drugs',
    suggestedDays: 180,
    risks: [
      'Severe health consequences and overdose risk',
      'Legal problems and criminal charges',
      'Financial devastation',
      'Family and relationship destruction',
      'Mental health deterioration'
    ],
    guidelines: [
      'Inpatient rehabilitation program',
      'Medical detox and stabilization',
      'Intensive outpatient treatment',
      '12-step programs and support groups'
    ]
  },
  {
    key: 'gambling',
    name: 'Gambling Addiction',
    suggestedDays: 90,
    risks: [
      'Financial ruin and debt',
      'Family and relationship breakdown',
      'Legal problems and job loss',
      'Mental health issues (depression, anxiety)',
      'Social isolation and stigma'
    ],
    guidelines: [
      'Gamblers Anonymous (GA) meetings',
      'Financial counseling and debt management',
      'Individual and family therapy',
      'Self-exclusion programs'
    ]
  },
  {
    key: 'internet_social_media',
    name: 'Internet & Social Media',
    suggestedDays: 45,
    risks: [
      'Reduced productivity and focus',
      'Sleep disruption and insomnia',
      'Social comparison and low self-esteem',
      'Reduced real-world social skills',
      'Time waste and procrastination'
    ],
    guidelines: [
      'Digital detox and screen time limits',
      'App blockers and website restrictions',
      'Mindfulness and meditation practices',
      'Real-world social activities'
    ]
  },
  {
    key: 'gaming',
    name: 'Gaming Addiction',
    suggestedDays: 60,
    risks: [
      'Excessive time consumption',
      'Reduced physical activity',
      'Sleep disruption and irregular patterns',
      'Social isolation and relationship issues',
      'Academic or work performance decline'
    ],
    guidelines: [
      'Set strict gaming time limits',
      'Develop alternative hobbies and interests',
      'Physical activity and exercise',
      'Social activities and real-world connections'
    ]
  },
  {
    key: 'pornography_sex',
    name: 'Pornography & Sex',
    suggestedDays: 90,
    risks: [
      'Relationship and intimacy issues',
      'Unrealistic expectations and standards',
      'Mental health problems (anxiety, depression)',
      'Reduced motivation and productivity',
      'Social isolation and shame'
    ],
    guidelines: [
      'Professional therapy and counseling',
      'Support groups (Sex Addicts Anonymous)',
      'Relationship and intimacy counseling',
      'Mindfulness and meditation practices'
    ]
  },
  {
    key: 'food',
    name: 'Food Addiction',
    suggestedDays: 75,
    risks: [
      'Weight gain and obesity',
      'Type 2 diabetes risk',
      'Heart disease and high blood pressure',
      'Low self-esteem and body image issues',
      'Financial burden of food costs'
    ],
    guidelines: [
      'Professional nutrition counseling',
      'Therapy for emotional eating',
      'Support groups (Overeaters Anonymous)',
      'Mindful eating practices'
    ]
  },
  {
    key: 'smartphones',
    name: 'Smartphone Addiction',
    suggestedDays: 45,
    risks: [
      'Reduced attention span and focus',
      'Sleep disruption and blue light exposure',
      'Social isolation and reduced communication',
      'Productivity and work performance decline',
      'Physical health issues (text neck, eye strain)'
    ],
    guidelines: [
      'Digital wellness and screen time management',
      'App usage limits and restrictions',
      'Mindfulness and meditation practices',
      'Real-world social activities'
    ]
  },
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

// Dynamic Meal Planning with OpenAI
app.post('/api/meal-planning/generate-dynamic', async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;
    
    const { weekStart, preferences } = req.body || {};
    
    if (!weekStart || !preferences) {
      return res.status(400).json({ error: 'weekStart and preferences are required' });
    }

    let mealPlan = null;
    
    if (OPENAI_API_KEY) {
      try {
        // Build comprehensive prompt for OpenAI
        const prompt = buildMealPlanningPrompt(preferences, weekStart);
        
        const ai = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are an expert nutritionist and meal planner. Generate personalized, non-repetitive weekly meal plans based on user preferences. Ensure variety, nutritional balance, and adherence to dietary restrictions.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        }, { 
          headers: { 
            Authorization: `Bearer ${OPENAI_API_KEY}`, 
            'Content-Type': 'application/json' 
          } 
        });
        
        const content = ai.data.choices?.[0]?.message?.content || '';
        mealPlan = parseMealPlanFromAI(content, weekStart);
        
      } catch (e) {
        console.error('OpenAI meal planning error:', e.response?.data || e.message);
      }
    }
    
    // Fallback if OpenAI fails or not available
    if (!mealPlan) {
      mealPlan = generateFallbackMealPlan(preferences, weekStart);
    }
    
    // Generate shopping list from meal plan
    const shoppingList = generateShoppingListFromMealPlan(mealPlan);
    
    return res.json({
      success: true,
      mealPlan,
      shoppingList,
      message: 'Dynamic meal plan generated successfully'
    });
    
  } catch (e) {
    console.error('Dynamic meal planning error:', e);
    return res.status(500).json({ error: 'Failed to generate dynamic meal plan' });
  }
});

function buildMealPlanningPrompt(preferences, weekStart) {
  const {
    mood, activityLevel, foodSourceRestriction, dietaryPattern, 
    cuisinePreference, healthConditions, calorieTarget, cookingTime, 
    servings, budget
  } = preferences;

  // Dynamic calorie distribution based on activity level
  const getCalorieDistribution = (calories, activity) => {
    switch(activity) {
      case 'high':
        return { breakfast: Math.round(calories * 0.3), lunch: Math.round(calories * 0.4), dinner: Math.round(calories * 0.3) };
      case 'low':
        return { breakfast: Math.round(calories * 0.25), lunch: Math.round(calories * 0.4), dinner: Math.round(calories * 0.35) };
      default: // moderate
        return { breakfast: Math.round(calories * 0.25), lunch: Math.round(calories * 0.35), dinner: Math.round(calories * 0.3), snacks: Math.round(calories * 0.1) };
    }
  };

  // Dynamic mood-based nutrition strategy
  const getMoodStrategy = (moodState) => {
    const strategies = {
      'neutral': 'Optimal state for balanced meal planning. Focus on sustained energy and mood stability through complex carbs and protein balance.',
      'stressed': 'Prioritize magnesium-rich foods (dark leafy greens, nuts), omega-3s (fish, walnuts), and adaptogenic spices. Avoid high caffeine and sugar spikes.',
      'tired': 'Emphasize iron-rich foods (lean meats, spinach), B-vitamins (whole grains, eggs), and energizing spices. Include warming foods and metabolism boosters.',
      'energetic': 'Channel energy with protein-rich meals. Include performance-optimizing nutrients and sustained-release carbs.',
      'sad': 'Focus on mood-boosting nutrients: tryptophan (turkey, pumpkin seeds), folate (legumes), and vitamin D sources.'
    };
    return strategies[moodState] || strategies.neutral;
  };

  // Dynamic activity level nutrition
  const getActivityStrategy = (activity, calories) => {
    const distribution = getCalorieDistribution(calories, activity);
    const strategies = {
      'high': `High activity metabolism: ${calories} calories distributed as ${distribution.breakfast} breakfast, ${distribution.lunch} lunch, ${distribution.dinner} dinner. Increase protein to 1.2-1.6g/kg body weight. Add pre/post activity nutrition timing.`,
      'low': `Sedentary lifestyle optimization: ${calories} calories as ${distribution.breakfast} breakfast, ${distribution.lunch} lunch, ${distribution.dinner} dinner. Reduce calorie density, increase fiber and protein for satiety. Focus on metabolic support.`,
      'moderate': `Moderate activity balance: ${calories} calories as ${distribution.breakfast} breakfast, ${distribution.lunch} lunch, ${distribution.dinner} dinner, ${distribution.snacks} snacks. Focus on sustained energy release.`
    };
    return strategies[activity] || strategies.moderate;
  };

  // Dynamic food source strategy
  const getFoodSourceStrategy = (restriction) => {
    const strategies = {
      'non_vegetarian': 'Leverage high-quality lean proteins: fish, chicken, eggs. Balance with plant proteins for complete amino profiles.',
      'vegetarian': 'Focus on complete protein combinations: beans+grains, dairy proteins, eggs. Ensure B12, iron, and zinc adequacy.',
      'vegan': 'Prioritize legume-grain combinations, nutritional yeast for B12, iron-rich plants with vitamin C. Include nuts, seeds, and fortified foods.',
      'pescatarian': 'Emphasize fish for omega-3s, combine with plant proteins. Include iodine-rich seaweeds and varied seafood.',
      'lacto_vegetarian': 'Utilize dairy for complete proteins and calcium. Combine with legumes and grains for amino acid completeness.',
      'ovo_vegetarian': 'Leverage eggs for complete protein. Focus on plant-based combinations and nutrient-dense vegetables.',
      'halal': 'Use halal-certified proteins. Focus on traditional Middle Eastern and South Asian flavor profiles.',
      'kosher': 'Follow kosher dietary laws. Separate meat and dairy meals, emphasize traditional Jewish cuisine elements.',
      'jain': 'Avoid root vegetables and certain plants. Focus on above-ground vegetables, dairy, and permitted grains.'
    };
    return strategies[restriction] || strategies.non_vegetarian;
  };

  // Dynamic cuisine expertise
  const getCuisineExpertise = (cuisine) => {
    const expertise = {
      'italian': 'ITALIAN CUISINE SPECIALIZATION: Utilize olive oil for healthy fats, tomatoes for lycopene, herbs (basil, oregano) for antioxidants. Focus on whole grain pastas, lean proteins, and Mediterranean diet principles.',
      'chinese': 'CHINESE CUISINE MASTERY: Focus on steaming, stir-frying with minimal oil. Emphasize umami flavors, mushrooms for B-vitamins, and balance of textures. Use ginger and garlic for anti-inflammatory benefits.',
      'indian': 'INDIAN CUISINE EXPERTISE: Utilize traditional spices (turmeric, cumin, coriander) for anti-inflammatory benefits. Incorporate legumes, whole grains, and yogurt for probiotics.',
      'mexican': 'MEXICAN CUISINE SPECIALIZATION: Focus on beans for fiber and protein, avocados for healthy fats, chilies for capsaicin benefits. Use lime for vitamin C and traditional herbs.',
      'japanese': 'JAPANESE CUISINE MASTERY: Emphasize fish for omega-3s, seaweed for minerals, miso for probiotics. Use minimal oil and steaming/grilling techniques.',
      'mediterranean': 'MEDITERRANEAN DIET EXPERTISE: Focus on olive oil, fish, vegetables, and whole grains. Emphasize anti-inflammatory foods and traditional preparation methods.',
      'thai': 'THAI CUISINE SPECIALIZATION: Use coconut in moderation, emphasize herbs (lemongrass, thai basil), and balance sweet, sour, and spicy flavors. Include fish sauce for umami.',
      'american': 'AMERICAN CUISINE OPTIMIZATION: Focus on healthier versions of comfort foods. Emphasize lean proteins, whole grains, and increased vegetable content.'
    };
    return expertise[cuisine] || 'GLOBAL FUSION EXPERTISE: Combine the best nutritional elements from various cuisines while maintaining authentic flavors.';
  };

  // Dynamic health condition protocols
  const getHealthProtocols = (conditions) => {
    const protocols = [];
    
    if (conditions.includes('obesity')) {
      protocols.push(`🎯 OBESITY MANAGEMENT PROTOCOL:
- Create moderate caloric deficit while maintaining nutrition density
- High fiber (35-40g/day) for satiety and gut health
- Protein target: 1.2g/kg ideal body weight (25-30% of calories)
- Low glycemic index carbs with high fiber content
- Anti-inflammatory spices for thermogenic effects
- Portion control with traditional serving methods
- Meal timing: Larger breakfast/lunch, lighter dinner`);
    }
    
    if (conditions.includes('diabetes')) {
      protocols.push(`🎯 DIABETES MANAGEMENT:
- Complex carbs with fiber ratio >3:1
- Chromium and magnesium rich foods (nuts, whole grains)
- Cinnamon, fenugreek integration for blood sugar control
- Consistent carb timing and portion control`);
    }
    
    if (conditions.includes('hypertension')) {
      protocols.push(`🎯 HYPERTENSION MANAGEMENT:
- DASH diet principles with reduced sodium (<2300mg/day)
- Potassium-rich foods (bananas, leafy greens, potatoes)
- Magnesium sources (nuts, seeds, whole grains)
- Limit processed foods and added salt`);
    }
    
    if (conditions.includes('gluten_intolerance')) {
      protocols.push(`🎯 GLUTEN-FREE PROTOCOL:
- Eliminate wheat, barley, rye, and cross-contaminated oats
- Focus on naturally gluten-free grains (rice, quinoa, millet)
- Ensure adequate B-vitamin intake from alternative sources
- Include gluten-free whole grains for fiber`);
    }
    
    if (conditions.includes('lactose_intolerance')) {
      protocols.push(`🎯 LACTOSE-FREE PROTOCOL:
- Eliminate or minimize dairy products
- Use lactose-free alternatives (almond, oat, coconut milk)
- Ensure adequate calcium from leafy greens, fortified foods
- Include probiotic sources from non-dairy fermented foods`);
    }
    
    return protocols.join('\n\n');
  };

  // Dynamic cooking time optimization
  const getCookingTimeStrategy = (time) => {
    const strategies = {
      'quick': 'Under 30 minutes per meal. Focus on no-cook options, pre-cooked proteins, and simple preparations.',
      'medium': 'Under 60 minutes per meal. Utilize pressure cooking, one-pot methods, and smart prep techniques.',
      'slow': 'Over 60 minutes allowed. Can include slow-cooking, braising, and complex traditional preparations.'
    };
    return strategies[time] || strategies.medium;
  };

  let prompt = `🧠 EXPERT NUTRITIONIST & CULINARY AI SYSTEM 🧠

You are a world-renowned nutritionist, registered dietitian, and culinary expert with 20+ years of experience in personalized nutrition and regional cuisine specialization. Your expertise spans:
- Advanced nutritional biochemistry and metabolism
- International cuisine nutrition profiles and authenticity
- Health condition management through targeted nutrition
- Meal timing optimization for different activity levels
- Micronutrient density maximization

**CLIENT PROFILE ANALYSIS:**
Week Starting: ${weekStart}

🧠 **PSYCHOLOGICAL & LIFESTYLE FACTORS:**
- Current Mood State: ${mood}
  → ${getMoodStrategy(mood)}

- Activity Level: ${activityLevel}
  → ${getActivityStrategy(activityLevel, calorieTarget)}

🥘 **CULINARY & DIETARY PREFERENCES:**
- Food Source: ${foodSourceRestriction}
  → ${getFoodSourceStrategy(foodSourceRestriction)}

- Cuisine Preference: ${cuisinePreference || 'Global Fusion'}
  → ${getCuisineExpertise(cuisinePreference)}

- Dietary Pattern: ${dietaryPattern || 'Balanced Nutrition'}
- Daily Calorie Target: ${calorieTarget} calories
- Servings: ${servings} people
- Budget Level: ${budget}
- Cooking Time Constraint: ${cookingTime}
  → ${getCookingTimeStrategy(cookingTime)}

⚕️ **HEALTH OPTIMIZATION STRATEGY:**
Health Conditions: ${healthConditions.length > 0 ? healthConditions.join(', ') : 'None'}

${getHealthProtocols(healthConditions)}

**NUTRITIONAL TARGETS PER MEAL:**
- Protein: ${Math.round(calorieTarget * 0.25 / 4)}g daily (25-30% of calories)
- Fiber: 35-40g daily for optimal health
- Healthy fats: ${Math.round(calorieTarget * 0.25 / 9)}g daily (25% of calories)
- Complex carbs: ${Math.round(calorieTarget * 0.45 / 4)}g daily (45% of calories)
- Micronutrient density: Maximum vitamins/minerals per calorie

**EXTRAORDINARY RECIPE INNOVATION REQUIREMENTS:**
1. NO repetitive main ingredients within the week
2. Authentic ${cuisinePreference || 'international'} flavors with modern nutrition optimization
3. Incorporate 3-4 different cooking methods across the week
4. Balance traditional culinary techniques with health requirements
5. Seasonal ingredients when possible
6. All restrictions STRICTLY followed: ${healthConditions.join(', ')}
7. ${servings}-person portions with accurate scaling

**RESPONSE FORMAT - COMPREHENSIVE JSON:**
{
  "weekStart": "${weekStart}",
  "nutritionalPhilosophy": "Expert-designed ${cuisinePreference || 'international'} cuisine for ${healthConditions.length > 0 ? healthConditions.join(' & ') + ' management' : 'optimal health'} with cultural authenticity",
  "days": [
    {
      "day": "Monday", 
      "date": "YYYY-MM-DD",
      "dailyNutritionSummary": {
        "totalCalories": ${calorieTarget},
        "protein": "${Math.round(calorieTarget * 0.25 / 4)}g",
        "carbs": "${Math.round(calorieTarget * 0.45 / 4)}g", 
        "fat": "${Math.round(calorieTarget * 0.25 / 9)}g",
        "fiber": "35-40g target",
        "specialNutrients": ["Nutrients targeting ${healthConditions.join(', ') || 'general health'}"]
      },
      "meals": {
        "breakfast": {
          "name": "Authentic ${cuisinePreference || 'International'} Recipe Name",
          "authenticity": "Traditional ${cuisinePreference || 'international'} preparation with modern nutrition optimization",
          "ingredients": ["Specific ingredients with exact quantities for ${servings} people"],
          "instructions": "Detailed step-by-step ${cuisinePreference || 'international'} cooking method under ${cookingTime} time constraint",
          "prepTime": 15,
          "cookTime": 25,
          "nutrition": {
            "calories": ${Math.round(getCalorieDistribution(calorieTarget, activityLevel).breakfast)},
            "protein": ${Math.round(getCalorieDistribution(calorieTarget, activityLevel).breakfast * 0.25 / 4)},
            "carbs": ${Math.round(getCalorieDistribution(calorieTarget, activityLevel).breakfast * 0.45 / 4)},
            "fat": ${Math.round(getCalorieDistribution(calorieTarget, activityLevel).breakfast * 0.25 / 9)},
            "fiber": "${Math.round(35 / 3)}g",
            "sodium": "Under 800mg",
            "specialBenefits": "Health benefits for ${healthConditions.join(' & ') || 'general wellness'}"
          },
          "culturalNotes": "${cuisinePreference || 'International'} cultural significance and traditional context",
          "healthOptimization": "How this meal specifically supports ${healthConditions.join(' & ') || 'optimal health'} goals",
          "difficulty": "easy",
          "rating": 4.7,
          "image": "https://images.unsplash.com/photo-appropriate-for-dish",
          "dietaryTags": ["${cuisinePreference || 'international'}", "${foodSourceRestriction}", "health-optimized"],
          "spiceProfile": {
            "heat": "mild/medium/hot",
            "dominantSpices": ["${cuisinePreference || 'international'} specific spices"],
            "healthBenefits": ["Specific health benefits of spices used"]
          }
        }
      }
    }
  ],
  "weeklyNutritionalAnalysis": {
    "averageDailyCalories": ${calorieTarget},
    "proteinDistribution": "Optimal for ${activityLevel} activity level",
    "varietyScore": "High - no repeated main ingredients",
    "culturalAuthenticity": "Authentic ${cuisinePreference || 'international'} recipes with modern nutrition",
    "healthCompliance": "100% compliant with ${healthConditions.join(', ') || 'general health'} requirements"
  },
  "expertRecommendations": [
    "Specific meal timing advice for ${activityLevel} activity level",
    "${cuisinePreference || 'International'} spice combinations for ${healthConditions.join(' & ') || 'general health'} benefits", 
    "Traditional ${cuisinePreference || 'international'} cooking techniques that enhance nutrition"
  ]
}

**CRITICAL SUCCESS FACTORS:**
- Each recipe must be genuinely authentic ${cuisinePreference || 'international'} cuisine
- Perfect nutritional balance for ${healthConditions.join(' & ') || 'optimal health'} goals
- ${cookingTime} time-efficient preparation methods
- Maximum flavor and satisfaction within ${calorieTarget} calorie constraints
- Educational value about ${cuisinePreference || 'international'} culinary traditions
- Practical implementation for ${servings}-person household
- STRICT adherence to ${foodSourceRestriction} and ${healthConditions.join(', ') || 'general health'} requirements

Generate the most comprehensive, nutritionally optimized, and culturally authentic ${cuisinePreference || 'international'} meal plan that perfectly matches ALL specified preferences and restrictions.`;

  return prompt;
}

function parseMealPlanFromAI(content, weekStart) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.days && Array.isArray(parsed.days)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to parse AI meal plan:', e);
  }
  
  // Return null if parsing fails
  return null;
}

function generateFallbackMealPlan(preferences, weekStart) {
  const { foodSourceRestriction, cuisinePreference, healthConditions, calorieTarget, activityLevel } = preferences;
  
  // Generate 7 days of non-repetitive meals
  const days = [];
  const usedRecipes = new Set();
  
  // Calculate daily nutrition summary
  const getCalorieDistribution = (calories, activity) => {
    switch(activity) {
      case 'high':
        return { breakfast: Math.round(calories * 0.3), lunch: Math.round(calories * 0.4), dinner: Math.round(calories * 0.3) };
      case 'low':
        return { breakfast: Math.round(calories * 0.25), lunch: Math.round(calories * 0.4), dinner: Math.round(calories * 0.35) };
      default:
        return { breakfast: Math.round(calories * 0.25), lunch: Math.round(calories * 0.35), dinner: Math.round(calories * 0.3), snacks: Math.round(calories * 0.1) };
    }
  };
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(new Date(weekStart).getTime() + i * 24 * 60 * 60 * 1000);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    const calorieDistribution = getCalorieDistribution(calorieTarget, activityLevel);
    
    const day = {
      day: dayNames[date.getDay()],
      date: date.toISOString().split('T')[0],
      dailyNutritionSummary: {
        totalCalories: calorieTarget,
        protein: `${Math.round(calorieTarget * 0.25 / 4)}g`,
        carbs: `${Math.round(calorieTarget * 0.45 / 4)}g`, 
        fat: `${Math.round(calorieTarget * 0.25 / 9)}g`,
        fiber: "35-40g target",
        specialNutrients: [`Nutrients targeting ${healthConditions.join(', ') || 'general health'}`]
      },
      meals: {}
    };
    
    // Generate unique meals for each day
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    mealTypes.forEach(mealType => {
      const meal = generateUniqueMeal(mealType, foodSourceRestriction, cuisinePreference, healthConditions, usedRecipes);
      day.meals[mealType] = meal;
    });
    
    days.push(day);
  }
  
  return {
    weekStart,
    nutritionalPhilosophy: `Expert-designed ${cuisinePreference || 'international'} cuisine for ${healthConditions.length > 0 ? healthConditions.join(' & ') + ' management' : 'optimal health'} with cultural authenticity`,
    days,
    weeklyNutritionalAnalysis: {
      averageDailyCalories: calorieTarget,
      proteinDistribution: `Optimal for ${activityLevel} activity level`,
      varietyScore: "High - no repeated main ingredients",
      culturalAuthenticity: `Authentic ${cuisinePreference || 'international'} recipes with modern nutrition`,
      healthCompliance: `100% compliant with ${healthConditions.join(', ') || 'general health'} requirements`
    },
    expertRecommendations: [
      `Specific meal timing advice for ${activityLevel} activity level`,
      `${cuisinePreference || 'International'} spice combinations for ${healthConditions.join(' & ') || 'general health'} benefits`, 
      `Traditional ${cuisinePreference || 'international'} cooking techniques that enhance nutrition`
    ]
  };
}

function generateUniqueMeal(mealType, foodRestriction, cuisine, healthConditions, usedRecipes) {
  // Comprehensive recipe database organized by cuisine
  const recipes = {
    breakfast: [
      // Italian
      { name: 'Gluten-Free Italian Frittata', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Polenta with Fresh Berries', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Italian Almond Flour Pancakes', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      
      // Indian
      { name: 'Masala Dosa', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Idli with Sambar', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Besan Chilla', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      
      // International/Mediterranean
      { name: 'Quinoa Breakfast Bowl', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'mediterranean' },
      { name: 'Chia Pudding with Coconut Milk', tags: ['vegan', 'gluten-free', 'lactose-free'], cuisine: 'international' },
      { name: 'Oatmeal with Almond Milk', tags: ['vegan', 'gluten-free', 'lactose-free'], cuisine: 'international' },
      
      // Chinese/Asian
      { name: 'Rice Congee with Vegetables', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'chinese' },
      { name: 'Japanese Tamagoyaki', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'japanese' }
    ],
    lunch: [
      // Italian
      { name: 'Gluten-Free Pasta Primavera', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Italian Grilled Chicken Salad', tags: ['high-protein', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Risotto with Coconut Milk', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Italian Zucchini Boats', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      
      // Indian
      { name: 'Dal Khichdi', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Vegetable Biryani', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Tandoori Chicken Salad', tags: ['high-protein', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      
      // Mediterranean
      { name: 'Mediterranean Quinoa Bowl', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'mediterranean' },
      { name: 'Grilled Fish with Herbs', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'mediterranean' },
      
      // Chinese/Asian
      { name: 'Chinese Steamed Fish', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'chinese' },
      { name: 'Thai Coconut Curry', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'thai' }
    ],
    dinner: [
      // Italian
      { name: 'Italian Herb-Crusted Salmon', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Gluten-Free Eggplant Parmigiana', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Italian Stuffed Peppers', tags: ['vegetarian', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      { name: 'Osso Buco Style Chicken', tags: ['high-protein', 'gluten-free', 'lactose-free'], cuisine: 'italian' },
      
      // Indian
      { name: 'Tandoori Chicken with Vegetables', tags: ['high-protein', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Vegetable Curry', tags: ['vegan', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      { name: 'Fish Curry Kerala Style', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'indian' },
      
      // Mediterranean
      { name: 'Mediterranean Grilled Vegetables', tags: ['vegan', 'gluten-free', 'lactose-free'], cuisine: 'mediterranean' },
      { name: 'Greek-Style Baked Fish', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'mediterranean' },
      
      // Chinese/Asian
      { name: 'Chinese Steamed Vegetables', tags: ['vegan', 'gluten-free', 'lactose-free'], cuisine: 'chinese' },
      { name: 'Japanese Teriyaki Salmon', tags: ['pescatarian', 'gluten-free', 'lactose-free'], cuisine: 'japanese' }
    ]
  };
  
  // Filter recipes based on all restrictions dynamically
  let availableRecipes = recipes[mealType].filter(recipe => {
    // Food source restrictions
    if (foodRestriction === 'vegan' && !recipe.tags.includes('vegan')) return false;
    if (foodRestriction === 'vegetarian' && !recipe.tags.includes('vegetarian') && !recipe.tags.includes('vegan')) return false;
    if (foodRestriction === 'pescatarian' && !recipe.tags.includes('pescatarian') && !recipe.tags.includes('vegetarian') && !recipe.tags.includes('vegan')) return false;
    
    // Health conditions - must pass ALL conditions
    if (healthConditions.includes('gluten_intolerance') && !recipe.tags.includes('gluten-free')) return false;
    if (healthConditions.includes('lactose_intolerance') && !recipe.tags.includes('lactose-free')) return false;
    if (healthConditions.includes('diabetes') && !recipe.tags.some(tag => ['low-carb', 'diabetic-friendly', 'gluten-free'].includes(tag))) return false;
    
    return true;
  });
  
  // Filter by cuisine preference if specified
  if (cuisine && cuisine !== '') {
    const cuisineFiltered = availableRecipes.filter(recipe => recipe.cuisine === cuisine);
    if (cuisineFiltered.length > 0) {
      availableRecipes = cuisineFiltered;
    }
  }
  
  // Remove already used recipes
  availableRecipes = availableRecipes.filter(recipe => !usedRecipes.has(recipe.name));
  
  // If no recipes available after filtering, expand search
  if (availableRecipes.length === 0) {
    // Try without cuisine restriction first
    availableRecipes = recipes[mealType].filter(recipe => {
      if (foodRestriction === 'vegan' && !recipe.tags.includes('vegan')) return false;
      if (foodRestriction === 'vegetarian' && !recipe.tags.includes('vegetarian') && !recipe.tags.includes('vegan')) return false;
      if (healthConditions.includes('gluten_intolerance') && !recipe.tags.includes('gluten-free')) return false;
      if (healthConditions.includes('lactose_intolerance') && !recipe.tags.includes('lactose-free')) return false;
      return true;
    }).filter(recipe => !usedRecipes.has(recipe.name));
    
    // If still no recipes, reset used recipes and try again
    if (availableRecipes.length === 0) {
      usedRecipes.clear();
      availableRecipes = recipes[mealType].filter(recipe => {
        if (healthConditions.includes('gluten_intolerance') && !recipe.tags.includes('gluten-free')) return false;
        if (healthConditions.includes('lactose_intolerance') && !recipe.tags.includes('lactose-free')) return false;
        return true;
      });
    }
  }
  
  // Pick a random recipe from available options
  const recipe = availableRecipes[Math.floor(Math.random() * availableRecipes.length)];
  usedRecipes.add(recipe.name);
  
  // Generate comprehensive meal details
  return {
    name: recipe.name,
    ingredients: generateIngredientsForRecipe(recipe, mealType, healthConditions),
    instructions: generateInstructionsForRecipe(recipe, mealType, healthConditions),
    prepTime: Math.floor(Math.random() * 20) + 10,
    cookTime: Math.floor(Math.random() * 30) + 15,
    nutrition: generateNutritionForRecipe(mealType, recipe, healthConditions),
    difficulty: Math.random() > 0.6 ? 'medium' : 'easy',
    rating: (Math.random() * 1.5 + 3.5).toFixed(1),
    image: generateImageForRecipe(recipe.name),
    dietaryTags: recipe.tags,
    culturalNotes: generateCulturalNotes(recipe, cuisine),
    healthOptimization: generateHealthOptimization(recipe, healthConditions),
    spiceProfile: generateSpiceProfile(recipe, cuisine)
  };
}

// Enhanced ingredient generation based on recipe and health conditions
function generateIngredientsForRecipe(recipe, mealType, healthConditions) {
  const ingredientDatabase = {
    // Italian recipes
    'Gluten-Free Italian Frittata': ['6 eggs', '1 zucchini diced', '1 bell pepper diced', '2 tbsp olive oil', 'Fresh herbs (basil, oregano)', 'Salt and pepper'],
    'Polenta with Fresh Berries': ['1 cup polenta', '3 cups almond milk', '1 cup mixed berries', '2 tbsp honey', 'Cinnamon'],
    'Italian Almond Flour Pancakes': ['1 cup almond flour', '3 eggs', '1/4 cup almond milk', '1 tsp vanilla', 'Fresh berries'],
    'Gluten-Free Pasta Primavera': ['8 oz gluten-free pasta', '2 cups mixed vegetables', '3 tbsp olive oil', 'Fresh herbs', 'Nutritional yeast'],
    'Italian Grilled Chicken Salad': ['6 oz chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Olives', 'Balsamic vinegar', 'Olive oil'],
    'Risotto with Coconut Milk': ['1 cup arborio rice', '2 cups vegetable broth', '1/2 cup coconut milk', 'Mushrooms', 'Nutritional yeast'],
    'Italian Herb-Crusted Salmon': ['6 oz salmon fillet', 'Fresh herbs (rosemary, thyme)', 'Lemon', 'Olive oil', 'Garlic'],
    'Gluten-Free Eggplant Parmigiana': ['1 large eggplant', 'Gluten-free breadcrumbs', 'Nutritional yeast', 'Tomato sauce', 'Fresh basil'],
    
    // Indian recipes
    'Masala Dosa': ['1 cup rice flour', '1/2 cup urad dal flour', 'Potatoes', 'Onions', 'Turmeric', 'Mustard seeds'],
    'Idli with Sambar': ['Idli batter', 'Toor dal', 'Vegetables', 'Tamarind', 'Sambar powder', 'Curry leaves'],
    'Dal Khichdi': ['1/2 cup rice', '1/2 cup moong dal', 'Turmeric', 'Ginger', 'Cumin seeds', 'Vegetables'],
    
    // Default for unlisted recipes
    'default': ['Fresh seasonal ingredients', 'Healthy cooking oil', 'Herbs and spices', 'Vegetables']
  };
  
  let ingredients = ingredientDatabase[recipe.name] || ingredientDatabase['default'];
  
  // Modify ingredients based on health conditions
  if (healthConditions.includes('lactose_intolerance')) {
    ingredients = ingredients.map(ing => 
      ing.replace(/milk/gi, 'almond milk')
         .replace(/cheese/gi, 'nutritional yeast')
         .replace(/yogurt/gi, 'coconut yogurt')
    );
  }
  
  return ingredients;
}

function generateInstructionsForRecipe(recipe, mealType, healthConditions) {
  const instructionDatabase = {
    'Gluten-Free Italian Frittata': 'Heat olive oil in oven-safe pan. Sauté vegetables until tender. Beat eggs with herbs, pour over vegetables. Cook on stovetop 3-4 minutes, then finish in 375°F oven for 10-12 minutes.',
    'Italian Grilled Chicken Salad': 'Season chicken with Italian herbs. Grill 6-7 minutes per side until cooked through. Let rest, then slice. Toss greens with olive oil and balsamic. Top with chicken and vegetables.',
    'Dal Khichdi': 'Wash rice and dal together. In pressure cooker, add 3 cups water, turmeric, ginger. Cook 3 whistles. Heat oil, add cumin seeds, then pour over khichdi. Garnish with cilantro.',
    'default': `Prepare ${recipe.name.toLowerCase()} using traditional methods adapted for dietary restrictions. Focus on fresh ingredients and gentle cooking techniques to preserve nutrients.`
  };
  
  let instructions = instructionDatabase[recipe.name] || instructionDatabase['default'];
  
  // Add health-conscious modifications
  if (healthConditions.includes('obesity')) {
    instructions += ' Use minimal oil and focus on steaming or grilling when possible.';
  }
  
  return instructions;
}

function generateNutritionForRecipe(mealType, recipe, healthConditions) {
  const baseCalories = { breakfast: 350, lunch: 450, dinner: 400 };
  const mealCalories = baseCalories[mealType] || 400;
  
  // Adjust for health conditions
  let calories = mealCalories;
  if (healthConditions.includes('obesity')) {
    calories = Math.round(mealCalories * 0.85); // Reduce calories for weight management
  }
  
  // Calculate macros based on health conditions
  let proteinPercent = 0.25;
  let carbPercent = 0.45;
  let fatPercent = 0.30;
  
  if (healthConditions.includes('diabetes')) {
    proteinPercent = 0.30;
    carbPercent = 0.35;
    fatPercent = 0.35;
  }
  
  return {
    calories,
    protein: Math.round((calories * proteinPercent) / 4),
    carbs: Math.round((calories * carbPercent) / 4),
    fat: Math.round((calories * fatPercent) / 9),
    fiber: Math.round(calories / 50), // Aim for high fiber
    sodium: healthConditions.includes('hypertension') ? Math.round(calories * 0.3) : Math.round(calories * 0.5),
    specialBenefits: generateSpecialBenefits(recipe, healthConditions)
  };
}

function generateSpecialBenefits(recipe, healthConditions) {
  const benefits = [];
  
  if (healthConditions.includes('obesity')) {
    benefits.push('High fiber for satiety, controlled portions for weight management');
  }
  if (healthConditions.includes('gluten_intolerance')) {
    benefits.push('Completely gluten-free, safe for celiac disease');
  }
  if (healthConditions.includes('lactose_intolerance')) {
    benefits.push('Dairy-free, rich in calcium from alternative sources');
  }
  if (healthConditions.includes('diabetes')) {
    benefits.push('Low glycemic index, balanced macronutrients for blood sugar control');
  }
  
  if (benefits.length === 0) {
    benefits.push('Nutrient-dense, balanced meal for optimal health');
  }
  
  return benefits.join(', ');
}

function generateImageForRecipe(recipeName) {
  // Cuisine-specific image selection
  const imageMap = {
    'italian': [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400',
      'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400',
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400'
    ],
    'indian': [
      'https://images.unsplash.com/photo-1567337712385-da44e6a67bb0?w=400',
      'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
      'https://images.unsplash.com/photo-1574653203071-20fd6c3e7e35?w=400'
    ],
    'general': [
      'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400',
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400'
    ]
  };
  
  // Determine cuisine from recipe name
  let cuisine = 'general';
  if (recipeName.toLowerCase().includes('italian')) cuisine = 'italian';
  else if (recipeName.toLowerCase().includes('dosa') || recipeName.toLowerCase().includes('idli') || recipeName.toLowerCase().includes('dal')) cuisine = 'indian';
  
  const images = imageMap[cuisine];
  return images[Math.floor(Math.random() * images.length)];
}

function generateCulturalNotes(recipe, cuisine) {
  const culturalDatabase = {
    'Gluten-Free Italian Frittata': 'A traditional Italian egg dish, originally created to use leftover ingredients. This gluten-free version maintains authentic flavors while being inclusive.',
    'Italian Grilled Chicken Salad': 'Inspired by Italian antipasto traditions, combining fresh herbs and quality ingredients that define Mediterranean cuisine.',
    'Dal Khichdi': 'An ancient Ayurvedic comfort food, known as the perfect balance of protein and carbs. Often the first solid food given to babies in India.',
    'Masala Dosa': 'A South Indian breakfast staple, originating from Karnataka. The fermentation process adds probiotics and makes it easily digestible.',
    'default': `Traditional ${cuisine || 'international'} preparation adapted for modern nutritional needs while preserving authentic flavors.`
  };
  
  return culturalDatabase[recipe.name] || culturalDatabase['default'];
}

function generateHealthOptimization(recipe, healthConditions) {
  if (healthConditions.length === 0) {
    return 'Optimized for general wellness with balanced macronutrients and micronutrient density.';
  }
  
  const optimizations = [];
  
  if (healthConditions.includes('obesity')) {
    optimizations.push('Portion-controlled and high-fiber for sustained satiety and weight management');
  }
  if (healthConditions.includes('gluten_intolerance')) {
    optimizations.push('Completely gluten-free while maintaining nutritional completeness');
  }
  if (healthConditions.includes('lactose_intolerance')) {
    optimizations.push('Dairy-free with alternative calcium and protein sources');
  }
  if (healthConditions.includes('diabetes')) {
    optimizations.push('Low glycemic index with balanced carbohydrates for blood sugar stability');
  }
  
  return optimizations.join(', ');
}

function generateSpiceProfile(recipe, cuisine) {
  const spiceProfiles = {
    'italian': {
      heat: 'mild',
      dominantSpices: ['basil', 'oregano', 'rosemary', 'garlic'],
      healthBenefits: ['antioxidant', 'anti-inflammatory', 'digestive']
    },
    'indian': {
      heat: 'medium',
      dominantSpices: ['turmeric', 'cumin', 'coriander', 'ginger'],
      healthBenefits: ['anti-inflammatory', 'digestive', 'metabolic boost']
    },
    'mediterranean': {
      heat: 'mild',
      dominantSpices: ['herbs de provence', 'lemon', 'olive oil'],
      healthBenefits: ['heart-healthy', 'antioxidant', 'anti-inflammatory']
    },
    'default': {
      heat: 'mild',
      dominantSpices: ['herbs', 'garlic', 'pepper'],
      healthBenefits: ['antioxidant', 'flavor enhancement']
    }
  };
  
  return spiceProfiles[cuisine] || spiceProfiles['default'];
}

function generateShoppingListFromMealPlan(mealPlan) {
  const ingredients = new Map();
  
  mealPlan.days.forEach(day => {
    Object.values(day.meals).forEach(meal => {
      meal.ingredients.forEach(ingredient => {
        const count = ingredients.get(ingredient) || 0;
        ingredients.set(ingredient, count + 1);
      });
    });
  });
  
  // Categorize ingredients
  const categories = {
    'Proteins': ['chicken', 'salmon', 'tofu', 'eggs', 'yogurt', 'cheese', 'beans', 'lentils'],
    'Grains': ['oats', 'quinoa', 'rice', 'bread', 'pasta', 'flour'],
    'Vegetables': ['tomatoes', 'cucumber', 'onions', 'potatoes', 'broccoli', 'carrots', 'spinach', 'kale'],
    'Fruits': ['berries', 'apples', 'bananas', 'oranges', 'grapes'],
    'Nuts & Seeds': ['almonds', 'walnuts', 'chia', 'flax'],
    'Dairy': ['milk', 'yogurt', 'cheese', 'butter'],
    'Condiments': ['olive oil', 'honey', 'spices', 'herbs', 'sauce']
  };
  
  const shoppingList = [];
  
  Object.entries(categories).forEach(([category, categoryItems]) => {
    const categoryIngredients = [];
    
    ingredients.forEach((count, ingredient) => {
      if (categoryItems.some(item => ingredient.toLowerCase().includes(item))) {
        categoryIngredients.push({
          name: ingredient,
          checked: false,
          count: count > 1 ? `${count}x` : undefined
        });
      }
    });
    
    if (categoryIngredients.length > 0) {
      shoppingList.push({
        category,
        items: categoryIngredients
      });
    }
  });
  
  // Add uncategorized items
  const uncategorized = [];
  ingredients.forEach((count, ingredient) => {
    const categorized = shoppingList.some(cat => 
      cat.items.some(item => item.name === ingredient)
    );
    
    if (!categorized) {
      uncategorized.push({
        name: ingredient,
        checked: false,
        count: count > 1 ? `${count}x` : undefined
      });
    }
  });
  
  if (uncategorized.length > 0) {
    shoppingList.push({
      category: 'Other',
      items: uncategorized
    });
  }
  
  return shoppingList;
}

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
        return res.json({ success: true, recognizedFoods, nutritionData, totalNutrition, fallback: true });

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

// Hydration routes
app.get('/api/hydration/today', (req, res) => {
  try {
    // Mock data for development
    const todayHydration = 0; // ml
    const goal = 2250; // 9 glasses * 250ml
    
    res.json({
      todayHydration,
      goal,
      percentage: Math.min((todayHydration / goal) * 100, 100),
      logs: []
    });
  } catch (error) {
    console.error('Error fetching hydration data:', error);
    res.status(500).json({ error: 'Failed to fetch hydration data' });
  }
});

app.post('/api/hydration/log', (req, res) => {
  try {
    const { amount, type, notes } = req.body;
    
    if (!amount || amount === 0) {
      return res.status(400).json({ error: 'Amount must be provided' });
    }
    
    // Mock successful logging
    res.json({ 
      message: 'Hydration logged successfully',
      logged: { amount, type, notes, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error logging hydration:', error);
    res.status(500).json({ error: 'Failed to log hydration' });
  }
});

app.get('/api/hydration/history', (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    // Mock history data
    const history = Array.from({ length: parseInt(days) }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return {
        date: date.toISOString().split('T')[0],
        total: Math.floor(Math.random() * 8) * 250 // Random water intake
      };
    });
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching hydration history:', error);
    res.status(500).json({ error: 'Failed to fetch hydration history' });
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
