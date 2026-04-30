// src/utils/format.js
function money(n, currency = 'INR') {
  if (n == null || isNaN(n)) return '—';
  const symbol = { INR: '₹', USD: '$', EUR: '€', GBP: '£' }[currency] || '';
  return symbol + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function num(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function pct(n, digits = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toFixed(digits) + '%';
}

function delta(current, previous) {
  if (!previous || previous === 0) {
    return { pct: null, direction: 'flat', display: 'new' };
  }
  const change = ((current - previous) / previous) * 100;
  const direction = change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat';
  const sign = change > 0 ? '+' : '';
  return {
    pct: change,
    direction,
    display: `${sign}${change.toFixed(1)}%`,
  };
}

// For a metric where higher is better (leads, clicks): up = good.
// For a metric where lower is better (CPL, CPC): down = good.
function deltaColor(direction, lowerIsBetter) {
  if (direction === 'flat') return '#6b7280';
  const good = lowerIsBetter ? 'down' : 'up';
  return direction === good ? '#16a34a' : '#dc2626';
}

module.exports = { money, num, pct, delta, deltaColor };
