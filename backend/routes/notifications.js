const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', authenticate, async (req, res) => {
  const [rows] = await db.query(
    `SELECT id, token_id, message, type, is_read, created_at
     FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [req.user.id]
  );
  res.json({ notifications: rows });
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticate, async (req, res) => {
  await db.query(
    'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Marked as read.' });
});

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req, res) => {
  await db.query('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.id]);
  res.json({ message: 'All notifications marked as read.' });
});

module.exports = router;
