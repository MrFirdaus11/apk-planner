/**
 * Halaman Jadwal Harian
 * APK Planner
 */

import {
  getJadwalByTanggal,
  simpanJadwal,
  hapusJadwal,
  toggleJadwalSelesai,
} from '../store.js';

import {
  formatTanggalPanjang,
  formatTanggalPendek,
  getMingguIni,
  isSameDay,
  isToday,
  hitungDurasi,
} from '../utils/date-utils.js';

import { HARI_SINGKAT } from '../utils/constants.js';
import { KATEGORI, TIPS_FOKUS } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { bukaModal, tutupModal } from '../components/modal.js';
import { tampilkanToast } from '../components/toast.js';
import { jadwalkanNotifikasiJadwal, batalkanNotifikasiJadwal } from '../notifications.js';

import '../styles/jadwal.css';
import '../styles/components.css';

// ─── STATE ───────────────────────────────────────────────────────────────────
let tanggalAktif = new Date();
let jadwalList = [];
let tipsInterval = null;
let tipsIndex = 0;
let _container = null;

// ─── SWIPE STATE ─────────────────────────────────────────────────────────────
let _swipeState = null;
let _isSwipeActive = false;

function _docMouseMove(e) {
  if (!_swipeState) return;
  _swipeState.currentX = e.clientX - _swipeState.startX;
  if (_swipeState.currentX < 0) {
    _swipeState.cardEl.style.transform = `translateX(${Math.max(_swipeState.currentX, -120)}px)`;
  }
}

function _docMouseUp() {
  if (!_swipeState || !_isSwipeActive) {
    _swipeState = null;
    return;
  }
  _isSwipeActive = false;
  _swipeState.cardEl.style.transition = '';
  if (_swipeState.currentX < -80) {
    _swipeState.cardEl.style.transform = 'translateX(0)';
    handleHapusJadwal(_swipeState.id);
  } else {
    _swipeState.cardEl.style.transform = 'translateX(0)';
  }
  _swipeState = null;
}

function initSwipe() {
  document.addEventListener('mousemove', _docMouseMove);
  document.addEventListener('mouseup', _docMouseUp);
}

