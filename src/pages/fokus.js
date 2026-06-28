/**
 * fokus.js — Halaman Timer Pomodoro
 * APK Planner
 */

import { simpanSesiFokus, getSesiFokusByTanggal } from '../store.js';
import { formatTanggalPendek, formatDetik } from '../utils/date-utils.js';
import { TIMER_PRESET, TIPS_FOKUS } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { tampilkanToast } from '../components/toast.js';
import '../styles/fokus.css';
import '../styles/components.css';

// ─── STATE ────────────────────────────────────────────────────────────────────
const STATE_KEY = 'fokus_timer_state';

let timerInterval  = null;
let state          = null;
let containerRef   = null;
let jadwalHariIni  = [];

/** State default saat pertama kali atau reset penuh */
function buatStateAwal() {
  return {
    mode        : 'fokus',       // 'fokus' | 'istirahat'
    berjalan    : false,
    detikSisa   : TIMER_PRESET.fokus,
    detikTotal  : TIMER_PRESET.fokus,
    sesiSelesai : 0,
    tugasAktif  : '',
    waktuMulai  : null,          // timestamp saat tombol play ditekan
  };
}

function simpanStateSession() {
  try {
    sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (_) {}
}

function muatStateSession() {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Rekonsiliasi waktu yang berlalu saat tab tidak aktif
      if (parsed.berjalan && parsed.waktuMulai) {
        const berlalu = Math.floor((Date.now() - parsed.waktuMulai) / 1000);
        parsed.detikSisa = Math.max(0, parsed.detikSisa - berlalu);
        parsed.waktuMulai = Date.now();
      }
      return parsed;
    }
  } catch (_) {}
  return null;
}

// ─── AUDIO ───────────────────────────────────────────────────────────────────
function bunyikanBeep(frekuensi = 880, durasi = 0.4) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frekuensi, ctx.currentTime);
    gain.gain.setValueAtTime(0.35, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durasi);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durasi);

    // Double beep untuk mode selesai
    const osc2  = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(frekuensi * 1.25, ctx.currentTime + durasi + 0.08);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + durasi + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durasi * 2 + 0.08);
    osc2.start(ctx.currentTime + durasi + 0.08);
    osc2.stop(ctx.currentTime + durasi * 2 + 0.1);
  } catch (_) {}
}

// ─── TIMER LOGIC ─────────────────────────────────────────────────────────────
function mulaiTimer() {
  if (timerInterval) clearInterval(timerInterval);
  state.berjalan   = true;
  state.waktuMulai = Date.now();
  simpanStateSession();

  timerInterval = setInterval(() => {
    state.detikSisa--;
    state.waktuMulai = Date.now(); // update agar rekonsiliasi tetap akurat
    simpanStateSession();

    if (state.detikSisa <= 0) {
      selesaikanSesi();
    } else {
      updateUI();
    }
  }, 1000);
}

function jedaTimer() {
  clearInterval(timerInterval);
  timerInterval     = null;
  state.berjalan    = false;
  state.waktuMulai  = null;
  simpanStateSession();
  updateUI();
}

function togglePlayPause() {
  if (state.berjalan) {
    jedaTimer();
  } else {
    mulaiTimer();
  }
}

function resetTimer() {
  clearInterval(timerInterval);
  timerInterval = null;

  state.berjalan   = false;
  state.waktuMulai = null;
  // Reset ke awal mode saat ini saja
  if (state.mode === 'fokus') {
    state.detikSisa  = TIMER_PRESET.fokus;
    state.detikTotal = TIMER_PRESET.fokus;
  } else {
    const durasi     = isDurasiIstirahatPanjang() ? TIMER_PRESET.istirahatPanjang : TIMER_PRESET.istirahatPendek;
    state.detikSisa  = durasi;
    state.detikTotal = durasi;
  }
  simpanStateSession();
  updateUI();
}

function skipSesi() {
  clearInterval(timerInterval);
  timerInterval    = null;
  state.berjalan   = false;
  state.waktuMulai = null;

  if (state.mode === 'fokus') {
    // Simpan sesi fokus (hanya jika sudah mulai / ada kemajuan)
    const menitSelesai = Math.round((TIMER_PRESET.fokus - state.detikSisa) / 60);
    if (menitSelesai >= 1) {
      simpanSesiKeDalam(menitSelesai);
    }
    state.sesiSelesai++;
    masukModeIstirahat();
  } else {
    masukModeFokus();
  }
  simpanStateSession();
  updateUI();
  renderHistory();
}

