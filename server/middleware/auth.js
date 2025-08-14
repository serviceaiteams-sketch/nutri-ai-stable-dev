const jwt = require('jsonwebtoken');
const { getRow } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    // Development fallback: allow requests without token by using the first user
    if ((process.env.NODE_ENV || 'development') === 'development') {
      try {
        const fallbackUser = await getRow('SELECT id, email, name FROM users ORDER BY id ASC LIMIT 1');
        if (fallbackUser) {
          req.user = fallbackUser;
          return next();
        }
      } catch {}
    }
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'nutriai-secret-key');
    
    // Get user from database - handle both userId and id for backward compatibility
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      throw new Error('Invalid token payload');
    }
    
    const user = await getRow('SELECT id, email, name FROM users WHERE id = ?', [userId]);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    // Development fallback on invalid token as well
    if ((process.env.NODE_ENV || 'development') === 'development') {
      try {
        const fallbackUser = await getRow('SELECT id, email, name FROM users ORDER BY id ASC LIMIT 1');
        if (fallbackUser) {
          req.user = fallbackUser;
          return next();
        }
      } catch {}
    }
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'nutriai-secret-key',
    { expiresIn: '7d' }
  );
};

module.exports = {
  authenticateToken,
  generateToken
}; 