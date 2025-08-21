import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaTrophy, FaMedal, FaStar, FaFire, FaHeart, FaAward,
  FaCheckCircle, FaLock, FaUnlock, FaCrown, FaUsers,
  FaChartLine, FaCalendarAlt, FaGift,
  FaRunning, FaAppleAlt, FaWater, FaBed, FaDumbbell,
  FaRocket, FaLightbulb, FaSmile, FaThumbsUp
} from 'react-icons/fa';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const Gamification = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [streaks, setStreaks] = useState({});
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');

  const authHeaders = () => ({ 
    headers: { 
      Authorization: `Bearer ${localStorage.getItem('token') || ''}` 
    } 
  });

  useEffect(() => {
    fetchGamificationData();
  }, []);

  const fetchGamificationData = async () => {
    try {
      setLoading(true);
      
      // Fetch all gamification data
      const [statsRes, achievementsRes, challengesRes, leaderboardRes] = await Promise.all([
        axios.get('/api/gamification/stats', authHeaders()),
        axios.get('/api/gamification/achievements', authHeaders()),
        axios.get('/api/gamification/challenges', authHeaders()),
        axios.get('/api/gamification/leaderboard', authHeaders())
      ]);

      setUserStats(statsRes.data.stats);
      setAchievements(achievementsRes.data.achievements);
      setChallenges(challengesRes.data.challenges);
      setLeaderboard(leaderboardRes.data.leaderboard);
      setStreaks(statsRes.data.streaks);
      setRewards(statsRes.data.rewards);

    } catch (error) {
      console.error('Error fetching gamification data:', error);
      // Set mock data for demonstration
      setUserStats(getMockUserStats());
      setAchievements(getMockAchievements());
      setChallenges(getMockChallenges());
      setLeaderboard(getMockLeaderboard());
      setStreaks(getMockStreaks());
      setRewards(getMockRewards());
    } finally {
      setLoading(false);
    }
  };

  const getMockUserStats = () => ({
    level: 8,
    experience: 1250,
    experienceToNext: 2000,
    totalPoints: 3420,
    rank: 'Gold',
    achievementsUnlocked: 12,
    totalAchievements: 25,
    challengesCompleted: 8,
    totalChallenges: 15,
    currentStreak: 7,
    longestStreak: 14,
    weeklyPoints: 450,
    monthlyPoints: 1800
  });

  const getMockAchievements = () => [
    {
      id: 1,
      title: 'First Steps',
      description: 'Log your first meal',
      icon: FaAppleAlt,
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
      icon: FaWater,
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
      icon: FaTrophy,
      category: 'streak',
      points: 500,
      unlocked: false,
      progress: 7,
      target: 30,
      rarity: 'rare'
    },
    {
      id: 4,
      title: 'Health Warrior',
      description: 'Complete 10 health check-ins',
      icon: FaHeart,
      category: 'health',
      points: 200,
      unlocked: false,
      progress: 6,
      target: 10,
      rarity: 'uncommon'
    },
    {
      id: 5,
      title: 'Nutrition Expert',
      description: 'Log 100 different foods',
      icon: FaStar,
      category: 'nutrition',
      points: 300,
      unlocked: false,
      progress: 45,
      target: 100,
      rarity: 'rare'
    }
  ];

  const getMockChallenges = () => [
    {
      id: 1,
      title: '7-Day Meal Logging',
      description: 'Log at least one meal every day for a week',
      icon: FaCalendarAlt,
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
      icon: FaWater,
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
    },
    {
      id: 3,
      title: 'Protein Power',
      description: 'Meet your protein goal for 3 consecutive days',
      icon: FaDumbbell,
      category: 'nutrition',
      points: 100,
      duration: '3 days',
      startDate: '2024-01-20T00:00:00Z',
      endDate: '2024-01-23T00:00:00Z',
      progress: 2,
      target: 3,
      status: 'active',
      participants: 28,
      difficulty: 'medium'
    }
  ];

  const getMockLeaderboard = () => [
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
    },
    {
      id: 4,
      name: user?.name || 'You',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
      points: 3420,
      level: 8,
      rank: 4,
      achievements: 12,
      streak: 7,
      isCurrentUser: true
    }
  ];

  const getMockStreaks = () => ({
    mealLogging: 7,
    hydration: 5,
    exercise: 3,
    sleep: 2,
    healthCheckins: 4
  });

  const getMockRewards = () => [
    {
      id: 1,
      title: 'Premium Recipe Unlock',
      description: 'Unlock 10 premium healthy recipes',
      icon: FaGift,
      pointsRequired: 1000,
      unlocked: true,
      unlockedAt: '2024-01-18T12:00:00Z'
    },
    {
      id: 2,
      title: 'Custom Avatar',
      description: 'Unlock a special avatar for your profile',
      icon: FaSmile,
      pointsRequired: 2000,
      unlocked: false,
      progress: 3420,
      target: 2000
    },
    {
      id: 3,
      title: 'Advanced Analytics',
      description: 'Access to detailed health analytics',
      icon: FaChartLine,
      pointsRequired: 3000,
      unlocked: false,
      progress: 3420,
      target: 3000
    }
  ];

  const joinChallenge = async (challengeId) => {
    try {
      await axios.post(`/api/gamification/challenges/${challengeId}/join`, {}, authHeaders());
      toast.success('Challenge joined successfully!');
      fetchGamificationData(); // Refresh data
    } catch (error) {
      console.error('Error joining challenge:', error);
      toast.error('Failed to join challenge');
    }
  };

  const claimReward = async (rewardId) => {
    try {
      await axios.post(`/api/gamification/rewards/${rewardId}/claim`, {}, authHeaders());
      toast.success('Reward claimed successfully!');
      fetchGamificationData(); // Refresh data
    } catch (error) {
      console.error('Error claiming reward:', error);
      toast.error('Failed to claim reward');
    }
  };

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'uncommon': return 'text-green-600 bg-green-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressPercentage = (progress, target) => {
    return Math.min((progress / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading gamification data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with User Stats */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <FaTrophy className="text-2xl" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Gamification Center</h1>
                  <p className="text-purple-100">Level up your health journey!</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold">Level {userStats.level}</div>
                <div className="text-sm text-purple-100">
                  {userStats.experience} / {userStats.experienceToNext} XP
                </div>
                <div className="w-32 bg-white bg-opacity-20 rounded-full h-2 mt-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(userStats.experience / userStats.experienceToNext) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <FaFire className="text-orange-500 text-xl" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.currentStreak}</div>
                <div className="text-sm text-gray-600">Day Streak</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <FaStar className="text-yellow-500 text-xl" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.totalPoints}</div>
                <div className="text-sm text-gray-600">Total Points</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <FaTrophy className="text-purple-500 text-xl" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.achievementsUnlocked}</div>
                <div className="text-sm text-gray-600">Achievements</div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-3">
                              <FaAward className="text-green-500 text-xl" />
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.rank}</div>
                <div className="text-sm text-gray-600">Rank</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[
              { id: 'achievements', label: 'Achievements', icon: FaTrophy },
              { id: 'challenges', label: 'Challenges', icon: FaAward },
              { id: 'leaderboard', label: 'Leaderboard', icon: FaUsers },
              { id: 'rewards', label: 'Rewards', icon: FaGift }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab.icon && React.createElement(tab.icon, { className: "text-lg" })}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                      achievement.unlocked ? 'ring-2 ring-green-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-full ${
                        achievement.unlocked ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                      }`}>
                        {achievement.unlocked ? (
                          achievement.icon && React.createElement(achievement.icon, { className: "text-xl" })
                        ) : (
                          <FaLock className="text-xl" />
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{achievement.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          {achievement.progress} / {achievement.target}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            achievement.unlocked ? 'bg-green-500' : 'bg-purple-500'
                          }`}
                          style={{ width: `${getProgressPercentage(achievement.progress, achievement.target)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Reward</span>
                        <span className="text-sm font-medium text-purple-600">{achievement.points} points</span>
                      </div>
                    </div>
                    
                    {achievement.unlocked && (
                      <div className="mt-4 flex items-center space-x-2 text-green-600 text-sm">
                        <FaCheckCircle />
                        <span>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'challenges' && (
            <motion.div
              key="challenges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map((challenge) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                        {challenge.icon && React.createElement(challenge.icon, { className: "text-xl" })}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(challenge.difficulty)}`}>
                        {challenge.difficulty}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{challenge.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{challenge.description}</p>
                    
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Progress</span>
                        <span className="text-sm font-medium text-gray-900">
                          {challenge.progress} / {challenge.target}
                        </span>
                      </div>
                      
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(challenge.progress, challenge.target)}%` }}
                        ></div>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <span>{challenge.duration}</span>
                        <span>{challenge.participants} participants</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-600">{challenge.points} points</span>
                      <button
                        onClick={() => joinChallenge(challenge.id)}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        Join Challenge
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performers</h2>
              
              <div className="space-y-4">
                {leaderboard.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex items-center space-x-4 p-4 rounded-lg ${
                      user.isCurrentUser ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                        {user.rank}
                      </div>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {user.name} {user.isCurrentUser && '(You)'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Level {user.level} • {user.achievements} achievements
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex-1"></div>
                    
                    <div className="text-right">
                      <div className="font-semibold text-gray-900">{user.points} points</div>
                      <div className="text-sm text-gray-500">{user.streak} day streak</div>
                    </div>
                    
                    {user.rank <= 3 && (
                      <div className="ml-4">
                        {user.rank === 1 && <FaCrown className="text-yellow-500 text-xl" />}
                        {user.rank === 2 && <FaMedal className="text-gray-400 text-xl" />}
                        {user.rank === 3 && <FaMedal className="text-orange-500 text-xl" />}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewards.map((reward) => (
                  <motion.div
                    key={reward.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${
                      reward.unlocked ? 'ring-2 ring-green-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-full ${
                        reward.unlocked ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {reward.icon && React.createElement(reward.icon, { className: "text-xl" })}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        reward.unlocked ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {reward.unlocked ? 'Unlocked' : 'Available'}
                      </span>
                    </div>
                    
                    <h3 className="font-semibold text-gray-900 mb-2">{reward.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{reward.description}</p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Points Required</span>
                        <span className="text-sm font-medium text-purple-600">{reward.pointsRequired}</span>
                      </div>
                      
                      {!reward.unlocked && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${getProgressPercentage(reward.progress, reward.pointsRequired)}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {reward.unlocked ? (
                        <div className="flex items-center space-x-2 text-green-600 text-sm">
                          <FaCheckCircle />
                          <span>Unlocked {new Date(reward.unlockedAt).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => claimReward(reward.id)}
                          disabled={reward.progress < reward.pointsRequired}
                          className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reward.progress >= reward.pointsRequired ? 'Claim Reward' : 'Not Enough Points'}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Gamification;
