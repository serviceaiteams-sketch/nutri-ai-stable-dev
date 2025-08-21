const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { runQuery, getRow } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();

// --- Minimal TOTP helpers (RFC 6238) ---
function base32Encode(buffer) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0, output = '';
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
  return output;
}

function generateSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function base32ToBuffer(base32) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0, value = 0;
  const out = [];
  for (const ch of base32.replace(/=+$/,'').toUpperCase()) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function totp(secret, timeStep = 30, digits = 6, algo = 'sha1') {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter, 4);
  const key = base32ToBuffer(secret);
  const hmac = crypto.createHmac(algo, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)).toString().padStart(digits, '0');
  return code;
}

// Register user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('age').optional().isInt({ min: 1, max: 120 }),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('height').optional().isFloat({ min: 0 }),
  body('weight').optional().isFloat({ min: 0 }),
  body('activity_level').optional().isIn(['sedentary', 'moderate', 'active']),
  body('health_goal').optional().isIn(['weight_loss', 'muscle_gain', 'maintenance', 'improve_health'])
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      email,
      password,
      name,
      age,
      gender,
      height,
      weight,
      activity_level = 'moderate',
      health_goal = 'maintenance',
      dietary_preferences,
      allergies,
      medical_conditions
    } = req.body;

    // Check if user already exists
    const existingUser = await getRow('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Insert new user
    const result = await runQuery(
      `INSERT INTO users (email, password, name, age) 
       VALUES (?, ?, ?, ?)`,
      [email, hashedPassword, name, age || null]
    );

    // Generate token
    const token = generateToken(result.id);

    // Get user data (without password)
    const user = await getRow(
      'SELECT id, email, name, age FROM users WHERE id = ?',
      [result.id]
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, twoFAToken } = req.body;

    // Find user
    const user = await getRow('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // If 2FA is enabled, require a valid TOTP
    if (user.twofa_enabled) {
      if (!twoFAToken) {
        return res.status(200).json({ twofaRequired: true });
      }
      const isValidTotp = totp(user.twofa_secret) === String(twoFAToken).trim();
      if (!isValidTotp) {
        return res.status(401).json({ error: 'Invalid 2FA code' });
      }
    }

    // Generate token
    const token = generateToken(user.id);

    // Remove password from response
    const { password: _, twofa_secret, ...userWithoutSensitive } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userWithoutSensitive
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await getRow(
      'SELECT id, email, name, age, gender, height, weight, activity_level, health_goal, dietary_preferences, allergies, medical_conditions, twofa_enabled, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// 2FA: initiate/enable - generates a secret and validates a user-provided TOTP to activate
router.post('/2fa/enable', authenticateToken, [
  body('token').isLength({ min: 6, max: 8 }).optional()
], async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getRow('SELECT id, twofa_enabled, twofa_secret, email FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // If token provided, verify and enable
    if (req.body.token && user.twofa_secret) {
      const valid = totp(user.twofa_secret) === String(req.body.token).trim();
      if (!valid) return res.status(400).json({ error: 'Invalid 2FA token' });
      await runQuery('UPDATE users SET twofa_enabled = 1 WHERE id = ?', [userId]);
      return res.json({ ok: true, enabled: true });
    }

    // Otherwise, generate a new secret and return provisioning info
    const secret = generateSecret();
    await runQuery('UPDATE users SET twofa_secret = ?, twofa_enabled = 0 WHERE id = ?', [secret, userId]);
    const issuer = encodeURIComponent('NutriAI');
    const account = encodeURIComponent(user.email || `user${userId}`);
    const otpauth = `otpauth://totp/${issuer}:${account}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
    return res.json({ ok: true, enabled: false, secret, otpauth });
  } catch (e) {
    console.error('Enable 2FA error:', e);
    res.status(500).json({ error: 'Could not enable 2FA' });
  }
});

// 2FA: disable
router.post('/2fa/disable', authenticateToken, async (req, res) => {
  try {
    await runQuery('UPDATE users SET twofa_enabled = 0, twofa_secret = NULL WHERE id = ?', [req.user.id]);
    res.json({ ok: true, enabled: false });
  } catch (e) {
    console.error('Disable 2FA error:', e);
    res.status(500).json({ error: 'Could not disable 2FA' });
  }
});

module.exports = router; 