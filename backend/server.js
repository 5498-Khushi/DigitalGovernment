require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const path = require('path');

const { initSocket } = require('./sockets/queueSocket');
const { autoExpireOverdueTokens } = require('./utils/queueEngine');

const authRoutes = require('./routes/auth');
const serviceRoutes = require('./routes/services');
const documentRoutes = require('./routes/documents');
const tokenRoutes = require('./routes/tokens');
const counterRoutes = require('./routes/counters');
const adminRoutes = require('./routes/admin');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true }
});
initSocket(io);

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // served only to authenticated app users in prod via a reverse proxy

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'citizen-service-backend' }));

app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Centralized error handler (e.g. multer file-size/type errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

// Background job: auto-expire "Called" tokens past their grace period (Rule 9 & 10)
const EXPIRY_CHECK_INTERVAL_MS = 30 * 1000;
setInterval(() => {
  autoExpireOverdueTokens().catch((err) => console.error('Auto-expiry job failed:', err));
}, EXPIRY_CHECK_INTERVAL_MS);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Citizen Service backend running on http://localhost:${PORT}`);
});
