import { escapeHtml } from './utils/helpers.js';

const pages = {
  jadwal: () => import('./pages/jadwal.js'),
  fokus: () => import('./pages/fokus.js'),
  manifestasi: () => import('./pages/manifestasi.js'),
  jurnal: () => import('./pages/jurnal.js'),
  progres: () => import('./pages/progres.js'),
  pengaturan: () => import('./pages/pengaturan.js'),
};

let currentPage = null;
let currentModule = null;

export async function loadPage(pageName) {
  const container = document.getElementById('page-container');
  if (!container) return;

  // Cleanup current page
  if (currentModule?.unmount) currentModule.unmount();

  // Transition out
  container.classList.add('page-exit');
  await new Promise(r => setTimeout(r, 150));

  const loader = pages[pageName] || pages.jadwal;
  try {
    currentModule = await loader();
    currentPage = pageName;

    container.innerHTML = '';
    container.className = 'page-container';
    container.classList.add('page-enter');

    await currentModule.mount(container);

    requestAnimationFrame(() => {
      container.classList.remove('page-enter');
    });
  } catch (e) {
    console.error('Gagal memuat halaman:', pageName, e);
    container.innerHTML = `<div class="error-page"><p>Halaman tidak ditemukan</p><pre style="color:red; text-align:left; font-size:12px; margin-top:20px; white-space:pre-wrap;">${escapeHtml(e.stack || e.message || String(e))}</pre></div>`;
  }
}

export function getCurrentPage() {
  return currentPage;
}
