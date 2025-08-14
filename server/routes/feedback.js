const express = require('express');
const router = express.Router();
const { runQuery, getAll, getRow } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Create or get open thread for current user
router.post('/thread/open', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    let thread = await getRow('SELECT * FROM feedback_threads WHERE user_id = ? AND status = "open" ORDER BY id DESC LIMIT 1', [userId]);
    if (!thread) {
      const result = await runQuery('INSERT INTO feedback_threads (user_id, status) VALUES (?, "open")', [userId]);
      thread = await getRow('SELECT * FROM feedback_threads WHERE id = ?', [result.id]);
    }
    const messages = await getAll('SELECT * FROM feedback_messages WHERE thread_id = ? ORDER BY id ASC', [thread.id]);
    res.json({ ok: true, thread, messages });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_open_thread' });
  }
});

// Post a message
router.post('/message', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { threadId, content } = req.body || {};
    if (!threadId || !content) return res.status(400).json({ ok: false, error: 'threadId_and_content_required' });
    const thread = await getRow('SELECT * FROM feedback_threads WHERE id = ? AND user_id = ?', [threadId, userId]);
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
    const result = await runQuery('INSERT INTO feedback_messages (thread_id, sender, content) VALUES (?, "user", ?)', [threadId, String(content).slice(0, 4000)]);
    const message = await getRow('SELECT * FROM feedback_messages WHERE id = ?', [result.id]);
    res.json({ ok: true, message });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_add_message' });
  }
});

// Get messages in a thread
router.get('/thread/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const threadId = Number(req.params.id);
    const thread = await getRow('SELECT * FROM feedback_threads WHERE id = ? AND user_id = ?', [threadId, userId]);
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
    const messages = await getAll('SELECT * FROM feedback_messages WHERE thread_id = ? ORDER BY id ASC', [threadId]);
    res.json({ ok: true, thread, messages });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_get_thread' });
  }
});

// Close a thread
router.post('/thread/:id/close', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);
    const thread = await getRow('SELECT * FROM feedback_threads WHERE id = ? AND user_id = ?', [id, userId]);
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
    await runQuery('UPDATE feedback_threads SET status = "closed", updated_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_close_thread' });
  }
});

// Create a structured feedback request (wizard submission)
router.post('/structured', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      threadId,
      title = '',
      problem = '',
      goal = '',
      impact = '',
      priority = 'medium',
      details = '',
      tags = [],
      summary = ''
    } = req.body || {};

    if (!threadId) return res.status(400).json({ ok: false, error: 'threadId_required' });
    const thread = await getRow('SELECT * FROM feedback_threads WHERE id = ? AND user_id = ?', [threadId, userId]);
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });

    const result = await runQuery(
      `INSERT INTO feedback_requests (thread_id, user_id, title, problem, goal, impact, priority, details, tags, summary)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [threadId, userId, title, problem, goal, impact, priority, details, JSON.stringify(tags || []), summary]
    );

    const created = await getRow('SELECT * FROM feedback_requests WHERE id = ?', [result.id]);
    res.json({ ok: true, request: created });
  } catch (e) {
    console.error('Failed to save structured feedback', e);
    res.status(500).json({ ok: false, error: 'failed_save_feedback' });
  }
});

// Admin: list feedback requests with user details
router.get('/admin/requests', authenticateToken, async (req, res) => {
  try {
    const rows = await getAll(`
      SELECT fr.*, u.name as user_name, u.email as user_email
      FROM feedback_requests fr
      JOIN users u ON fr.user_id = u.id
      ORDER BY fr.created_at DESC
      LIMIT 200
    `);
    res.json({ ok: true, requests: rows });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_list_feedback' });
  }
});

// Admin: get thread with messages and user details
router.get('/admin/thread/:id', authenticateToken, async (req, res) => {
  try {
    const threadId = Number(req.params.id);
    const thread = await getRow('SELECT * FROM feedback_threads WHERE id = ?', [threadId]);
    if (!thread) return res.status(404).json({ ok: false, error: 'thread_not_found' });
    const user = await getRow('SELECT id, name, email FROM users WHERE id = ?', [thread.user_id]);
    const messages = await getAll('SELECT * FROM feedback_messages WHERE thread_id = ? ORDER BY id ASC', [threadId]);
    res.json({ ok: true, thread, user, messages });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'failed_get_admin_thread' });
  }
});

module.exports = router; 