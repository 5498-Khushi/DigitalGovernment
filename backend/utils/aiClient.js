const axios = require('axios');
const db = require('../config/db');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:6000';

/**
 * Gathers the live features the AI service needs, calls it, and returns
 * the predicted waiting time in minutes. Falls back to a simple heuristic
 * if the AI microservice is unreachable, so the citizen flow never breaks.
 */
async function predictWaitTime(serviceId) {
  const [[service]] = await db.query(
    'SELECT id, name, estimated_duration FROM services WHERE id = ?',
    [serviceId]
  );
  if (!service) throw new Error('Service not found');

  const [[queueRow]] = await db.query(
    `SELECT COUNT(*) AS queueLength FROM tokens
     WHERE service_id = ? AND status IN ('Waiting','Approaching','Called') AND DATE(created_at) = CURDATE()`,
    [serviceId]
  );

  const [[servingRow]] = await db.query(
    `SELECT COUNT(*) AS activeServing FROM tokens
     WHERE service_id = ? AND status = 'Serving'`,
    [serviceId]
  );

  const [[counterRow]] = await db.query(
    `SELECT COUNT(*) AS activeCounters FROM counters
     WHERE active = 1 AND FIND_IN_SET(?, service_ids)`,
    [serviceId]
  );

  const [[historyRow]] = await db.query(
    `SELECT AVG(service_duration) AS avgDuration FROM service_history WHERE service_id = ?`,
    [serviceId]
  );

  const features = {
    queue_length: queueRow.queueLength,
    service_id: serviceId,
    service_name: service.name,
    avg_historical_duration: historyRow.avgDuration
      ? Number(historyRow.avgDuration)
      : service.estimated_duration,
    active_counters: Math.max(counterRow.activeCounters, 1),
    currently_serving: servingRow.activeServing
  };

  try {
    const { data } = await axios.post(`${AI_SERVICE_URL}/predict`, features, { timeout: 4000 });
    return {
      predictedMinutes: Math.round(data.predicted_wait_time_minutes),
      features
    };
  } catch (err) {
    // Fallback heuristic if the AI microservice is down: keeps the app usable.
    const heuristic =
      (features.queue_length * features.avg_historical_duration) /
      Math.max(features.active_counters, 1);
    return { predictedMinutes: Math.max(Math.round(heuristic), 2), features, fallback: true };
  }
}

module.exports = { predictWaitTime };
