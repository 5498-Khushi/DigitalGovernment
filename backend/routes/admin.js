const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate, authorize('admin'));

/* ------------------------- SERVICES ------------------------- */

router.get('/services', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM services ORDER BY id');
  res.json({ services: rows });
});

router.post('/services', async (req, res) => {
  const { name, description, estimatedDuration } = req.body;
  if (!name) return res.status(400).json({ error: 'Service name is required.' });
  const [result] = await db.query(
    'INSERT INTO services (name, description, estimated_duration) VALUES (?, ?, ?)',
    [name, description || '', estimatedDuration || 10]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/services/:id', async (req, res) => {
  const { name, description, estimatedDuration, active } = req.body;
  await db.query(
    `UPDATE services SET name = COALESCE(?, name), description = COALESCE(?, description),
     estimated_duration = COALESCE(?, estimated_duration), active = COALESCE(?, active) WHERE id = ?`,
    [name, description, estimatedDuration, active, req.params.id]
  );
  res.json({ message: 'Service updated.' });
});

router.delete('/services/:id', async (req, res) => {
  // Soft delete/deactivate rather than hard delete, to preserve token history.
  await db.query('UPDATE services SET active = 0 WHERE id = ?', [req.params.id]);
  res.json({ message: 'Service deactivated.' });
});

/* ------------------------- DOCUMENTS ------------------------- */

router.get('/services/:serviceId/documents', async (req, res) => {
  const [rows] = await db.query(
    'SELECT * FROM documents WHERE service_id = ? ORDER BY required DESC, document_name',
    [req.params.serviceId]
  );
  res.json({ documents: rows });
});

router.post('/services/:serviceId/documents', async (req, res) => {
  const { documentName, required } = req.body;
  if (!documentName) return res.status(400).json({ error: 'Document name is required.' });
  const [result] = await db.query(
    'INSERT INTO documents (service_id, document_name, required) VALUES (?, ?, ?)',
    [req.params.serviceId, documentName, required ? 1 : 0]
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/documents/:id', async (req, res) => {
  const { documentName, required } = req.body;
  await db.query(
    'UPDATE documents SET document_name = COALESCE(?, document_name), required = COALESCE(?, required) WHERE id = ?',
    [documentName, required, req.params.id]
  );
  res.json({ message: 'Document updated.' });
});

router.delete('/documents/:id', async (req, res) => {
  await db.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
  res.json({ message: 'Document removed.' });
});

/* ------------------------- COUNTERS ------------------------- */

router.get('/counters', async (req, res) => {
  const [rows] = await db.query(
    `SELECT c.*, u.name AS staff_name FROM counters c
     LEFT JOIN users u ON u.id = c.assigned_staff_id ORDER BY c.counter_number`
  );
  res.json({ counters: rows });
});

router.post('/counters', async (req, res) => {
  const { counterNumber, serviceIds, assignedStaffId } = req.body;
  if (!counterNumber) return res.status(400).json({ error: 'Counter number is required.' });
  const [result] = await db.query(
    'INSERT INTO counters (counter_number, service_ids, assigned_staff_id, status) VALUES (?, ?, ?, ?)',
    [counterNumber, (serviceIds || []).join(','), assignedStaffId || null, 'Available']
  );
  res.status(201).json({ id: result.insertId });
});

router.put('/counters/:id', async (req, res) => {
  const { active, serviceIds, assignedStaffId, status } = req.body;
  await db.query(
    `UPDATE counters SET
       active = COALESCE(?, active),
       service_ids = COALESCE(?, service_ids),
       assigned_staff_id = ?,
       status = COALESCE(?, status)
     WHERE id = ?`,
    [
      active,
      serviceIds ? serviceIds.join(',') : null,
      assignedStaffId === undefined ? null : assignedStaffId,
      status,
      req.params.id
    ]
  );
  res.json({ message: 'Counter updated.' });
});

/* ------------------------- USERS (staff creation) ------------------------- */

router.get('/users', async (req, res) => {
  const [rows] = await db.query('SELECT id, name, email, mobile, role, created_at FROM users ORDER BY id');
  res.json({ users: rows });
});

router.post('/users', async (req, res) => {
  const { name, email, mobile, password, role } = req.body;
  if (!name || !email || !mobile || !password || !['staff', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Name, email, mobile, password, and a valid role are required.' });
  }
  const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) return res.status(409).json({ error: 'A user with this email already exists.' });

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (name, email, mobile, password_hash, role) VALUES (?, ?, ?, ?, ?)',
    [name, email, mobile, passwordHash, role]
  );
  res.status(201).json({ id: result.insertId });
});

/* ------------------------- ANALYTICS ------------------------- */

router.get('/analytics', async (req, res) => {
  const [[totals]] = await db.query(`
    SELECT
      (SELECT COUNT(*) FROM tokens WHERE DATE(created_at) = CURDATE()) AS totalToday,
      (SELECT COUNT(*) FROM tokens WHERE status IN ('Waiting','Approaching','Called','Serving')) AS activeQueue,
      (SELECT COUNT(*) FROM tokens WHERE status = 'Completed' AND DATE(completed_at) = CURDATE()) AS completedToday,
      (SELECT COUNT(*) FROM tokens WHERE status = 'Missed' AND DATE(expired_at) = CURDATE()) AS missedToday,
      (SELECT COUNT(*) FROM counters WHERE active = 1) AS activeCounters,
      (SELECT ROUND(AVG(waiting_duration)) FROM service_history) AS avgWaitMinutes,
      (SELECT ROUND(AVG(service_duration)) FROM service_history) AS avgServiceMinutes
  `);

  const [serviceWise] = await db.query(`
    SELECT s.id, s.name,
      COUNT(t.id) AS totalTokens,
      SUM(CASE WHEN t.status = 'Completed' THEN 1 ELSE 0 END) AS completed,
      SUM(CASE WHEN t.status = 'Missed' THEN 1 ELSE 0 END) AS missed
    FROM services s
    LEFT JOIN tokens t ON t.service_id = s.id AND DATE(t.created_at) = CURDATE()
    GROUP BY s.id, s.name
    ORDER BY s.name
  `);

  const [peakHours] = await db.query(`
    SELECT HOUR(created_at) AS hour, COUNT(*) AS count
    FROM tokens
    WHERE DATE(created_at) = CURDATE()
    GROUP BY HOUR(created_at)
    ORDER BY hour
  `);

  res.json({ totals, serviceWise, peakHours });
});

module.exports = router;
