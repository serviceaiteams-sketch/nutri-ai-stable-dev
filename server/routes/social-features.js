const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { runQuery, getRow, getAll } = require('../config/database');

// Social Features Routes

// Create a challenge
router.post('/challenges/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, type, duration, goal, participants } = req.body;

    console.log('Creating challenge with data:', { userId, title, description, type, duration, goal, participants });

    // Create challenge
    const result = await runQuery(`
      INSERT INTO challenges (creator_id, title, description, type, duration, goal, 
        participants_limit, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', datetime('now'))
    `, [userId, title, description, type, duration, goal, participants]);

    console.log('Challenge created with ID:', result.id);
    console.log('Result object:', result);

    const challengeId = result.id;
    
    if (!challengeId) {
      throw new Error('Failed to create challenge - no ID returned');
    }

    console.log('About to insert participant with challengeId:', challengeId, 'userId:', userId);

    // Add creator as participant
    await runQuery(`
      INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
      VALUES (?, ?, datetime('now'))
    `, [challengeId, userId]);

    console.log('Creator added as participant');

    res.json({
      success: true,
      challengeId,
      message: 'Challenge created successfully'
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Failed to create challenge',
      error: error.message
    });
  }
});

// Join a challenge
router.post('/challenges/:challengeId/join', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { challengeId } = req.params;

    // Check if challenge exists and has space
    const challenge = await getRow(`
      SELECT c.*, COUNT(cp.user_id) as current_participants
      FROM challenges c
      LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
      WHERE c.id = ? AND c.status = 'active'
      GROUP BY c.id
    `, [challengeId]);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found or inactive'
      });
    }

    if (challenge.current_participants >= challenge.participants_limit) {
      return res.status(400).json({
        success: false,
        message: 'Challenge is full'
      });
    }

    // Check if user is already participating
    const existingParticipation = await getRow(`
      SELECT * FROM challenge_participants 
      WHERE challenge_id = ? AND user_id = ?
    `, [challengeId, userId]);

    if (existingParticipation) {
      return res.status(400).json({
        success: false,
        message: 'Already participating in this challenge'
      });
    }

    // Join challenge
    await runQuery(`
      INSERT INTO challenge_participants (challenge_id, user_id, joined_at)
      VALUES (?, ?, datetime('now'))
    `, [challengeId, userId]);

    res.json({
      success: true,
      message: 'Successfully joined challenge'
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join challenge'
    });
  }
});

// Get available challenges
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const challenges = await getAll(`
      SELECT 
        c.*,
        u.name as creator_name,
        COUNT(cp.user_id) as participant_count,
        CASE WHEN cp.user_id IS NOT NULL THEN 1 ELSE 0 END as is_participating
      FROM challenges c
      LEFT JOIN users u ON c.creator_id = u.id
      LEFT JOIN challenge_participants cp ON c.id = cp.challenge_id
      WHERE c.status = 'active'
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      challenges,
      message: 'Challenges retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch challenges'
    });
  }
});

// Share progress (opt-in)
router.post('/progress/share', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, data, isPublic } = req.body;

    // Store shared progress
    await runQuery(`
      INSERT INTO shared_progress (user_id, type, data, is_public, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [userId, type, JSON.stringify(data), isPublic ? 1 : 0]);

    res.json({
      success: true,
      message: 'Progress shared successfully'
    });
  } catch (error) {
    console.error('Error sharing progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to share progress'
    });
  }
});

