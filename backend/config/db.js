const mysql = require('mysql2/promise');
const fs = require('fs');
require('dotenv').config();

const sslConfig = process.env.DB_SSL_CA_PATH
  ? { ca: fs.readFileSync(process.env.DB_SSL_CA_PATH), rejectUnauthorized: true }
  : undefined;

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'citizen_service_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  ssl: sslConfig
});

module.exports = pool;