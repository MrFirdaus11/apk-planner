import {
  getAfirmasi,
  simpanAfirmasiKustom,
  getStreakManifestasi,
  updateStreakManifestasi,
} from '../store.js';
import { formatTanggalPendek } from '../utils/date-utils.js';
import { AFIRMASI_PAGI, AFIRMASI_MALAM } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { bukaModal, tutupModal } from '../components/modal.js';
import { tampilkanToast } from '../components/toast.js';
import '../styles/manifestasi.css';
import '../styles/components.css';

// ─── STATE ────────────────────────────────────────────────────────────────────
let state = {
  mode: 'pagi',            // 'pagi' | 'malam'
  afirmasiList: [],        // gabungan default + kustom
  indexAktif: 0,
  pengulangan: 0,          // 0–5
  isAnimating: false,
  streak: { count: 0, terakhir: null },
  container: null,
};

// ─── MOUNT ───────────────────────────────────────────────────────────────────
export async function mount(container) {
  state.container = container;

  // Tentukan mode awal berdasarkan jam
  const jam = new Date().getHours();
  state.mode = jam >= 17 || jam < 5 ? 'malam' : 'pagi';
  state.indexAktif = 0;
  state.pengulangan = 0;

  // Load data
  state.streak = await getStreakManifestasi();
  await _muatAfirmasi();

  // Render
  container.innerHTML = _renderPage();
  _bindEvents();

  if (window.lucide) window.lucide.createIcons();
}

// ─── UNMOUNT ─────────────────────────────────────────────────────────────────
export function unmount() {
  // Bersihkan celebration jika ada
  const cel = document.querySelector('.celebration-overlay');
  if (cel) cel.remove();
  document.querySelectorAll('.confetti-particle').forEach(p => p.remove());
  state.container = null;
}

// ─── MUAT AFIRMASI ────────────────────────────────────────────────────────────
async function _muatAfirmasi() {
  const data = await getAfirmasi();
  const defaultList = state.mode === 'pagi' ? AFIRMASI_PAGI : AFIRMASI_MALAM;
  const kustom = (data[`kustom_${state.mode}`] || []).map(k => k.teks);
  state.afirmasiList = [...defaultList, ...kustom];
  if (state.indexAktif >= state.afirmasiList.length) state.indexAktif = 0;
}

// ─── RENDER HALAMAN ───────────────────────────────────────────────────────────
function _renderPage() {
  const tanggal = _getTanggalLabel();
  const streakLabel = state.streak.count > 0
    ? `🔥 ${state.streak.count} hari berturut-turut!`
    : 'Mulai streak hari ini!';

  return `
    <div class="manifestasi-page">
      ${_renderHeader(tanggal)}
      ${_renderStreakBanner(streakLabel)}
      ${_renderToggle()}
      ${_renderSectionHead()}
      ${_renderKartuAfirmasi()}
      ${_renderSwipeHint()}
      ${_renderPageIndicator()}
      ${_renderTracker()}
      ${_renderActions()}
      ${_renderInfoSection()}
    </div>
  `;
}

function _renderHeader(tanggal) {
  return `
    <header class="manifestasi-header">
      <div class="manifestasi-avatar">
        <span>✨</span>
      </div>
      <div class="manifestasi-header-center">
        <span class="manifestasi-app-title">APK Planner</span>
        <span class="manifestasi-date-label">${tanggal}</span>
      </div>
      <button class="btn-icon" id="settings-btn" title="Pengaturan" aria-label="Pengaturan">
        <i data-lucide="settings" width="20" height="20"></i>
      </button>
    </header>
  `;
}

function _renderStreakBanner(streakLabel) {
  const hasStreak = state.streak.count > 0;
  return `
    <div class="manifestasi-streak-banner">
      <span class="streak-fire">${hasStreak ? '🔥' : '🌱'}</span>
      <div class="streak-info">
        <strong>${streakLabel}</strong>
        <span>Konsistensi adalah kunci manifestasi</span>
      </div>
      ${hasStreak ? `<span style="font-size:var(--text-xs);font-weight:700;color:var(--primary);">×${state.streak.count}</span>` : ''}
    </div>
  `;
}

