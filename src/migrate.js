// src/migrate.js — minimal migration runner; runs every .sql file in src/migrations
// in alphabetical order, recording applied versions in schema_migrations.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { query } = require('./db');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function applied() {
  const { rows } = await query('SELECT version FROM schema_migrations');
  return new Set(rows.map((r) => r.version));
}

async function run() {
  const dir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(dir)) {
    console.log('[migrate] No migrations directory; skipping.');
    return;
  }
  await ensureTable();
  const done = await applied();
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const version = file.replace(/\.sql$/, '');
    if (done.has(version)) {
      console.log(`[migrate] skip ${version} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    console.log(`[migrate] applying ${version}…`);
    await query(sql);
    await query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
    console.log(`[migrate] done ${version}`);
  }
  console.log('[migrate] all migrations applied.');
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[migrate] failed:', err);
      process.exit(1);
    });
}

module.exports = { run };
