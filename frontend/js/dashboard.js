// =============================================
// PMPilot — Dashboard
// =============================================

function updateDashboardAfterUpload(data) {
  // Update stat cards
  document.getElementById('stat-rows').textContent = data.totalRows.toLocaleString();
  document.getElementById('stat-cols').textContent = data.totalColumns;
  document.getElementById('stat-risks').textContent = data.risks?.length || 0;

  // Update data status header
  document.querySelector('.status-dot').classList.add('active');
  document.querySelector('.status-dot').classList.remove('inactive');
  document.getElementById('data-status-text').textContent = `${data.totalRows} rows loaded`;

  // Risk flags
  renderDashboardRisks(data.risks || []);

  // File info card
  const fileCard = document.getElementById('dashboard-file-card');
  const fileInfo = document.getElementById('dashboard-file-info');
  fileInfo.innerHTML = `
    <div style="display:flex; align-items:center; gap:14px">
      <div style="font-size:32px">📊</div>
      <div>
        <div style="font-weight:600; color:var(--text); font-size:15px">${data.fileName}</div>
        <div style="color:var(--text-light); font-size:12px; margin-top:2px">${data.totalRows.toLocaleString()} rows · ${data.totalColumns} columns · ${data.headers.join(', ')}</div>
      </div>
    </div>
  `;
  fileCard.style.display = 'block';

  // Update risk badge
  document.getElementById('risk-count-badge').textContent = data.risks?.length || 0;
}

function renderDashboardRisks(risks) {
  const container = document.getElementById('dashboard-risks');

  if (!risks || risks.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:20px; color:var(--success)">
        <div style="font-size:24px; margin-bottom:8px">✅</div>
        <div style="font-size:13px; font-weight:500">No risks detected</div>
      </div>`;
    document.getElementById('risk-count-badge').className = 'card-badge green';
    document.getElementById('risk-count-badge').textContent = '0';
    return;
  }

  document.getElementById('risk-count-badge').textContent = risks.length;

  container.innerHTML = risks.map(r => `
    <div class="risk-item">
      <div class="risk-dot ${r.level}"></div>
      <span class="risk-text">${r.message}</span>
    </div>
  `).join('');
}

function renderInsightsPage() {
  const emptyEl = document.getElementById('insights-empty');
  const contentEl = document.getElementById('insights-content');
  const data = window.__uploadData;

  if (!data) {
    emptyEl.style.display = 'block';
    contentEl.style.display = 'none';
    return;
  }

  emptyEl.style.display = 'none';
  contentEl.style.display = 'block';

  // Render risk cards
  const risksGrid = document.getElementById('risks-grid');
  if (data.risks && data.risks.length > 0) {
    risksGrid.innerHTML = data.risks.map(r => `
      <div class="risk-card ${r.level}">
        <div class="risk-card-title">${r.level.toUpperCase()} RISK</div>
        <div class="risk-card-msg">${r.message}</div>
      </div>
    `).join('');
  } else {
    risksGrid.innerHTML = `
      <div class="risk-card low" style="grid-column: 1/-1">
        <div class="risk-card-title">ALL CLEAR</div>
        <div class="risk-card-msg">✅ No critical risk flags detected in your data</div>
      </div>`;
  }

  // Render AI insights
  const insightsText = document.getElementById('insights-ai-text');
  if (data.insights) {
    insightsText.textContent = data.insights;
  } else {
    insightsText.textContent = 'AI insights not available. Please check your Gemini API key in the .env file.';
  }
}
