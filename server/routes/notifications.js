const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAll, getRow, runQuery } = require('../config/database');

// Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 50, unreadOnly = false } = req.query;

    // In a real app, you'd store notifications in the database
    // For now, return mock data
    const notifications = getMockNotifications(userId);

    let filteredNotifications = notifications;
    if (unreadOnly === 'true') {
      filteredNotifications = notifications.filter(n => !n.read);
    }

    res.json({
      success: true,
      notifications: filteredNotifications.slice(0, parseInt(limit))
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // In a real app, update the database
    // For now, just return success
    res.json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Mark notification as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // In a real app, delete from database
    // For now, just return success
    res.json({
      success: true,
      message: 'Notification deleted'
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Get notification settings
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // In a real app, get from database
    // For now, return default settings
    const settings = {
      mealReminders: true,
      hydrationAlerts: true,
      medicationReminders: true,
      healthCheckins: true,
      exerciseReminders: false,
      sleepReminders: false
    };

    const channels = {
      inApp: true,
      email: false,
      push: false,
      sms: false
    };

    res.json({
      success: true,
      settings: settings,
      channels: channels
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

// Update notification settings
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const settings = req.body;

    // In a real app, save to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: settings
    });

  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// Update notification channels
router.put('/channels', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const channels = req.body;

    // In a real app, save to database
    // For now, just return success
    res.json({
      success: true,
      message: 'Notification channels updated',
      channels: channels
    });

  } catch (error) {
    console.error('Update notification channels error:', error);
    res.status(500).json({ error: 'Failed to update notification channels' });
  }
});

// Generate smart notifications
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, context } = req.body;

    // Generate smart notifications based on user data
    const notifications = await generateSmartNotifications(userId, type, context);

    res.json({
      success: true,
      notifications: notifications
    });

  } catch (error) {
    console.error('Generate notifications error:', error);
    res.status(500).json({ error: 'Failed to generate notifications' });
  }
});

// Schedule notifications
router.post('/schedule', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, schedule, message } = req.body;

    // Schedule notifications based on user preferences
    const scheduledNotification = await scheduleNotification(userId, type, schedule, message);

    res.json({
      success: true,
      notification: scheduledNotification
    });

  } catch (error) {
    console.error('Schedule notification error:', error);
    res.status(500).json({ error: 'Failed to schedule notification' });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get notification statistics
    const stats = await getNotificationStats(userId);

    res.json({
      success: true,
      stats: stats
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch notification statistics' });
  }
});