function _renderToggle() {
  return `
    <div class="manifestasi-toggle-wrap">
      <div class="pill-toggle" role="group" aria-label="Pilih waktu afirmasi">
        <button class="pill-toggle-btn ${state.mode === 'pagi' ? 'active' : ''}" 
          data-mode="pagi" id="toggle-pagi" aria-pressed="${state.mode === 'pagi'}">
          <span class="toggle-icon">☀️</span>
          Niat Pagi
        </button>
        <button class="pill-toggle-btn ${state.mode === 'malam' ? 'active' : ''}" 
          data-mode="malam" id="toggle-malam" aria-pressed="${state.mode === 'malam'}">
          <span class="toggle-icon">🌙</span>
          Refleksi Malam
        </button>
      </div>
    </div>
  `;
}

function _renderSectionHead() {
  const judul = state.mode === 'pagi' ? 'Niat Pagi' : 'Refleksi Malam';
  return `
    <div class="manifestasi-section-head">
      <h2 class="manifestasi-section-title">${judul}</h2>
      <p class="manifestasi-section-subtitle">Ucapkan dengan jelas dan penuh kesadaran.</p>
    </div>
  `;
}

function _renderKartuAfirmasi() {
  const teks = state.afirmasiList[state.indexAktif] || 'Hari ini saya penuh semangat dan niat baik.';
  return `
    <div class="afirmasi-card-wrap">
      <div class="afirmasi-card-slider">
        <div class="afirmasi-card" id="afirmasi-card" role="region" 
          aria-label="Kartu afirmasi, geser untuk pindah" tabindex="0">
          <div class="afirmasi-card-decoration afirmasi-deco-1"></div>
          <div class="afirmasi-card-decoration afirmasi-deco-2"></div>
          <div class="afirmasi-quote-mark">\u201C</div>
          <p class="afirmasi-card-teks" id="afirmasi-teks">${escapeHtml(teks)}</p>
          <div class="afirmasi-quote-mark afirmasi-quote-mark-close">\u201D</div>
        </div>
      </div>
    </div>
  `;
}

function _renderSwipeHint() {
  return `
    <div class="afirmasi-swipe-hint">
      <span style="opacity:0.5">←</span>
      <span>Geser untuk pindah afirmasi</span>
      <span style="opacity:0.5">→</span>
    </div>
  `;
}

function _renderPageIndicator() {
  const total = state.afirmasiList.length;
  const current = state.indexAktif + 1;
  const maxDots = Math.min(total, 8);

  const dots = Array.from({ length: total }, (_, i) => {
    if (total > 8) {
      // Tampilkan hanya 8 dot dengan window sliding
      const start = Math.max(0, Math.min(state.indexAktif - 3, total - 8));
      if (i < start || i >= start + 8) return '';
    }
    return `<div class="indicator-dot ${i === state.indexAktif ? 'active' : ''}"></div>`;
  }).join('');

  return `
    <div class="afirmasi-page-indicator">
      <div class="indicator-dots" id="indicator-dots">${dots}</div>
      <span class="indicator-label" id="indicator-label">${current} / ${total}</span>
    </div>
  `;
}

function _renderTracker() {
  const dots = Array.from({ length: 5 }, (_, i) => {
    const filled = i < state.pengulangan;
    return `
      <div class="tracker-dot ${filled ? 'filled' : ''}" 
        data-idx="${i}" 
        role="checkbox" 
        aria-checked="${filled}" 
        aria-label="Pengulangan ${i + 1}"
        tabindex="0">
        ${filled ? '✓' : ''}
      </div>
    `;
  }).join('');

  return `
    <div class="tracker-section">
      <div class="tracker-header">
        <span class="tracker-label">Ulangi 5 Kali</span>
        <span class="tracker-count-badge" id="tracker-badge">${state.pengulangan}/5</span>
      </div>
      <div class="tracker-dots" id="tracker-dots">
        ${dots}
      </div>
    </div>
  `;
}

