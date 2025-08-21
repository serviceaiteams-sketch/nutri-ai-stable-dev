const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const nutritionRoutes = require('./routes/nutrition');
const mealRoutes = require('./routes/meals');
const userRoutes = require('./routes/users');
const aiRoutes = require('./routes/ai');
const workoutRoutes = require('./routes/workouts');
const advancedFeaturesRoutes = require('./routes/advanced-features');
const wearableRoutes = require('./routes/wearable-integration');
const mealPlanningRoutes = require('./routes/meal-planning');
const predictiveHealthRoutes = require('./routes/predictive-health');
const socialRoutes = require('./routes/social-features');
const genomicRoutes = require('./routes/genomic-integration');

// Import new advanced nutrition routes
const advancedNutritionRoutes = require('./routes/advanced-nutrition');
const dynamicMealPlanningRoutes = require('./routes/dynamic-meal-planning');
const enhancedFoodSwapsRoutes = require('./routes/enhanced-food-swaps');
const aiPortionEstimationRoutes = require('./routes/ai-portion-estimation');
const enhancedMoodAnalysisRoutes = require('./routes/enhanced-mood-analysis');

// Import health analysis routes
const healthAnalysisRoutes = require('./routes/health-analysis');
const analyticsRoutes = require('./routes/analytics');
const notificationsRoutes = require('./routes/notifications');
const gamificationRoutes = require('./routes/gamification');

// Import sleep tracking routes
const sleepTrackingRoutes = require('./routes/sleep-tracking');
const hydrationRoutes = require('./routes/hydration');
const stepsRoutes = require('./routes/steps');
const allergenDetectionRoutes = require('./routes/allergen-detection');
const healthApprovedRoutes = require('./routes/health-approved');
const feedbackRoutes = require('./routes/feedback');
const addictionRoutes = require('./routes/addiction');

const app = express();
// Trust proxy for correct client IPs in rate limiting and logging
// app.set('trust proxy', true); // Commented out due to rate limiting compatibility issues
const PORT = process.env.PORT || 5001;

// Security middleware temporarily simplified due to Express 5 compatibility issues
app.use(helmet());

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting temporarily disabled due to Express 5 compatibility issues
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const strictLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5, // limit auth endpoints to 5 requests per 15 minutes
//   message: 'Too many authentication attempts, please try again later.'
// });

// app.use('/api/', limiter);
// app.use('/api/auth/login', strictLimiter);
// app.use('/api/auth/register', strictLimiter);

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize()); // Commented out due to compatibility issues with Express 5

// Data sanitization against XSS
// app.use(xss()); // Commented out due to compatibility issues with Express 5

// Prevent HTTP parameter pollution
// app.use(hpp()); // Commented out due to compatibility issues with Express 5

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploaded images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/meals', mealRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/workouts', workoutRoutes);
app.use('/api/advanced', advancedFeaturesRoutes);
app.use('/api/wearable', wearableRoutes);
app.use('/api/meal-planning', mealPlanningRoutes);
app.use('/api/predictive-health', predictiveHealthRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/genomic', genomicRoutes);

// Use new advanced nutrition routes
app.use('/api/advanced-nutrition', advancedNutritionRoutes);
app.use('/api/dynamic-meal-planning', dynamicMealPlanningRoutes);
app.use('/api/enhanced-food-swaps', enhancedFoodSwapsRoutes);
app.use('/api/ai-portion-estimation', aiPortionEstimationRoutes);
app.use('/api/enhanced-mood-analysis', enhancedMoodAnalysisRoutes);

// Use health analysis routes
// Register health-approved BEFORE /api/health to avoid prefix collisions
app.use('/api/health-approved', healthApprovedRoutes);
app.use('/api/health-analysis', healthAnalysisRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/addiction', addictionRoutes);

// Use sleep tracking routes
app.use('/api/sleep', sleepTrackingRoutes);
// Hydration routes
app.use('/api/hydration', hydrationRoutes);
// Steps routes
app.use('/api/steps', stepsRoutes);
app.use('/api/allergen', allergenDetectionRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'NutriAI Oracle Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'An error occurred',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 NutriAI Oracle Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);
}); 