// src/windsor/meta.js — Meta (Facebook) Ads via Windsor.ai
const { fetchWindsor, sumRows } = require('./client');

const FIELDS = [
  'campaign',
  'campaign_id',
  'spend',
  'impressions',
  'clicks',
  'actions_lead',
  'date',
  'account_id',
  'account_name',
];

const NUMERIC = ['spend', 'impressions', 'clicks', 'actions_lead'];

async function fetchMeta({ accountId, dateFrom, dateTo }) {
  const rows = await fetchWindsor({
    connector: 'facebook',
    fields: FIELDS,
    dateFrom,
    dateTo,
    accountId,
  });

  const totals = sumRows(rows, NUMERIC);
  const leads = totals.actions_lead || 0;
  const spend = totals.spend;
  const impressions = totals.impressions;
  const clicks = totals.clicks;

  const byCampaign = {};
  for (const row of rows) {
    const key = row.campaign || row.campaign_id || 'Unknown campaign';
    if (!byCampaign[key]) {
      byCampaign[key] = { name: key, spend: 0, leads: 0, clicks: 0, impressions: 0 };
    }
    byCampaign[key].spend += parseFloat(row.spend) || 0;
    byCampaign[key].leads += parseFloat(row.actions_lead) || 0;
    byCampaign[key].clicks += parseFloat(row.clicks) || 0;
    byCampaign[key].impressions += parseFloat(row.impressions) || 0;
  }

  return {
    platform: 'meta',
    label: 'Meta Ads',
    spend, impressions, clicks, leads,
    ctr: impressions ? (clicks / impressions) * 100 : 0,
    cpc: clicks ? spend / clicks : 0,
    cpl: leads ? spend / leads : 0,
    campaigns: Object.values(byCampaign),
    rowCount: rows.length,
  };
}

module.exports = { fetchMeta };
