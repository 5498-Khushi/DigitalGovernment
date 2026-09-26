const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/documents/checklist/:serviceId
// Returns the required/optional document list for a service, merged with
// this citizen's upload status for each one.
router.get('/checklist/:serviceId', authenticate, async (req, res) => {
  const { serviceId } = req.params;

  const [docs] = await db.query(
    'SELECT id, document_name, required FROM documents WHERE service_id = ? ORDER BY required DESC, document_name',
    [serviceId]
  );

  const [uploaded] = await db.query(
    `SELECT document_id, file_path, original_filename, uploaded_at
     FROM uploaded_documents WHERE user_id = ? AND service_id = ?`,
    [req.user.id, serviceId]
  );
  const uploadedMap = new Map(uploaded.map((u) => [u.document_id, u]));

  const checklist = docs.map((d) => ({
    id: d.id,
    documentName: d.document_name,
    required: !!d.required,
    uploaded: uploadedMap.has(d.id),
    uploadedAt: uploadedMap.get(d.id)?.uploaded_at || null,
    originalFilename: uploadedMap.get(d.id)?.original_filename || null
  }));

  const allMandatoryUploaded = checklist
    .filter((d) => d.required)
    .every((d) => d.uploaded);

  res.json({ checklist, allMandatoryUploaded });
});

// POST /api/documents/upload
// multipart/form-data: file, serviceId, documentId
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const { serviceId, documentId } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: 'No file was received.' });
    }
    if (!serviceId || !documentId) {
      return res.status(400).json({ error: 'serviceId and documentId are required.' });
    }

    const [[doc]] = await db.query(
      'SELECT id FROM documents WHERE id = ? AND service_id = ?',
      [documentId, serviceId]
    );
    if (!doc) {
      return res.status(404).json({ error: 'Document type not found for this service.' });
    }

    await db.query(
      `INSERT INTO uploaded_documents (user_id, service_id, document_id, file_path, original_filename)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE file_path = VALUES(file_path),
                               original_filename = VALUES(original_filename),
                               uploaded_at = CURRENT_TIMESTAMP`,
      [req.user.id, serviceId, documentId, req.file.filename, req.file.originalname]
    );

    res.status(201).json({ message: 'Document uploaded successfully.', filename: req.file.filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
});

// DELETE /api/documents/:documentId?serviceId=..  -> remove an uploaded file (re-upload flow)
router.delete('/:documentId', authenticate, async (req, res) => {
  const { serviceId } = req.query;
  await db.query(
    'DELETE FROM uploaded_documents WHERE user_id = ? AND service_id = ? AND document_id = ?',
    [req.user.id, serviceId, req.params.documentId]
  );
  res.json({ message: 'Document removed.' });
});

module.exports = router;
