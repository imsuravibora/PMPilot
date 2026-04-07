// =============================================
// PMPilot — Status Reports
// =============================================

function initReportsPage() {
  const emptyEl = document.getElementById('reports-empty');
  const contentEl = document.getElementById('reports-content');

  if (!window.__uploadData) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  if (!document.getElementById('report-text').textContent.trim()) {
    generateReport();
  }
}

async function generateReport() {
  const reportText = document.getElementById('report-text');
  const loading = document.getElementById('report-loading');

  reportText.style.display = 'none';
  loading.style.display = 'block';

  try {
    // First ensure session has data restored
    await ensureSessionRestored();

    const res = await fetch(`${API}/restore/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID })
    });

    const data = await res.json();
    loading.style.display = 'none';
    reportText.style.display = 'block';

    if (!res.ok) {
      reportText.textContent = '⚠️ ' + (data.error || 'Failed to generate report. Please re-upload your data.');
      return;
    }

    reportText.textContent = data.report;
    showToast('Status report generated!', 'success');

  } catch (err) {
    loading.style.display = 'none';
    reportText.style.display = 'block';
    reportText.textContent = '⚠️ Could not generate report. Please check your internet connection and try again.';
  }
}

async function ensureSessionRestored() {
  const stored = localStorage.getItem('pmpilot_data');
  const storedRows = localStorage.getItem('pmpilot_rows');
  if (!stored) return;

  const data = JSON.parse(stored);
  const rows = storedRows ? JSON.parse(storedRows) : [];

  await fetch(`${API}/restore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: SESSION_ID,
      fileName: data.fileName,
      headers: data.headers,
      rows: rows,
      stats: data.stats
    })
  });
}

function copyReport() {
  const text = document.getElementById('report-text').textContent;
  if (!text || text.startsWith('⚠️')) {
    showToast('No report to copy yet', 'warning');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    showToast('Report copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Copy failed. Please select and copy manually.', 'error');
  });
}