function cleanupSwipe() {
  document.removeEventListener('mousemove', _docMouseMove);
  document.removeEventListener('mouseup', _docMouseUp);
  _swipeState = null;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getWaktuMenitSekarang() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function parseWaktuMenit(waktuStr) {
  if (!waktuStr) return 0;
  const [h, m] = waktuStr.split(':').map(Number);
  return h * 60 + m;
}

function isJadwalAktif(j) {
  if (j.selesai) return false;
  if (!isToday(tanggalAktif)) return false;
  const nowMenit = getWaktuMenitSekarang();
  const mulai = parseWaktuMenit(j.waktuMulai);
  const selesai = parseWaktuMenit(j.waktuSelesai);
  return nowMenit >= mulai && nowMenit < selesai;
}

function isJadwalLewat(j) {
  if (!isToday(tanggalAktif)) return false;
  const nowMenit = getWaktuMenitSekarang();
  const selesai = parseWaktuMenit(j.waktuSelesai);
  return nowMenit >= selesai;
}

function getKategoriMeta(kat) {
  return KATEGORI[kat?.toLowerCase()] || KATEGORI.lainnya;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function hitungKemajuan() {
  if (!jadwalList.length) return 0;
  const selesai = jadwalList.filter((j) => j.selesai).length;
  return Math.round((selesai / jadwalList.length) * 100);
}

// ─── RENDER HEADER ───────────────────────────────────────────────────────────
function renderHeader() {
  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const now = new Date();
  const namaHari = hari[now.getDay()];
  const tgl = now.getDate();
  const namaBulan = bulan[now.getMonth()];
  const tahun = now.getFullYear();

  return `
    <div class="jadwal-header">
      <div class="jadwal-header-left">
        <span class="jadwal-tanggal-label">Hari ini</span>
        <span class="jadwal-tanggal-value">${namaHari}, ${tgl} ${namaBulan} ${tahun}</span>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-icon" id="btn-search-jadwal" title="Cari jadwal" aria-label="Cari jadwal">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ─── RENDER SECTION TITLE ────────────────────────────────────────────────────
function renderSectionTitle() {
  return `
    <div class="jadwal-section-title">
      <h2>Jadwal Hari Ini</h2>
    </div>
  `;
}

// ─── RENDER DATE PICKER ───────────────────────────────────────────────────────
function renderDatePicker() {
  const minggu = getMingguIni(new Date());
  const hariNama = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const items = minggu
    .map((tgl, i) => {
      const isAktif = isSameDay(tgl, tanggalAktif);
      const isHariIni = isToday(tgl);
      const hari = HARI_SINGKAT[tgl.getDay()];
      const tanggalNum = tgl.getDate();
      const tglStr = formatTanggalPendek(tgl);

      return `
        <div
          class="date-day-item${isAktif ? ' active' : ''}${isHariIni ? ' today' : ''}"
          data-tgl="${tglStr}"
          role="button"
          tabindex="0"
          aria-label="${hari} ${tanggalNum}${isHariIni ? ', Hari ini' : ''}${isAktif ? ', Dipilih' : ''}"
        >
          <span class="date-day-name">${hari}</span>
          <span class="date-day-number">${tanggalNum}</span>
          <span class="date-day-dot"></span>
        </div>
      `;
    })
    .join('');

  return `
    <div class="date-picker-wrapper">
      <div class="date-picker-scroll" id="date-picker-scroll">
        ${items}
      </div>
    </div>
  `;
}

// ─── RENDER KEMAJUAN CARD ────────────────────────────────────────────────────
function renderKemajuanCard() {
  const persen = hitungKemajuan();
  const selesai = jadwalList.filter((j) => j.selesai).length;
  const total = jadwalList.length;
  const fillClass = persen === 100 ? 'progress-fill progress-fill-success' : 'progress-fill';

  let statusLabel = '';
  if (total === 0) statusLabel = 'Belum ada jadwal';
  else if (persen === 100) statusLabel = '🎉 Semua selesai!';
  else if (persen >= 75) statusLabel = 'Hampir selesai!';
  else if (persen >= 50) statusLabel = 'Separuh jalan!';
  else if (persen > 0) statusLabel = 'Ayo terus!';
  else statusLabel = 'Mulai sekarang!';

  return `
    <div class="card kemajuan-card">
      <div class="kemajuan-header">
        <div class="kemajuan-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          Kemajuan Hari Ini
        </div>
        <span class="kemajuan-persen">${persen}%</span>
      </div>
      <div class="progress-track">
        <div class="${fillClass}" id="kemajuan-bar" style="width: 0%"></div>
      </div>
      <div class="kemajuan-info">
        <span class="kemajuan-count">${selesai} dari ${total} selesai</span>
        <span class="kemajuan-status">${statusLabel}</span>
      </div>
    </div>
  `;
}

// ─── RENDER TIMELINE ITEM ────────────────────────────────────────────────────
function renderTimelineItem(j) {
  const aktif = isJadwalAktif(j);
  const selesai = j.selesai;
  const lewat = isJadwalLewat(j) && !selesai;
  const katMeta = getKategoriMeta(j.kategori);

  let statusClass = '';
  if (selesai) statusClass = 'selesai';
  else if (aktif) statusClass = 'aktif';

  const durasi = j.waktuMulai && j.waktuSelesai ? hitungDurasi(j.waktuMulai, j.waktuSelesai) : '';

  const aktifPill = aktif
    ? `<span class="aktif-pill"><span class="aktif-indicator"></span>Sekarang</span>`
    : '';

  const lokasiHtml = j.lokasi
    ? `
        <div class="jadwal-card-lokasi">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          ${escapeHtml(j.lokasi)}
        </div>
      `
    : '';

  const rangeHtml =
    j.waktuMulai || j.waktuSelesai
      ? `
        <div class="jadwal-card-range">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          ${j.waktuMulai || ''}${j.waktuSelesai ? ' – ' + j.waktuSelesai : ''}
          ${durasi ? `<span style="color:var(--text-tertiary)">• ${durasi}</span>` : ''}
        </div>
      `
      : '';

  const checkIcon = selesai
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
        fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>`
    : '';

  return `
    <div class="timeline-item ${statusClass}" data-id="${j.id}">
      <div class="timeline-time">
        <span class="timeline-time-text">${j.waktuMulai || '—'}</span>
      </div>
      <div class="timeline-connector">
        <div class="timeline-dot"></div>
      </div>
      <div class="jadwal-card-wrapper">
        <div class="jadwal-card-swipe-bg" aria-hidden="true">
          <span>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4h6v2"/>
            </svg>
            Hapus
          </span>
        </div>
        <div class="jadwal-card" data-id="${j.id}">
          <div class="jadwal-card-content">
            <div class="jadwal-card-top">
              <span class="badge badge-${j.kategori || 'lainnya'}">${katMeta.label}</span>
              ${aktifPill}
            </div>
            <div class="jadwal-card-judul">${escapeHtml(j.judul)}</div>
            <div class="jadwal-card-meta">
              ${lokasiHtml}
              ${rangeHtml}
            </div>
          </div>
          <div class="jadwal-card-right">
            <div
              class="checkbox-custom${selesai ? ' checked' : ''}"
              data-id="${j.id}"
              role="checkbox"
              aria-checked="${selesai ? 'true' : 'false'}"
              tabindex="0"
              title="${selesai ? 'Tandai belum selesai' : 'Tandai selesai'}"
            >
              <span class="check-icon">${checkIcon}</span>
            </div>
            <button
              class="jadwal-hapus-btn"
              data-id="${j.id}"
              aria-label="Hapus jadwal ${j.judul}"
              title="Hapus"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14H6L5 6"/>
                <path d="M10 11v6M14 11v6"/>
                <path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── RENDER TIMELINE ─────────────────────────────────────────────────────────
function renderTimeline() {
  if (!jadwalList.length) {
    return `
      <div class="timeline-section">
        <div class="jadwal-empty animate-fade">
          <div class="jadwal-empty-icon">📅</div>
          <h3>Belum ada jadwal</h3>
          <p>Tekan tombol <strong>+</strong> untuk menambahkan jadwal baru</p>
          <button class="btn btn-primary" id="btn-empty-add">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Tambah Jadwal
          </button>
        </div>
      </div>
    `;
  }

  const isHariIni = isToday(tanggalAktif);
  const tglLabel = !isHariIni
    ? `<div class="tanggal-badge">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        ${formatTanggalPanjang(tanggalAktif)}
      </div>`
    : '';

  const items = jadwalList.map((j) => renderTimelineItem(j)).join('');

  return `
    ${tglLabel}
    <div class="timeline-section">
      <div class="timeline-section-header">
        <h3>Timeline</h3>
        <span class="text-sm text-secondary">${jadwalList.length} jadwal</span>
      </div>
      <div class="timeline-container" id="timeline-container">
        ${items}
      </div>
    </div>
  `;
}

// ─── RENDER TIPS CARD ─────────────────────────────────────────────────────────
function renderTipsCard() {
  const tips = TIPS_FOKUS[tipsIndex];
  return `
    <div class="card tips-card" id="tips-card">
      <div class="tips-icon-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="9" y1="18" x2="15" y2="18"/>
          <line x1="10" y1="22" x2="14" y2="22"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
      </div>
      <div class="tips-content">
        <div class="tips-label">Tips Fokus</div>
        <div class="tips-text" id="tips-text">${tips.text}</div>
      </div>
    </div>
  `;
}

// ─── RENDER HALAMAN ───────────────────────────────────────────────────────────
function renderHalaman() {
  if (!_container) return;

  _container.innerHTML = `
    <div class="jadwal-page">
      ${renderHeader()}
      ${renderSectionTitle()}
      ${renderDatePicker()}
      ${renderKemajuanCard()}
      ${renderTimeline()}
      ${renderTipsCard()}
      <div style="height: var(--space-8)"></div>
    </div>
  `;

  // Re-insert pull-to-refresh indicator (hilang setelah innerHTML)
  insertPtrIndicator();

  // Animasi progress bar
  requestAnimationFrame(() => {
    const bar = document.getElementById('kemajuan-bar');
    if (bar) {
      bar.style.width = `${hitungKemajuan()}%`;
    }

    // Scroll ke hari aktif
    const scroll = document.getElementById('date-picker-scroll');
    const activeItem = scroll?.querySelector('.date-day-item.active');
    if (activeItem && scroll) {
      const containerLeft = scroll.getBoundingClientRect().left;
      const itemLeft = activeItem.getBoundingClientRect().left;
      const offset = itemLeft - containerLeft - (scroll.offsetWidth / 2) + (activeItem.offsetWidth / 2);
      scroll.scrollBy({ left: offset, behavior: 'smooth' });
    }
  });

  // Setup event listeners
  setupEventListeners();
}

// ─── RELOAD JADWAL ────────────────────────────────────────────────────────────
async function loadJadwal(tgl = tanggalAktif) {
  tanggalAktif = tgl instanceof Date ? tgl : new Date(tgl);
  jadwalList = await getJadwalByTanggal(formatTanggalPendek(tanggalAktif));
  renderHalaman();
}

// ─── PARTIAL UPDATE TIMELINE ──────────────────────────────────────────────────
async function refreshTimeline() {
  jadwalList = await getJadwalByTanggal(formatTanggalPendek(tanggalAktif));

  // Update kemajuan
  const persen = hitungKemajuan();
  const bar = document.getElementById('kemajuan-bar');
  if (bar) {
    bar.style.width = `${persen}%`;
  }

  // Update timeline container
  const timelineSection = _container?.querySelector('.timeline-section');
  if (timelineSection) {
    const tglLabel = _container?.querySelector('.tanggal-badge');
    if (tglLabel) tglLabel.remove();

    const newTimeline = document.createElement('div');
    newTimeline.innerHTML = renderTimeline();
    const newSection = newTimeline.querySelector('.timeline-section');
    if (newSection) {
      timelineSection.replaceWith(newSection);
    }

    // Reattach events for new items
    setupTimelineListeners();
  }
}

// ─── MODAL TAMBAH JADWAL ──────────────────────────────────────────────────────
function bukaModalTambahJadwal(tglDefault = null) {
  const tglValue = tglDefault || formatTanggalPendek(tanggalAktif);

  const formEl = document.createElement('div');
  formEl.className = 'modal-form';
  formEl.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="inp-judul">Judul <span style="color:var(--danger)">*</span></label>
      <input
        id="inp-judul"
        class="form-input"
        type="text"
        placeholder="Contoh: Meeting tim pagi"
        maxlength="80"
        autocomplete="off"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="inp-kategori">Kategori</label>
      <select id="inp-kategori" class="form-input form-select">
        <option value="kesehatan">💚 Kesehatan</option>
        <option value="kerja" selected>💼 Kerja</option>
        <option value="pribadi">🩷 Pribadi</option>
        <option value="belajar">📚 Belajar</option>
        <option value="lainnya">🔘 Lainnya</option>
      </select>
    </div>

    <div class="form-row">
      <div class="form-group">
        <label class="form-label" for="inp-mulai">Waktu Mulai</label>
        <input id="inp-mulai" class="form-input" type="time" />
      </div>
      <div class="form-group">
        <label class="form-label" for="inp-selesai">Waktu Selesai</label>
        <input id="inp-selesai" class="form-input" type="time" />
      </div>
    </div>

    <div class="form-group">
      <label class="form-label" for="inp-lokasi">Lokasi <span class="text-secondary font-medium">(opsional)</span></label>
      <input
        id="inp-lokasi"
        class="form-input"
        type="text"
        placeholder="Contoh: Kantor, Kafe, Rumah…"
        maxlength="60"
        autocomplete="off"
      />
    </div>

    <div class="form-group">
      <label class="form-label" for="inp-tanggal">Tanggal</label>
      <input id="inp-tanggal" class="form-input" type="date" value="${tglValue}" />
    </div>
  `;

  // Set default waktu mulai ke jam saat ini (dibulatkan ke 15 menit)
  const now = new Date();
  const menitBulat = Math.ceil(now.getMinutes() / 15) * 15;
  const jamMulai = menitBulat >= 60 ? now.getHours() + 1 : now.getHours();
  const menitMulai = menitBulat >= 60 ? 0 : menitBulat;
  const defaultMulai = `${String(jamMulai % 24).padStart(2, '0')}:${String(menitMulai).padStart(2, '0')}`;
  const defaultSelesai = `${String((jamMulai + 1) % 24).padStart(2, '0')}:${String(menitMulai).padStart(2, '0')}`;

  setTimeout(() => {
    const mulaiEl = document.getElementById('inp-mulai');
    const selesaiEl = document.getElementById('inp-selesai');
    if (mulaiEl && !mulaiEl.value) mulaiEl.value = defaultMulai;
    if (selesaiEl && !selesaiEl.value) selesaiEl.value = defaultSelesai;
  }, 50);

  bukaModal({
    judul: '📅 Tambah Jadwal',
    konten: formEl,
    ukuran: 'besar',
    aksi: [
      {
        label: 'Batal',
        id: 'batal',
        kelas: 'btn-ghost',
        onClick: () => tutupModal(),
      },
      {
        label: 'Simpan',
        id: 'simpan',
        kelas: 'btn-primary',
        onClick: () => simpanJadwalBaru(),
      },
    ],
  });

  // Focus judul
  setTimeout(() => {
    document.getElementById('inp-judul')?.focus();
  }, 300);
}

// ─── SIMPAN JADWAL BARU ───────────────────────────────────────────────────────
async function simpanJadwalBaru() {
  const judul = document.getElementById('inp-judul')?.value.trim();
  const kategori = document.getElementById('inp-kategori')?.value;
  const waktuMulai = document.getElementById('inp-mulai')?.value;
  const waktuSelesai = document.getElementById('inp-selesai')?.value;
  const lokasi = document.getElementById('inp-lokasi')?.value.trim();
  const tanggalVal = document.getElementById('inp-tanggal')?.value;

  if (!judul) {
    const inp = document.getElementById('inp-judul');
    if (inp) {
      inp.style.borderColor = 'var(--danger)';
      inp.style.boxShadow = '0 0 0 3px var(--danger-bg)';
      inp.focus();
    }
    tampilkanToast('Judul jadwal wajib diisi!', 'error');
    return;
  }

  const jadwalBaru = {
    id: generateId(),
    judul,
    kategori: kategori || 'lainnya',
    waktuMulai: waktuMulai || '',
    waktuSelesai: waktuSelesai || '',
    lokasi: lokasi || '',
    tanggal: tanggalVal || formatTanggalPendek(),
    selesai: false,
    dibuatPada: Date.now(),
  };

  try {
    await simpanJadwal(jadwalBaru);
    jadwalkanNotifikasiJadwal(jadwalBaru);
    tutupModal();
    tampilkanToast('Jadwal berhasil ditambahkan! 🎉', 'success');

    // Refresh
    if (isSameDay(new Date(jadwalBaru.tanggal), tanggalAktif)) {
      await refreshTimeline();
      await updateDatePickerDots();
    } else {
      await loadJadwal(new Date(jadwalBaru.tanggal + 'T00:00:00'));
    }
  } catch (err) {
    console.error(err);
    tampilkanToast('Gagal menyimpan jadwal', 'error');
  }
}

// ─── TOGGLE SELESAI ───────────────────────────────────────────────────────────
async function handleToggleSelesai(id) {
  const jadwal = await toggleJadwalSelesai(id);
  if (!jadwal) return;

  if (jadwal.selesai) {
    batalkanNotifikasiJadwal(id);
    tampilkanToast('Jadwal selesai! ✅', 'success');
  } else {
    jadwalkanNotifikasiJadwal(jadwal);
    tampilkanToast('Jadwal dibuka kembali', 'info');
  }

  await refreshTimeline();
}

// ─── HAPUS JADWAL ─────────────────────────────────────────────────────────────
async function handleHapusJadwal(id) {
  const jadwal = jadwalList.find((j) => j.id === id);
  if (!jadwal) return;

  bukaModal({
    judul: '🗑️ Hapus Jadwal',
    konten: `<p class="text-secondary" style="text-align:center;line-height:1.6">
      Hapus <strong>"${jadwal.judul}"</strong>?<br>
      <span style="font-size:var(--text-sm)">Tindakan ini tidak dapat dibatalkan.</span>
    </p>`,
    aksi: [
      {
        label: 'Batal',
        id: 'batal',
        kelas: 'btn-ghost',
        onClick: () => tutupModal(),
      },
      {
        label: 'Hapus',
        id: 'hapus',
        kelas: 'btn-primary',
        onClick: async () => {
          await hapusJadwal(id);
          batalkanNotifikasiJadwal(id);
          tutupModal();
          tampilkanToast('Jadwal dihapus', 'info');
          await refreshTimeline();
          await updateDatePickerDots();
        },
      },
    ],
  });
}

// ─── UPDATE DATE PICKER DOTS ──────────────────────────────────────────────────
async function updateDatePickerDots() {
  const scroll = document.getElementById('date-picker-scroll');
  if (!scroll) return;

  const items = scroll.querySelectorAll('.date-day-item');
  for (const item of items) {
    const tglStr = item.dataset.tgl;
    if (!tglStr) continue;
    const list = await getJadwalByTanggal(tglStr);
    if (list.length > 0) {
      item.classList.add('has-jadwal');
    } else {
      item.classList.remove('has-jadwal');
    }
  }
}

// ─── SWIPE TO DELETE ──────────────────────────────────────────────────────────
function setupSwipe(cardEl, id) {
  function onPointerDown(e) {
    if (e.target.closest('.checkbox-custom') || e.target.closest('.jadwal-hapus-btn')) return;
    _isSwipeActive = true;
    _swipeState = {
      startX: e.type === 'touchstart' ? e.touches[0].clientX : e.clientX,
      currentX: 0,
      cardEl,
      id,
    };
    cardEl.style.transition = 'none';
  }

  cardEl.addEventListener('touchstart', onPointerDown, { passive: true });
  cardEl.addEventListener('touchmove', (e) => {
    if (!_swipeState || _swipeState.cardEl !== cardEl) return;
    _swipeState.currentX = e.touches[0].clientX - _swipeState.startX;
    if (_swipeState.currentX < 0) {
      cardEl.style.transform = `translateX(${Math.max(_swipeState.currentX, -120)}px)`;
    }
  }, { passive: true });
  cardEl.addEventListener('touchend', () => {
    if (!_swipeState || _swipeState.cardEl !== cardEl) return;
    _isSwipeActive = false;
    cardEl.style.transition = '';
    if (_swipeState.currentX < -80) {
      cardEl.style.transform = 'translateX(0)';
      handleHapusJadwal(id);
    } else {
      cardEl.style.transform = 'translateX(0)';
    }
    _swipeState = null;
  });
  cardEl.addEventListener('mousedown', onPointerDown);
}

// ─── SETUP EVENT LISTENERS ────────────────────────────────────────────────────
function setupTimelineListeners() {
  // Checkbox toggle
  document.querySelectorAll('.checkbox-custom[data-id]').forEach((el) => {
    el.onclick = () => handleToggleSelesai(el.dataset.id);
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') handleToggleSelesai(el.dataset.id); };
  });

  // Hapus button
  document.querySelectorAll('.jadwal-hapus-btn[data-id]').forEach((el) => {
    el.onclick = (e) => {
      e.stopPropagation();
      handleHapusJadwal(el.dataset.id);
    };
  });

  // Swipe to delete
  document.querySelectorAll('.jadwal-card[data-id]').forEach((el) => {
    setupSwipe(el, el.dataset.id);
  });
}

function setupEventListeners() {
  // Date picker
  const scroll = document.getElementById('date-picker-scroll');
  if (scroll) {
    scroll.querySelectorAll('.date-day-item').forEach((el) => {
      el.addEventListener('click', async () => {
        const tglStr = el.dataset.tgl;
        if (!tglStr) return;
        await loadJadwal(new Date(tglStr + 'T00:00:00'));
      });
      el.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          const tglStr = el.dataset.tgl;
          if (!tglStr) return;
          await loadJadwal(new Date(tglStr + 'T00:00:00'));
        }
      });
    });

    // Load dots
    updateDatePickerDots();
  }

  // FAB
  const fab = document.getElementById('fab-jadwal');
  if (fab) {
    fab.onclick = () => bukaModalTambahJadwal();
  }

  // Empty state add button
  const emptyAdd = document.getElementById('btn-empty-add');
  if (emptyAdd) {
    emptyAdd.onclick = () => bukaModalTambahJadwal();
  }

  // Timeline events
  setupTimelineListeners();
}

