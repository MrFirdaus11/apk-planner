import { escapeHtml } from '../utils/helpers.js';
import { hasApiKey, kirimPesan, abortPesan } from '../services/ai-chat.js';
import { getSystemPrompt, getDataKonteks } from '../services/knowledge-base.js';
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

export function initChat() {
  renderFab();
}

export function openChat() {
  if (isOpen) return;
  isOpen = true;
  riwayat = [];

  const container = document.getElementById('chat-container');
  container.innerHTML = renderChatSheet();
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

  requestAnimationFrame(() => {
    input.focus();
  });
}

export function closeChat() {
  if (!isOpen) return;
  abortPesan();
  isOpen = false;
  isSending = false;
  const container = document.getElementById('chat-container');
  container.innerHTML = '';
  renderFab();
}

function renderFab() {
  const container = document.getElementById('chat-container');
  const existing = container.querySelector('.chat-fab');
  if (existing) return;

  const fab = document.createElement('button');
  fab.className = 'chat-fab';
  fab.id = 'chat-fab';
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
          <div class="chat-header-icon">
            <i data-lucide="bot" width="18" height="18"></i>
          </div>
          <div class="chat-header-info">
            <div class="chat-header-title">AI Asisten</div>
            <div class="chat-header-status">● Online</div>
          </div>
          <button class="chat-header-close">
            <i data-lucide="x" width="20" height="20"></i>
          </button>
        </div>

        <div class="chat-body" id="chat-body">
          ${renderWelcome()}
        </div>

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

function renderWelcome() {
  if (!hasApiKey()) {
    return `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">
          <i data-lucide="bot" width="24" height="24"></i>
        </div>
        <h3>AI Asisten</h3>
        <p>Atur API key terlebih dahulu di halaman <strong>Pengaturan</strong> untuk mulai menggunakan AI.</p>
      </div>
    `;
  }

  return `
    <div class="chat-welcome">
      <div class="chat-welcome-icon">
        <i data-lucide="bot" width="24" height="24"></i>
      </div>
      <h3>Halo! Ada yang bisa dibantu?</h3>
      <p>Tanya seputar aplikasi, tips produktivitas, atau keuangan.</p>
      <div class="chat-templates">
        ${TEMPLATE_QUESTIONS.map(q => `<button class="chat-template-chip">${escapeHtml(q)}</button>`).join('')}
      </div>
    </div>
  `;
}

function scrollToBottom() {
  const body = document.getElementById('chat-body');
  if (body) body.scrollTop = body.scrollHeight;
}

function addMessage(role, content) {
  const body = document.getElementById('chat-body');
  if (!body) return;

  const isBot = role === 'assistant';
  const isError = role === 'error';
  const msgClass = isError ? 'chat-msg error' : `chat-msg ${isBot ? 'bot' : 'user'}`;
  const avatarHtml = isBot
    ? '<div class="chat-msg-avatar"><i data-lucide="bot" width="14" height="14"></i></div>'
    : '<div class="chat-msg-avatar"><i data-lucide="user" width="14" height="14"></i></div>';

  const div = document.createElement('div');
  div.className = msgClass;
  div.innerHTML = `
    ${avatarHtml}
    <div class="chat-msg-bubble">${escapeHtml(content)}</div>
  `;
  body.appendChild(div);
  scrollToBottom();
  if (window.lucide) window.lucide.createIcons();
}

function showTyping() {
  const body = document.getElementById('chat-body');
  if (!body) return;

  const div = document.createElement('div');
  div.className = 'chat-typing';
  div.id = 'chat-typing';
  div.innerHTML = `
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
    <span class="chat-typing-dot"></span>
  `;
  body.appendChild(div);
  scrollToBottom();
}

function hideTyping() {
  const el = document.getElementById('chat-typing');
  if (el) el.remove();
}

function setLoadingState(loading) {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const stopBtn = document.getElementById('chat-stop-btn');
  if (!input || !sendBtn || !stopBtn) return;

  isSending = loading;
  input.disabled = loading;
  if (loading) {
    sendBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
  } else {
    sendBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    sendBtn.disabled = !input.value.trim();
  }
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

  input.value = '';
  setLoadingState(true);

  const stopBtn = document.getElementById('chat-stop-btn');
  const handleStop = () => {
    abortPesan();
    addMessage('error', 'Pesan dibatalkan');
    setLoadingState(false);
    stopBtn.removeEventListener('click', handleStop);
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

    if (riwayat.length > 20) {
      riwayat = riwayat.slice(-20);
    }

    addMessage('assistant', jawaban);
  } catch (err) {
    hideTyping();
    if (err.message !== 'Dibatalkan') {
      const msg = err.message === 'AI tidak merespon, coba pertanyaan yang lebih sederhana'
        ? err.message
        : err.message || 'Terjadi kesalahan. Coba lagi nanti.';
      addMessage('error', msg);
    }
  } finally {
    setLoadingState(false);
    stopBtn.removeEventListener('click', handleStop);
  }
}
