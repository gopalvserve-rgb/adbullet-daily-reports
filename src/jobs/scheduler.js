// src/jobs/scheduler.js — registers the daily cron.
const cron = require('node-cron');
const { runAll } = require('./daily-report');

function start() {
  if (process.env.CRON_ENABLED !== 'true') {
    console.log('[scheduler] CRON_ENABLED is not "true" — skipping cron registration');
    return;
  }
  // Default 02:30 UTC = 08:00 IST
  const expr = process.env.DAILY_CRON || '30 2 * * *';
  if (!cron.validate(expr)) {
    console.error('[scheduler] invalid DAILY_CRON expression:', expr);
    return;
  }
  cron.schedule(expr, async () => {
    console.log('[scheduler] daily cron firing at', new Date().toISOString());
    try {
      await runAll();
    } catch (err) {
      console.error('[scheduler] runAll failed:', err);
    }
  }, { timezone: 'UTC' });
  console.log(`[scheduler] daily cron registered (UTC expr "${expr}")`);
}

module.exports = { start };
