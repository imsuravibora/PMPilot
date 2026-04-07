// =============================================
// PMPilot — Main App Controller
// =============================================

const API = `${window.location.origin}/api`;
let SESSION_ID = null;

const PAGE_META = {
  dashboard:  { title: 'Dashboard',       subtitle: 'Your project overview at a glance' },
  upload:     { title: 'Upload Data',      subtitle: 'Upload a CSV or Excel file to start analysing' },
  insights:   { title: 'Insights',         subtitle: 'AI-powered analysis of your project data' },
  chat:       { title: 'AI Chat',          subtitle: 'Ask questions about your project in plain English' },
  charts:     { title: 'Charts',           subtitle: 'Visual breakdown of your project data' },
  reports:    { title: 'Status Reports',   subtitle: 'Auto-generated reports ready to share' },
  timeline:   { title: 'Timeline Estimator', subtitle: 'Upload team hours CSV to estimate project duration' },
  documents:  { title: 'Document Hub',     subtitle: 'Upload and manage your project documentation' }
};

// --- Init ---
window.addEventListener('DOMContentLoaded', async () => {
  await initSession();
  await restoreFromLocalStorage();
  showPage('dashboard');
});

async function initSession() {
  let stored = localStorage.getItem('pmpilot_session');
  if (stored) {
    // Verify it's still alive on the server
    try {
      const res = await fetch(`${API}/session/${stored}`);
      if (res.ok) {
        SESSION_ID = stored;
        const data = await res.json();
        updateSessionUI(data);
        return;
      }
    } catch (e) {}
  }

  // Create new session
  try {
    const res = await fetch(`${API}/session/create`, { method: 'POST' });
    const data = await res.json();
    SESSION_ID = data.sessionId;
    localStorage.setItem('pmpilot_session', SESSION_ID);
    updateSessionUI({ hasData: false, documentCount: 0 });
  } catch (e) {
    showToast('Could not connect to server. Make sure the backend is running.', 'error');
    document.getElementById('session-dot').classList.add('inactive');
    document.getElementById('session-label').textContent = 'Server offline';
  }
}

function updateSessionUI(data) {
  const dot = document.getElementById('session-dot');
  const label = document.getElementById('session-label');
  const dataStatus = document.getElementById('data-status');
  const dataStatusText = document.getElementById('data-status-text');

  dot.classList.remove('inactive');
  label.textContent = 'Session active';

  if (data.hasData) {
    dataStatus.querySelector('.status-dot').classList.remove('inactive');
    dataStatus.querySelector('.status-dot').classList.add('active');
    dataStatusText.textContent = `${data.rowCount} rows loaded`;

    // Update stat cards
    document.getElementById('stat-rows').textContent = data.rowCount || '—';
    document.getElementById('stat-cols').textContent = data.headers?.length || '—';
    document.getElementById('stat-risks').textContent = '—';

    // Show file card on dashboard
    showPage('dashboard');
  }

  document.getElementById('stat-docs').textContent = data.documentCount || '0';
}

async function restoreFromLocalStorage() {
  const stored = localStorage.getItem('pmpilot_data');
  const storedRows = localStorage.getItem('pmpilot_rows');
  if (!stored) return;

  try {
    const data = JSON.parse(stored);
    const rows = storedRows ? JSON.parse(storedRows) : data.rows || [];

    // Restore window.__uploadData so all pages work
    window.__uploadData = { ...data, preview: rows };

    // Restore server session silently
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

    // Update UI
    updateDashboardAfterUpload({ ...data, preview: rows });

  } catch (e) {
    console.warn('Could not restore session:', e);
  }
}

async function clearSession() {
  if (!confirm('Clear session? All uploaded data will be lost.')) return;
  try {
    await fetch(`${API}/session/${SESSION_ID}`, { method: 'DELETE' });
  } catch (e) {}
  localStorage.removeItem('pmpilot_session');
  localStorage.removeItem('pmpilot_data');
  localStorage.removeItem('pmpilot_rows');
  location.reload();
}

// --- Page Navigation ---
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  // Remove active from nav
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const page = document.getElementById(`page-${pageId}`);
  if (page) page.classList.add('active');

  // Activate nav item
  const navItem = document.querySelector(`[data-page="${pageId}"]`);
  if (navItem) navItem.classList.add('active');

  // Update header
  const meta = PAGE_META[pageId];
  if (meta) {
    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-subtitle').textContent = meta.subtitle;
  }

  // Page-specific init
  if (pageId === 'insights') renderInsightsPage();
  if (pageId === 'charts') renderChartsPage();
  if (pageId === 'reports') initReportsPage();
  if (pageId === 'documents') loadDocuments();
}

// --- Toast Notifications ---
function showToast(message, type = 'default') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// --- Utility: Format file size ---
function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// --- Utility: Format date ---
function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
