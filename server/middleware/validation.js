const { body, param, query, validationResult } = require('express-validator');

// Validation middleware wrapper
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  };
};

// Common validation rules
const validationRules = {
  // User authentication
  register: [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number')
  ],

  login: [
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required')
      .isEmail().withMessage('Please provide a valid email')
      .normalizeEmail(),
    body('password')
      .notEmpty().withMessage('Password is required')
  ],

  // Meal logging
  logMeal: [
    body('meal_type')
      .notEmpty().withMessage('Meal type is required')
      .isIn(['breakfast', 'lunch', 'dinner', 'snack']).withMessage('Invalid meal type'),
    body('food_items')
      .isArray({ min: 1 }).withMessage('At least one food item is required'),
    body('food_items.*.name')
      .trim()
      .notEmpty().withMessage('Food name is required')
      .isLength({ max: 100 }).withMessage('Food name too long'),
    body('food_items.*.quantity')
      .isFloat({ min: 0.1 }).withMessage('Quantity must be a positive number'),
    body('food_items.*.calories')
      .optional()
      .isFloat({ min: 0 }).withMessage('Calories must be a positive number'),
    body('date')
      .optional()
      .isISO8601().withMessage('Invalid date format')
  ],

  // Health conditions
  healthConditions: [
    body('conditions')
      .isArray().withMessage('Conditions must be an array'),
    body('conditions.*.name')
      .trim()
      .notEmpty().withMessage('Condition name is required')
      .isLength({ max: 100 }).withMessage('Condition name too long'),
    body('conditions.*.severity')
      .optional()
      .isIn(['mild', 'moderate', 'severe']).withMessage('Invalid severity level'),
    body('conditions.*.diagnosedDate')
      .optional()
      .isISO8601().withMessage('Invalid date format')
  ],

  // Workout logging
  logWorkout: [
    body('workout_type')
      .trim()
      .notEmpty().withMessage('Workout type is required')
      .isLength({ max: 50 }).withMessage('Workout type too long'),
    body('duration')
      .isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
    body('intensity')
      .optional()
      .isIn(['low', 'moderate', 'high']).withMessage('Invalid intensity level'),
    body('calories_burned')
      .optional()
      .isFloat({ min: 0 }).withMessage('Calories burned must be a positive number')
  ],

  // Profile update
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
    body('age')
      .optional()
      .isInt({ min: 1, max: 120 }).withMessage('Age must be between 1 and 120'),
    body('current_weight')
      .optional()
      .isFloat({ min: 1, max: 500 }).withMessage('Weight must be between 1 and 500'),
    body('target_weight')
      .optional()
      .isFloat({ min: 1, max: 500 }).withMessage('Target weight must be between 1 and 500'),
    body('phone')
      .optional()
      .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format')
  ],

  // Hydration logging
  logHydration: [
    body('amount')
      .isInt({ min: -10, max: 10 }).withMessage('Amount must be between -10 and 10 glasses')
  ],

  // Steps logging
  logSteps: [
    body('amount')
      .isInt({ min: -50000, max: 50000 }).withMessage('Steps amount must be between -50000 and 50000')
  ],

  // File upload
  uploadFile: [
    body('file')
      .custom((value, { req }) => {
        if (!req.file) {
          throw new Error('No file uploaded');
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(req.file.mimetype)) {
          throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed');
        }
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (req.file.size > maxSize) {
          throw new Error('File size exceeds 10MB limit');
        }
        return true;
      })
  ],

  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],

  // Date range
  dateRange: [
    query('startDate')
      .optional()
      .isISO8601().withMessage('Invalid start date format'),
    query('endDate')
      .optional()
      .isISO8601().withMessage('Invalid end date format')
      .custom((value, { req }) => {
        if (req.query.startDate && value) {
          if (new Date(value) < new Date(req.query.startDate)) {
            throw new Error('End date must be after start date');
          }
        }
        return true;
      })
  ],

  // ID parameter
  idParam: [
    param('id')
      .isInt({ min: 1 }).withMessage('Invalid ID format')
  ]
};

// Sanitization helpers
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Remove any HTML tags
  input = input.replace(/<[^>]*>/g, '');
  
  // Remove any script tags and content
  input = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Escape special characters
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;'
  };
  
  return input.replace(/[&<>"'/]/g, char => escapeMap[char]);
};

// Middleware to sanitize all inputs
const sanitizeAll = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeInput(req.body[key]);
      }
    });
  }
  
  // Sanitize query
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeInput(req.query[key]);
      }
    });
  }
  
  // Sanitize params
  if (req.params) {
    Object.keys(req.params).forEach(key => {
      if (typeof req.params[key] === 'string') {
        req.params[key] = sanitizeInput(req.params[key]);
      }
    });
  }
  
  next();
};

module.exports = {
  validate,
  validationRules,
  sanitizeInput,
  sanitizeAll
}; 