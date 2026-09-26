const db = require('../config/db');

/**
 * Generates the next token number for a service, in the form
 * <ServiceLetter>-<sequence>, e.g. "A-105".
 * The letter is derived from the service's position among active services,
 * so each service keeps its own token letter/sequence series, matching
 * the physical "counter ticket" convention citizens already recognise.
 */
async function generateTokenNumber(serviceId) {
  const [[service]] = await db.query(
    'SELECT id, name FROM services WHERE id = ?',
    [serviceId]
  );
  if (!service) throw new Error('Service not found');

  const [[{ letterIndex }]] = await db.query(
    `SELECT COUNT(*) AS letterIndex FROM services WHERE id <= ? ORDER BY id`,
    [serviceId]
  );
  const letter = String.fromCharCode(64 + (((letterIndex - 1) % 26) + 1)); // A, B, C...

  const [[{ count }]] = await db.query(
    `SELECT COUNT(*) AS count FROM tokens WHERE service_id = ? AND DATE(created_at) = CURDATE()`,
    [serviceId]
  );

  const sequence = (100 + count).toString(); // start sequences at 101 for readability
  return `${letter}-${sequence}`;
}

module.exports = { generateTokenNumber };