// ─── TIPS ROTASI ──────────────────────────────────────────────────────────────
function startTipsRotation() {
  stopTipsRotation();
  tipsInterval = setInterval(() => {
    const textEl = document.getElementById('tips-text');
    if (!textEl) return;

    textEl.classList.add('fade-out');
    setTimeout(() => {
      tipsIndex = (tipsIndex + 1) % TIPS_FOKUS.length;
      textEl.textContent = TIPS_FOKUS[tipsIndex].text;
      textEl.classList.remove('fade-out');
      textEl.classList.add('fade-in');
      setTimeout(() => textEl.classList.remove('fade-in'), 400);
    }, 400);
  }, 10000);
}

function stopTipsRotation() {
  if (tipsInterval) {
    clearInterval(tipsInterval);
    tipsInterval = null;
  }
}

// ─── FAB BUTTON ──────────────────────────────────────────────────────────────
function renderFAB() {
  let fab = document.getElementById('fab-jadwal');
  if (!fab) {
    fab = document.createElement('button');
    fab.id = 'fab-jadwal';
    fab.className = 'fab';
    fab.setAttribute('aria-label', 'Tambah jadwal baru');
    fab.title = 'Tambah jadwal';
    fab.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    `;
    document.querySelector('.app-container')?.appendChild(fab);
  }
  fab.onclick = () => bukaModalTambahJadwal();
}

function removeFAB() {
  const fab = document.getElementById('fab-jadwal');
  if (fab) fab.remove();
}

// ─── PULL-TO-REFRESH ─────────────────────────────────────────────────────────
let _ptrState = null;

function ptrIndicatorHTML() {
  return `
    <div id="ptr-indicator" class="ptr-indicator" style="display:none">
      <div class="ptr-spinner">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
          <polyline points="23 4 23 10 17 10"/>
          <polyline points="1 20 1 14 7 14"/>
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </div>
      <span class="ptr-text" id="ptr-text">Tarik untuk memuat ulang</span>
    </div>
  `;
}

function insertPtrIndicator() {
  const existing = document.getElementById('ptr-indicator');
  if (existing) existing.remove();
  const tmp = document.createElement('div');
  tmp.innerHTML = ptrIndicatorHTML();
  const el = tmp.firstElementChild;
  _container?.insertBefore(el, _container.firstChild);
}

function initPullToRefresh(pageEl) {
  if (!pageEl || _ptrState) return;

  insertPtrIndicator();

  let touchStartY = 0;
  let pullY = 0;
  let isPulling = false;
  const THRESHOLD = 80;

  function onTouchStart(e) {
    if (pageEl.scrollTop > 0) return;
    touchStartY = e.touches[0].clientY;
    pullY = 0;
    isPulling = false;
  }

  function onTouchMove(e) {
    if (pageEl.scrollTop > 0) return;
    pullY = e.touches[0].clientY - touchStartY;
    const ptrEl = document.getElementById('ptr-indicator');
    const ptrText = document.getElementById('ptr-text');
    if (!ptrEl) return;
    if (pullY <= 0) {
      ptrEl.style.display = 'none';
      return;
    }
    isPulling = true;
    ptrEl.style.display = 'flex';
    const progress = Math.min(pullY / THRESHOLD, 1);
    ptrEl.style.opacity = progress;
    ptrEl.style.transform = `translateY(${Math.min(pullY * 0.5, 50)}px)`;
    ptrText.textContent = progress >= 1 ? 'Lepaskan untuk memuat ulang' : 'Tarik untuk memuat ulang';
  }

  async function onTouchEnd() {
    if (!isPulling) return;
    const ptrEl = document.getElementById('ptr-indicator');
    const ptrText = document.getElementById('ptr-text');
    if (!ptrEl) { isPulling = false; pullY = 0; return; }
    if (pullY >= THRESHOLD) {
      ptrText.textContent = 'Memuat ulang...';
      ptrEl.style.transform = 'translateY(0)';
      await loadJadwal(tanggalAktif);
      // Indicator sudah di-reinsert oleh renderHalaman via insertPtrIndicator
      // Tunggu dulu agar user sempat melihat feedback "Memuat ulang"
      await new Promise(r => setTimeout(r, 400));
      const newPtr = document.getElementById('ptr-indicator');
      if (newPtr) {
        newPtr.style.display = 'none';
        newPtr.style.opacity = '0';
        newPtr.style.transform = 'translateY(-20px)';
      }
    } else {
      ptrEl.style.display = 'none';
      ptrEl.style.opacity = '0';
      ptrEl.style.transform = 'translateY(-20px)';
    }
    isPulling = false;
    pullY = 0;
  }

  pageEl.addEventListener('touchstart', onTouchStart, { passive: true });
  pageEl.addEventListener('touchmove', onTouchMove, { passive: true });
  pageEl.addEventListener('touchend', onTouchEnd, { passive: true });

  _ptrState = { pageEl, onTouchStart, onTouchMove, onTouchEnd };
}

function cleanupPullToRefresh() {
  if (_ptrState) {
    const { pageEl, onTouchStart, onTouchMove, onTouchEnd } = _ptrState;
    pageEl?.removeEventListener('touchstart', onTouchStart);
    pageEl?.removeEventListener('touchmove', onTouchMove);
    pageEl?.removeEventListener('touchend', onTouchEnd);
    const el = document.getElementById('ptr-indicator');
    if (el) el.remove();
    _ptrState = null;
  }
}

// ─── EXPORT: MOUNT ────────────────────────────────────────────────────────────
export async function mount(container) {
  _container = container;
  tanggalAktif = new Date();
  tipsIndex = 0;

  // Init swipe document listeners (sekali per mount)
  initSwipe();

  // Load data
  jadwalList = await getJadwalByTanggal(formatTanggalPendek(tanggalAktif));

  // Render
  renderHalaman();

  // FAB
  renderFAB();

  // Tips rotation
  startTipsRotation();

  // Pull-to-refresh (on the wrapper inside page-container)
  initPullToRefresh(container);
}

// ─── EXPORT: UNMOUNT ─────────────────────────────────────────────────────────
export function unmount() {
  stopTipsRotation();
  removeFAB();
  cleanupSwipe();
  cleanupPullToRefresh();
  _container = null;
}