function _renderActions() {
  return `
    <div class="manifestasi-actions">
      <button class="btn-next-afirmasi" id="btn-next-afirmasi">
        Frasa Berikutnya
        <span>→</span>
      </button>
      <button class="btn-add-afirmasi" id="btn-add-afirmasi" 
        title="Tambah afirmasi kustom" aria-label="Tambah afirmasi kustom">
        +
      </button>
    </div>
  `;
}

function _renderInfoSection() {
  const tipsPagi = 'Ucapkan setiap afirmasi dengan lantang 5 kali di depan cermin untuk hasil terbaik.';
  const tipsMalam = 'Renungkan pencapaian hari ini sambil menarik napas perlahan dan dalam.';
  return `
    <div class="manifestasi-info-section">
      <span class="manifestasi-info-icon">${state.mode === 'pagi' ? '💡' : '🌠'}</span>
      <p class="manifestasi-info-text">
        <strong>Tips:</strong> ${state.mode === 'pagi' ? tipsPagi : tipsMalam}
      </p>
    </div>
  `;
}

// ─── BIND EVENTS ─────────────────────────────────────────────────────────────
function _bindEvents() {
  const c = state.container;
  if (!c) return;

  // Toggle mode
  c.querySelector('#toggle-pagi')?.addEventListener('click', () => _gantiMode('pagi'));
  c.querySelector('#toggle-malam')?.addEventListener('click', () => _gantiMode('malam'));

  // Tombol next
  c.querySelector('#btn-next-afirmasi')?.addEventListener('click', () => _navigasi(1));

  // Tombol tambah afirmasi
  c.querySelector('#btn-add-afirmasi')?.addEventListener('click', _bukaModalTambah);

  // Settings
  c.querySelector('#settings-btn')?.addEventListener('click', () => {
    window.location.hash = '#pengaturan';
  });

  // Tracker dots
  c.querySelector('#tracker-dots')?.addEventListener('click', e => {
    const dot = e.target.closest('.tracker-dot');
    if (dot) _klikTracker(parseInt(dot.dataset.idx));
  });
  c.querySelector('#tracker-dots')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const dot = e.target.closest('.tracker-dot');
      if (dot) { e.preventDefault(); _klikTracker(parseInt(dot.dataset.idx)); }
    }
  });

  // Swipe/touch pada kartu
  _bindSwipe();

  // Keyboard navigation
  c.querySelector('#afirmasi-card')?.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') _navigasi(1);
    if (e.key === 'ArrowLeft') _navigasi(-1);
  });
}

// ─── SWIPE HANDLER ────────────────────────────────────────────────────────────
function _bindSwipe() {
  const card = state.container?.querySelector('#afirmasi-card');
  if (!card) return;

  let startX = 0;
  let startY = 0;
  let isDragging = false;

  card.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      _navigasi(dx < 0 ? 1 : -1);
    }
  }, { passive: true });

  // Mouse drag
  let mouseStartX = 0;
  let isMouseDown = false;

  card.addEventListener('mousedown', e => {
    mouseStartX = e.clientX;
    isMouseDown = true;
  });

  card.addEventListener('mouseup', e => {
    if (!isMouseDown) return;
    isMouseDown = false;
    const dx = e.clientX - mouseStartX;
    if (Math.abs(dx) > 40) {
      _navigasi(dx < 0 ? 1 : -1);
    }
  });

  card.addEventListener('mouseleave', () => { isMouseDown = false; });
}

// ─── NAVIGASI AFIRMASI ────────────────────────────────────────────────────────
function _navigasi(arah) {
  if (state.isAnimating) return;
  const total = state.afirmasiList.length;
  if (total === 0) return;

  state.isAnimating = true;

  const card = state.container?.querySelector('#afirmasi-card');
  if (!card) { state.isAnimating = false; return; }

  // Animasi keluar
  const outClass = arah > 0 ? 'slide-out-left' : 'slide-out-right';
  card.classList.add(outClass);

  card.addEventListener('animationend', () => {
    card.classList.remove(outClass);

    // Update index
    state.indexAktif = ((state.indexAktif + arah) + total) % total;
    state.pengulangan = 0; // Reset pengulangan saat ganti afirmasi

    // Update teks
    const teksEl = card.querySelector('#afirmasi-teks');
    if (teksEl) teksEl.textContent = state.afirmasiList[state.indexAktif];

    // Animasi masuk
    const inClass = arah > 0 ? 'slide-in-left' : 'slide-in-right';
    card.classList.add(inClass);

    card.addEventListener('animationend', () => {
      card.classList.remove(inClass);
      state.isAnimating = false;
    }, { once: true });

    // Update UI lainnya
    _updateIndicator();
    _updateTracker();
  }, { once: true });
}

