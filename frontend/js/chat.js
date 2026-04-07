// =============================================
// PMPilot — AI Chat
// =============================================

let isTyping = false;

function handleChatKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function sendSuggestion(btn) {
  const input = document.getElementById('chat-input');
  input.value = btn.textContent;
  sendMessage();
}

async function sendMessage() {
  if (isTyping) return;
  const input = document.getElementById('chat-input');
  const message = input.value.trim();
  if (!message) return;

  input.value = '';
  input.style.height = 'auto';

  // Add user message
  appendMessage('user', message);

  // Add typing indicator
  const typingId = appendTyping();
  isTyping = true;
  document.getElementById('chat-send-btn').disabled = true;

  try {
    const res = await fetch(`${API}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: SESSION_ID, message })
    });

    const data = await res.json();
    removeTyping(typingId);

    if (!res.ok) {
      appendMessage('ai', '⚠️ ' + (data.error || 'Something went wrong. Please try again.'));
    } else {
      appendMessage('ai', data.reply);
    }

  } catch (err) {
    removeTyping(typingId);
    appendMessage('ai', '⚠️ Could not reach the server. Please make sure the backend is running.');
  }

  isTyping = false;
  document.getElementById('chat-send-btn').disabled = false;
  document.getElementById('chat-input').focus();
}

function appendMessage(role, content) {
  const container = document.getElementById('chat-messages');

  const msgEl = document.createElement('div');
  msgEl.className = `chat-message ${role}`;
  msgEl.innerHTML = `
    <div class="chat-avatar ${role}">${role === 'ai' ? '✈' : 'PM'}</div>
    <div class="chat-bubble ${role}"><p>${escapeHtml(content)}</p></div>
  `;

  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
  return msgEl;
}

function appendTyping() {
  const container = document.getElementById('chat-messages');
  const id = 'typing-' + Date.now();

  const el = document.createElement('div');
  el.className = 'chat-message ai';
  el.id = id;
  el.innerHTML = `
    <div class="chat-avatar ai">✈</div>
    <div class="chat-bubble ai">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;

  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
  return id;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

async function clearChat() {
  if (!confirm('Clear chat history?')) return;
  try {
    await fetch(`${API}/chat/history/${SESSION_ID}`, { method: 'DELETE' });
  } catch (e) {}

  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="chat-welcome">
      <div class="chat-avatar ai">✈</div>
      <div class="chat-bubble ai">
        <p>Chat cleared! Ready to help you analyze your project data. What would you like to know?</p>
      </div>
    </div>
  `;
  showToast('Chat history cleared', 'success');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}
