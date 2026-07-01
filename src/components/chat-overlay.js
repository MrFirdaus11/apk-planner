import { escapeHtml, renderMarkdown } from '../utils/helpers.js';
import { hasApiKey, kirimPesan, abortPesan } from '../services/ai-chat.js';
import { getSystemPrompt, getDataKonteks } from '../services/knowledge-base.js';
import { getChatHistory, setChatHistory } from '../store.js';
import '../styles/chat.css';

const TEMPLATE_QUESTIONS = [
  'Tips meningkatkan produktivitas harian?',
  'Bagaimana cara konsisten dengan jadwal?',
  'Apa teknik pomodoro yang efektif?',
  'Cara mengatur waktu dengan baik?',
  'Tips menghindari prokrastinasi?',
  'Tips mengatur keuangan pribadi?',
  'Cara menabung yang efektif?',
  'Bagaimana cara mengurangi pengeluaran?',
  'Tips investasi untuk pemula?',
  'Apa saja fitur yang tersedia?',
];

let isOpen = false;
let riwayat = [];
let isSending = false;
let lastUserText = '';

export function initChat() {
  renderFab();
}

export function openChat() {
  if (isOpen) return;
  isOpen = true;

  const container = document.getElementById('chat-container');
  container.innerHTML = renderChatSheet();

  loadRiwayat().then(() => {
    renderSemuaPesan();
    scrollToBottom();
  });

  container.querySelector('.chat-backdrop').addEventListener('click', e => {
    if (e.target === container.querySelector('.chat-backdrop')) closeChat();
  });
  container.querySelector('.chat-header-close').addEventListener('click', closeChat);

  const input = container.querySelector('.chat-input');
  const sendBtn = container.querySelector('.chat-send-btn');

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  sendBtn.addEventListener('click', handleSend);
  input.addEventListener('input', () => {
    autoResizeInput(input);
    if (!isSending) sendBtn.disabled = !input.value.trim();
  });

  container.querySelectorAll('.chat-template-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const text = chip.textContent.trim();
      input.value = text;
      sendBtn.disabled = false;
      handleSend();
    });
  });

  requestAnimationFrame(() => input.focus());
}

export function closeChat() {
  if (!isOpen) return;
  abortPesan();
  isOpen = false;
  isSending = false;
  riwayat = [];
  const container = document.getElementById('chat-container');
  container.innerHTML = '';
  renderFab();
}

function renderFab() {
  const container = document.getElementById('chat-container');
  if (container.querySelector('.chat-fab')) return;

  const fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.innerHTML = '<i data-lucide="message-circle" width="24" height="24"></i>';
  fab.addEventListener('click', openChat);
  container.appendChild(fab);
  if (window.lucide) window.lucide.createIcons();
}

