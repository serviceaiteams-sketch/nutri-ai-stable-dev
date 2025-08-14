const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

// Add colors to winston
winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        info => `${info.timestamp} ${info.level}: ${info.message}`
      )
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false
});

// Create a stream object for Morgan middleware
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Audit logger for security events
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'audit.log'),
      maxsize: 5242880,
      maxFiles: 10
    })
  ]
});

// Helper functions
const logError = (error, req = null) => {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  };
  
  if (req) {
    errorInfo.request = {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id
    };
  }
  
  logger.error(errorInfo);
};

const logAudit = (action, userId, details = {}) => {
  auditLogger.info({
    action,
    userId,
    details,
    timestamp: new Date().toISOString()
  });
};

const logPerformance = (operation, duration, metadata = {}) => {
  logger.verbose({
    type: 'performance',
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString()
  });
};

const logSecurity = (event, severity, details = {}) => {
  const logMethod = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
  logger[logMethod]({
    type: 'security',
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
  
  // Also log to audit
  auditLogger.info({
    type: 'security',
    event,
    severity,
    details,
    timestamp: new Date().toISOString()
  });
};

// Database query logger
const logQuery = (query, params, duration) => {
  if (process.env.LOG_QUERIES === 'true') {
    logger.debug({
      type: 'database',
      query,
      params,
      duration,
      timestamp: new Date().toISOString()
    });
  }
};

// API request logger
const logApiRequest = (endpoint, method, statusCode, duration, userId = null) => {
  logger.http({
    type: 'api',
    endpoint,
    method,
    statusCode,
    duration,
    userId,
    timestamp: new Date().toISOString()
  });
};

// Health check logger
const logHealthCheck = (service, status, details = {}) => {
  const logMethod = status === 'healthy' ? 'info' : 'error';
  logger[logMethod]({
    type: 'health',
    service,
    status,
    details,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  logger,
  auditLogger,
  logError,
  logAudit,
  logPerformance,
  logSecurity,
  logQuery,
  logApiRequest,
  logHealthCheck
}; 