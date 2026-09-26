const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { predictWaitTime } = require('../utils/aiClient');
const { generateTokenNumber } = require('../utils/tokenGenerator');
const { recomputeQueueForService } = require('../utils/queueEngine');

const router = express.Router();

async function allMandatoryDocsUploaded(userId, serviceId) {
  const [docs] = await db.query(
    'SELECT id FROM documents WHERE service_id = ? AND required = 1',
    [serviceId]
  );
  if (!docs.length) return true;

  const [uploaded] = await db.query(
    `SELECT document_id FROM uploaded_documents WHERE user_id = ? AND service_id = ?`,
    [userId, serviceId]
  );
  const uploadedIds = new Set(uploaded.map((u) => u.document_id));
  return docs.every((d) => uploadedIds.has(d.id));
}

// POST /api/tokens/predict  { serviceId }
// Step before confirmation: validates documents, returns predicted wait time.
// Does NOT create a token (Rule 5 / Rule 6).
router.post('/predict', authenticate, async (req, res) => {
  try {
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required.' });

    const ready = await allMandatoryDocsUploaded(req.user.id, serviceId);
    if (!ready) {
      return res.status(400).json({
        error: 'Please upload all mandatory documents before generating a token.'
      });
    }

    const { predictedMinutes } = await predictWaitTime(serviceId);
    const [[{ queueLength }]] = await db.query(
      `SELECT COUNT(*) AS queueLength FROM tokens
       WHERE service_id = ? AND status IN ('Waiting','Approaching','Called') AND DATE(created_at) = CURDATE()`,
      [serviceId]
    );

    res.json({
      predictedWaitTime: predictedMinutes,
      currentQueueLength: queueLength,
      readyToGenerate: true
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not calculate waiting time. Please try again.' });
  }
});

// POST /api/tokens/generate  { serviceId }
// Only called after the citizen explicitly confirms (Rule 6).
router.post('/generate', authenticate, async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { serviceId } = req.body;
    if (!serviceId) return res.status(400).json({ error: 'serviceId is required.' });

    const ready = await allMandatoryDocsUploaded(req.user.id, serviceId);
    if (!ready) {
      return res.status(400).json({
        error: 'Please upload all mandatory documents before generating a token.'
      });
    }

    const [[existing]] = await db.query(
      `SELECT id FROM tokens WHERE user_id = ? AND service_id = ?
       AND status IN ('Waiting','Approaching','Called','Serving')`,
      [req.user.id, serviceId]
    );
    if (existing) {
      return res.status(409).json({ error: 'You already have an active token for this service.' });
    }

    const tokenNumber = await generateTokenNumber(serviceId);
    const { predictedMinutes } = await predictWaitTime(serviceId);

    const [[{ queueLength }]] = await db.query(
      `SELECT COUNT(*) AS queueLength FROM tokens
       WHERE service_id = ? AND status IN ('Waiting','Approaching','Called')`,
      [serviceId]
    );

    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO tokens (token_number, user_id, service_id, status, queue_position, predicted_wait_time)
       VALUES (?, ?, ?, 'Waiting', ?, ?)`,
      [tokenNumber, req.user.id, serviceId, queueLength + 1, predictedMinutes]
    );
    await connection.commit();

    const [[service]] = await db.query('SELECT name FROM services WHERE id = ?', [serviceId]);
    await db.query(
      `INSERT INTO notifications (user_id, token_id, message, type)
       VALUES (?, ?, ?, 'info')`,
      [req.user.id, result.insertId, `Token ${tokenNumber} generated for ${service.name}.`, 'info']
    );

    const snapshot = await recomputeQueueForService(serviceId);

    res.status(201).json({
      token: {
        id: result.insertId,
        tokenNumber,
        serviceId,
        status: 'Waiting',
        queuePosition: queueLength + 1,
        predictedWaitTime: predictedMinutes
      },
      snapshot
    });
  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ error: 'Could not generate token. Please try again.' });
  } finally {
    connection.release();
  }
});

// GET /api/tokens/my-active  -> citizen's current active token(s), for dashboard/redirect logic
router.get('/my-active', authenticate, async (req, res) => {
  const [rows] = await db.query(
    `SELECT t.id, t.token_number, t.status, t.queue_position, t.predicted_wait_time,
            t.counter_id, t.created_at, s.name AS service_name, s.id AS service_id,
            c.counter_number
     FROM tokens t
     JOIN services s ON s.id = t.service_id
     LEFT JOIN counters c ON c.id = t.counter_id
     WHERE t.user_id = ? AND t.status IN ('Waiting','Approaching','Called','Serving')
     ORDER BY t.created_at DESC`,
    [req.user.id]
  );
  res.json({ tokens: rows });
});

// GET /api/tokens/:id  -> full detail for the token page / live tracking
router.get('/:id', authenticate, async (req, res) => {
  const [[token]] = await db.query(
    `SELECT t.*, s.name AS service_name, c.counter_number
     FROM tokens t
     JOIN services s ON s.id = t.service_id
     LEFT JOIN counters c ON c.id = t.counter_id
     WHERE t.id = ?`,
    [req.params.id]
  );
  if (!token) return res.status(404).json({ error: 'Token not found.' });
  if (token.user_id !== req.user.id && req.user.role === 'citizen') {
    return res.status(403).json({ error: 'You can only view your own token.' });
  }

  const [[servingToken]] = await db.query(
  `SELECT token_number AS nowServing FROM tokens
   WHERE service_id = ? AND status = 'Serving' LIMIT 1`,
  [token.service_id]
);

const nowServing = servingToken ? servingToken.nowServing : null;

  res.json({
    token: {
      id: token.id,
      tokenNumber: token.token_number,
      serviceName: token.service_name,
      status: token.status,
      queuePosition: token.queue_position,
      peopleAhead: Math.max(token.queue_position - 1, 0),
      predictedWaitTime: token.predicted_wait_time,
      counterNumber: token.counter_number,
      createdAt: token.created_at,
      nowServing: nowServing || null
    }
  });
});

module.exports = router;
