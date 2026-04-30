// src/windsor/client.js — thin Windsor.ai API wrapper.
// Windsor exposes a unified endpoint:
//   https://windsor.ai/api/v1/all?api_key=...&connector=<platform>&fields=...&date_from=...&date_to=...
// Docs: https://windsor.ai/connect/
const axios = require('axios');

const BASE_URL = 'https://windsor.ai/api/v1/all';

async function fetchWindsor({ connector, fields, dateFrom, dateTo, accountId, extraParams = {} }) {
  if (!process.env.WINDSOR_API_KEY) {
    throw new Error('WINDSOR_API_KEY is not configured');
  }

  const params = {
    api_key: process.env.WINDSOR_API_KEY,
    connector,
    fields: Array.isArray(fields) ? fields.join(',') : fields,
    date_from: dateFrom,
    date_to: dateTo,
    _renderer: 'json',
    ...extraParams,
  };

  // Most Windsor connectors use account_id; some use specific names.
  if (accountId) {
    params.account_id = accountId;
  }

  try {
    const { data } = await axios.get(BASE_URL, {
      params,
      timeout: 30_000,
    });
    // Windsor returns { data: [...] } or sometimes a bare array.
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  } catch (err) {
    const detail = err.response
      ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data).slice(0, 200)}`
      : err.message;
    throw new Error(`Windsor.ai request failed (${connector}): ${detail}`);
  }
}

// Aggregate an array of rows by summing numeric fields.
function sumRows(rows, numericFields) {
  const totals = Object.fromEntries(numericFields.map((f) => [f, 0]));
  for (const row of rows) {
    for (const f of numericFields) {
      const v = parseFloat(row[f]);
      if (!Number.isNaN(v)) totals[f] += v;
    }
  }
  return totals;
}

module.exports = { fetchWindsor, sumRows };