function tambah5Menit() {
  state.detikSisa  += 5 * 60;
  state.detikTotal += 5 * 60;
  simpanStateSession();
  tampilkanToast('Ditambah 5 menit ⏱️', 'info');
  updateUI();
}

function isDurasiIstirahatPanjang() {
  return state.sesiSelesai > 0 && state.sesiSelesai % TIMER_PRESET.sesiPerSiklus === 0;
}

function masukModeIstirahat() {
  const durasi     = isDurasiIstirahatPanjang() ? TIMER_PRESET.istirahatPanjang : TIMER_PRESET.istirahatPendek;
  state.mode       = 'istirahat';
  state.detikSisa  = durasi;
  state.detikTotal = durasi;
}

function masukModeFokus() {
  state.mode       = 'fokus';
  state.detikSisa  = TIMER_PRESET.fokus;
  state.detikTotal = TIMER_PRESET.fokus;
}

async function selesaikanSesi() {
  clearInterval(timerInterval);
  timerInterval    = null;
  state.berjalan   = false;
  state.waktuMulai = null;

  if (state.mode === 'fokus') {
    bunyikanBeep(880);
    state.sesiSelesai++;
    const menitSelesai = Math.round(TIMER_PRESET.fokus / 60);
    await simpanSesiKeDalam(menitSelesai);

    const isPanjang = isDurasiIstirahatPanjang();
    masukModeIstirahat();
    tampilkanToast(
      isPanjang ? '🎉 4 sesi selesai! Istirahat panjang 15 menit' : '✅ Sesi fokus selesai! Waktunya istirahat',
      'success',
      4000
    );
    renderHistory();
  } else {
    bunyikanBeep(660);
    masukModeFokus();
    tampilkanToast('☕ Istirahat selesai! Siap fokus lagi?', 'info', 3000);
  }

  simpanStateSession();
  updateUI();
}

async function simpanSesiKeDalam(menitSelesai) {
  const sesi = {
    id          : Date.now().toString(),
    tanggal     : formatTanggalPendek(),
    tugas       : state.tugasAktif || 'Fokus Umum',
    menitSelesai,
    waktu       : new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
  };
  await simpanSesiFokus(sesi);
}

// ─── MULAI ISTIRAHAT MANUAL ───────────────────────────────────────────────────
function mulaiIstirahatManual() {
  if (state.mode === 'fokus') {
    clearInterval(timerInterval);
    timerInterval    = null;
    state.berjalan   = false;
    state.waktuMulai = null;
    masukModeIstirahat();
    simpanStateSession();
    updateUI();
    tampilkanToast('☕ Mode istirahat dimulai', 'info');
  }
}

// ─── SVG RING ────────────────────────────────────────────────────────────────
function hitungDashOffset(radius, detikSisa, detikTotal) {
  const keliling    = 2 * Math.PI * radius;
  const persen      = detikTotal > 0 ? detikSisa / detikTotal : 0;
  const offset      = keliling * (1 - persen);
  return { keliling, offset };
}

