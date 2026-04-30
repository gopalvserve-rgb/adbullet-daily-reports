// src/report/chart.js — QuickChart.io URL builder for inline email images.
// QuickChart returns a PNG when you GET the URL with a Chart.js config in the query.
// This works in Gmail/Outlook/Apple Mail without any attachments.
const QC_BASE = 'https://quickchart.io/chart';

function chartUrl(config, { width = 600, height = 280, bgColor = 'white' } = {}) {
  const params = new URLSearchParams({
    c: JSON.stringify(config),
    w: String(width),
    h: String(height),
    bkg: bgColor,
    devicePixelRatio: '2',
  });
  return `${QC_BASE}?${params.toString()}`;
}

// Bar chart comparing yesterday vs day-before, per platform.
function platformComparisonChart(platforms, metric, label) {
  const labels = platforms.map((p) => p.label);
  const yesterdayData = platforms.map((p) => Number((p[metric] || 0).toFixed(2)));
  const previousData = platforms.map((p) => Number((p.previous?.[metric] || 0).toFixed(2)));

  return chartUrl({
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'Day-before',
          data: previousData,
          backgroundColor: 'rgba(148, 163, 184, 0.6)',
        },
        {
          label: 'Yesterday',
          data: yesterdayData,
          backgroundColor: 'rgba(37, 99, 235, 0.85)',
        },
      ],
    },
    options: {
      plugins: {
        title: { display: true, text: label, font: { size: 14, weight: 'bold' } },
        legend: { position: 'bottom' },
      },
      scales: {
        y: { beginAtZero: true },
      },
    },
  });
}

module.exports = { chartUrl, platformComparisonChart };
