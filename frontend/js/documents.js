// =============================================
// PMPilot — Document Hub
// =============================================

function handleDocDrop(e) {
  e.preventDefault();
  document.getElementById('doc-upload-zone').classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file) uploadDocument(file);
}

function handleDocSelect(e) {
  const file = e.target.files[0];
  if (file) uploadDocument(file);
  e.target.value = ''; // reset input
}

async function uploadDocument(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!['pdf', 'txt', 'md'].includes(ext)) {
    showToast('Only PDF, TXT, and MD files are supported', 'error');
    return;
  }

  document.getElementById('doc-uploading').style.display = 'block';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('sessionId', SESSION_ID);

  try {
    const res = await fetch(`${API}/documents/upload`, { method: 'POST', body: formData });
    const data = await res.json();

    document.getElementById('doc-uploading').style.display = 'none';

    if (!res.ok) {
      showToast(data.error || 'Upload failed', 'error');
      return;
    }

    showToast(`${file.name} uploaded and summarized!`, 'success');

    // Update doc count in stat card
    const currentCount = parseInt(document.getElementById('stat-docs').textContent) || 0;
    document.getElementById('stat-docs').textContent = currentCount + 1;

    loadDocuments();

  } catch (err) {
    document.getElementById('doc-uploading').style.display = 'none';
    showToast('Upload failed. Is the server running?', 'error');
  }
}

async function loadDocuments() {
  if (!SESSION_ID) return;

  try {
    const res = await fetch(`${API}/documents/${SESSION_ID}`);
    const data = await res.json();
    renderDocuments(data.documents || []);
  } catch (e) {
    renderDocuments([]);
  }
}

function renderDocuments(docs) {
  const list = document.getElementById('documents-list');
  const emptyState = document.getElementById('docs-empty-state');

  if (!docs || docs.length === 0) {
    list.innerHTML = `<div class="empty-state small" id="docs-empty-state"><p>No documents uploaded yet. Upload your meeting notes, risk logs, or project charters above.</p></div>`;
    return;
  }

  list.innerHTML = docs.map(doc => `
    <div class="document-card" id="doc-${doc.id}">
      <div class="doc-card-header">
        <div class="doc-info">
          <span class="doc-type-badge">${doc.type}</span>
          <div>
            <div class="doc-name">${escapeHtml(doc.name)}</div>
            <div class="doc-meta">Uploaded ${formatDate(doc.uploadedAt)} · ${formatSize(doc.size)}</div>
          </div>
        </div>
        <button class="doc-delete-btn" onclick="deleteDocument('${doc.id}')" title="Delete document">✕</button>
      </div>
      <div class="doc-summary">${escapeHtml(doc.summary)}</div>
    </div>
  `).join('');

  // Update stat count
  document.getElementById('stat-docs').textContent = docs.length;
}

async function deleteDocument(docId) {
  if (!confirm('Delete this document?')) return;

  try {
    await fetch(`${API}/documents/${SESSION_ID}/${docId}`, { method: 'DELETE' });
    const card = document.getElementById(`doc-${docId}`);
    if (card) {
      card.style.opacity = '0';
      card.style.transition = 'opacity 0.3s';
      setTimeout(() => { loadDocuments(); }, 300);
    }
    showToast('Document deleted', 'default');
  } catch (e) {
    showToast('Failed to delete document', 'error');
  }
}
