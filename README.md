# Adbullet Daily Reports

Automated daily ad-performance report sender. Pulls Meta + Google + LinkedIn campaign data via Windsor.ai every morning at **08:00 IST** and emails a designed HTML report to each client's stakeholders.

Built with Node.js 20 + Express + Postgres. Designed to deploy on Railway and tracked on GitHub.

---

## What it does

1. Cron fires daily at 02:30 UTC (08:00 IST).
2. For each active client, it pulls yesterday's data from Windsor.ai for every connected ad account (Meta / Google / LinkedIn).
3. It also pulls the day-before for day-over-day comparisons.
4. Builds a designed HTML email (KPI cards, platform breakdown table, top campaigns, comparison charts) and sends it via Gmail SMTP.
5. Logs every send (success / failure / no-data / skipped) to the `report_runs` table.

A web admin UI at `/admin` lets you add/edit clients, attach ad accounts, view send history, and trigger a test send to any single client on demand.

---

## Quick start (local)

```bash
git clone <this-repo>
cd adbullet-daily-reports
npm install
cp .env.example .env
# Fill in DATABASE_URL, WINDSOR_API_KEY, GMAIL_APP_PASSWORD, ADMIN_PASS
npm run migrate
npm start
```

Open http://localhost:3000/admin (basic auth: ADMIN_USER / ADMIN_PASS).

---

## Deploying to Railway

1. Push this repo to GitHub.
2. On Railway → New Project → **Deploy from GitHub repo** → pick this repo.
3. Add the **Postgres** plugin (Service → New → Database → PostgreSQL). Railway injects `DATABASE_URL` automatically.
4. Set these environment variables on the web service:
   - `WINDSOR_API_KEY` — from windsor.ai → Settings → API
   - `GMAIL_USER` — `gopalvserve@gmail.com`
   - `GMAIL_APP_PASSWORD` — see "Gmail app password" below
   - `ADMIN_USER`, `ADMIN_PASS` — pick something memorable but not weak
   - `FROM_NAME` — e.g. "Adbullet Reports"
   - `REPLY_TO` — `gopalvserve@gmail.com`
   - `INTERNAL_BCC` — `gopalvserve@gmail.com` (so you get a copy of every send)
   - `CRON_ENABLED=true`
   - `DAILY_CRON=30 2 * * *` (02:30 UTC = 08:00 IST — already the default)
   - `TZ=Asia/Kolkata`
5. Deploy. The healthcheck path `/healthz` should return 200 within ~30 seconds.
6. Migrations auto-run on every boot — the `clients`, `client_accounts`, and `report_runs` tables get created automatically.

---

## Gmail app password

1. Turn on 2-Step Verification at https://myaccount.google.com/security
2. Go to https://myaccount.google.com/apppasswords
3. App = **Mail**, Device = **Other → "Adbullet Reports"** → Generate
4. Copy the 16-character password (no spaces) into `GMAIL_APP_PASSWORD`.

Gmail SMTP allows ~500 outbound emails per day per account — plenty for daily client reports.

---

## Adding a client

1. Go to `/admin/clients` → **+ Add client**
2. Fill in:
   - Client name (e.g. "Mastercard ILA")
   - Recipient emails (comma-separated)
   - Optional CC list
3. Save.
4. On the client edit page, **Add account** for each ad account this client has — pick the platform and paste the account ID.
5. Click **▶ Send test report** to trigger a real send right now (uses real Windsor data + real email).

Once accounts are connected and the client is marked **active**, the daily cron will include them automatically.

---

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection (Railway auto-injects) |
| `WINDSOR_API_KEY` | yes | Windsor.ai API key |
| `GMAIL_USER` | yes | Gmail address for sending |
| `GMAIL_APP_PASSWORD` | yes | 16-char Gmail app password |
| `ADMIN_USER` | yes | Basic-auth user for `/admin` |
| `ADMIN_PASS` | yes | Basic-auth password for `/admin` |
| `FROM_NAME` | no | Sender display name |
| `REPLY_TO` | no | Reply-to header |
| `INTERNAL_BCC` | no | Comma-separated list — every send is BCC'd here |
| `CRON_ENABLED` | no | Set to `true` to enable the daily cron (default off in dev) |
| `DAILY_CRON` | no | UTC cron expr; default `30 2 * * *` (08:00 IST) |
| `TZ` | no | Process timezone; default `Asia/Kolkata` |
| `PORT` | no | HTTP port; default `3000` |

---

## CLI commands

```bash
npm run migrate          # apply pending migrations
npm run send-now         # run the daily job for ALL active clients right now
npm run test-send -- 5   # run for client id=5 only
```

---

## Project layout

```
src/
├── server.js              # Express entry; boots, migrates, starts cron
├── db.js                  # Postgres pool + helpers
├── migrate.js             # Migration runner
├── auth.js                # Basic auth middleware for /admin
├── migrations/            # SQL migrations (auto-applied on boot)
├── routes/admin.js        # Admin web UI routes
├── views/                 # EJS views (admin UI)
├── windsor/               # Per-platform Windsor.ai fetchers
│   ├── client.js          # HTTP wrapper
│   ├── meta.js
│   ├── google.js
│   ├── linkedin.js
│   └── index.js           # Combined fetcher
├── report/
│   ├── builder.js         # Composes the HTML email
│   ├── template.ejs       # The email design
│   └── chart.js           # QuickChart URL builder for inline charts
├── email/sender.js        # Nodemailer Gmail SMTP
├── jobs/
│   ├── daily-report.js    # The daily orchestration job
│   └── scheduler.js       # node-cron registration
└── utils/                 # date + format helpers
public/styles.css          # Admin UI styles
```

---

## Troubleshooting

**No emails arriving** → `/admin/check-email` verifies SMTP connection. Check the **Send log** for failure messages.
**"WINDSOR_API_KEY is not configured"** → set the env var on Railway and redeploy.
**Status `no_data`** → Windsor.ai returned zero spend/leads/clicks; either yesterday genuinely had no activity or the account ID is wrong.
**Wrong send time** → cron is in UTC. `30 2 * * *` = 08:00 IST. For 09:00 IST use `30 3 * * *`.
