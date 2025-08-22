const { db, runQuery } = require('./database');

// Migration system for database schema updates
const migrations = [
  {
    version: 1,
    name: 'add_indexes_for_performance',
    up: async () => {
      // Add indexes for better query performance
      await runQuery('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, created_at)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_food_items_meal ON food_items(meal_id)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_workouts_user ON workout_recommendations(user_id)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_mood_user_date ON mood_entries(user_id, created_at)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_hydration_user_date ON hydration_logs(user_id, created_at)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_steps_user_date ON steps_logs(user_id, created_at)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_shared_progress_public ON shared_progress(is_public, created_at)');
    }
  },
  {
    version: 2,
    name: 'add_user_preferences_table',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL UNIQUE,
          theme TEXT DEFAULT 'light',
          language TEXT DEFAULT 'en',
          timezone TEXT DEFAULT 'UTC',
          notifications_enabled BOOLEAN DEFAULT 1,
          email_notifications BOOLEAN DEFAULT 1,
          push_notifications BOOLEAN DEFAULT 0,
          privacy_level TEXT DEFAULT 'private',
          data_sharing_consent BOOLEAN DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    }
  },
  {
    version: 3,
    name: 'add_audit_log_table',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          action TEXT NOT NULL,
          entity_type TEXT,
          entity_id INTEGER,
          old_value TEXT,
          new_value TEXT,
          ip_address TEXT,
          user_agent TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
        )
      `);
      await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id)');
      await runQuery('CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at)');
    }
  },
  {
    version: 4,
    name: 'add_api_keys_table',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS api_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          key_hash TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          last_used DATETIME,
          expires_at DATETIME,
          is_active BOOLEAN DEFAULT 1,
          permissions TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      await runQuery('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)');
    }
  },
  {
    version: 5,
    name: 'add_notifications_table',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          data TEXT,
          is_read BOOLEAN DEFAULT 0,
          read_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      await runQuery('CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)');
    }
  },
  {
    version: 6,
    name: 'add_data_export_requests',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS data_export_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          status TEXT DEFAULT 'pending',
          file_path TEXT,
          expires_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          completed_at DATETIME,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
    }
  },
  {
    version: 7,
    name: 'add_health_conditions_table',
    up: async () => {
      await runQuery(`
        CREATE TABLE IF NOT EXISTS health_conditions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          condition_name TEXT NOT NULL,
          diagnosed_date TEXT,
          severity TEXT,
          medications TEXT,
          notes TEXT,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `);
      await runQuery('CREATE INDEX IF NOT EXISTS idx_health_conditions_user ON health_conditions(user_id)');
    }
  },
  {
    version: 8,
    name: 'add_health_metrics_table',
    up: async () => {
      try {
        await runQuery(`
          CREATE TABLE IF NOT EXISTS health_metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric_type TEXT NOT NULL,
            value REAL NOT NULL,
            unit TEXT,
            notes TEXT,
            measured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Health metrics table created successfully');
      } catch (error) {
        console.error('Error in migration 8:', error);
        throw error;
      }
    }
  },
  {
    version: 9,
    name: 'add_health_alerts_table',
    up: async () => {
      try {
        await runQuery(`
          CREATE TABLE IF NOT EXISTS health_alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            alert_type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            recommendations TEXT,
            is_acknowledged BOOLEAN DEFAULT 0,
            acknowledged_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
          )
        `);
        console.log('✅ Health alerts table created successfully');
      } catch (error) {
        console.error('Error in migration 9:', error);
        throw error;
      }
    }
  }
];

// Migration runner
async function runMigrations() {
  try {
    // Create migrations table if it doesn't exist
    await runQuery(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get current version
    const result = await new Promise((resolve, reject) => {
      db.get('SELECT MAX(version) as version FROM schema_migrations', (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const currentVersion = result?.version || 0;
    console.log(`📊 Current database version: ${currentVersion}`);

    // Run pending migrations with better error handling
    for (const migration of migrations) {
      if (migration.version > currentVersion) {
        try {
          console.log(`🔄 Running migration ${migration.version}: ${migration.name}`);
          await migration.up();
          await runQuery(
            'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
            [migration.version, migration.name]
          );
          console.log(`✅ Migration ${migration.version} completed`);
        } catch (migrationError) {
          console.error(`❌ Migration ${migration.version} failed:`, migrationError.message);
          // Continue with other migrations instead of crashing
          continue;
        }
      }
    }

    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Migration error:', error);
    // Don't throw error, just log it
    console.log('⚠️ Continuing with application startup...');
  }
}

module.exports = { runMigrations }; 