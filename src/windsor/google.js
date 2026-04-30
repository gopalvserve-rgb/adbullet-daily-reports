// src/windsor/google.js — Google Ads via Windsor.ai
const { fetchWindsor, sumRows } = require('./client');

const FIELDS = [
  'campaign',
  'campaign_id',
  'spend',
  'impressions',
  'clicks',
  'conversions',
  'all_conversions',
  'date',
  'account_id',
  'account_name',
];

const NUMERIC = ['spend', 'impressions', 'clicks', 'conversions', 'all_conversions'];

async function fetchGoogle({ accountId, dateFrom, dateTo }) {
  const rows = await fetchWindsor({
    connector: 'google_ads',
    fields: FIELDS,
    dateFrom,
    dateTo,
    accountId,
  });

  const totals = sumRows(rows, NUMERIC);
  const leads = totals.conversions || totals.all_conversions || 0;
  const { spend, impressions, clicks } = totals;

  const byCampaign = {};
  for (const row of rows) {
    const key = row.campaign || row.campaign_id || 'Unknown campaign';
    if (!byCampaign[key]) {
      byCampaign[key] = { name: key, spend: 0, leads: 0, clicks: 0, impressions: 0 };
    }
    byCampaign[key].spend += parseFloat(row.spend) || 0;
    byCampaign[key].leads += parseFloat(row.conversions) || parseFloat(row.all_conversions) || 0;
    byCampaign[key].clicks += parseFloat(row.clicks) || 0;
    byCampaign[key].impressions += parseFloat(row.impressions) || 0;
  }

  return {
    platform: 'google',
    label: 'Google Ads',
    spend,
    impressions,
    clicks,
    leads,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    cpl: leads ? spend / leads : 0,
    campaigns: Object.values(byCampaign),
    rowCount: rows.length,
  };
}

module.exports = { fetchGoogle };
