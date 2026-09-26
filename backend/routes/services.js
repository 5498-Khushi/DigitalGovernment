const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/services  -> list active services (for the citizen service-selection page)
router.get('/', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, name, description, estimated_duration FROM services WHERE active = 1 ORDER BY name'
  );
  res.json({ services: rows });
});

// GET /api/services/:id  -> single service detail
router.get('/:id', authenticate, async (req, res) => {
  const [rows] = await db.query(
    'SELECT id, name, description, estimated_duration FROM services WHERE id = ? AND active = 1',
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Service not found.' });
  res.json({ service: rows[0] });
});

module.exports = router;
