// src/windsor/index.js — Combined fetcher across a client's connected platforms.
const { fetchMeta } = require('./meta');
const { fetchGoogle } = require('./google');
const { fetchLinkedIn } = require('./linkedin');

const FETCHERS = {
  meta: fetchMeta,
  google: fetchGoogle,
  linkedin: fetchLinkedIn,
};

const EMPTY = (platform) => ({
  platform,
  label: { meta: 'Meta Ads', google: 'Google Ads', linkedin: 'LinkedIn Ads' }[platform],
  spend: 0,
  impressions: 0,
  clicks: 0,
  leads: 0,
  ctr: 0,
  cpc: 0,
  cpl: 0,
  campaigns: [],
  rowCount: 0,
  error: null,
});

// accounts: [{platform, account_id}]
async function fetchAllForClient({ accounts, dateFrom, dateTo }) {
  // Bucket account IDs per platform; one client may have multiple accounts per platform.
  const grouped = {};
  for (const a of accounts) {
    if (!grouped[a.platform]) grouped[a.platform] = [];
    grouped[a.platform].push(a.account_id);
  }

  const results = {};
  for (const platform of Object.keys(FETCHERS)) {
    const ids = grouped[platform] || [];
    if (!ids.length) continue;

    let combined = EMPTY(platform);
    for (const id of ids) {
      try {
        const single = await FETCHERS[platform]({ accountId: id, dateFrom, dateTo });
        combined.spend += single.spend;
        combined.impressions += single.impressions;
        combined.clicks += single.clicks;
        combined.leads += single.leads;
        combined.campaigns = combined.campaigns.concat(single.campaigns);
        combined.rowCount += single.rowCount;
      } catch (err) {
        console.error(`[windsor] ${platform} (${id}) failed:`, err.message);
        combined.error = (combined.error ? combined.error + ' | ' : '') + err.message;
      }
    }
    combined.ctr = combined.impressions ? (combined.clicks / combined.impressions) * 100 : 0;
    combined.cpc = combined.clicks ? combined.spend / combined.clicks : 0;
    combined.cpl = combined.leads ? combined.spend / combined.leads : 0;
    results[platform] = combined;
  }
  return results;
}

module.exports = { fetchAllForClient };
