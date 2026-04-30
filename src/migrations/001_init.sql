-- ====================================================
-- Adbullet Daily Reports — schema v1
-- ====================================================

CREATE TABLE IF NOT EXISTS clients (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    company         TEXT,
    recipient_emails TEXT NOT NULL,        -- comma-separated list of recipients
    cc_emails       TEXT,                  -- optional CC list
    timezone        TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_accounts (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    platform        TEXT NOT NULL CHECK (platform IN ('meta', 'google', 'linkedin')),
    account_id      TEXT NOT NULL,         -- platform-side account id
    account_label   TEXT,                  -- friendly display name
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (client_id, platform, account_id)
);

CREATE INDEX IF NOT EXISTS idx_client_accounts_client ON client_accounts(client_id);
CREATE INDEX IF NOT EXISTS idx_client_accounts_platform ON client_accounts(platform);

CREATE TABLE IF NOT EXISTS report_runs (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    client_name     TEXT NOT NULL,         -- snapshot in case client is deleted
    report_date     DATE NOT NULL,         -- the date the data is for (yesterday)
    status          TEXT NOT NULL CHECK (status IN ('success', 'no_data', 'failed', 'skipped')),
    recipient_emails TEXT,
    error_message   TEXT,
    duration_ms     INTEGER,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_runs_client ON report_runs(client_id);
CREATE INDEX IF NOT EXISTS idx_report_runs_date ON report_runs(report_date DESC);
CREATE INDEX IF NOT EXISTS idx_report_runs_sent_at ON report_runs(sent_at DESC);

-- Migration tracking
CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
