const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getAll, getRow, runQuery } = require('../config/database');

// Get user gamification stats
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's meal logging data
    const meals = await getAll(
      `SELECT COUNT(*) as total_meals,
              COUNT(DISTINCT DATE(created_at)) as days_logged,
              MAX(created_at) as last_meal
       FROM meals
       WHERE user_id = ?`,
      [userId]
    );

    const mealData = meals[0];
    
    // Calculate level and experience
    const totalMeals = mealData.total_meals || 0;
    const daysLogged = mealData.days_logged || 0;
    const level = Math.floor(totalMeals / 10) + 1;
    const experience = totalMeals * 10;
    const experienceToNext = level * 100;

    // Calculate streaks
    const streakData = await calculateStreaks(userId);

    // Calculate points
    const points = await calculatePoints(userId);

    const stats = {
      level: level,
      experience: experience,
      experienceToNext: experienceToNext,
      totalPoints: points.total,
      rank: getRank(points.total),
      achievementsUnlocked: await getAchievementsCount(userId),
      totalAchievements: 25,
      challengesCompleted: await getChallengesCompleted(userId),
      totalChallenges: 15,
      currentStreak: streakData.current,
      longestStreak: streakData.longest,
      weeklyPoints: points.weekly,
      monthlyPoints: points.monthly
    };

    const streaks = {
      mealLogging: streakData.current,
      hydration: await getHydrationStreak(userId),
      exercise: await getExerciseStreak(userId),
      sleep: await getSleepStreak(userId),
      healthCheckins: await getHealthCheckinsStreak(userId)
    };

    const rewards = await getAvailableRewards(userId, points.total);

    res.json({
      success: true,
      stats: stats,
      streaks: streaks,
      rewards: rewards
    });

  } catch (error) {
    console.error('Get gamification stats error:', error);
    res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
});

