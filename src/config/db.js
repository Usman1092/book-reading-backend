// src/config/db.js
// Central PostgreSQL connection pool. All queries in the app go through
// this pool — never open ad-hoc connections elsewhere.

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: {
    rejectUnauthorized: false,
  },

  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  // Log and let the process crash on an unrecoverable pool error rather
  // than silently running with a broken connection.
  console.error('Unexpected PostgreSQL pool error:', err);
  process.exit(1);
});

module.exports = pool;
