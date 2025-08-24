const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll } = require('../config/database');
const OpenAI = require('openai');

const router = express.Router();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test endpoint to verify database connection
router.get('/test', async (req, res) => {
  try {
    const products = await getAll('SELECT COUNT(*) as count FROM health_approved_products');
    res.json({ 
      message: 'Database connection working',
      productCount: products[0]?.count || 0
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({ error: 'Database connection failed', details: error.message });
  }
});

// Get product information by GTIN/barcode
router.get('/lookup', async (req, res) => {
  try {
    const { gtin } = req.query;
    
    if (!gtin) {
      return res.status(400).json({ error: 'GTIN/barcode is required' });
    }

    // Check if we have this product in our database
    const products = await getAll(
      'SELECT * FROM health_approved_products WHERE gtin = ?',
      [gtin]
    );

    const product = products.length > 0 ? products[0] : null;

    if (product) {
      return res.json({
        success: true,
        product: {
          gtin: product.gtin,
          name: product.name,
          brand: product.brand,
          category: product.category,
          ingredients: product.ingredients,
          allergens: product.allergens,
          nutritionInfo: product.nutrition_info,
          healthRating: product.health_rating,
          approvedBy: product.approved_by,
          approvalDate: product.approval_date
        }
      });
    }

    // If not in database, use AI to analyze the GTIN and provide information
    const prompt = `As a revolutionary product analyst, nutrition expert, and health innovation specialist, analyze this GTIN/barcode: ${gtin} and provide mind-blowing, breakthrough insights about what this product represents and how it can transform the user's health.

Provide REVOLUTIONARY analysis in this format:

**🚀 QUANTUM PRODUCT IDENTIFICATION**:
- [Specific product type with revolutionary accuracy]
- [Brand insights and market positioning]
- [Breakthrough product category analysis]

**💎 INGREDIENT REVOLUTION**:
- [Specific ingredients this product likely contains]
- [Hidden superfoods or concerning additives]
- [Revolutionary ingredient combinations they've never heard of]

**⚡ HEALTH TRANSFORMATION POTENTIAL**:
- [How this product could revolutionize their health]
- [Specific health benefits with percentages and numbers]
- [Breakthrough health applications they never considered]

**🔬 ALLERGEN INNOVATION**:
- [Revolutionary allergen detection strategies]
- [Hidden allergen risks they need to know]
- [Breakthrough safe alternatives for their conditions]

**🎯 REVOLUTIONARY CONSUMPTION STRATEGY**:
- [Optimal timing for maximum health benefits]
- [Synergistic food pairings for this product]
- [Breakthrough portion control techniques]

**💡 GAME-CHANGING DISCOVERIES**:
- [Unexpected health connections they never knew]
- [Hidden superfood properties of this product]
- [Revolutionary ways to use this product for health]

Make this absolutely mind-blowing! Use specific numbers, percentages, revolutionary insights, and breakthrough recommendations that will make them excited about the product's potential to transform their health!`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800
    });

    const aiAnalysis = completion.choices[0].message.content;

    res.json({
      success: true,
      gtin: gtin,
      aiAnalysis: aiAnalysis,
      message: 'Product not found in database, but here is AI analysis based on GTIN pattern'
    });

  } catch (error) {
    console.error('Error looking up product:', error);
    res.status(500).json({ error: 'Failed to lookup product' });
  }
});

// Add new product to database
router.post('/products', authenticateToken, async (req, res) => {
  try {
    const { gtin, name, brand, category, ingredients, allergens, nutritionInfo, healthRating } = req.body;

    if (!gtin || !name || !brand) {
      return res.status(400).json({ error: 'GTIN, name, and brand are required' });
    }

    await runQuery(
      `INSERT INTO health_approved_products 
       (gtin, name, brand, category, ingredients, allergens, nutrition_info, health_rating, approved_by, approval_date) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [gtin, name, brand, category || '', ingredients || '', allergens || '', nutritionInfo || '', healthRating || 'pending', req.user.id, new Date().toISOString()]
    );

    res.json({ message: 'Product added successfully' });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: 'Failed to add product' });
  }
});

// Get all approved products
router.get('/products', async (req, res) => {
  try {
    const products = await getAll(
      'SELECT * FROM health_approved_products ORDER BY approval_date DESC'
    );
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Seed sample products for demonstration
router.post('/seed-products', async (req, res) => {
  try {
    const sampleProducts = [
      {
        gtin: '8901088000345',
        name: 'Organic Quinoa Protein Bars',
        brand: 'HealthVibe',
        category: 'Snack Bars',
        ingredients: 'Organic quinoa, dates, almonds, chia seeds, coconut oil, vanilla extract',
        allergens: 'Tree nuts (almonds)',
        nutrition_info: '{"calories": 180, "protein": 8, "carbs": 22, "fat": 9, "fiber": 4}',
        health_rating: 'approved'
      },
      {
        gtin: '8901396514503',
        name: 'Super Greens Smoothie Mix',
        brand: 'NutriBlast',
        category: 'Beverage Mixes',
        ingredients: 'Spirulina, chlorella, wheatgrass, moringa, matcha, acai berry',
        allergens: 'None',
        nutrition_info: '{"calories": 45, "protein": 6, "carbs": 8, "fat": 0, "fiber": 3}',
        health_rating: 'approved'
      }
    ];

    for (const product of sampleProducts) {
      try {
        await runQuery(
          `INSERT OR IGNORE INTO health_approved_products 
           (gtin, name, brand, category, ingredients, allergens, nutrition_info, health_rating) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [product.gtin, product.name, product.brand, product.category, product.ingredients, product.allergens, product.nutrition_info, product.health_rating]
        );
      } catch (insertError) {
        console.log(`Product ${product.gtin} already exists or error:`, insertError.message);
      }
    }

    res.json({ message: 'Sample products seeded successfully' });
  } catch (error) {
    console.error('Error seeding products:', error);
    res.status(500).json({ error: 'Failed to seed sample products' });
  }
});

module.exports = router;
