// =============================================
// PMPilot — Upload Handler
// =============================================

function handleDragOver(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.add('drag-over');
}

function handleDragLeave(e) {
  document.getElementById('upload-zone').classList.remove('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) uploadFile(file);
}

async function uploadFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['csv', 'xlsx', 'xls'].includes(ext)) {
    showToast('Only CSV and Excel files are supported', 'error');
    return;
  }

  // Show progress
  document.getElementById('upload-result').style.display = 'none';
  document.getElementById('upload-progress').style.display = 'block';

  animateProgress();
  document.getElementById('upload-status-text').textContent = `Uploading ${file.name}...`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', SESSION_ID);

  try {
    const res = await fetch(`${API}/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    document.getElementById('upload-progress').style.display = 'none';

    if (!res.ok) {
      showToast(data.error || 'Upload failed', 'error');
      return;
    }

    // Store for dashboard use
    window.__uploadData = data;

    showUploadResult(data);
    updateDashboardAfterUpload(data);
    showToast(`${file.name} uploaded successfully!`, 'success');

  } catch (err) {
    document.getElementById('upload-progress').style.display = 'none';
    showToast('Upload failed. Is the server running?', 'error');
  }
}

function animateProgress() {
  const bar = document.getElementById('progress-bar');
  let width = 0;
  const interval = setInterval(() => {
    if (width >= 85) { clearInterval(interval); return; }
    width += Math.random() * 15;
    bar.style.width = Math.min(width, 85) + '%';
  }, 300);
  window.__progressInterval = interval;
}

function showUploadResult(data) {
  // Stats
  const statsEl = document.getElementById('upload-stats');
  statsEl.innerHTML = `
    <div class="upload-stat">
      <span class="upload-stat-value">${data.totalRows.toLocaleString()}</span>
      <span class="upload-stat-label">Rows</span>
    </div>
    <div class="upload-stat">
      <span class="upload-stat-value">${data.totalColumns}</span>
      <span class="upload-stat-label">Columns</span>
    </div>
    <div class="upload-stat">
      <span class="upload-stat-value">${data.risks?.length || 0}</span>
      <span class="upload-stat-label">Risk Flags</span>
    </div>
    <div class="upload-stat">
      <span class="upload-stat-value" style="color:var(--success)">✓</span>
      <span class="upload-stat-label">${data.fileName}</span>
    </div>
  `;

  // Preview table
  const table = document.getElementById('preview-table');
  if (data.preview && data.preview.length > 0) {
    const headers = data.headers;
    let html = '<thead><tr>';
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    data.preview.forEach(row => {
      html += '<tr>';
      headers.forEach(h => { html += `<td title="${row[h] || ''}">${row[h] || '—'}</td>`; });
      html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
  }

  document.getElementById('upload-result').style.display = 'block';

  // Scroll to result
  document.getElementById('upload-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
