const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll, getRow } = require('../config/database');

// Initialize sleep tracking tables
const initializeSleepTables = async () => {
  try {
    // Sleep data table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS sleep_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        bed_time TEXT NOT NULL,
        wake_time TEXT NOT NULL,
        duration REAL NOT NULL,
        quality TEXT DEFAULT 'unknown',
        notes TEXT,
        recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Sleep settings table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS sleep_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL UNIQUE,
        sleep_goal INTEGER DEFAULT 8,
        bed_time TEXT DEFAULT '23:30',
        wake_time TEXT DEFAULT '07:30',
        bed_time_reminder BOOLEAN DEFAULT 1,
        track_sleep_reminder BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    // Sleep analysis table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS sleep_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        week_start_date DATE NOT NULL,
        total_sleep_hours REAL DEFAULT 0,
        average_sleep_hours REAL DEFAULT 0,
        sleep_deficit_hours REAL DEFAULT 0,
        days_meeting_goal INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);

    console.log('✅ Sleep tracking tables initialized');
  } catch (error) {
    console.error('❌ Error initializing sleep tables:', error);
  }
};

initializeSleepTables();

// Get sleep data
router.get('/data', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get today's sleep data
    const today = new Date().toISOString().split('T')[0];
    const todaySleep = await getRow(
      'SELECT duration FROM sleep_data WHERE user_id = ? AND DATE(recorded_at) = ? ORDER BY recorded_at DESC LIMIT 1',
      [userId, today]
    );

    // Get sleep settings
    let settings = await getRow(
      'SELECT * FROM sleep_settings WHERE user_id = ?',
      [userId]
    );

    if (!settings) {
      // Create default settings
      await runQuery(
        'INSERT INTO sleep_settings (user_id, sleep_goal, bed_time, wake_time) VALUES (?, ?, ?, ?)',
        [userId, 8, '23:30', '07:30']
      );
      settings = await getRow(
        'SELECT * FROM sleep_settings WHERE user_id = ?',
        [userId]
      );
    }

    // Get weekly sleep data
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weeklyData = await getAll(
      `SELECT 
        DATE(recorded_at) as date,
        duration,
        bed_time,
        wake_time
       FROM sleep_data 
       WHERE user_id = ? AND DATE(recorded_at) >= ? 
       ORDER BY recorded_at DESC`,
      [userId, weekStartStr]
    );

    // Calculate weekly statistics
    const weeklyStats = calculateWeeklyStats(weeklyData, settings.sleep_goal);

    res.json({
      todaySleep: todaySleep ? todaySleep.duration : 0,
      settings: {
        sleepGoal: settings.sleep_goal,
        bedTime: settings.bed_time,
        wakeTime: settings.wake_time,
        bedTimeReminder: settings.bed_time_reminder,
        trackSleepReminder: settings.track_sleep_reminder
      },
      weeklyData: weeklyStats.weeklyData,
      weeklyStats: weeklyStats
    });
  } catch (error) {
    console.error('Error fetching sleep data:', error);
    res.status(500).json({ error: 'Failed to fetch sleep data' });
  }
});

// Update sleep goal
router.post('/goal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal } = req.body;

    if (!goal || goal < 1 || goal > 24) {
      return res.status(400).json({ error: 'Invalid sleep goal' });
    }

    await runQuery(
      'UPDATE sleep_settings SET sleep_goal = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [goal, userId]
    );

    res.json({ success: true, message: 'Sleep goal updated' });
  } catch (error) {
    console.error('Error updating sleep goal:', error);
    res.status(500).json({ error: 'Failed to update sleep goal' });
  }
});

