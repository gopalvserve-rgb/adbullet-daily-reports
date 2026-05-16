// src/windsor/client.js — thin Windsor.ai API wrapper.
// Windsor exposes a unified endpoint:
//   https://connectors.windsor.ai/<connector>?api_key=...&fields=...&date_from=...&date_to=...
// IMPORTANT: Windsor.ai's API does NOT reliably filter by account_id at the server side.
// We always filter client-side after the response arrives.
const axios = require('axios');

async function fetchWindsor({ connector, fields, dateFrom, dateTo, accountId, extraParams = {} }) {
  if (!process.env.WINDSOR_API_KEY) {
    throw new Error('WINDSOR_API_KEY is not configured');
  }

  const params = {
    api_key: process.env.WINDSOR_API_KEY,
    fields: Array.isArray(fields) ? fields.join(',') : fields,
    date_from: dateFrom,
    date_to: dateTo,
    _renderer: 'json',
    ...extraParams,
  };

  const url = `https://connectors.windsor.ai/${connector}`;

  try {
    const { data } = await axios.get(url, { params, timeout: 30_000 });
    let rows = Array.isArray(data) ? data : (data && Array.isArray(data.data) ? data.data : []);
    // Client-side filter by account_id — Windsor's server-side filter is unreliable.
    if (accountId && rows.length) {
      const wanted = String(accountId);
      rows = rows.filter(r => String(r.account_id) === wanted);
    }
    return rows;
  } catch (err) {
    const detail = err.response
      ? `HTTP ${err.response.status} — ${JSON.stringify(err.response.data).slice(0, 200)}`
      : err.message;
    throw new Error(`Windsor.ai request failed (${connector}): ${detail}`);
  }
}

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
