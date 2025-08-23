const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getAll } = require('../config/database');

const router = express.Router();

// Get today's hydration data
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    const hydrationData = await getAll(
      'SELECT * FROM hydration_logs WHERE user_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC',
      [userId, today]
    );
    
    const totalWater = hydrationData.reduce((sum, log) => sum + (log.amount || 0), 0);
    const goal = 2000; // Default 2L goal
    
    res.json({
      todayHydration: totalWater,
      goal,
      percentage: Math.min((totalWater / goal) * 100, 100),
      logs: hydrationData
    });
  } catch (error) {
    console.error('Error fetching today\'s hydration:', error);
    res.status(500).json({ error: 'Failed to fetch hydration data' });
  }
});

// Log hydration
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, type = 'water', notes } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }
    
    await runQuery(
      'INSERT INTO hydration_logs (user_id, amount, type, notes, created_at) VALUES (?, ?, ?, ?, ?)',
      [userId, amount, type, notes, new Date().toISOString()]
    );
    
    res.json({ message: 'Hydration logged successfully' });
  } catch (error) {
    console.error('Error logging hydration:', error);
    res.status(500).json({ error: 'Failed to log hydration' });
  }
});

// Get hydration history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    
    const history = await getAll(
      'SELECT DATE(created_at) as date, SUM(amount) as total FROM hydration_logs WHERE user_id = ? AND created_at >= DATE("now", "-? days") GROUP BY DATE(created_at) ORDER BY date DESC',
      [userId, days]
    );
    
    res.json({ history });
  } catch (error) {
    console.error('Error fetching hydration history:', error);
    res.status(500).json({ error: 'Failed to fetch hydration history' });
  }
});

module.exports = router;
