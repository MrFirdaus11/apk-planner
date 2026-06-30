import { renderBottomNav } from './components/bottom-nav.js';
import { initNotifikasi } from './notifications.js';
import { loadPage } from './router.js';
import { initChat } from './components/chat-overlay.js';
import { getApiKey } from './store.js';
import { setApiKey } from './services/ai-chat.js';
import './utils/theme.js'; // auto-init theme on load

// ─── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  // Render bottom nav
  renderBottomNav();

  // Setup router
  const hash = window.location.hash.slice(1) || 'jadwal';
  await loadPage(hash);

  window.addEventListener('hashchange', async () => {
    const page = window.location.hash.slice(1) || 'jadwal';
    await loadPage(page);
    renderBottomNav();
  });

  // Init notifikasi (minta izin & schedule)
  await initNotifikasi();

  // Init AI Chat
  const savedKey = await getApiKey();
  if (savedKey) setApiKey(savedKey);
  initChat();
}

document.addEventListener('DOMContentLoaded', init);
