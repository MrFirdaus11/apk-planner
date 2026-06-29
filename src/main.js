import { renderBottomNav } from './components/bottom-nav.js';
import { initNotifikasi } from './notifications.js';
import { loadPage } from './router.js';
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
}

document.addEventListener('DOMContentLoaded', init);