// ─── GANTI MODE ────────────────────────────────────────────────────────────────
async function _gantiMode(mode) {
  if (state.mode === mode) return;
  state.mode = mode;
  state.indexAktif = 0;
  state.pengulangan = 0;
  await _muatAfirmasi();

  // Re-render seluruh halaman
  if (state.container) {
    state.container.innerHTML = _renderPage();
    _bindEvents();
    if (window.lucide) window.lucide.createIcons();
  }
}

// ─── TRACKER ─────────────────────────────────────────────────────────────────
function _klikTracker(idx) {
  // Toggle: jika sudah filled dan klik lagi, unfill dari idx ke akhir
  if (state.pengulangan === idx + 1) {
    state.pengulangan = idx;
  } else {
    state.pengulangan = idx + 1;
  }

  _updateTracker();

  // Animasi pop pada dot yang baru diklik
  const dots = state.container?.querySelectorAll('.tracker-dot');
  if (dots && dots[idx]) {
    dots[idx].classList.remove('pop');
    void dots[idx].offsetWidth; // force reflow
    dots[idx].classList.add('pop');
    dots[idx].addEventListener('animationend', () => dots[idx].classList.remove('pop'), { once: true });
  }

  // Celebration saat 5 pengulangan
  if (state.pengulangan === 5) {
    _tampilkanCelebration();
    _updateStreak();
  }
}

function _updateTracker() {
  const dotsEl = state.container?.querySelectorAll('.tracker-dot');
  const badge = state.container?.querySelector('#tracker-badge');

  dotsEl?.forEach((dot, i) => {
    const filled = i < state.pengulangan;
    dot.classList.toggle('filled', filled);
    dot.setAttribute('aria-checked', filled);
    dot.innerHTML = filled ? '✓' : '';
  });

  if (badge) badge.textContent = `${state.pengulangan}/5`;
}

function _updateIndicator() {
  const dotsEl = state.container?.querySelector('#indicator-dots');
  const labelEl = state.container?.querySelector('#indicator-label');
  const total = state.afirmasiList.length;

  if (dotsEl) {
    const dots = Array.from({ length: total }, (_, i) => {
      const start = Math.max(0, Math.min(state.indexAktif - 3, total - 8));
      if (total > 8 && (i < start || i >= start + 8)) return '';
      return `<div class="indicator-dot ${i === state.indexAktif ? 'active' : ''}"></div>`;
    }).join('');
    dotsEl.innerHTML = dots;
  }

  if (labelEl) labelEl.textContent = `${state.indexAktif + 1} / ${total}`;
}

// ─── STREAK UPDATE ────────────────────────────────────────────────────────────
async function _updateStreak() {
  const tanggal = formatTanggalPendek(new Date());
  state.streak = await updateStreakManifestasi(tanggal);
}

