const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Lightweight in-repo datasets to avoid DB migrations for v1
const DATA_DIR = path.join(__dirname, '..', 'data');
const PRODUCTS_PATH = path.join(DATA_DIR, 'india_products.json');
const ADDITIVES_PATH = path.join(DATA_DIR, 'india_additives.json');
const SUBMISSIONS_PATH = path.join(DATA_DIR, 'product_submissions.json');

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    return fallback;
  }
}

function writeJsonSafe(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    // ignore for now; caller handles UX
  }
}

function normalizeIngredientToken(token) {
  const t = token.trim().toLowerCase();
  return t
    .replace(/\./g, '')
    .replace(/\s+/g, ' ')
    .replace(/^ins\s*/i, 'e')
    .replace(/^e\s*(\d+)/i, 'e$1');
}

function extractTokens(ingredientsRaw = '') {
  const cleaned = (ingredientsRaw || '')
    .replace(/\(|\)|\[|\]/g, ',')
    .replace(/\s{2,}/g, ' ');
  const parts = cleaned.split(/,|;|\.|\//).map(p => normalizeIngredientToken(p)).filter(Boolean);
  // dedupe but keep order
  const seen = new Set();
  const tokens = [];
  for (const p of parts) {
    if (!seen.has(p)) {
      seen.add(p);
      tokens.push(p);
    }
  }
  return tokens;
}

function computeHealthScore(product, additivesKb) {
  const result = {
    score: 100,
    status: 'Approved',
    reasons: [],
    highlights: [], // {name, level: 'red'|'amber'|'green', note}
  };

  const per = product.per || 100; // assume per 100g baseline
  const n = product.nutrition || {};
  const ingRaw = product.ingredients_raw || '';
  const tokens = extractTokens(ingRaw);

  // ultra-processing proxy
  const ultraCats = ['instant noodles', 'potato chips', 'sugar confectionery', 'processed meat', 'premix', 'soft drink', 'cola', 'energy drink', 'breakfast cereal (sweetened)'];
  if (ultraCats.some(c => (product.category || '').toLowerCase().includes(c))) {
    result.score -= 18;
    result.reasons.push('Ultra-processed category');
  }

  // Added sugar penalty
  if (typeof n.sugar === 'number') {
    const sugar = n.sugar; // per 100
    if (sugar > 5) result.score -= Math.min(25, Math.floor(sugar - 5));
    if (sugar > 22.5) {
      result.score -= 15;
      result.reasons.push('High sugar');
    }
  }

  // Sodium penalty
  if (typeof n.sodium === 'number') {
    const sodium = n.sodium; // mg per 100
    if (sodium > 120) result.score -= Math.min(20, Math.floor((sodium - 120) / 100));
    if (sodium > 600) {
      result.score -= 15;
      result.reasons.push('High sodium');
    }
  }

  // Fats
  if (typeof n.trans_fat === 'number' && n.trans_fat > 0) {
    result.score -= 25;
    result.status = 'Not Approved';
    result.reasons.push('Contains trans fat');
  }
  if (typeof n.sat_fat === 'number' && n.sat_fat > 5) {
    result.score -= 5;
  }

  // Ingredient flags via KB
  const tokensSet = new Set(tokens);
  const risky = [];
  const cautions = [];

  for (const add of readJsonSafe(ADDITIVES_PATH, [])) {
    const names = [add.name, ...(add.aliases || [])].map(s => normalizeIngredientToken(s));
    const present = names.some(nm => tokensSet.has(nm));
    if (!present) continue;
    const level = add.level || 'amber';
    if (level === 'red') {
      result.score -= add.severity || 10;
      risky.push(add);
      result.reasons.push(add.short || add.name);
      result.status = result.status === 'Approved' && result.score >= 60 ? 'Caution' : result.status;
      result.status = result.score < 60 ? 'Not Approved' : result.status;
      result.highlights.push({ name: add.name, level: 'red', note: add.short || 'Avoid frequent use' });
    } else if (level === 'amber') {
      result.score -= Math.min(10, add.severity || 5);
      cautions.push(add);
      result.highlights.push({ name: add.name, level: 'amber', note: add.short || 'Limit intake' });
    } else {
      result.highlights.push({ name: add.name, level: 'green', note: 'Generally safe' });
    }
  }

  // Palm/palmolein penalty
  if ([...tokensSet].some(t => t.includes('palm') || t.includes('palmolein'))) {
    result.score -= 7;
    result.reasons.push('Refined palm oil/palmolein');
  }

  // Positives
  const positive = ['whole wheat', 'millets', 'ragi', 'jowar', 'bajra', 'oats', 'nuts', 'almonds', 'peanuts', 'chana', 'moong', 'urad', 'rajma', 'chickpea'];
  if ([...tokensSet].some(t => positive.some(p => t.includes(p)))) {
    result.score += 6;
  }

  // Clamp
  if (result.score > 100) result.score = 100;
  if (result.score < 0) result.score = 0;

  if (result.status === 'Approved' && (result.score < 80)) result.status = 'Caution';
  if (result.score < 60) result.status = 'Not Approved';

  return result;
}

async function fetchFromOpenFoodFacts(gtin) {
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(gtin)}.json`;
    const resp = await fetch(url, { headers: { 'User-Agent': 'NutriAI-Oracle/1.0' } });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json || json.status !== 1 || !json.product) return null;
    const p = json.product;
    const nutr = p.nutriments || {};

    // Map to our expected structure
    const product = {
      id: 0,
      gtin,
      brand: p.brands || p.brand || 'Unknown',
      name: p.product_name || p.generic_name || 'Unknown product',
      variant: p.quantity || '',
      category: (p.categories || '').split(',').shift() || '',
      veg_mark: undefined,
      per: 100,
      nutrition: {
        energy: typeof nutr['energy-kcal_100g'] === 'number' ? nutr['energy-kcal_100g'] : undefined,
        protein: typeof nutr.proteins_100g === 'number' ? nutr.proteins_100g : undefined,
        fat: typeof nutr.fat_100g === 'number' ? nutr.fat_100g : undefined,
        sat_fat: typeof nutr['saturated-fat_100g'] === 'number' ? nutr['saturated-fat_100g'] : undefined,
        trans_fat: typeof nutr['trans-fat_100g'] === 'number' ? nutr['trans-fat_100g'] : undefined,
        carbs: typeof nutr.carbohydrates_100g === 'number' ? nutr.carbohydrates_100g : undefined,
        sugar: typeof nutr.sugars_100g === 'number' ? nutr.sugars_100g : undefined,
        sodium: typeof nutr.sodium_100g === 'number' ? Math.round(nutr.sodium_100g * 1000) : (typeof nutr.salt_100g === 'number' ? Math.round(nutr.salt_100g * 400) : undefined),
        fiber: typeof nutr.fiber_100g === 'number' ? nutr.fiber_100g : undefined
      },
      ingredients_raw: p.ingredients_text || ''
    };
    return product;
  } catch (e) {
    return null;
  }
}

router.get('/lookup', async (req, res) => {
  try {
    const gtin = String(req.query.gtin || '').trim();
    if (!gtin) return res.status(400).json({ error: 'gtin required' });

    const products = readJsonSafe(PRODUCTS_PATH, []);
    const additives = readJsonSafe(ADDITIVES_PATH, []);
    let product = products.find(p => String(p.gtin) === gtin);

    // Fallback: OpenFoodFacts lookup
    if (!product) {
      const offProduct = await fetchFromOpenFoodFacts(gtin);
      if (offProduct) {
        product = offProduct;
      }
    }

    if (!product) return res.status(200).json({ status: 'Unknown', product: null });

    const score = computeHealthScore(product, additives);
    return res.json({ status: score.status, score, product });
  } catch (e) {
    return res.status(500).json({ error: 'lookup_failed', details: e.message });
  }
});

router.post('/submit', express.json(), async (req, res) => {
  try {
    const payload = req.body || {};
    const submissions = readJsonSafe(SUBMISSIONS_PATH, []);
    payload.id = submissions.length + 1;
    payload.submitted_at = new Date().toISOString();
    submissions.push(payload);
    writeJsonSafe(SUBMISSIONS_PATH, submissions);
    return res.json({ ok: true, submission_id: payload.id });
  } catch (e) {
    return res.status(500).json({ error: 'submit_failed', details: e.message });
  }
});

router.get('/kb/additives', (req, res) => {
  const additives = readJsonSafe(ADDITIVES_PATH, []);
  res.json({ additives });
});

router.get('/education', (req, res) => {
  res.json({
    articles: [
      { id: 'label-basics', title: 'Label Reading Basics (India)', lang: 'en', summary: 'Understand per 100g, serving size, and claims.' },
      { id: 'oil-guide', title: 'Edible Oils: Refined vs Cold-Pressed', lang: 'en', summary: 'Picking daily-use oils wisely.' },
      { id: 'school-snacks', title: 'Smarter School Snacks', lang: 'en', summary: 'Lower-sugar, whole-food swaps for tiffins.' }
    ]
  });
});

module.exports = router; 