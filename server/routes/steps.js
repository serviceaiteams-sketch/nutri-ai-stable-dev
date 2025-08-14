const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow } = require('../config/database');

// Get today's steps summary for the user
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Latest wearable steps today
    const wearable = await getRow(
      `SELECT MAX(steps) AS steps
       FROM wearable_sync
       WHERE user_id = ? AND DATE(sync_timestamp) = ?`,
      [userId, today]
    );

    // Manual steps adjustments sum today
    const manual = await getRow(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM steps_logs
       WHERE user_id = ? AND DATE(created_at) = ?`,
      [userId, today]
    );

    const current = Math.max(wearable?.steps || 0, manual?.total || 0);
    const userRow = await getRow('SELECT step_goal FROM users WHERE id = ?', [userId]);

    res.json({ success: true, current, target: userRow?.step_goal || 10000 });
  } catch (error) {
    console.error('Error fetching steps:', error);
    res.status(500).json({ error: 'Failed to fetch steps' });
  }
});

// Adjust steps by amount (can be negative). Default increment 500
router.post('/log', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount = 100 } = req.body;
    await runQuery('INSERT INTO steps_logs (user_id, amount) VALUES (?, ?)', [userId, parseInt(amount, 10)]);
    res.json({ success: true, message: 'Steps updated' });
  } catch (error) {
    console.error('Error logging steps:', error);
    res.status(500).json({ error: 'Failed to log steps' });
  }
});

// Update steps goal
router.put('/goal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal } = req.body;
    const parsed = parseInt(goal, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return res.status(400).json({ error: 'Invalid goal' });
    }
    await runQuery('UPDATE users SET step_goal = ? WHERE id = ?', [parsed, userId]);
    res.json({ success: true, message: 'Steps goal updated' });
  } catch (error) {
    console.error('Error updating steps goal:', error);
    res.status(500).json({ error: 'Failed to update steps goal' });
  }
});

module.exports = router; 