// Get achievements
router.get('/achievements', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const achievements = await getUserAchievements(userId);

    res.json({
      success: true,
      achievements: achievements
    });

  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get challenges
router.get('/challenges', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const challenges = await getAvailableChallenges(userId);

    res.json({
      success: true,
      challenges: challenges
    });

  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

// Get leaderboard
router.get('/leaderboard', authenticateToken, async (req, res) => {
  try {
    const leaderboard = await getLeaderboard();

    res.json({
      success: true,
      leaderboard: leaderboard
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Join challenge
router.post('/challenges/:id/join', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // In a real app, add user to challenge participants
    // For now, just return success
    res.json({
      success: true,
      message: 'Challenge joined successfully'
    });

  } catch (error) {
    console.error('Join challenge error:', error);
    res.status(500).json({ error: 'Failed to join challenge' });
  }
});

// Claim reward
router.post('/rewards/:id/claim', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // In a real app, verify user has enough points and claim reward
    // For now, just return success
    res.json({
      success: true,
      message: 'Reward claimed successfully'
    });

  } catch (error) {
    console.error('Claim reward error:', error);
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

// Helper functions
async function calculateStreaks(userId) {
  try {
    const meals = await getAll(
      `SELECT DATE(created_at) as meal_date
       FROM meals
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    if (meals.length === 0) {
      return { current: 0, longest: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mealDates = meals.map(m => new Date(m.meal_date).toDateString());
    const uniqueDates = [...new Set(mealDates)];

    for (let i = 0; i < uniqueDates.length; i++) {
      const currentDate = new Date(uniqueDates[i]);
      const nextDate = i < uniqueDates.length - 1 ? new Date(uniqueDates[i + 1]) : null;

      if (nextDate) {
        const dayDiff = Math.floor((currentDate - nextDate) / (1000 * 60 * 60 * 24));
        if (dayDiff === 1) {
          tempStreak++;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 1;
        }
      } else {
        tempStreak++;
      }

      // Check if this is part of current streak
      if (currentDate.toDateString() === today.toDateString() || 
          currentDate.toDateString() === yesterday.toDateString()) {
        currentStreak = tempStreak;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }

    return { current: currentStreak, longest: longestStreak };
  } catch (error) {
    console.error('Calculate streaks error:', error);
    return { current: 0, longest: 0 };
  }
}

async function calculatePoints(userId) {
  try {
    // Calculate points based on various activities
    const meals = await getAll(
      `SELECT COUNT(*) as total_meals
       FROM meals
       WHERE user_id = ?`,
      [userId]
    );

    const weeklyMeals = await getAll(
      `SELECT COUNT(*) as weekly_meals
       FROM meals
       WHERE user_id = ? 
       AND datetime(created_at) >= datetime('now', '-7 days')`,
      [userId]
    );

    const monthlyMeals = await getAll(
      `SELECT COUNT(*) as monthly_meals
       FROM meals
       WHERE user_id = ? 
       AND datetime(created_at) >= datetime('now', '-30 days')`,
      [userId]
    );

    const totalPoints = (meals[0]?.total_meals || 0) * 10;
    const weeklyPoints = (weeklyMeals[0]?.weekly_meals || 0) * 10;
    const monthlyPoints = (monthlyMeals[0]?.monthly_meals || 0) * 10;

    return {
      total: totalPoints,
      weekly: weeklyPoints,
      monthly: monthlyPoints
    };
  } catch (error) {
    console.error('Calculate points error:', error);
    return { total: 0, weekly: 0, monthly: 0 };
  }
}

function getRank(points) {
  if (points >= 5000) return 'Diamond';
  if (points >= 3000) return 'Platinum';
  if (points >= 2000) return 'Gold';
  if (points >= 1000) return 'Silver';
  if (points >= 500) return 'Bronze';
  return 'Beginner';
}

async function getAchievementsCount(userId) {
  try {
    // In a real app, count unlocked achievements from database
    // For now, return mock count
    return 12;
  } catch (error) {
    console.error('Get achievements count error:', error);
    return 0;
  }
}

async function getChallengesCompleted(userId) {
  try {
    // In a real app, count completed challenges from database
    // For now, return mock count
    return 8;
  } catch (error) {
    console.error('Get challenges completed error:', error);
    return 0;
  }
}

async function getHydrationStreak(userId) {
  try {
    // In a real app, calculate hydration streak
    // For now, return mock data
    return 5;
  } catch (error) {
    console.error('Get hydration streak error:', error);
    return 0;
  }
}

async function getExerciseStreak(userId) {
  try {
    // In a real app, calculate exercise streak
    // For now, return mock data
    return 3;
  } catch (error) {
    console.error('Get exercise streak error:', error);
    return 0;
  }
}

async function getSleepStreak(userId) {
  try {
    // In a real app, calculate sleep streak
    // For now, return mock data
    return 2;
  } catch (error) {
    console.error('Get sleep streak error:', error);
    return 0;
  }
}

async function getHealthCheckinsStreak(userId) {
  try {
    // In a real app, calculate health check-ins streak
    // For now, return mock data
    return 4;
  } catch (error) {
    console.error('Get health check-ins streak error:', error);
    return 0;
  }
}

async function getAvailableRewards(userId, totalPoints) {
  try {
    // In a real app, get available rewards from database
    // For now, return mock rewards
    return [
      {
        id: 1,
        title: 'Premium Recipe Unlock',
        description: 'Unlock 10 premium healthy recipes',
        pointsRequired: 1000,
        unlocked: totalPoints >= 1000,
        unlockedAt: totalPoints >= 1000 ? new Date().toISOString() : null
      },
      {
        id: 2,
        title: 'Custom Avatar',
        description: 'Unlock a special avatar for your profile',
        pointsRequired: 2000,
        unlocked: totalPoints >= 2000,
        unlockedAt: totalPoints >= 2000 ? new Date().toISOString() : null
      },
      {
        id: 3,
        title: 'Advanced Analytics',
        description: 'Access to detailed health analytics',
        pointsRequired: 3000,
        unlocked: totalPoints >= 3000,
        unlockedAt: totalPoints >= 3000 ? new Date().toISOString() : null
      }
    ];
  } catch (error) {
    console.error('Get available rewards error:', error);
    return [];
  }
}

async function getUserAchievements(userId) {
  try {
    // In a real app, get user achievements from database
    // For now, return mock achievements
    return [
      {
        id: 1,
        title: 'First Steps',
        description: 'Log your first meal',
        category: 'nutrition',
        points: 50,
        unlocked: true,
        unlockedAt: '2024-01-15T10:30:00Z',
        rarity: 'common',
        progress: 1,
        target: 1
      },
      {
        id: 2,
        title: 'Hydration Master',
        description: 'Log water intake for 7 consecutive days',
        category: 'hydration',
        points: 100,
        unlocked: true,
        unlockedAt: '2024-01-20T14:20:00Z',
        rarity: 'uncommon',
        progress: 7,
        target: 7
      },
      {
        id: 3,
        title: 'Consistency King',
        description: 'Log meals for 30 consecutive days',
        category: 'streak',
        points: 500,
        unlocked: false,
        progress: 7,
        target: 30,
        rarity: 'rare'
      }
    ];
  } catch (error) {
    console.error('Get user achievements error:', error);
    return [];
  }
}

async function getAvailableChallenges(userId) {
  try {
    // In a real app, get available challenges from database
    // For now, return mock challenges
    return [
      {
        id: 1,
        title: '7-Day Meal Logging',
        description: 'Log at least one meal every day for a week',
        category: 'streak',
        points: 150,
        duration: '7 days',
        startDate: '2024-01-15T00:00:00Z',
        endDate: '2024-01-22T00:00:00Z',
        progress: 5,
        target: 7,
        status: 'active',
        participants: 45,
        difficulty: 'easy'
      },
      {
        id: 2,
        title: 'Hydration Challenge',
        description: 'Drink 8 glasses of water daily for 5 days',
        category: 'hydration',
        points: 200,
        duration: '5 days',
        startDate: '2024-01-18T00:00:00Z',
        endDate: '2024-01-23T00:00:00Z',
        progress: 3,
        target: 5,
        status: 'active',
        participants: 32,
        difficulty: 'medium'
      }
    ];
  } catch (error) {
    console.error('Get available challenges error:', error);
    return [];
  }
}

async function getLeaderboard() {
  try {
    // In a real app, get leaderboard from database
    // For now, return mock leaderboard
    return [
      {
        id: 1,
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
        points: 5420,
        level: 12,
        rank: 1,
        achievements: 18,
        streak: 21
      },
      {
        id: 2,
        name: 'Mike Chen',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        points: 4890,
        level: 11,
        rank: 2,
        achievements: 16,
        streak: 18
      },
      {
        id: 3,
        name: 'Emma Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        points: 4560,
        level: 10,
        rank: 3,
        achievements: 15,
        streak: 15
      }
    ];
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return [];
  }
}

module.exports = router;