// Get community feed
router.get('/feed', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (page - 1) * limit;

    console.log('Fetching community feed with params:', { page, limit, offset });

    const feed = await getAll(`
      SELECT 
        sp.*,
        u.name as user_name
      FROM shared_progress sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.is_public = 1
      ORDER BY sp.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    console.log('Feed result:', feed);

    res.json({
      success: true,
      feed,
      message: 'Community feed retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching community feed:', error);
    console.error('Error details:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community feed',
      error: error.message
    });
  }
});

// Create community post
router.post('/posts/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, content, category, tags } = req.body;

    // Create community post
    const result = await runQuery(`
      INSERT INTO community_posts (user_id, title, content, category, tags, created_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `, [userId, title, content, category, tags]);

    res.json({
      success: true,
      postId: result.id,
      message: 'Post created successfully'
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create post'
    });
  }
});

// Get community posts
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const { category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        cp.*,
        u.name as author_name,
        COUNT(c.comment_id) as comment_count,
        COUNT(l.like_id) as like_count
      FROM community_posts cp
      JOIN users u ON cp.user_id = u.id
      LEFT JOIN post_comments c ON cp.id = c.post_id
      LEFT JOIN post_likes l ON cp.id = l.post_id
    `;

    const params = [];
    if (category) {
      query += ' WHERE cp.category = ?';
      params.push(category);
    }

    query += ' GROUP BY cp.id ORDER BY cp.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const posts = await getAll(query, params);

    res.json({
      success: true,
      posts,
      message: 'Community posts retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching community posts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community posts'
    });
  }
});

// Like/unlike a post
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Check if already liked
    const existingLike = await getRow(`
      SELECT * FROM post_likes WHERE post_id = ? AND user_id = ?
    `, [postId, userId]);

    if (existingLike) {
      // Unlike
      await runQuery(`
        DELETE FROM post_likes WHERE post_id = ? AND user_id = ?
      `, [postId, userId]);

      res.json({
        success: true,
        liked: false,
        message: 'Post unliked'
      });
    } else {
      // Like
      await runQuery(`
        INSERT INTO post_likes (post_id, user_id, created_at)
        VALUES (?, ?, datetime('now'))
      `, [postId, userId]);

      res.json({
        success: true,
        liked: true,
        message: 'Post liked'
      });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle like'
    });
  }
});

// Add comment to post
router.post('/posts/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    const { content } = req.body;

    const result = await runQuery(`
      INSERT INTO post_comments (post_id, user_id, content, created_at)
      VALUES (?, ?, ?, datetime('now'))
    `, [postId, userId, content]);

    res.json({
      success: true,
      commentId: result.id,
      message: 'Comment added successfully'
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment'
    });
  }
});

// Get user's social stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await getRow(`
      SELECT 
        (SELECT COUNT(*) FROM challenges WHERE creator_id = ?) as challenges_created,
        (SELECT COUNT(*) FROM challenge_participants WHERE user_id = ?) as challenges_joined,
        (SELECT COUNT(*) FROM shared_progress WHERE user_id = ?) as progress_shared,
        (SELECT COUNT(*) FROM community_posts WHERE user_id = ?) as posts_created,
        (SELECT COUNT(*) FROM post_likes WHERE user_id = ?) as posts_liked
    `, [userId, userId, userId, userId, userId]);

    res.json({
      success: true,
      stats,
      message: 'Social stats retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching social stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch social stats'
    });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { type = 'overall', period = 'month' } = req.query;

    let query = '';
    let params = [];

    switch (type) {
      case 'challenges':
        query = `
          SELECT 
            u.name,
            COUNT(cp.challenge_id) as challenges_completed
          FROM users u
          JOIN challenge_participants cp ON u.id = cp.user_id
          JOIN challenges c ON cp.challenge_id = c.id
          WHERE c.status = 'completed'
          GROUP BY u.id
          ORDER BY challenges_completed DESC
          LIMIT 10
        `;
        break;
      
      case 'activity':
        query = `
          SELECT 
            u.name,
            COUNT(sp.id) as posts_shared
          FROM users u
          JOIN shared_progress sp ON u.id = sp.user_id
          WHERE sp.created_at >= datetime('now', '-1 month')
          GROUP BY u.id
          ORDER BY posts_shared DESC
          LIMIT 10
        `;
        break;
      
      default: // overall
        query = `
          SELECT 
            u.name,
            (
              (SELECT COUNT(*) FROM challenge_participants WHERE user_id = u.id) +
              (SELECT COUNT(*) FROM shared_progress WHERE user_id = u.id) +
              (SELECT COUNT(*) FROM community_posts WHERE user_id = u.id)
            ) as total_activity
          FROM users u
          ORDER BY total_activity DESC
          LIMIT 10
        `;
    }

    const leaderboard = await getAll(query, params);

    res.json({
      success: true,
      leaderboard,
      type,
      message: 'Leaderboard retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leaderboard'
    });
  }
});

module.exports = router; 