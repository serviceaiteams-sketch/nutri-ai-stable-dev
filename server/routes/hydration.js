const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Get today's hydration summary for the user
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    const row = await getRow(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM hydration_logs
       WHERE user_id = ? AND DATE(created_at) = ?`,
      [userId, today]
    );

    const userRow = await getRow('SELECT water_goal FROM users WHERE id = ?', [userId]);

    res.json({
      success: true,
      current: row?.total || 0,
      target: userRow?.water_goal || 9,
      unit: 'glasses'
    });
  } catch (error) {
    console.error('Error fetching hydration summary:', error);
    res.status(500).json({ error: 'Failed to fetch hydration' });
  }
});

// Increment or decrement hydration by amount (default 1)
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount = 1 } = req.body;

    await runQuery(
      `INSERT INTO hydration_logs (user_id, amount) VALUES (?, ?)`,
      [userId, parseInt(amount, 10)]
    );

    res.json({ success: true, message: 'Hydration updated' });
  } catch (error) {
    console.error('Error logging hydration:', error);
    res.status(500).json({ error: 'Failed to log hydration' });
  }
});

// Update daily water goal
router.put('/goal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal } = req.body;
    const parsed = parseInt(goal, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'Invalid goal' });
    }
    await runQuery('UPDATE users SET water_goal = ? WHERE id = ?', [parsed, userId]);
    res.json({ success: true, message: 'Water goal updated' });
  } catch (error) {
    console.error('Error updating water goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

module.exports = router; 