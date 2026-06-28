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

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker terdaftar:', reg.scope);
    } catch (e) {
      console.warn('Service Worker gagal:', e);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
