// src/email/sender.js — Gmail SMTP via Nodemailer.
const nodemailer = require('nodemailer');

let transporterCache = null;

function transporter() {
  if (transporterCache) return transporterCache;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be set');
  }
  transporterCache = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporterCache;
}

function parseList(s) {
  if (!s) return [];
  return s.split(',').map((x) => x.trim()).filter(Boolean);
}

async function verifyConnection() {
  try {
    await transporter().verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

async function sendEmail({ to, cc, bcc, subject, html, replyTo }) {
  const from = `"${process.env.FROM_NAME || 'Adbullet Reports'}" <${process.env.GMAIL_USER}>`;
  const internalBcc = parseList(process.env.INTERNAL_BCC);
  const allBcc = [...parseList(bcc), ...internalBcc];

  const info = await transporter().sendMail({
    from,
    to: parseList(to).join(', '),
    cc: parseList(cc).join(', ') || undefined,
    bcc: allBcc.length ? allBcc.join(', ') : undefined,
    replyTo: replyTo || process.env.REPLY_TO || process.env.GMAIL_USER,
    subject,
    html,
  });
  return { messageId: info.messageId, accepted: info.accepted, rejected: info.rejected };
}

module.exports = { sendEmail, verifyConnection };
