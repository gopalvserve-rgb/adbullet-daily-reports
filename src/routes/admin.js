// src/routes/admin.js — admin web UI (server-rendered EJS).
// NOTE: We pass `row` (not `client`) to client-form views because `client`
// is a reserved EJS option name that disables the include() helper.
const express = require('express');
const { many, one, query } = require('../db');
const { adminAuth } = require('../auth');
const { runForClient, getClientById, runAll } = require('../jobs/daily-report');
const { verifyConnection } = require('../email/sender');

const router = express.Router();
router.use(adminAuth);

// ---- Dashboard ----
router.get('/', async (req, res) => {
  const stats = {
    totalClients: (await one('SELECT COUNT(*)::int AS n FROM clients')).n,
    activeClients: (await one('SELECT COUNT(*)::int AS n FROM clients WHERE is_active = TRUE')).n,
    totalAccounts: (await one('SELECT COUNT(*)::int AS n FROM client_accounts WHERE is_active = TRUE')).n,
    sendsLast7d: (await one(
      "SELECT COUNT(*)::int AS n FROM report_runs WHERE sent_at > NOW() - INTERVAL '7 days'"
    )).n,
  };
  const recent = await many(
    `SELECT id, client_name, report_date, status, error_message, sent_at, duration_ms
       FROM report_runs ORDER BY sent_at DESC LIMIT 15`
  );
  res.render('dashboard', { stats, recent, page: 'dashboard' });
});

// ---- Clients list ----
router.get('/clients', async (req, res) => {
  const clients = await many(`
    SELECT c.*, COALESCE(a.account_count, 0)::int AS account_count
      FROM clients c
      LEFT JOIN (
        SELECT client_id, COUNT(*) AS account_count
          FROM client_accounts WHERE is_active = TRUE GROUP BY client_id
      ) a ON a.client_id = c.id
     ORDER BY c.is_active DESC, c.name
  `);
  res.render('clients', { clients, page: 'clients' });
});

// ---- New client form ----
router.get('/clients/new', (req, res) => {
  res.render('client-form', { row: {}, accounts: [], page: 'clients' });
});

// ---- Edit client form ----
router.get('/clients/:id', async (req, res) => {
  const row = await one('SELECT * FROM clients WHERE id = $1', [req.params.id]);
  if (!row) return res.status(404).send('Not found');
  const accounts = await many(
    'SELECT * FROM client_accounts WHERE client_id = $1 ORDER BY platform, account_id',
    [row.id]
  );
  res.render('client-form', { row, accounts, page: 'clients' });
});

// ---- Create / update client ----
router.post('/clients', async (req, res) => {
  const { id, name, company, recipient_emails, cc_emails, timezone, notes, is_active } = req.body;
  let clientId = id;
  if (id) {
    await query(
      `UPDATE clients SET name=$1, company=$2, recipient_emails=$3, cc_emails=$4,
              timezone=$5, notes=$6, is_active=$7, updated_at=NOW() WHERE id=$8`,
      [name, company || null, recipient_emails, cc_emails || null,
        timezone || 'Asia/Kolkata', notes || null, is_active === 'on', id]
    );
  } else {
    const created = await one(
      `INSERT INTO clients (name, company, recipient_emails, cc_emails, timezone, notes, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [name, company || null, recipient_emails, cc_emails || null,
        timezone || 'Asia/Kolkata', notes || null, is_active === 'on']
    );
    clientId = created.id;
  }
  res.redirect('/admin/clients/' + clientId);
});

// ---- Add account to client ----
router.post('/clients/:id/accounts', async (req, res) => {
  const { platform, account_id, account_label } = req.body;
  await query(
    `INSERT INTO client_accounts (client_id, platform, account_id, account_label)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (client_id, platform, account_id) DO UPDATE SET account_label=EXCLUDED.account_label, is_active=TRUE`,
    [req.params.id, platform, account_id, account_label || null]
  );
  res.redirect('/admin/clients/' + req.params.id);
});

// ---- Delete account ----
router.post('/clients/:id/accounts/:accountId/delete', async (req, res) => {
  await query('DELETE FROM client_accounts WHERE id = $1 AND client_id = $2',
    [req.params.accountId, req.params.id]);
  res.redirect('/admin/clients/' + req.params.id);
});

// ---- Delete client ----
router.post('/clients/:id/delete', async (req, res) => {
  await query('DELETE FROM clients WHERE id = $1', [req.params.id]);
  res.redirect('/admin/clients');
});

// ---- Send test report (uses real Windsor data, real email) ----
router.post('/clients/:id/send-test', async (req, res) => {
  const target = await getClientById(parseInt(req.params.id, 10));
  if (!target) return res.status(404).send('Not found');
  const result = await runForClient(target);
  res.redirect('/admin/clients/' + target.id + '?test=' + encodeURIComponent(JSON.stringify(result)));
});

// ---- Send all clients now (manual trigger) ----
router.post('/run-now', async (req, res) => {
  runAll().catch((e) => console.error('[admin run-now] failed:', e));
  res.redirect('/admin?triggered=1');
});

// ---- Logs ----
router.get('/logs', async (req, res) => {
  const logs = await many(
    'SELECT * FROM report_runs ORDER BY sent_at DESC LIMIT 200'
  );
  res.render('logs', { logs, page: 'logs' });
});

// ---- Email connection check ----
router.get('/check-email', async (req, res) => {
  const r = await verifyConnection();
  res.json(r);
});

module.exports = router;
