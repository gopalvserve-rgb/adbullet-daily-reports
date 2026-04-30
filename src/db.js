// src/db.js — Postgres connection pool + query helpers
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.warn('[db] DATABASE_URL is not set — DB calls will fail.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 10,
  idleTimeoutMillis: 30_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  if (process.env.LOG_SQL === 'true') {
    console.log('[sql]', { text, duration: Date.now() - start, rows: res.rowCount });
  }
  return res;
}

async function one(text, params) {
  const { rows } = await query(text, params);
  return rows[0] || null;
}

async function many(text, params) {
  const { rows } = await query(text, params);
  return rows;
}

module.exports = { pool, query, one, many };