// ─── UPDATE UI ────────────────────────────────────────────────────────────────
function updateUI() {
  if (!containerRef) return;

  const isIstirahat = state.mode === 'istirahat';
  const isBerjalan  = state.berjalan;

  // ── Waktu display ──
  const elWaktu = containerRef.querySelector('.fokus-time-display');
  if (elWaktu) {
    const baru = formatDetik(state.detikSisa);
    if (elWaktu.textContent !== baru) {
      elWaktu.textContent = baru;
      // Tick animation
      elWaktu.classList.remove('tick');
      void elWaktu.offsetWidth; // reflow
      elWaktu.classList.add('tick');
    }
    elWaktu.className = `fokus-time-display${isIstirahat ? ' mode-istirahat' : ''}`;
  }

  // ── Label timer ──
  const elLabel = containerRef.querySelector('.fokus-time-label');
  if (elLabel) {
    elLabel.textContent = isIstirahat ? 'ISTIRAHAT' : 'SESI FOKUS';
    elLabel.className   = `fokus-time-label${isIstirahat ? ' mode-istirahat' : ''}`;
  }

  // ── SVG Ring ──
  const RADIUS = 120;
  const elProgress = containerRef.querySelector('.fokus-ring-progress');
  const elGlow     = containerRef.querySelector('.fokus-ring-glow');
  if (elProgress) {
    const { keliling, offset } = hitungDashOffset(RADIUS, state.detikSisa, state.detikTotal);
    elProgress.setAttribute('stroke-dasharray', `${keliling}`);
    elProgress.setAttribute('stroke-dashoffset', `${offset}`);
    elProgress.setAttribute('class', `fokus-ring-progress${isIstirahat ? ' mode-istirahat' : ''}`);
    if (elGlow) {
      elGlow.setAttribute('stroke-dasharray', `${keliling}`);
      elGlow.setAttribute('stroke-dashoffset', `${offset}`);
      elGlow.setAttribute('class', `fokus-ring-glow${isIstirahat ? ' mode-istirahat' : ''}`);
    }
  }

  // ── Status badge ──
  const elBadge = containerRef.querySelector('.fokus-status-badge');
  if (elBadge) {
    if (!isBerjalan && !isIstirahat) {
      elBadge.className    = 'fokus-status-badge status-siap';
      elBadge.innerHTML    = `<span class="status-dot"></span> Siap Mulai`;
    } else if (isBerjalan && !isIstirahat) {
      elBadge.className    = 'fokus-status-badge status-fokus';
      elBadge.innerHTML    = `<span class="status-dot"></span> Sedang Mengerjakan`;
    } else {
      elBadge.className    = 'fokus-status-badge status-istirahat';
      elBadge.innerHTML    = `<span class="status-dot"></span> Istirahat`;
    }
  }

  // ── Play/pause button ──
  const elPlay = containerRef.querySelector('.fokus-btn-play');
  if (elPlay) {
    elPlay.className = `fokus-btn-play${isIstirahat ? ' mode-istirahat' : ''}`;
    elPlay.innerHTML = isBerjalan
      ? `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`
      : `<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v14.71a1 1 0 001.53.85l11-7.36a1 1 0 000-1.7l-11-7.35A1 1 0 008 5.14z"/></svg>`;
  }

  // ── Session dots ──
  const elDots = containerRef.querySelector('.fokus-session-dots');
  const elTeks = containerRef.querySelector('.fokus-session-text');
  if (elDots) {
    const sesiTotal = TIMER_PRESET.sesiPerSiklus;
    const sesiDone  = state.sesiSelesai % sesiTotal;
    let html = '';
    for (let i = 0; i < sesiTotal; i++) {
      if (i < sesiDone) {
        html += `<span class="session-dot dot-done" title="Sesi ${i + 1} selesai"></span>`;
      } else if (i === sesiDone && isBerjalan && !isIstirahat) {
        html += `<span class="session-dot dot-active" title="Sesi ${i + 1} berjalan"></span>`;
      } else {
        html += `<span class="session-dot" title="Sesi ${i + 1}"></span>`;
      }
    }
    elDots.innerHTML = html;
  }
  if (elTeks) {
    const sesiDone = state.sesiSelesai % TIMER_PRESET.sesiPerSiklus;
    elTeks.textContent = `${sesiDone} dari ${TIMER_PRESET.sesiPerSiklus} Sesi`;
  }

  // ── Tombol aksi ──
  const elIstirahat = containerRef.querySelector('[data-aksi="istirahat"]');
  if (elIstirahat) {
    elIstirahat.style.display = state.mode === 'fokus' ? 'inline-flex' : 'none';
  }
}

