const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
// Database file path
const dbPath = path.join(__dirname, '../data/nutriai.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✅ Connected to NutriAI database');
    initializeTables();
  }
});

// Helper function to run queries with promises
function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
}

// Helper function to get single row
function getRow(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Helper function to get multiple rows
function getAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Initialize database tables
async function initializeTables() {
  try {
    // Users table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar TEXT,
        phone TEXT,
        age INTEGER,
        current_weight REAL,
        target_weight REAL,
        weight_unit TEXT DEFAULT 'kg',
        sleep_time TEXT DEFAULT '23:30',
        wake_time TEXT DEFAULT '07:30',
        water_goal INTEGER DEFAULT 9,
        step_goal INTEGER DEFAULT 10000,
        onboarding_completed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Ensure avatar column exists (for older DBs)
    try {
      const info = await getRow("PRAGMA table_info(users)");
      // If query succeeds, check presence of avatar via pragma list
      const columns = await getAll("PRAGMA table_info(users)");
      const hasAvatar = columns.some(c => c.name === 'avatar');
      if (!hasAvatar) {
        await runQuery('ALTER TABLE users ADD COLUMN avatar TEXT');
        console.log('🛠️ Added missing users.avatar column');
      }
      // Ensure 2FA columns exist
      const hasTwoFAEnabled = columns.some(c => c.name === 'twofa_enabled');
      if (!hasTwoFAEnabled) {
        await runQuery("ALTER TABLE users ADD COLUMN twofa_enabled BOOLEAN DEFAULT 0");
        console.log('🛠️ Added missing users.twofa_enabled column');
      }
      const hasTwoFASecret = columns.some(c => c.name === 'twofa_secret');
      if (!hasTwoFASecret) {
        await runQuery("ALTER TABLE users ADD COLUMN twofa_secret TEXT");
        console.log('🛠️ Added missing users.twofa_secret column');
      }
    } catch (e) {
      // ignore
    }

    // User goals table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        goal_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // User medical conditions table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_medical_conditions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        condition_type TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Meals table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS meals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        meal_type TEXT NOT NULL,
        image_url TEXT,
        total_calories REAL DEFAULT 0,
        total_protein REAL DEFAULT 0,
        total_carbs REAL DEFAULT 0,
        total_fat REAL DEFAULT 0,
        total_sugar REAL DEFAULT 0,
        total_sodium REAL DEFAULT 0,
        total_fiber REAL DEFAULT 0,
        is_healthy BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Food items table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS food_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        meal_id INTEGER NOT NULL,
        food_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        sugar REAL DEFAULT 0,
        sodium REAL DEFAULT 0,
        fiber REAL DEFAULT 0,
        confidence_score REAL DEFAULT 0,
        is_healthy BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (meal_id) REFERENCES meals (id)
      )
    `);

    // Migration: Add missing columns to existing tables
    try {
      // Check if meals table has image_url column
      const mealsColumns = await getAll("PRAGMA table_info(meals)");
      const hasImageUrl = mealsColumns.some(c => c.name === 'image_url');
      if (!hasImageUrl) {
        await runQuery('ALTER TABLE meals ADD COLUMN image_url TEXT');
        console.log('🛠️ Added missing meals.image_url column');
      }
      
      const hasIsHealthy = mealsColumns.some(c => c.name === 'is_healthy');
      if (!hasIsHealthy) {
        await runQuery('ALTER TABLE meals ADD COLUMN is_healthy BOOLEAN DEFAULT 1');
        console.log('🛠️ Added missing meals.is_healthy column');
      }

      // Check if food_items table has food_name column (migrate from 'name' if needed)
      const foodItemsColumns = await getAll("PRAGMA table_info(food_items)");
      const hasFoodName = foodItemsColumns.some(c => c.name === 'food_name');
      const hasName = foodItemsColumns.some(c => c.name === 'name');
      
      if (!hasFoodName && hasName) {
        // Rename 'name' column to 'food_name'
        await runQuery('ALTER TABLE food_items RENAME COLUMN name TO food_name');
        console.log('🛠️ Renamed food_items.name to food_items.food_name');
      } else if (!hasFoodName && !hasName) {
        // Add food_name column if neither exists
        await runQuery('ALTER TABLE food_items ADD COLUMN food_name TEXT NOT NULL DEFAULT ""');
        console.log('🛠️ Added missing food_items.food_name column');
      }
    } catch (error) {
      console.log('Migration completed (some columns may already exist)');
    }

    // Workouts table (recommendations and logged sessions)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS workout_recommendations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        recommendation_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        duration INTEGER DEFAULT 0,
        intensity TEXT DEFAULT 'moderate',
        calories_burn REAL DEFAULT 0,
        muscle_groups TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Nutrition goals table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        daily_calories REAL DEFAULT 2000,
        daily_protein REAL DEFAULT 150,
        daily_carbs REAL DEFAULT 250,
        daily_fat REAL DEFAULT 65,
        daily_sugar REAL DEFAULT 50,
        daily_sodium REAL DEFAULT 2300,
        daily_fiber REAL DEFAULT 25,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Mood entries table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS mood_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        mood_level INTEGER NOT NULL,
        energy_level INTEGER NOT NULL,
        productivity_level INTEGER NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Mood correlations table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS mood_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        correlation_type TEXT NOT NULL,
        correlation_strength REAL NOT NULL,
        confidence_score REAL NOT NULL,
        recommendation TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Hydration logs table (water intake tracking)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS hydration_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,            -- number of glasses (can be negative for adjustments)
        unit TEXT DEFAULT 'glass',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Steps logs table (manual steps adjustments)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS steps_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Portion estimations table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS portion_estimations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        food_name TEXT NOT NULL,
        estimated_quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        confidence_score REAL NOT NULL,
        calories REAL DEFAULT 0,
        protein REAL DEFAULT 0,
        carbs REAL DEFAULT 0,
        fat REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Wearable activity table (legacy)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS wearable_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        steps INTEGER DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        active_minutes INTEGER DEFAULT 0,
        heart_rate INTEGER DEFAULT 0,
        distance REAL DEFAULT 0,
        sleep_hours REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Enhanced wearable sync table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS wearable_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        device_type TEXT NOT NULL,
        steps INTEGER DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        active_minutes INTEGER DEFAULT 0,
        heart_rate_avg TEXT, -- JSON for detailed heart rate data
        sleep_data TEXT, -- JSON for sleep analysis
        workout_sessions TEXT, -- JSON for workout data
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Daily energy balance table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS daily_energy_balance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        calories_consumed REAL DEFAULT 0,
        calories_burned REAL DEFAULT 0,
        energy_balance REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, date),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Workout adjustments table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS workout_adjustments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_workout TEXT NOT NULL, -- JSON
        adjusted_workout TEXT NOT NULL, -- JSON
        activity_data TEXT NOT NULL, -- JSON
        energy_balance REAL DEFAULT 0,
        adjustment_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // HealthKit sync table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS healthkit_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        raw_data TEXT NOT NULL, -- JSON
        processed_data TEXT NOT NULL, -- JSON
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Google Fit sync table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS googlefit_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        raw_data TEXT NOT NULL, -- JSON
        processed_data TEXT NOT NULL, -- JSON
        sync_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Micronutrient goals table (enhanced)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS micronutrient_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nutrient TEXT NOT NULL,
        target_value REAL,
        target_percentage REAL,
        timeframe TEXT DEFAULT 'monthly', -- daily, weekly, monthly
        priority TEXT DEFAULT 'medium', -- low, medium, high
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, nutrient),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Goal achievements table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS goal_achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        goal_type TEXT NOT NULL, -- micronutrient, health, fitness
        goal_name TEXT NOT NULL,
        achievement_data TEXT, -- JSON
        achieved_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Health risk assessments table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS health_risk_assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        overall_risk TEXT NOT NULL, -- low, medium, high
        risk_factors TEXT NOT NULL, -- JSON array
        risk_score INTEGER DEFAULT 0,
        assessment_data TEXT, -- JSON
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Nutrition trends analysis table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS nutrition_trends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        period TEXT NOT NULL, -- week, month, quarter
        nutrient TEXT NOT NULL,
        trend_direction TEXT, -- increasing, decreasing, stable
        slope REAL DEFAULT 0,
        volatility REAL DEFAULT 0,
        prediction REAL DEFAULT 0,
        confidence REAL DEFAULT 0,
        analysis_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Early warnings table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS early_warnings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        warning_type TEXT NOT NULL, -- early_warning, chronic_deficiency
        severity TEXT NOT NULL, -- low, medium, high
        nutrient TEXT NOT NULL,
        message TEXT NOT NULL,
        recommendation TEXT,
        target_reduction TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Enhanced genomic data table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_genomic_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        raw_data TEXT NOT NULL, -- JSON with raw genomic data
        processed_data TEXT NOT NULL, -- JSON with processed variants
        key_variants TEXT NOT NULL, -- JSON with nutrition-related variants
        data_source TEXT NOT NULL, -- 23andme, ancestrydna, vcf, etc.
        consent_given BOOLEAN NOT NULL DEFAULT 0,
        privacy_level TEXT DEFAULT 'high', -- low, medium, high
        share_for_research BOOLEAN DEFAULT 0,
        anonymize_data BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Genomic nutrition profiles table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS genomic_nutrition_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        genetic_factors TEXT NOT NULL, -- JSON with genetic factors affecting nutrition
        risk_assessment TEXT NOT NULL, -- JSON with nutritional risk assessment
        metabolism_profile TEXT NOT NULL, -- JSON with metabolism analysis
        vitamin_recommendations TEXT, -- JSON with vitamin-specific recommendations
        mineral_recommendations TEXT, -- JSON with mineral-specific recommendations
        dietary_modifications TEXT, -- JSON with dietary modification recommendations
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Genetic test results table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS genetic_test_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        gene_name TEXT NOT NULL,
        variant_id TEXT NOT NULL, -- rs number or other identifier
        genotype TEXT NOT NULL,
        impact_score INTEGER DEFAULT 0, -- 0-100 scale
        nutrition_relevance TEXT, -- how this variant affects nutrition
        recommendations TEXT, -- JSON with specific recommendations
        confidence_level TEXT DEFAULT 'high', -- low, medium, high
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Meal plans table (legacy)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_data TEXT NOT NULL,
        days INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Enhanced meal plans table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS enhanced_meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_data TEXT NOT NULL, -- JSON with meals and recipes
        shopping_list TEXT, -- JSON with detailed shopping list
        days INTEGER DEFAULT 7,
        calorie_goal INTEGER DEFAULT 2000,
        dietary_preferences TEXT, -- JSON array
        cuisine_preferences TEXT, -- JSON array
        skill_level TEXT DEFAULT 'intermediate', -- beginner, intermediate, advanced
        budget_range TEXT DEFAULT 'medium', -- low, medium, high
        location TEXT, -- for local ingredient availability
        nutritional_summary TEXT, -- JSON with nutrition analysis
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Micronutrient goals table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS micronutrient_goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        goals_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Challenges table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS challenges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        creator_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        duration INTEGER NOT NULL,
        goal TEXT NOT NULL,
        participants_limit INTEGER DEFAULT 10,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (creator_id) REFERENCES users (id)
      )
    `);

    // Challenge participants table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS challenge_participants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        challenge_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (challenge_id) REFERENCES challenges (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Shared progress table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS shared_progress (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        is_public BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Community posts table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS community_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Post likes table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS post_likes (
        like_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES community_posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Post comments table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS post_comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES community_posts (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Genomic data table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS genomic_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        data_type TEXT NOT NULL,
        data_content TEXT NOT NULL,
        consent_given BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Micronutrient tracking table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS micronutrient_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        vitamin_a REAL DEFAULT 0,
        vitamin_c REAL DEFAULT 0,
        vitamin_d REAL DEFAULT 0,
        vitamin_e REAL DEFAULT 0,
        vitamin_k REAL DEFAULT 0,
        thiamine_b1 REAL DEFAULT 0,
        riboflavin_b2 REAL DEFAULT 0,
        niacin_b3 REAL DEFAULT 0,
        pantothenic_acid_b5 REAL DEFAULT 0,
        pyridoxine_b6 REAL DEFAULT 0,
        biotin_b7 REAL DEFAULT 0,
        folate_b9 REAL DEFAULT 0,
        cobalamin_b12 REAL DEFAULT 0,
        calcium REAL DEFAULT 0,
        iron REAL DEFAULT 0,
        magnesium REAL DEFAULT 0,
        phosphorus REAL DEFAULT 0,
        potassium REAL DEFAULT 0,
        sodium REAL DEFAULT 0,
        zinc REAL DEFAULT 0,
        copper REAL DEFAULT 0,
        manganese REAL DEFAULT 0,
        selenium REAL DEFAULT 0,
        iodine REAL DEFAULT 0,
        chromium REAL DEFAULT 0,
        molybdenum REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // User allergens table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS user_allergens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        allergen_name TEXT NOT NULL,
        severity TEXT DEFAULT 'moderate', -- mild, moderate, severe
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Allergen detection history table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS allergen_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        meal_id INTEGER,
        detected_allergens TEXT, -- JSON array of allergens
        confidence_score REAL DEFAULT 0,
        warning_triggered BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (meal_id) REFERENCES meals (id)
      )
    `);

    // Dynamic meal plans table (enhanced)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS dynamic_meal_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plan_type TEXT DEFAULT 'weekly', -- daily, weekly, monthly
        plan_data TEXT NOT NULL, -- JSON with meals, recipes, shopping list
        dietary_preferences TEXT, -- JSON array
        location_data TEXT, -- JSON with location preferences
        seasonality_data TEXT, -- JSON with seasonal preferences
        adaptation_history TEXT, -- JSON with user deviations
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Shopping lists table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS shopping_lists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        meal_plan_id INTEGER,
        list_data TEXT NOT NULL, -- JSON with categorized items
        location_optimized BOOLEAN DEFAULT 0,
        market_data TEXT, -- JSON with local market info
        estimated_cost REAL DEFAULT 0,
        currency TEXT DEFAULT 'USD',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (meal_plan_id) REFERENCES dynamic_meal_plans (id)
      )
    `);

    // Food swap suggestions table (enhanced)
    await runQuery(`
      CREATE TABLE IF NOT EXISTS food_swap_suggestions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        original_food TEXT NOT NULL,
        suggested_food TEXT NOT NULL,
        swap_reason TEXT, -- health, allergy, availability, preference
        health_score_improvement REAL DEFAULT 0,
        cultural_relevance REAL DEFAULT 0,
        local_availability REAL DEFAULT 0,
        price_comparison REAL DEFAULT 0,
        nutritional_comparison TEXT, -- JSON
        location_data TEXT, -- JSON
        accepted BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Enhanced mood tracking table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS enhanced_mood_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date DATE NOT NULL,
        time_of_day TIME NOT NULL,
        mood_score INTEGER NOT NULL, -- 1-10 scale
        energy_level INTEGER NOT NULL, -- 1-10 scale
        productivity_score INTEGER NOT NULL, -- 1-10 scale
        stress_level INTEGER NOT NULL, -- 1-10 scale
        sleep_quality INTEGER DEFAULT 0, -- 1-10 scale
        physical_symptoms TEXT, -- JSON array
        mental_clarity INTEGER DEFAULT 0, -- 1-10 scale
        social_engagement INTEGER DEFAULT 0, -- 1-10 scale
        exercise_completed BOOLEAN DEFAULT 0,
        medication_taken BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Nutrition mood correlations table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS nutrition_mood_correlations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        analysis_period TEXT NOT NULL, -- daily, weekly, monthly
        correlation_data TEXT NOT NULL, -- JSON with correlation analysis
        significant_patterns TEXT, -- JSON with identified patterns
        recommendations TEXT, -- JSON with AI recommendations
        confidence_score REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // AI portion estimation enhancements table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS ai_portion_estimations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        meal_id INTEGER,
        image_path TEXT,
        reference_objects TEXT, -- JSON array of detected reference objects
        portion_analysis TEXT NOT NULL, -- JSON with 3D analysis data
        confidence_score REAL DEFAULT 0,
        visual_feedback_data TEXT, -- JSON with overlay data
        macro_estimations TEXT, -- JSON with estimated macros
        accuracy_feedback REAL, -- User feedback on accuracy
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (meal_id) REFERENCES meals (id)
      )
    `);

    // Micronutrient deficiency alerts table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS micronutrient_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        nutrient_name TEXT NOT NULL,
        deficiency_level TEXT NOT NULL, -- mild, moderate, severe
        alert_message TEXT NOT NULL,
        recommended_foods TEXT, -- JSON array
        supplement_suggestions TEXT, -- JSON array
        local_alternatives TEXT, -- JSON array
        acknowledged BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Feedback chat tables
    await runQuery(`
      CREATE TABLE IF NOT EXISTS feedback_threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'open', -- open, closed
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS feedback_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        sender TEXT NOT NULL, -- user, admin
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES feedback_threads (id)
      )
    `);

    // Structured feedback requests
    await runQuery(`
      CREATE TABLE IF NOT EXISTS feedback_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT,
        problem TEXT,
        goal TEXT,
        impact TEXT,
        priority TEXT, -- low, medium, high, critical
        details TEXT,
        tags TEXT, -- JSON array
        summary TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (thread_id) REFERENCES feedback_threads (id),
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Addiction recovery plan tables
    await runQuery(`
      CREATE TABLE IF NOT EXISTS addiction_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        addiction_key TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        daily_reminder_time TEXT, -- 'HH:MM'
        status TEXT DEFAULT 'active', -- active, completed, canceled
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS addiction_checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        checkin_date DATE NOT NULL,
        followed_steps BOOLEAN DEFAULT 0,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(plan_id, checkin_date),
        FOREIGN KEY (plan_id) REFERENCES addiction_plans (id)
      )
    `);

    await runQuery(`
      CREATE TABLE IF NOT EXISTS addiction_plan_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        plan_id INTEGER NOT NULL,
        success_rate REAL DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        total_days INTEGER DEFAULT 0,
        completed_days INTEGER DEFAULT 0,
        missed_days INTEGER DEFAULT 0,
        suggestions TEXT, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (plan_id) REFERENCES addiction_plans (id)
      )
    `);

    // Recipes table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        cuisine TEXT,
        prep_time INTEGER,
        cook_time INTEGER,
        servings INTEGER,
        calories REAL,
        protein REAL,
        carbs REAL,
        fat REAL,
        sugar REAL,
        sodium REAL,
        fiber REAL,
        ingredients TEXT, -- JSON array of {name, quantity, unit}
        instructions TEXT, -- JSON array of steps
        tags TEXT, -- JSON array of strings (e.g., 'vegan', 'gluten_free', 'high_protein', 'spicy', 'comfort_food')
        image_url TEXT,
        source_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Database tables initialized');
    
    // Run migrations for additional improvements
    try {
      const { runMigrations } = require('./database-migrations');
      await runMigrations();
    } catch (migrationError) {
      console.error('⚠️ Migration error (continuing):', migrationError.message);
    }
    
    // Seed recipes after tables and migrations are complete
    try {
      const { seedRecipes } = require('../data/seed_recipes');
      await seedRecipes(runQuery);
    } catch (seedError) {
      console.error('⚠️ Recipe seeding error (continuing):', seedError.message);
    }

    // Seed a default demo user for development convenience
    try {
      const demoEmail = 'test@example.com';
      const existing = await getRow('SELECT id FROM users WHERE email = ?', [demoEmail]);
      if (!existing) {
        const hashed = await bcrypt.hash('password123', 12);
        const result = await runQuery(
          `INSERT INTO users (email, password, name, age) VALUES (?, ?, ?, ?)`,
          [demoEmail, hashed, 'Test User', 30]
        );
        console.log(`👤 Seeded demo user: ${demoEmail} (id=${result.id})`);
      }
    } catch (userSeedError) {
      console.error('⚠️ Demo user seeding error (continuing):', userSeedError.message);
    }
  } catch (error) {
    console.error('❌ Error initializing database tables:', error);
    // Don't throw error, just log it
    console.log('⚠️ Continuing with application startup...');
  }
}

module.exports = {
  db,
  runQuery,
  getRow,
  getAll
}; 