// Update sleep times
router.post('/times', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, time } = req.body;

    if (!type || !time || !['bedTime', 'wakeTime'].includes(type)) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    const column = type === 'bedTime' ? 'bed_time' : 'wake_time';
    
    await runQuery(
      `UPDATE sleep_settings SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [time, userId]
    );

    res.json({ success: true, message: `${type} updated` });
  } catch (error) {
    console.error('Error updating sleep times:', error);
    res.status(500).json({ error: 'Failed to update sleep times' });
  }
});

// Log sleep
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bedTime, wakeTime, duration, quality, notes, sleepDate } = req.body;

    console.log('Sleep log request:', { userId, bedTime, wakeTime, duration, quality, notes, sleepDate });

    if (!bedTime || !wakeTime || !duration) {
      console.log('Missing required fields:', { bedTime, wakeTime, duration });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(bedTime) || !timeRegex.test(wakeTime)) {
      console.log('Invalid time format:', { bedTime, wakeTime });
      return res.status(400).json({ error: 'Invalid time format. Use HH:MM format.' });
    }

    // Use provided date or default to today
    const dateToUse = sleepDate || new Date().toISOString().split('T')[0];

    const result = await runQuery(
      'INSERT INTO sleep_data (user_id, bed_time, wake_time, duration, quality, notes, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, bedTime, wakeTime, duration, quality || 'unknown', notes || '', `${dateToUse} 00:00:00`]
    );

    // Update weekly analysis
    await updateWeeklyAnalysis(userId);

    console.log('Sleep logged successfully:', result.lastID);

    res.json({
      success: true,
      message: 'Sleep logged successfully',
      sleepId: result.lastID
    });
  } catch (error) {
    console.error('Error logging sleep:', error);
    res.status(500).json({ error: 'Failed to log sleep' });
  }
});

// Update reminders
router.post('/reminders', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bedTimeReminder, trackSleepReminder } = req.body;

    await runQuery(
      'UPDATE sleep_settings SET bed_time_reminder = ?, track_sleep_reminder = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [bedTimeReminder, trackSleepReminder, userId]
    );

    res.json({ success: true, message: 'Reminders updated' });
  } catch (error) {
    console.error('Error updating reminders:', error);
    res.status(500).json({ error: 'Failed to update reminders' });
  }
});

// Get sleep history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 30 } = req.query;

    const history = await getAll(
      `SELECT 
        id,
        bed_time,
        wake_time,
        duration,
        quality,
        notes,
        recorded_at
       FROM sleep_data 
       WHERE user_id = ? 
       ORDER BY recorded_at DESC 
       LIMIT ?`,
      [userId, parseInt(days)]
    );

    res.json({ history });
  } catch (error) {
    console.error('Error fetching sleep history:', error);
    res.status(500).json({ error: 'Failed to fetch sleep history' });
  }
});

// Get sleep analysis
router.get('/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'week', start, end } = req.query;

    let analysis;
    if (period === 'week') {
      analysis = await getWeeklyAnalysis(userId);
    } else if (period === 'month') {
      analysis = await getMonthlyAnalysis(userId);
    } else if (period === 'custom' && start && end) {
      analysis = await getCustomRangeAnalysis(userId, start, end);
    } else {
      analysis = await getWeeklyAnalysis(userId);
    }

    res.json(analysis);
  } catch (error) {
    console.error('Error fetching sleep analysis:', error);
    res.status(500).json({ error: 'Failed to fetch sleep analysis' });
  }
});

// Helper functions
function calculateWeeklyStats(weeklyData, sleepGoal) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyDataArray = new Array(7).fill(0);
  
  let totalSleep = 0;
  let daysMeetingGoal = 0;
  let totalDeficit = 0;

  weeklyData.forEach(record => {
    const date = new Date(record.date);
    const dayIndex = date.getDay();
    weeklyDataArray[dayIndex] = record.duration;
    
    totalSleep += record.duration;
    if (record.duration >= sleepGoal) {
      daysMeetingGoal++;
    }
    if (record.duration < sleepGoal) {
      totalDeficit += (sleepGoal - record.duration);
    }
  });

  return {
    weeklyData: weeklyDataArray,
    totalSleep,
    averageSleep: weeklyData.length > 0 ? totalSleep / weeklyData.length : 0,
    daysMeetingGoal,
    totalDeficit,
    sleepGoal
  };
}

async function updateWeeklyAnalysis(userId) {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const weeklyData = await getAll(
      `SELECT duration FROM sleep_data 
       WHERE user_id = ? AND DATE(recorded_at) >= ?`,
      [userId, weekStartStr]
    );

    const settings = await getRow(
      'SELECT sleep_goal FROM sleep_settings WHERE user_id = ?',
      [userId]
    );

    const stats = calculateWeeklyStats(weeklyData, settings.sleep_goal);

    // Update or insert weekly analysis
    await runQuery(
      `INSERT OR REPLACE INTO sleep_analysis 
       (user_id, week_start_date, total_sleep_hours, average_sleep_hours, sleep_deficit_hours, days_meeting_goal) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, weekStartStr, stats.totalSleep, stats.averageSleep, stats.totalDeficit, stats.daysMeetingGoal]
    );
  } catch (error) {
    console.error('Error updating weekly analysis:', error);
  }
}

