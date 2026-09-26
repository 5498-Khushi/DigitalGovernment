const db = require('../config/db');
const { predictWaitTime } = require('./aiClient');
const {
  emitQueueUpdate,
  emitTokenUpdate,
  emitUserNotification,
  emitStaffUpdate
} = require('../sockets/queueSocket');

const APPROACHING_MINUTES = 10;
const APPROACHING_PEOPLE_AHEAD = 5;

/**
 * Recalculates queue position + predicted wait time for every token still
 * in the active queue (Waiting/Approaching/Called) of a service, updates
 * the DB, fires "approaching" notifications when thresholds are crossed,
 * and broadcasts the fresh snapshot over sockets.
 *
 * This is the single place queue math happens, so it's called after every
 * event that changes the queue: token created, called, completed, missed.
 */
async function recomputeQueueForService(serviceId) {
  const [tokens] = await db.query(
    `SELECT id, token_number, user_id, status, created_at
     FROM tokens
     WHERE service_id = ? AND status IN ('Waiting','Approaching','Called')
     ORDER BY created_at ASC`,
    [serviceId]
  );

  const { predictedMinutes: baseWaitPerPerson, features } = await predictWaitTime(serviceId);
  const perPersonMinutes = tokens.length
    ? Math.max(baseWaitPerPerson / Math.max(tokens.length, 1), 2)
    : features.avg_historical_duration / Math.max(features.active_counters, 1);

  const updates = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i];
    const peopleAhead = i;
    const estWait = Math.round(peopleAhead * perPersonMinutes + (t.status === 'Called' ? 0 : perPersonMinutes / 2));

    let newStatus = t.status;
    if (t.status === 'Waiting' && (estWait <= APPROACHING_MINUTES || peopleAhead <= APPROACHING_PEOPLE_AHEAD)) {
      newStatus = 'Approaching';
    }

    updates.push({ id: t.id, userId: t.user_id, position: i + 1, peopleAhead, estWait, newStatus, prevStatus: t.status });
  }

  for (const u of updates) {
    await db.query(
      'UPDATE tokens SET queue_position = ?, predicted_wait_time = ?, status = ? WHERE id = ?',
      [u.position, u.estWait, u.newStatus, u.id]
    );

    if (u.newStatus === 'Approaching' && u.prevStatus === 'Waiting') {
      const message = `Your turn is approaching. Only ${u.peopleAhead} citizen(s) remain before your turn. Estimated wait: ${u.estWait} minute(s).`;
      await db.query(
        `INSERT INTO notifications (user_id, token_id, message, type) VALUES (?, ?, ?, 'approaching')`,
        [u.userId, u.id, message]
      );
      emitUserNotification(u.userId, { type: 'approaching', message, tokenId: u.id });
    }

    emitTokenUpdate(u.userId, {
      tokenId: u.id,
      status: u.newStatus,
      queuePosition: u.position,
      peopleAhead: u.peopleAhead,
      predictedWaitTime: u.estWait
    });
  }

  const snapshot = {
    serviceId,
    queueLength: updates.length,
    tokens: updates.map((u) => ({
      tokenId: u.id,
      position: u.position,
      status: u.newStatus,
      predictedWaitTime: u.estWait
    }))
  };

  emitQueueUpdate(serviceId, snapshot);
  emitStaffUpdate({ serviceId, queueLength: updates.length });

  return snapshot;
}

/**
 * Scans "Called" tokens whose grace period has elapsed and auto-expires
 * them, then re-runs queue math for the affected service so nobody is
 * blocked behind a citizen who didn't show up.
 */
async function autoExpireOverdueTokens() {
  const graceMinutes = Number(process.env.TOKEN_GRACE_PERIOD_MINUTES || 5);

  const [overdue] = await db.query(
    `SELECT id, user_id, service_id, token_number FROM tokens
     WHERE status = 'Called' AND called_at IS NOT NULL
       AND called_at < (NOW() - INTERVAL ? MINUTE)`,
    [graceMinutes]
  );

  const affectedServices = new Set();

  for (const t of overdue) {
    await db.query(
      `UPDATE tokens SET status = 'Missed', expired_at = NOW(), counter_id = NULL WHERE id = ?`,
      [t.id]
    );
    const message = `Your token ${t.token_number} has expired because you did not report within the allowed time.`;
    await db.query(
      `INSERT INTO notifications (user_id, token_id, message, type) VALUES (?, ?, ?, 'expired')`,
      [t.user_id, t.id, message]
    );
    emitUserNotification(t.user_id, { type: 'expired', message, tokenId: t.id });
    emitTokenUpdate(t.user_id, { tokenId: t.id, status: 'Missed' });
    affectedServices.add(t.service_id);
  }

  for (const serviceId of affectedServices) {
    await recomputeQueueForService(serviceId);
  }

  return overdue.length;
}

module.exports = { recomputeQueueForService, autoExpireOverdueTokens };