// Helper functions
function getMockNotifications(userId) {
  const now = new Date();
  return [
    {
      id: 1,
      userId: userId,
      type: 'meal',
      title: 'Time for Lunch!',
      message: 'It\'s 12:00 PM. Don\'t forget to log your lunch meal.',
      time: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      read: false,
      priority: 'high',
      color: 'blue'
    },
    {
      id: 2,
      userId: userId,
      type: 'hydration',
      title: 'Stay Hydrated!',
      message: 'You haven\'t logged water intake in 2 hours. Aim for 8 glasses daily.',
      time: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      read: false,
      priority: 'medium',
      color: 'cyan'
    },
    {
      id: 3,
      userId: userId,
      type: 'medication',
      title: 'Medication Reminder',
      message: 'Time to take your diabetes medication (Metformin).',
      time: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'high',
      color: 'red'
    },
    {
      id: 4,
      userId: userId,
      type: 'health',
      title: 'Health Check-in',
      message: 'How are you feeling today? Log your mood and energy levels.',
      time: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'medium',
      color: 'green'
    },
    {
      id: 5,
      userId: userId,
      type: 'exercise',
      title: 'Exercise Reminder',
      message: 'You\'ve been inactive for 3 hours. Time for a quick walk!',
      time: new Date(now.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      read: true,
      priority: 'low',
      color: 'orange'
    }
  ];
}

async function generateSmartNotifications(userId, type, context) {
  try {
    // Get user's health conditions and recent activity
    const healthConditions = await getAll(
      'SELECT * FROM health_conditions WHERE user_id = ?',
      [userId]
    );

    const recentMeals = await getAll(
      `SELECT m.meal_type, m.created_at
       FROM meals m
       WHERE m.user_id = ? 
       AND datetime(m.created_at) >= datetime('now', '-24 hours')
       ORDER BY m.created_at DESC`,
      [userId]
    );

    const notifications = [];

    // Generate meal reminders
    if (type === 'meal' || type === 'all') {
      const mealTimes = ['breakfast', 'lunch', 'dinner'];
      const currentHour = new Date().getHours();
      
      mealTimes.forEach(mealType => {
        const expectedHour = mealType === 'breakfast' ? 8 : mealType === 'lunch' ? 12 : 19;
        const timeDiff = Math.abs(currentHour - expectedHour);
        
        if (timeDiff <= 1) {
          const lastMeal = recentMeals.find(m => m.meal_type === mealType);
          if (!lastMeal) {
            notifications.push({
              id: Date.now() + Math.random(),
              userId: userId,
              type: 'meal',
              title: `Time for ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}!`,
              message: `It's time to log your ${mealType}. Don't forget to track your nutrition.`,
              time: new Date().toISOString(),
              read: false,
              priority: 'high',
              color: 'blue'
            });
          }
        }
      });
    }

    // Generate hydration reminders
    if (type === 'hydration' || type === 'all') {
      const lastHydration = recentMeals.find(m => m.meal_type === 'water');
      if (!lastHydration || new Date() - new Date(lastHydration.created_at) > 2 * 60 * 60 * 1000) {
        notifications.push({
          id: Date.now() + Math.random(),
          userId: userId,
          type: 'hydration',
          title: 'Stay Hydrated!',
          message: 'You haven\'t logged water intake recently. Aim for 8 glasses daily.',
          time: new Date().toISOString(),
          read: false,
          priority: 'medium',
          color: 'cyan'
        });
      }
    }

    // Generate medication reminders
    if (type === 'medication' || type === 'all') {
      healthConditions.forEach(condition => {
        if (condition.medications) {
          const medications = JSON.parse(condition.medications);
          medications.forEach(med => {
            notifications.push({
              id: Date.now() + Math.random(),
              userId: userId,
              type: 'medication',
              title: 'Medication Reminder',
              message: `Time to take your ${condition.condition_name} medication (${med}).`,
              time: new Date().toISOString(),
              read: false,
              priority: 'high',
              color: 'red'
            });
          });
        }
      });
    }

    // Generate health check-ins
    if (type === 'health' || type === 'all') {
      const lastCheckin = recentMeals.find(m => m.meal_type === 'health_checkin');
      if (!lastCheckin || new Date() - new Date(lastCheckin.created_at) > 6 * 60 * 60 * 1000) {
        notifications.push({
          id: Date.now() + Math.random(),
          userId: userId,
          type: 'health',
          title: 'Health Check-in',
          message: 'How are you feeling today? Log your mood and energy levels.',
          time: new Date().toISOString(),
          read: false,
          priority: 'medium',
          color: 'green'
        });
      }
    }

    return notifications;

  } catch (error) {
    console.error('Generate smart notifications error:', error);
    return [];
  }
}

async function scheduleNotification(userId, type, schedule, message) {
  try {
    const notification = {
      id: Date.now() + Math.random(),
      userId: userId,
      type: type,
      title: message.title || 'Scheduled Reminder',
      message: message.body || message,
      time: new Date(schedule.time || Date.now() + schedule.delay).toISOString(),
      read: false,
      priority: schedule.priority || 'medium',
      color: schedule.color || 'blue',
      scheduled: true,
      recurring: schedule.recurring || false,
      interval: schedule.interval || null
    };

    // In a real app, save to database and schedule with a job queue
    return notification;

  } catch (error) {
    console.error('Schedule notification error:', error);
    return null;
  }
}

async function getNotificationStats(userId) {
  try {
    // In a real app, get from database
    // For now, return mock stats
    return {
      total: 25,
      unread: 3,
      read: 22,
      byType: {
        meal: 8,
        hydration: 6,
        medication: 4,
        health: 5,
        exercise: 2
      },
      byPriority: {
        high: 5,
        medium: 15,
        low: 5
      },
      thisWeek: 12,
      lastWeek: 13
    };

  } catch (error) {
    console.error('Get notification stats error:', error);
    return {};
  }
}

module.exports = router;
