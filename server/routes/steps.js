const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll } = require('../config/database');

const router = express.Router();

// Get today's steps data
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const stepsData = await getAll(
      'SELECT * FROM steps_logs WHERE user_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC',
      [userId, today]
    );
    
    const totalSteps = stepsData.reduce((sum, log) => sum + (log.steps || 0), 0);
    const goal = 10000; // Default 10k steps goal
    
    res.json({
      todaySteps: totalSteps,
      goal,
      percentage: Math.min((totalSteps / goal) * 100, 100),
      logs: stepsData
    });
  } catch (error) {
    console.error('Error fetching today\'s steps:', error);
    res.status(500).json({ error: 'Failed to fetch steps data' });
  }
});

// Log steps
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { steps, activity_type = 'walking', notes } = req.body;
    
    if (!steps || steps <= 0) {
      return res.status(400).json({ error: 'Steps must be positive' });
    }
    
    await runQuery(
      'INSERT INTO steps_logs (user_id, steps, activity_type, notes, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, steps, activity_type, notes, new Date().toISOString()]
    );
    
    res.json({ message: 'Steps logged successfully' });
  } catch (error) {
    console.error('Error logging steps:', error);
    res.status(500).json({ error: 'Failed to log steps' });
  }
});

// Get steps history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    const history = await getAll(
      'SELECT DATE(created_at) as date, SUM(steps) as total FROM steps_logs WHERE user_id = ? AND created_at >= DATE("now", "-? days") GROUP BY DATE(created_at) ORDER BY date DESC',
      [userId, days]
    );
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching steps history:', error);
    res.status(500).json({ error: 'Failed to fetch steps history' });
  }
});

module.exports = router;
