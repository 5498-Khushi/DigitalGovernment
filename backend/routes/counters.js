const express = require('express');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { recomputeQueueForService } = require('../utils/queueEngine');
const { emitUserNotification, emitTokenUpdate, emitStaffUpdate } = require('../sockets/queueSocket');

const router = express.Router();

// GET /api/counters/my-counter  -> the counter assigned to the logged-in staff member
router.get('/my-counter', authenticate, authorize('staff', 'admin'), async (req, res) => {
  const [[counter]] = await db.query(
    `SELECT id, counter_number, status, service_ids FROM counters WHERE assigned_staff_id = ?`,
    [req.user.id]
  );
  if (!counter) return res.status(404).json({ error: 'No counter is currently assigned to you.' });

  const serviceIds = (counter.service_ids || '').split(',').filter(Boolean);
  const [services] = serviceIds.length
    ? await db.query(`SELECT id, name FROM services WHERE id IN (?)`, [serviceIds])
    : [[]];

  const [[current]] = await db.query(
    `SELECT t.id, t.token_number, t.status, s.name AS service_name, u.name AS citizen_name, u.id AS citizen_id
     FROM tokens t JOIN services s ON s.id = t.service_id JOIN users u ON u.id = t.user_id
     WHERE t.counter_id = ? AND t.status IN ('Called','Serving') ORDER BY t.called_at DESC LIMIT 1`,
    [counter.id]
  );

  const [nextInLine] = serviceIds.length
    ? await db.query(
        `SELECT t.id, t.token_number, s.name AS service_name, u.name AS citizen_name
         FROM tokens t JOIN services s ON s.id = t.service_id JOIN users u ON u.id = t.user_id
         WHERE t.service_id IN (?) AND t.status IN ('Waiting','Approaching')
         ORDER BY t.created_at ASC LIMIT 5`,
        [serviceIds]
      )
    : [[]];

  res.json({ counter, services, current: current || null, nextInLine });
});

// POST /api/counters/call-next  { }
// Picks the oldest waiting token across the staff member's assigned services.
router.post('/call-next', authenticate, authorize('staff', 'admin'), async (req, res) => {
  const [[counter]] = await db.query(
    `SELECT id, service_ids FROM counters WHERE assigned_staff_id = ? AND active = 1`,
    [req.user.id]
  );
  if (!counter) return res.status(404).json({ error: 'No active counter is assigned to you.' });

  const serviceIds = (counter.service_ids || '').split(',').filter(Boolean);
  if (!serviceIds.length) return res.status(400).json({ error: 'This counter has no assigned services.' });

  const [[busy]] = await db.query(
    `SELECT id FROM tokens WHERE counter_id = ? AND status IN ('Called','Serving')`,
    [counter.id]
  );
  if (busy) {
    return res.status(409).json({ error: 'Finish or complete the current token before calling the next one.' });
  }

  const [[next]] = await db.query(
    `SELECT id, token_number, user_id, service_id, token_number AS tokenNumber
     FROM tokens WHERE service_id IN (?) AND status IN ('Waiting','Approaching')
     ORDER BY created_at ASC LIMIT 1`,
    [serviceIds]
  );
  if (!next) return res.status(404).json({ error: 'The queue is currently empty.' });

  await db.query(
    `UPDATE tokens SET status = 'Called', counter_id = ?, called_at = NOW() WHERE id = ?`,
    [counter.id, next.id]
  );
  await db.query(`UPDATE counters SET status = 'Serving' WHERE id = ?`, [counter.id]);

  const [[counterInfo]] = await db.query('SELECT counter_number FROM counters WHERE id = ?', [counter.id]);
  const message = `Your turn has arrived. Please proceed to Counter ${counterInfo.counter_number}.`;
  await db.query(
    `INSERT INTO notifications (user_id, token_id, message, type) VALUES (?, ?, ?, 'called')`,
    [next.user_id, next.id, message]
  );
  emitUserNotification(next.user_id, { type: 'called', message, tokenId: next.id });
  emitTokenUpdate(next.user_id, { tokenId: next.id, status: 'Called', counterNumber: counterInfo.counter_number });

  await recomputeQueueForService(next.service_id);
  emitStaffUpdate({ counterId: counter.id });

  res.json({ message: 'Next token called.', token: { id: next.id, tokenNumber: next.token_number } });
});