async function getWeeklyAnalysis(userId) {
  try {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const analysis = await getRow(
      'SELECT * FROM sleep_analysis WHERE user_id = ? AND week_start_date = ?',
      [userId, weekStartStr]
    );

    return analysis || {
      total_sleep_hours: 0,
      average_sleep_hours: 0,
      sleep_deficit_hours: 0,
      days_meeting_goal: 0
    };
  } catch (error) {
    console.error('Error getting weekly analysis:', error);
    return {
      total_sleep_hours: 0,
      average_sleep_hours: 0,
      sleep_deficit_hours: 0,
      days_meeting_goal: 0
    };
  }
}

async function getMonthlyAnalysis(userId) {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const monthlyData = await getAll(
      `SELECT 
        DATE(recorded_at) as date,
        duration,
        quality
       FROM sleep_data 
       WHERE user_id = ? AND DATE(recorded_at) >= ?
       ORDER BY recorded_at DESC`,
      [userId, monthStartStr]
    );

    const settings = await getRow(
      'SELECT sleep_goal FROM sleep_settings WHERE user_id = ?',
      [userId]
    );

    const stats = calculateWeeklyStats(monthlyData, settings.sleep_goal);

    return {
      total_sleep_hours: stats.totalSleep,
      average_sleep_hours: stats.averageSleep,
      sleep_deficit_hours: stats.totalDeficit,
      days_meeting_goal: stats.daysMeetingGoal,
      total_days: monthlyData.length
    };
  } catch (error) {
    console.error('Error getting monthly analysis:', error);
    return {
      total_sleep_hours: 0,
      average_sleep_hours: 0,
      sleep_deficit_hours: 0,
      days_meeting_goal: 0,
      total_days: 0
    };
  }
}

async function getCustomRangeAnalysis(userId, startDate, endDate) {
  try {
    const customData = await getAll(
      `SELECT 
        DATE(recorded_at) as date,
        duration,
        quality
       FROM sleep_data 
       WHERE user_id = ? AND DATE(recorded_at) BETWEEN ? AND ?
       ORDER BY recorded_at DESC`,
      [userId, startDate, endDate]
    );

    const settings = await getRow(
      'SELECT sleep_goal FROM sleep_settings WHERE user_id = ?',
      [userId]
    );

    const stats = calculateWeeklyStats(customData, settings.sleep_goal);

    return {
      total_sleep_hours: stats.totalSleep,
      average_sleep_hours: stats.averageSleep,
      sleep_deficit_hours: stats.totalDeficit,
      days_meeting_goal: stats.daysMeetingGoal,
      total_days: customData.length,
      start_date: startDate,
      end_date: endDate
    };
  } catch (error) {
    console.error('Error getting custom range analysis:', error);
    return {
      total_sleep_hours: 0,
      average_sleep_hours: 0,
      sleep_deficit_hours: 0,
      days_meeting_goal: 0,
      total_days: 0,
      start_date: startDate,
      end_date: endDate
    };
  }
}

module.exports = router; 