// ─── RENDER HISTORY ───────────────────────────────────────────────────────────
async function renderHistory() {
  const elList = containerRef?.querySelector('.fokus-history-list');
  if (!elList) return;

  const sesiHariIni = await getSesiFokusByTanggal(formatTanggalPendek());
  if (!sesiHariIni.length) {
    elList.innerHTML = `<p class="fokus-empty-history">Belum ada sesi fokus hari ini.</p>`;
    return;
  }

  // Tampilkan 5 terakhir, terbaru di atas
  const tampil = [...sesiHariIni].reverse().slice(0, 5);
  elList.innerHTML = tampil.map(s => `
    <div class="fokus-history-item">
      <span class="fokus-history-task">${escapeHtml(s.tugas)}</span>
      <div class="fokus-history-meta">
        <span class="fokus-history-menit">${s.menitSelesai} mnt</span>
        <span class="fokus-history-time">${s.waktu || ''}</span>
      </div>
    </div>
  `).join('');

  // Update stats card
  const totalMenit = sesiHariIni.reduce((sum, s) => sum + (s.menitSelesai || 0), 0);
  const elTotal    = containerRef?.querySelector('[data-stat="total-menit"]');
  const elSesiJml  = containerRef?.querySelector('[data-stat="total-sesi"]');
  if (elTotal)   elTotal.textContent   = totalMenit;
  if (elSesiJml) elSesiJml.textContent = sesiHariIni.length;
}

// ─── DROPDOWN JADWAL ──────────────────────────────────────────────────────────
function tampilkanDropdown() {
  // Hapus dropdown lama jika ada
  sembunyikanDropdown();
  if (!jadwalHariIni.length) {
    tampilkanToast('Tidak ada jadwal hari ini', 'info');
    return;
  }

  const taskSection = containerRef.querySelector('.fokus-task-section');
  const dropdown    = document.createElement('div');
  dropdown.className = 'fokus-task-dropdown-list';
  dropdown.id        = 'fokus-dropdown';

  dropdown.innerHTML = jadwalHariIni.map(j => `
    <div class="fokus-task-dropdown-item" data-nama="${escapeHtml(j.judul)}">
      <span>${escapeHtml(j.judul)}</span>
      <span class="task-item-time">${j.waktuMulai}${j.waktuSelesai ? ' – ' + j.waktuSelesai : ''}</span>
    </div>
  `).join('');

  taskSection.appendChild(dropdown);

  // Event listener tiap item
  dropdown.querySelectorAll('.fokus-task-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const nama  = item.dataset.nama;
      const input = containerRef.querySelector('.fokus-task-input');
      if (input) {
        input.value     = nama;
        state.tugasAktif = nama;
        simpanStateSession();
      }
      sembunyikanDropdown();
    });
  });

  // Klik di luar untuk tutup
  setTimeout(() => {
    document.addEventListener('click', tutupDropdownOutside, { once: true });
  }, 0);
}

function tutupDropdownOutside(e) {
  const dropdown = document.getElementById('fokus-dropdown');
  if (dropdown && !dropdown.contains(e.target)) {
    sembunyikanDropdown();
  }
}