// POST /api/counters/start-service  { tokenId }
router.post('/start-service', authenticate, authorize('staff', 'admin'), async (req, res) => {
  const { tokenId } = req.body;
  const [result] = await db.query(
    `UPDATE tokens SET status = 'Serving', serving_started_at = NOW() WHERE id = ? AND status = 'Called'`,
    [tokenId]
  );
  if (!result.affectedRows) {
    return res.status(400).json({ error: 'Token is not in a Called state.' });
  }
  const [[token]] = await db.query('SELECT user_id, service_id FROM tokens WHERE id = ?', [tokenId]);
  emitTokenUpdate(token.user_id, { tokenId, status: 'Serving' });
  emitStaffUpdate({ serviceId: token.service_id });
  res.json({ message: 'Service started.' });
});

// POST /api/counters/complete-service  { tokenId }
router.post('/complete-service', authenticate, authorize('staff', 'admin'), async (req, res) => {
  const { tokenId } = req.body;

  const [[token]] = await db.query(
    `SELECT id, user_id, service_id, counter_id, created_at, serving_started_at, token_number
     FROM tokens WHERE id = ? AND status = 'Serving'`,
    [tokenId]
  );
  if (!token) return res.status(400).json({ error: 'Token is not currently being served.' });

  await db.query(`UPDATE tokens SET status = 'Completed', completed_at = NOW() WHERE id = ?`, [tokenId]);
  await db.query(`UPDATE counters SET status = 'Available' WHERE id = ?`, [token.counter_id]);

  const serviceDuration = Math.max(
    Math.round((Date.now() - new Date(token.serving_started_at).getTime()) / 60000),
    1
  );
  const waitingDuration = Math.max(
    Math.round((new Date(token.serving_started_at).getTime() - new Date(token.created_at).getTime()) / 60000),
    0
  );
  await db.query(
    `INSERT INTO service_history (token_id, service_id, service_duration, waiting_duration)
     VALUES (?, ?, ?, ?)`,
    [tokenId, token.service_id, serviceDuration, waitingDuration]
  );

  const message = `Your service for token ${token.token_number} has been completed. Thank you.`;
  await db.query(
    `INSERT INTO notifications (user_id, token_id, message, type) VALUES (?, ?, ?, 'completed')`,
    [token.user_id, tokenId, message]
  );
  emitUserNotification(token.user_id, { type: 'completed', message, tokenId });
  emitTokenUpdate(token.user_id, { tokenId, status: 'Completed' });

  await recomputeQueueForService(token.service_id);
  emitStaffUpdate({ serviceId: token.service_id });

  res.json({ message: 'Service marked complete.' });
});

// POST /api/counters/mark-missed  { tokenId }
router.post('/mark-missed', authenticate, authorize('staff', 'admin'), async (req, res) => {
  const { tokenId } = req.body;
  const [[token]] = await db.query(
    `SELECT id, user_id, service_id, counter_id, token_number FROM tokens WHERE id = ? AND status IN ('Called','Serving')`,
    [tokenId]
  );
  if (!token) return res.status(400).json({ error: 'Token cannot be marked missed from its current state.' });

  await db.query(`UPDATE tokens SET status = 'Missed', expired_at = NOW(), counter_id = NULL WHERE id = ?`, [tokenId]);
  if (token.counter_id) {
    await db.query(`UPDATE counters SET status = 'Available' WHERE id = ?`, [token.counter_id]);
  }

  const message = `Your token ${token.token_number} has expired because you did not report within the allowed time.`;
  await db.query(
    `INSERT INTO notifications (user_id, token_id, message, type) VALUES (?, ?, ?, 'expired')`,
    [token.user_id, tokenId, message]
  );
  emitUserNotification(token.user_id, { type: 'expired', message, tokenId });
  emitTokenUpdate(token.user_id, { tokenId, status: 'Missed' });

  await recomputeQueueForService(token.service_id);
  emitStaffUpdate({ serviceId: token.service_id });

  res.json({ message: 'Token marked as missed. Queue has moved to the next citizen.' });
});

module.exports = router;