// ─── CELEBRATION ──────────────────────────────────────────────────────────────
function _tampilkanCelebration() {
  // Konfeti
  _lemparKonfeti();

  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.id = 'celebration-overlay';
  overlay.innerHTML = `
    <div class="celebration-card">
      <span class="celebration-emoji">🌟</span>
      <p class="celebration-title">Luar Biasa!</p>
      <p class="celebration-sub">5 pengulangan selesai.<br>Manifestasimu sedang bekerja!</p>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.addEventListener('click', () => {
    overlay.remove();
    document.querySelectorAll('.confetti-particle').forEach(p => p.remove());
  });

  setTimeout(() => {
    overlay.remove();
    document.querySelectorAll('.confetti-particle').forEach(p => p.remove());
  }, 3500);

  tampilkanToast('🌟 Afirmasi selesai! Streak diperbarui.', 'success');
}

function _lemparKonfeti() {
  const warna = ['#6C3CE1', '#9B5FF0', '#EC4899', '#F59E0B', '#10B981', '#C4B5FD'];
  const jumlah = 30;

  for (let i = 0; i < jumlah; i++) {
    const partikel = document.createElement('div');
    partikel.className = 'confetti-particle';
    partikel.style.cssText = `
      left: ${Math.random() * 100}%;
      top: 0;
      background: ${warna[Math.floor(Math.random() * warna.length)]};
      width: ${Math.random() * 8 + 4}px;
      height: ${Math.random() * 8 + 4}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-duration: ${Math.random() * 2 + 2}s;
      animation-delay: ${Math.random() * 0.5}s;
    `;
    document.body.appendChild(partikel);

    partikel.addEventListener('animationend', () => partikel.remove());
  }
}

// ─── MODAL TAMBAH AFIRMASI ────────────────────────────────────────────────────
function _bukaModalTambah() {
  let tipeModal = state.mode;
  const MAKS_KARAKTER = 150;

  const body = document.createElement('div');
  body.innerHTML = `
    <div class="modal-afirmasi-tipe">
      <button class="modal-tipe-btn ${tipeModal === 'pagi' ? 'active' : ''}" data-tipe="pagi">
        ☀️ Pagi
      </button>
      <button class="modal-tipe-btn ${tipeModal === 'malam' ? 'active' : ''}" data-tipe="malam">
        🌙 Malam
      </button>
    </div>
    <div class="form-group">
      <label class="form-label" for="input-afirmasi">Tulis afirmasi kustom Anda</label>
      <textarea class="form-input" id="input-afirmasi" 
        placeholder="Contoh: Saya adalah pribadi yang kuat, bahagia, dan penuh kasih..."
        rows="4" maxlength="${MAKS_KARAKTER}"></textarea>
      <div class="modal-char-count" id="char-count">0 / ${MAKS_KARAKTER}</div>
    </div>
  `;

  // Bind tipe buttons
  body.querySelectorAll('.modal-tipe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tipeModal = btn.dataset.tipe;
      body.querySelectorAll('.modal-tipe-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Char count
  const textarea = body.querySelector('#input-afirmasi');
  const charCount = body.querySelector('#char-count');
  textarea.addEventListener('input', () => {
    const len = textarea.value.length;
    charCount.textContent = `${len} / ${MAKS_KARAKTER}`;
    charCount.className = 'modal-char-count' +
      (len > MAKS_KARAKTER * 0.9 ? ' danger' : len > MAKS_KARAKTER * 0.7 ? ' warn' : '');
  });

  bukaModal({
    judul: '✨ Tambah Afirmasi Kustom',
    konten: body,
    aksi: [
      {
        id: 'batal',
        label: 'Batal',
        kelas: 'btn-ghost',
        onClick: tutupModal,
      },
      {
        id: 'simpan',
        label: 'Simpan',
        kelas: 'btn-primary',
        onClick: async () => {
          const teks = textarea.value.trim();
          if (!teks) {
            tampilkanToast('Tulis afirmasi terlebih dahulu!', 'warning');
            textarea.focus();
            return;
          }
          if (teks.length < 10) {
            tampilkanToast('Afirmasi terlalu pendek (min. 10 karakter).', 'warning');
            return;
          }

          try {
            await simpanAfirmasiKustom(tipeModal, teks);
            tutupModal();
            tampilkanToast('✅ Afirmasi kustom berhasil disimpan!', 'success');

            // Reload afirmasi jika tipe sama dengan mode aktif
            if (tipeModal === state.mode) {
              await _muatAfirmasi();
              _updateIndicator();
            }
          } catch (err) {
            tampilkanToast('Gagal menyimpan afirmasi.', 'error');
            console.error(err);
          }
        },
      },
    ],
  });

  // Fokus ke textarea setelah modal terbuka
  setTimeout(() => textarea?.focus(), 300);
}

// ─── HELPER ──────────────────────────────────────────────────────────────────
function _getTanggalLabel() {
  const now = new Date();
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${hari[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
}
