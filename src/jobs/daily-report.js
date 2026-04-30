// src/jobs/daily-report.js — orchestrates: pull data, build email, send, log.
require('dotenv').config();
const { many, query } = require('../db');
const { fetchAllForClient } = require('../windsor');
const { buildReport } = require('../report/builder');
const { sendEmail } = require('../email/sender');
const { yesterday, dayBefore } = require('../utils/dates');

async function getActiveClients() {
  return many(
    `SELECT id, name, company, recipient_emails, cc_emails, timezone
       FROM clients
      WHERE is_active = TRUE
      ORDER BY name`
  );
}

async function getClientById(id) {
  return many(
    `SELECT id, name, company, recipient_emails, cc_emails, timezone
       FROM clients
      WHERE id = $1`,
    [id]
  ).then((rows) => rows[0]);
}

async function getAccounts(clientId) {
  return many(
    `SELECT platform, account_id
       FROM client_accounts
      WHERE client_id = $1 AND is_active = TRUE`,
    [clientId]
  );
}

async function logRun({ client, reportDate, status, error, durationMs }) {
  await query(
    `INSERT INTO report_runs (client_id, client_name, report_date, status, recipient_emails, error_message, duration_ms)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      client?.id || null,
      client?.name || 'unknown',
      reportDate,
      status,
      client?.recipient_emails || null,
      error || null,
      durationMs,
    ]
  );
}

// Returns: { status, error?, totals?, subject? }
async function runForClient(client) {
  const start = Date.now();
  const tz = client.timezone || 'Asia/Kolkata';
  const reportDate = yesterday(tz);
  const previousDate = dayBefore(tz);

  try {
    const accounts = await getAccounts(client.id);
    if (!accounts.length) {
      await logRun({ client, reportDate, status: 'skipped', error: 'no accounts configured', durationMs: Date.now() - start });
      return { status: 'skipped', reason: 'no accounts' };
    }

    // Pull yesterday and day-before in parallel
    const [yesterdayData, previousData] = await Promise.all([
      fetchAllForClient({ accounts, dateFrom: reportDate, dateTo: reportDate }),
      fetchAllForClient({ accounts, dateFrom: previousDate, dateTo: previousDate }),
    ]);

    // Attach previous to each platform for delta rendering
    for (const p of Object.keys(yesterdayData)) {
      yesterdayData[p].previous = previousData[p] || {};
    }

    const { subject, html, totals } = buildReport({
      client,
      reportDate,
      platforms: yesterdayData,
      fromName: process.env.FROM_NAME,
    });

    if (totals.spend === 0 && totals.leads === 0 && totals.clicks === 0) {
      await logRun({ client, reportDate, status: 'no_data', durationMs: Date.now() - start });
      return { status: 'no_data', subject };
    }

    await sendEmail({
      to: client.recipient_emails,
      cc: client.cc_emails,
      subject,
      html,
    });

    await logRun({ client, reportDate, status: 'success', durationMs: Date.now() - start });
    return { status: 'success', subject, totals };
  } catch (err) {
    console.error(`[daily-report] ${client.name} failed:`, err);
    await logRun({ client, reportDate, status: 'failed', error: err.message, durationMs: Date.now() - start });
    return { status: 'failed', error: err.message };
  }
}

async function runAll() {
  const clients = await getActiveClients();
  console.log(`[daily-report] running for ${clients.length} active clients`);
  const summary = { success: 0, no_data: 0, failed: 0, skipped: 0 };
  for (const c of clients) {
    const r = await runForClient(c);
    summary[r.status] = (summary[r.status] || 0) + 1;
    console.log(`[daily-report] ${c.name}: ${r.status}${r.error ? ` (${r.error})` : ''}`);
  }
  console.log('[daily-report] summary:', summary);
  return summary;
}

// CLI entry
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    if (args.includes('--client')) {
      const id = args[args.indexOf('--client') + 1];
      const client = await getClientById(parseInt(id, 10));
      if (!client) {
        console.error('No client found with id', id);
        process.exit(1);
      }
      const r = await runForClient(client);
      console.log(r);
    } else {
      await runAll();
    }
    process.exit(0);
  })().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { runAll, runForClient, getClientById };
