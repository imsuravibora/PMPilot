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

  // Auto-generate if not yet done
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
    const res = await fetch(`${API}/chat/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID })
    });

    const data = await res.json();
    loading.style.display = 'none';
    reportText.style.display = 'block';

    if (!res.ok) {
      reportText.textContent = '⚠️ ' + (data.error || 'Failed to generate report');
      return;
    }

    reportText.textContent = data.report;
    showToast('Status report generated!', 'success');

  } catch (err) {
    loading.style.display = 'none';
    reportText.style.display = 'block';
    reportText.textContent = '⚠️ Could not generate report. Please check your API key and try again.';
  }
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
