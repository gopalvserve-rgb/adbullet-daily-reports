// src/report/builder.js — composes the HTML email report from Windsor.ai data.
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const { money, num, pct, delta, deltaColor } = require('../utils/format');
const { humanDate } = require('../utils/dates');
const { platformComparisonChart } = require('./chart');

const TEMPLATE = fs.readFileSync(path.join(__dirname, 'template.ejs'), 'utf8');

function arrow(direction) {
  return direction === 'up' ? '▲' : direction === 'down' ? '▼' : '■';
}

// platforms: { meta: {...}, google: {...}, linkedin: {...} }
// each platform may have a .previous: same shape from day-before.
function buildReport({ client, reportDate, platforms, fromName }) {
  // Order platforms consistently
  const order = ['meta', 'google', 'linkedin'];
  const present = order.filter((p) => platforms[p]);
  const platformsList = present.map((p) => platforms[p]);

  const totals = present.reduce(
    (acc, p) => {
      const cur = platforms[p];
      acc.spend += cur.spend;
      acc.leads += cur.leads;
      acc.clicks += cur.clicks;
      acc.impressions += cur.impressions;
      const prev = cur.previous || {};
      acc.prev.spend += prev.spend || 0;
      acc.prev.leads += prev.leads || 0;
      acc.prev.clicks += prev.clicks || 0;
      acc.prev.impressions += prev.impressions || 0;
      return acc;
    },
    { spend: 0, leads: 0, clicks: 0, impressions: 0, prev: { spend: 0, leads: 0, clicks: 0, impressions: 0 } }
  );
  totals.cpl = totals.leads ? totals.spend / totals.leads : 0;
  totals.ctr = totals.impressions ? (totals.clicks / totals.impressions) * 100 : 0;
  totals.prev.cpl = totals.prev.leads ? totals.prev.spend / totals.prev.leads : 0;
  totals.prev.ctr = totals.prev.impressions ? (totals.prev.clicks / totals.prev.impressions) * 100 : 0;

  // KPI cards (totals)
  const kpis = [
    {
      label: 'Total Spend',
      value: money(totals.spend),
      ...withDelta(totals.spend, totals.prev.spend, false),
    },
    {
      label: 'Leads',
      value: num(totals.leads),
      ...withDelta(totals.leads, totals.prev.leads, false),
    },
    {
      label: 'Cost / Lead',
      value: totals.leads ? money(totals.cpl) : '—',
      ...withDelta(totals.cpl, totals.prev.cpl, true),
    },
    {
      label: 'CTR',
      value: pct(totals.ctr),
      ...withDelta(totals.ctr, totals.prev.ctr, false),
    },
  ];

  // Platform table rows
  const platformsRendered = platformsList.map((p) => ({
    label: p.label,
    spendDisplay: money(p.spend),
    leadsDisplay: num(p.leads),
    cplDisplay: p.leads ? money(p.cpl) : '—',
    clicksDisplay: num(p.clicks),
    ctrDisplay: pct(p.ctr),
  }));

  const totalRendered = {
    spendDisplay: money(totals.spend),
    leadsDisplay: num(totals.leads),
    cplDisplay: totals.leads ? money(totals.cpl) : '—',
    clicksDisplay: num(totals.clicks),
    ctrDisplay: pct(totals.ctr),
  };

  // Top campaigns across all platforms (by leads, then spend tiebreaker)
  const allCampaigns = [];
  for (const p of platformsList) {
    for (const c of p.campaigns || []) {
      if (c.spend === 0 && c.leads === 0) continue;
      allCampaigns.push({
        ...c,
        platformLabel: p.label,
        cpl: c.leads ? c.spend / c.leads : 0,
      });
    }
  }
  const topCampaigns = allCampaigns
    .sort((a, b) => b.leads - a.leads || b.spend - a.spend)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      platformLabel: c.platformLabel,
      spendDisplay: money(c.spend),
      leadsDisplay: num(c.leads),
      cplDisplay: c.leads ? money(c.cpl) : '—',
    }));

  // Charts
  const charts = {};
  if (platformsList.length) {
    charts.spendChartUrl = platformComparisonChart(platformsList, 'spend', 'Spend');
    charts.leadsChartUrl = platformComparisonChart(platformsList, 'leads', 'Leads');
  }

  const subject = `[${client.name}] Daily Ads Report — ${reportDate} — ${num(totals.leads)} leads, ${money(totals.spend)} spend`;
  const html = ejs.render(TEMPLATE, {
    subject,
    clientName: client.name,
    reportDateHuman: humanDate(reportDate),
    kpis,
    platforms: platformsRendered,
    total: totalRendered,
    topCampaigns,
    charts,
    fromName: fromName || 'Adbullet Reports',
    generatedAt: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST',
  });

  return { subject, html, totals };
}

function withDelta(current, previous, lowerIsBetter) {
  const d = delta(current, previous);
  if (d.pct == null) return { deltaText: null, deltaColor: '#6b7280', deltaArrow: '' };
  return {
    deltaText: d.display,
    deltaColor: deltaColor(d.direction, lowerIsBetter),
    deltaArrow: arrow(d.direction),
  };
}

module.exports = { buildReport };
