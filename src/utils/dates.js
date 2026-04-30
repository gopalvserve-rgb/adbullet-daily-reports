// src/utils/dates.js
function pad(n) { return n < 10 ? '0' + n : '' + n; }

// Format a Date as YYYY-MM-DD in the client's timezone.
function formatDate(date, timeZone = 'Asia/Kolkata') {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(date);
}

// Yesterday in the client's timezone (the date the report is for).
function yesterday(timeZone = 'Asia/Kolkata') {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return formatDate(d, timeZone);
}

// Day before yesterday — used for day-over-day comparison.
function dayBefore(timeZone = 'Asia/Kolkata') {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 2);
  return formatDate(d, timeZone);
}

function humanDate(yyyymmdd) {
  // 2026-04-29 -> "Wed, 29 Apr 2026"
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

module.exports = { formatDate, yesterday, dayBefore, humanDate, pad };
