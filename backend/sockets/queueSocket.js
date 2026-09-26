const jwt = require('jsonwebtoken');

let ioInstance = null;

/**
 * Initializes Socket.IO on the given HTTP server.
 * Clients authenticate with the same JWT used for the REST API and join:
 *   - a personal room `user:<id>`      -> for their own token/notification updates
 *   - a service room `service:<id>`    -> for live queue-position updates
 *   - a staff room `staff`             -> for counter/queue operational updates
 */
function initSocket(io) {
  ioInstance = io;

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = payload;
      next();
    } catch (err) {
      next(new Error('Invalid session'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === 'staff' || socket.user.role === 'admin') {
      socket.join('staff');
    }

    socket.on('subscribe:service', (serviceId) => {
      socket.join(`service:${serviceId}`);
    });

    socket.on('unsubscribe:service', (serviceId) => {
      socket.leave(`service:${serviceId}`);
    });
  });
}

function getIo() {
  if (!ioInstance) throw new Error('Socket.io not initialized yet');
  return ioInstance;
}

/** Broadcast a fresh queue snapshot to everyone watching a service. */
function emitQueueUpdate(serviceId, payload) {
  getIo().to(`service:${serviceId}`).emit('queue:update', payload);
}

/** Push a notification / status change to one specific citizen. */
function emitUserNotification(userId, payload) {
  getIo().to(`user:${userId}`).emit('notification', payload);
}

/** Push a token status change to one specific citizen (for their token page). */
function emitTokenUpdate(userId, payload) {
  getIo().to(`user:${userId}`).emit('token:update', payload);
}

/** Notify staff dashboards that the queue for a counter/service changed. */
function emitStaffUpdate(payload) {
  getIo().to('staff').emit('staff:update', payload);
}

module.exports = {
  initSocket,
  emitQueueUpdate,
  emitUserNotification,
  emitTokenUpdate,
  emitStaffUpdate
};
