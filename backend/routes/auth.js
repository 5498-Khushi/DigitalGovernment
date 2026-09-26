const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function signToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// POST /api/auth/register  (citizens self-register; staff/admin are created by admin)
router.post('/register', async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    if (!name || !email || !mobile || !password) {
      return res.status(400).json({ error: 'Name, email, mobile, and password are all required.' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!/^\d{7,15}$/.test(mobile)) {
      return res.status(400).json({ error: 'Please enter a valid mobile number.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [name, email, mobile, passwordHash, 'citizen']
    );

    const user = { id: result.insertId, name, email, role: 'citizen' };
    const token = signToken(user);
    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const [rows] = await db.query(
      'SELECT id, name, email, role, password_hash FROM users WHERE email = ?',
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, name, email, mobile, role, created_at FROM users WHERE id = ?',
    [req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found.' });
  res.json({ user: rows[0] });
});

module.exports = router;
