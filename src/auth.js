// src/auth.js — minimal HTTP basic auth for the admin UI.
const basicAuth = require('basic-auth');

function adminAuth(req, res, next) {
  const expected = {
    name: process.env.ADMIN_USER || 'admin',
    pass: process.env.ADMIN_PASS || 'change-me-please',
  };
  const creds = basicAuth(req);
  if (!creds || creds.name !== expected.name || creds.pass !== expected.pass) {
    res.set('WWW-Authenticate', 'Basic realm="Adbullet Reports Admin"');
    return res.status(401).send('Authentication required');
  }
  next();
}

module.exports = { adminAuth };