function sembunyikanDropdown() {
  const existing = document.getElementById('fokus-dropdown');
  if (existing) existing.remove();
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getRandomTip() {
  const idx = Math.floor(Date.now() / 60000) % TIPS_FOKUS.length;
  return TIPS_FOKUS[idx];
}

function rippleEffect(btn, e) {
  const rect   = btn.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'btn-ripple';
  ripple.style.left = `${e.clientX - rect.left - 15}px`;
  ripple.style.top  = `${e.clientY - rect.top - 15}px`;
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
}

// ─── RENDER HTML ─────────────────────────────────────────────────────────────
function renderHTML() {
  const RADIUS    = 120;
  const DIAMETER  = 2 * Math.PI * RADIUS;
  const tip       = getRandomTip();
  const isMobile  = window.innerWidth <= 430;
  const SVG_SIZE  = isMobile ? 280 : 280;

  return `
<div class="fokus-page">

  <!-- ── HEADER ── -->
  <div class="fokus-header">
    <div class="fokus-header-left">
      <h2 class="fokus-title">⏱ Fokus</h2>
      <span class="fokus-status-badge status-siap">
        <span class="status-dot"></span> Siap Mulai
      </span>
    </div>
    <button class="btn-icon" id="btn-info-fokus" title="Panduan Pomodoro" aria-label="Info">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
      </svg>
    </button>
  </div>

  <!-- ── TASK INPUT ── -->
  <div class="fokus-task-section">
    <span class="fokus-task-label">Tugas yang dikerjakan</span>
    <div class="fokus-task-name-wrap">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
      </svg>
      <input
        type="text"
        class="fokus-task-input"
        id="fokus-task-input"
        placeholder="Ketik nama tugas…"
        maxlength="80"
        autocomplete="off"
      />
      <button class="fokus-task-btn-pick" id="btn-pick-jadwal" aria-label="Pilih dari jadwal">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        Jadwal
      </button>
    </div>
  </div>

  <!-- ── SUBTITLE ── -->
  <p class="fokus-subtitle">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
    Fokus penuh, hindari distraksi.
  </p>

  <!-- ── TIMER AREA ── -->
  <div class="fokus-timer-area">

    <!-- Ring SVG -->
    <div class="fokus-ring-wrap">
      <svg class="fokus-ring-svg" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" aria-hidden="true">
        <defs>
          <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stop-color="#6C3CE1"/>
            <stop offset="100%" stop-color="#9B5FF0"/>
          </linearGradient>
          <linearGradient id="timerGradientBreak" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stop-color="#3B82F6"/>
            <stop offset="100%" stop-color="#60A5FA"/>
          </linearGradient>
        </defs>

        <!-- Track -->
        <circle
          class="fokus-ring-track"
          cx="${SVG_SIZE / 2}" cy="${SVG_SIZE / 2}"
          r="${RADIUS}"
        />

        <!-- Glow -->
        <circle
          class="fokus-ring-glow"
          cx="${SVG_SIZE / 2}" cy="${SVG_SIZE / 2}"
          r="${RADIUS}"
          stroke-dasharray="${DIAMETER}"
          stroke-dashoffset="0"
        />

        <!-- Progress -->
        <circle
          class="fokus-ring-progress"
          cx="${SVG_SIZE / 2}" cy="${SVG_SIZE / 2}"
          r="${RADIUS}"
          stroke-dasharray="${DIAMETER}"
          stroke-dashoffset="0"
        />
      </svg>

      <!-- Inner content -->
      <div class="fokus-ring-inner-bg">
        <span class="fokus-time-label">SESI FOKUS</span>
        <span class="fokus-time-display" role="timer" aria-live="off">${formatDetik(state.detikSisa)}</span>
      </div>
    </div>

    <!-- Session indicators -->
    <div class="fokus-session-info">
      <div class="fokus-session-dots" aria-label="Progres sesi"></div>
      <span class="fokus-session-text">0 dari ${TIMER_PRESET.sesiPerSiklus} Sesi</span>
    </div>

    <!-- Controls -->
    <div class="fokus-controls">
      <!-- Reset -->
      <button class="fokus-btn-sm" id="btn-reset" title="Reset timer" aria-label="Reset">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
        </svg>
      </button>

      <!-- Play / Pause -->
      <button class="fokus-btn-play" id="btn-play" aria-label="Mulai timer">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.14v14.71a1 1 0 001.53.85l11-7.36a1 1 0 000-1.7l-11-7.35A1 1 0 008 5.14z"/>
        </svg>
      </button>

      <!-- Skip -->
      <button class="fokus-btn-sm" id="btn-skip" title="Lewati sesi" aria-label="Lewati">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 4 15 12 5 20 5 4"/>
          <line x1="19" y1="5" x2="19" y2="19"/>
        </svg>
      </button>
    </div>

  </div><!-- /timer-area -->

  <!-- ── ACTION BUTTONS ── -->
  <div class="fokus-action-btns">
    <button class="btn btn-ghost" id="btn-tambah-5" aria-label="Tambah 5 menit">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      +5 Menit
    </button>
    <button class="btn btn-ghost" id="btn-mulai-istirahat" data-aksi="istirahat" aria-label="Mulai istirahat">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/>
        <line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>
      </svg>
      Istirahat
    </button>
  </div>

  <!-- ── STATS CARD ── -->
  <div style="height:var(--space-5)"></div>
  <div class="fokus-stats-card">
    <div class="fokus-stat-item">
      <span class="fokus-stat-value" data-stat="total-sesi">0</span>
      <span class="fokus-stat-label">Sesi Hari Ini</span>
    </div>
    <div class="fokus-stat-divider"></div>
    <div class="fokus-stat-item">
      <span class="fokus-stat-value" data-stat="total-menit">0</span>
      <span class="fokus-stat-label">Menit Fokus</span>
    </div>
    <div class="fokus-stat-divider"></div>
    <div class="fokus-stat-item">
      <span class="fokus-stat-value">${TIMER_PRESET.sesiPerSiklus}</span>
      <span class="fokus-stat-label">Target Sesi</span>
    </div>
  </div>

  <!-- ── TIP ── -->
  <div class="fokus-tip-card">
    <div class="fokus-tip-icon">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/>
      </svg>
    </div>
    <p class="fokus-tip-text">${escapeHtml(tip.text)}</p>
  </div>

  <!-- ── HISTORY ── -->
  <div class="fokus-history">
    <h4 class="fokus-history-title">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
      </svg>
      Riwayat Hari Ini
    </h4>
    <div class="fokus-history-list">
      <p class="fokus-empty-history">Belum ada sesi fokus hari ini.</p>
    </div>
  </div>

</div><!-- /fokus-page -->
  `;
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────
function pasangEventListeners() {
  // Play/Pause
  const btnPlay = containerRef.querySelector('#btn-play');
  btnPlay?.addEventListener('click', (e) => {
    rippleEffect(btnPlay, e);
    togglePlayPause();
  });

  // Reset
  containerRef.querySelector('#btn-reset')?.addEventListener('click', () => {
    if (state.berjalan) {
      jedaTimer();
    }
    resetTimer();
    tampilkanToast('Timer direset', 'info');
  });

  // Skip
  containerRef.querySelector('#btn-skip')?.addEventListener('click', () => {
    skipSesi();
    tampilkanToast('Sesi dilewati', 'info');
  });

  // +5 Menit
  containerRef.querySelector('#btn-tambah-5')?.addEventListener('click', tambah5Menit);

  // Mulai istirahat manual
  containerRef.querySelector('#btn-mulai-istirahat')?.addEventListener('click', mulaiIstirahatManual);

  // Pilih jadwal dropdown
  containerRef.querySelector('#btn-pick-jadwal')?.addEventListener('click', (e) => {
    e.stopPropagation();
    tampilkanDropdown();
  });

  // Input tugas: live update state
  const inputTugas = containerRef.querySelector('#fokus-task-input');
  inputTugas?.addEventListener('input', () => {
    state.tugasAktif = inputTugas.value;
    simpanStateSession();
  });

  // Info button
  containerRef.querySelector('#btn-info-fokus')?.addEventListener('click', () => {
    tampilkanToast('🍅 Teknik Pomodoro: 25 menit fokus → 5 mnt istirahat × 4 → istirahat panjang 15 mnt', 'info', 5000);
  });
}

// ─── MOUNT ────────────────────────────────────────────────────────────────────
export async function mount(container) {
  containerRef = container;

  // Muat atau buat state baru
  const savedState = muatStateSession();
  state = savedState || buatStateAwal();

  // Muat jadwal hari ini untuk dropdown
  try {
    const { getJadwalByTanggal } = await import('../store.js');
    jadwalHariIni = await getJadwalByTanggal(formatTanggalPendek());
  } catch (_) {
    jadwalHariIni = [];
  }

  // Render HTML
  container.innerHTML = renderHTML();

  // Isi nilai input tugas dari state yang tersimpan
  const inputEl = container.querySelector('#fokus-task-input');
  if (inputEl && state.tugasAktif) {
    inputEl.value = state.tugasAktif;
  }

  // Pasang event listeners
  pasangEventListeners();

  // Update UI awal (sebelum timer jalan)
  updateUI();

  // Render history
  await renderHistory();

  // Jika sebelumnya sedang berjalan (tab switch), langsung lanjutkan
  if (state.berjalan) {
    mulaiTimer();
  }
}

// ─── UNMOUNT ──────────────────────────────────────────────────────────────────
export function unmount() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  // Simpan state terakhir ke sessionStorage
  if (state) {
    state.berjalan   = false;
    state.waktuMulai = Date.now();
    simpanStateSession();
    // Re-set berjalan agar rekonsiliasi bisa hitung selisih waktu
    state.berjalan = true;
    simpanStateSession();
  }
  document.removeEventListener('click', tutupDropdownOutside);
  containerRef = null;
}
