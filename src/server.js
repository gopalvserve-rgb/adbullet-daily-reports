// src/server.js — Express app entry. Boots HTTP, runs migrations, starts cron.
require('dotenv').config();
process.env.TZ = process.env.TZ || 'Asia/Kolkata';

const path = require('path');
const express = require('express');
const adminRouter = require('./routes/admin');
const { run: runMigrations } = require('./migrate');
const { start: startScheduler } = require('./jobs/scheduler');

const app = express();

// EJS views
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parsing + static
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Health check (Railway uses this)
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    service: 'adbullet-daily-reports',
    time: new Date().toISOString(),
    tz: process.env.TZ,
  });
});

// Root → admin
app.get('/', (req, res) => res.redirect('/admin'));

// Admin routes
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404).send('Not found');
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] error:', err);
  res.status(500).send('Server error: ' + err.message);
});

const PORT = process.env.PORT || 3000;

async function boot() {
  try {
    console.log('[boot] running migrations…');
    await runMigrations();
  } catch (err) {
    console.error('[boot] migration failed:', err.message);
    // Don't exit — let server boot so user can fix DB via the UI / Railway logs.
  }
  app.listen(PORT, () => {
    console.log(`[server] listening on :${PORT}`);
    console.log(`[server] admin: http://localhost:${PORT}/admin`);
    startScheduler();
  });
}

boot();