function renderChatSheet() {
  return `
    <div class="chat-backdrop">
      <div class="chat-sheet">
        <div class="chat-header">
          <div class="chat-header-icon"><i data-lucide="bot" width="18" height="18"></i></div>
          <div class="chat-header-info">
            <div class="chat-header-title">AI Asisten</div>
            <div class="chat-header-status">● Online</div>
          </div>
          <button class="chat-header-close"><i data-lucide="x" width="20" height="20"></i></button>
        </div>
        <div class="chat-body" id="chat-body"></div>
        <div class="chat-footer">
          <div class="chat-input-wrap">
            <textarea class="chat-input" rows="1" placeholder="Tanya sesuatu..." id="chat-input"></textarea>
          </div>
          <button class="chat-send-btn" id="chat-send-btn" disabled>
            <i data-lucide="send" width="16" height="16"></i>
          </button>
          <button class="chat-stop-btn" id="chat-stop-btn" style="display:none;">
            <i data-lucide="square" width="14" height="14"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

async function loadRiwayat() {
  if (!hasApiKey()) return;
  try {
    riwayat = await getChatHistory();
  } catch {
    riwayat = [];
  }
}

async function simpanRiwayat() {
  try {
    await setChatHistory(riwayat.slice(-50));
  } catch {}
}

function renderSemuaPesan() {
  const body = document.getElementById('chat-body');
  if (!body) return;

  body.innerHTML = '';

  if (!hasApiKey()) {
    body.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon"><i data-lucide="bot" width="24" height="24"></i></div>
        <h3>AI Asisten</h3>
        <p>Atur API key terlebih dahulu di halaman <strong>Pengaturan</strong>.</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  if (riwayat.length === 0) {
    body.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon"><i data-lucide="bot" width="24" height="24"></i></div>
        <h3>Halo! Ada yang bisa dibantu?</h3>
        <p>Tanya seputar aplikasi, tips produktivitas, atau keuangan.</p>
        <div class="chat-templates">
          ${TEMPLATE_QUESTIONS.map(q => `<button class="chat-template-chip">${escapeHtml(q)}</button>`).join('')}
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  for (const msg of riwayat) {
    addMessageBubble(msg.role, msg.content);
  }
}

function scrollToBottom() {
  const body = document.getElementById('chat-body');
  if (body) body.scrollTop = body.scrollHeight;
}

function addMessageBubble(role, content) {
  const body = document.getElementById('chat-body');
  if (!body) return;

  const isBot = role === 'assistant';
  const isError = role === 'error';
  const msgClass = isError ? 'chat-msg error' : `chat-msg ${isBot ? 'bot' : 'user'}`;

  const div = document.createElement('div');
  div.className = msgClass;
  div.innerHTML = `
    <div class="chat-msg-avatar">
      <i data-lucide="${isBot ? 'bot' : 'user'}" width="14" height="14"></i>
    </div>
    <div class="chat-msg-bubble">${isBot || isError ? renderMarkdown(content) : escapeHtml(content)}</div>
  `;
  body.appendChild(div);
  if (window.lucide) window.lucide.createIcons();
}

function addMessage(role, content) {
  addMessageBubble(role, content);
  scrollToBottom();
}

function showTyping() {
  const body = document.getElementById('chat-body');
  if (!body) return;
  const div = document.createElement('div');
  div.className = 'chat-typing';
  div.id = 'chat-typing';
  div.innerHTML = '<span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span>';
  body.appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('chat-typing');
  if (el) el.remove();
}

function autoResizeInput(input) {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 100) + 'px';
}

function setLoadingState(loading) {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const stopBtn = document.getElementById('chat-stop-btn');
  if (!input || !sendBtn || !stopBtn) return;

  isSending = loading;
  input.disabled = loading;
  sendBtn.style.display = loading ? 'none' : 'flex';
  stopBtn.style.display = loading ? 'flex' : 'none';
  if (!loading) sendBtn.disabled = !input.value.trim();
}

function showRetryButton() {
  const body = document.getElementById('chat-body');
  if (!body) return;

  const div = document.createElement('div');
  div.style.cssText = 'display:flex;justify-content:center;padding:4px 0 8px;';
  const btn = document.createElement('button');
  btn.className = 'chat-template-chip';
  btn.textContent = '🔄 Coba lagi';
  btn.addEventListener('click', () => {
    div.remove();
    if (lastUserText) {
      const input = document.getElementById('chat-input');
      input.value = lastUserText;
      handleSend();
    }
  });
  div.appendChild(btn);
  body.appendChild(div);
  scrollToBottom();
}

async function handleSend() {
  if (isSending) return;

  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  if (!hasApiKey()) {
    addMessage('error', 'API key belum diatur. Silakan atur di halaman Pengaturan.');
    return;
  }

  lastUserText = text;
  input.value = '';
  input.style.height = 'auto';
  setLoadingState(true);

  const stopBtn = document.getElementById('chat-stop-btn');
  const handleStop = () => {
    abortPesan();
    setLoadingState(false);
    stopBtn.removeEventListener('click', handleStop);
    addMessage('error', 'Dibatalkan');
  };
  stopBtn.addEventListener('click', handleStop);

  addMessage('user', text);
  showTyping();

  try {
    const sistemPrompt = getSystemPrompt();
    const dataKonteks = await getDataKonteks();
    const jawaban = await kirimPesan(riwayat, text, sistemPrompt, dataKonteks);

    hideTyping();

    riwayat.push({ role: 'user', content: text });
    riwayat.push({ role: 'assistant', content: jawaban });
    simpanRiwayat();

    addMessage('assistant', jawaban);
  } catch (err) {
    hideTyping();
    if (err.message !== 'Dibatalkan') {
      const msg = err.message === 'AI tidak merespon, coba pertanyaan yang lebih sederhana'
        ? err.message
        : err.message || 'Terjadi kesalahan. Coba lagi nanti.';
      addMessage('error', msg);
      showRetryButton();
    }
  } finally {
    setLoadingState(false);
    stopBtn.removeEventListener('click', handleStop);
  }
}
