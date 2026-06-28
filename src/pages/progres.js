import {
  getStatistikMingguan,
  getStreakManifestasi,
  hitungSkorProgres,
  generateInsight,
  getSemuaSesiFokus,
} from '../store.js';
import { formatDurasiMenit, getMingguIni, isSameDay } from '../utils/date-utils.js';
import { HARI_SINGKAT } from '../utils/constants.js';
import '../styles/progres.css';
import '../styles/components.css';

// ─── STATE ────────────────────────────────────────────────────────────────────
let _container = null;
let _periode = 'mingguan'; // 'mingguan' | 'bulanan'
let _statsData = [];
let _statsMingguan = []; // selalu 7 hari (untuk bar chart)
let _streakData = { count: 0, terakhir: null };
let _semuaSesi = [];

// ─── HELPER ───────────────────────────────────────────────────────────────────

/**
 * Hitung skor harian dari satu stat object (0-100)
 */
function hitungSkorHarian(stat) {
  let skor = 0;
  if (stat.totalJadwal > 0) skor += stat.persenJadwal * 0.5;
  if (stat.totalMenitFokus > 0) skor += Math.min(stat.totalMenitFokus / 120, 1) * 30;
  if (stat.adaJurnal) skor += 20;
  return Math.min(Math.round(skor), 100);
}

/**
 * Ambil statistik bulanan (30 hari ke belakang)
 */
async function getStatistikBulanan() {
  const { getStatistikHarian } = await import('../store.js');
  const hasil = [];
  for (let i = 29; i >= 0; i--) {
    const tgl = new Date();
    tgl.setDate(tgl.getDate() - i);
    const stat = await getStatistikHarian(tgl);
    hasil.push(stat);
  }
  return hasil;
}

/**
 * Hitung total menit fokus periode sebelumnya untuk perbandingan
 */
function hitungFokusSebelumnya(semuaSesi, jumlahHari) {
  const sekarang = new Date();
  const awalPeriodeLalu = new Date(sekarang);
  awalPeriodeLalu.setDate(sekarang.getDate() - jumlahHari * 2);
  const akhirPeriodeLalu = new Date(sekarang);
  akhirPeriodeLalu.setDate(sekarang.getDate() - jumlahHari);

  return semuaSesi
    .filter(s => {
      const tglSesi = new Date(s.tanggal);
      return tglSesi >= awalPeriodeLalu && tglSesi < akhirPeriodeLalu;
    })
    .reduce((sum, s) => sum + (s.menitSelesai || 0), 0);
}

/**
 * Hitung total menit fokus periode ini
 */
function hitungFokusPeriodeIni(statsData) {
  return statsData.reduce((sum, s) => sum + (s.totalMenitFokus || 0), 0);
}

/**
 * Rata-rata persen jadwal periode ini
 */
function hitungRataJadwal(statsData) {
  const denganJadwal = statsData.filter(s => s.totalJadwal > 0);
  if (denganJadwal.length === 0) return 0;
  const total = denganJadwal.reduce((sum, s) => sum + s.persenJadwal, 0);
  return Math.round(total / denganJadwal.length);
}

/**
 * Motivasi streak: berapa hari lagi ke lencana berikutnya (setiap 7 hari)
 */
function motivasiStreak(count) {
  if (count === 0) return 'Mulai streak manifestasimu hari ini! ✨';
  const sisaKeLencana = 7 - (count % 7);
  if (sisaKeLencana === 7) return `🏅 Lencana ke-${Math.floor(count / 7)} baru saja didapat!`;
  return `${sisaKeLencana} hari lagi untuk lencana baru! 🏅`;
}

/**
 * Format teks insight: bold angka (pola angka di dalam teks)
 */
function formatInsightTeks(teks) {
  return teks.replace(
    /(\d+(?:[.,]\d+)?(?:\s*%|\s*jam|\s*hari|\/\d+)?)/gi,
    '<strong>$1</strong>'
  );
}

// ─── RENDER HELPERS ───────────────────────────────────────────────────────────

function renderHeader() {
  return /* html */ `
    <div class="progres-header">
      <div class="progres-header-left">
        <h1 class="page-title">Statistik</h1>
        <p class="page-subtitle">Pantau perkembanganmu</p>
      </div>
      <div class="progres-avatar" title="Profil">🧑</div>
    </div>
  `;
}

function renderPeriodeToggle() {
  return /* html */ `
    <div class="periode-toggle-wrap">
      <div class="pill-toggle" role="group" aria-label="Pilih periode">
        <button
          class="pill-toggle-btn ${_periode === 'mingguan' ? 'active' : ''}"
          data-periode="mingguan"
        >Mingguan</button>
        <button
          class="pill-toggle-btn ${_periode === 'bulanan' ? 'active' : ''}"
          data-periode="bulanan"
        >Bulanan</button>
      </div>
    </div>
  `;
}

function renderSkorProgres(skor, rataJadwal) {
  const persen = Math.min(rataJadwal, 100);
  return /* html */ `
    <div class="skor-card">
      <div class="skor-card-header">
        <span class="skor-label">Skor Progres</span>
        <div class="skor-tren-icon" aria-label="Trending up">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
          </svg>
        </div>
      </div>
      <div class="skor-angka-wrap">
        <span class="skor-angka-besar">${skor}</span>
        <span class="skor-angka-dari">/100</span>
      </div>
      <div class="skor-penyelesaian">
        <span class="skor-penyelesaian-label">Penyelesaian Jadwal</span>
        <span class="skor-penyelesaian-persen">${persen}%</span>
      </div>
      <div class="skor-progress-track">
        <div class="skor-progress-fill" style="width: ${persen}%"></div>
      </div>
    </div>
  `;
}

function renderTotalFokus(totalMenitIni, totalMenitSebelumnya) {
  const selisih = totalMenitIni - totalMenitSebelumnya;
  const selisihFormatted = formatDurasiMenit(Math.abs(selisih));
  const naik = selisih >= 0;
  const arahIcon = naik ? '↑' : '↓';
  const kelasPerbandingan = naik ? 'naik' : 'turun';
  const labelPerbandingan = `${arahIcon} ${naik ? '+' : '-'}${selisihFormatted} dari periode lalu`;

  return /* html */ `
    <div class="fokus-card">
      <div class="fokus-icon-wrap" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      </div>
      <span class="fokus-label">Total Fokus</span>
      <span class="fokus-angka">${formatDurasiMenit(totalMenitIni)}</span>
      <div class="fokus-perbandingan ${kelasPerbandingan}" aria-label="${labelPerbandingan}">
        <span>${arahIcon}</span>
        <span>${naik ? '+' : '-'}${selisihFormatted} dari ${_periode === 'mingguan' ? 'minggu' : 'bulan'} lalu</span>
      </div>
    </div>
  `;
}

function renderAktivitasMingguan(stats7Hari) {
  const today = new Date();
  const skorPerHari = stats7Hari.map(s => hitungSkorHarian(s));
  const maxSkor = Math.max(...skorPerHari, 1);

  const bars = stats7Hari.map((stat, idx) => {
    const tglStat = new Date(stat.tanggal);
    const isHariIni = isSameDay(tglStat, today);
    const skor = skorPerHari[idx];
    const tinggiPersen = skor > 0 ? Math.max((skor / maxSkor) * 100, 8) : 4;
    const hariDariDate = tglStat.getDay(); // 0=Min
    const namaHari = HARI_SINGKAT[hariDariDate];

    let barClass = 'bar-normal';
    if (skor === 0) barClass = 'bar-empty';
    if (isHariIni) barClass = 'bar-active';

    return /* html */ `
      <div class="bar-item" role="img" aria-label="${namaHari}: skor ${skor}">
        <div class="bar-column-wrap">
          <div
            class="bar-column ${barClass}"
            style="height: ${tinggiPersen}%;"
            title="${namaHari}: ${skor}/100"
          ></div>
        </div>
        <span class="bar-day-label ${isHariIni ? 'active-day' : ''}">${namaHari}</span>
      </div>
    `;
  });

  return /* html */ `
    <div class="aktivitas-card">
      <div class="aktivitas-card-header">
        <h3>Aktivitas Mingguan</h3>
        <span class="aktivitas-detail-link" role="button" tabindex="0">Lihat Detail</span>
      </div>
      <div class="bar-chart" role="group" aria-label="Grafik aktivitas mingguan">
        ${bars.join('')}
      </div>
    </div>
  `;
}

function renderStreakManifestasi(streak) {
  const { count } = streak;
  const motivasi = motivasiStreak(count);
  return /* html */ `
    <div class="streak-card">
      <div class="streak-icon-wrap" aria-hidden="true">✨</div>
      <div class="streak-body">
        <div class="streak-label">Streak Manifestasi</div>
        <div class="streak-angka-wrap">
          <span class="streak-angka">${count}</span>
          <span class="streak-hari-text">hari</span>
        </div>
        <p class="streak-motivasi">${motivasi}</p>
      </div>
    </div>
  `;
}

function renderInsight(statsData) {
  const teks = generateInsight(statsData);
  const teksFormatted = formatInsightTeks(teks);
  return /* html */ `
    <div class="insight-card">
      <div class="insight-icon-wrap" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="9" y1="18" x2="15" y2="18"/>
          <line x1="10" y1="22" x2="14" y2="22"/>
          <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/>
        </svg>
      </div>
      <div class="insight-body">
        <div class="insight-label">Insight</div>
        <p class="insight-teks">${teksFormatted}</p>
      </div>
    </div>
  `;
}

function renderLoading() {
  return /* html */ `
    <div class="progres-loading">
      <div class="skeleton progres-skeleton-card" style="height:110px"></div>
      <div class="skeleton progres-skeleton-card" style="height:160px"></div>
      <div class="skeleton progres-skeleton-card" style="height:200px"></div>
      <div class="skeleton progres-skeleton-card" style="height:100px"></div>
      <div class="skeleton progres-skeleton-card" style="height:100px"></div>
    </div>
  `;
}

// ─── MAIN RENDER ──────────────────────────────────────────────────────────────

function renderPage() {
  if (!_container) return;

  const jumlahHari = _periode === 'mingguan' ? 7 : 30;
  const skor = hitungSkorProgres(_statsData);
  const rataJadwal = hitungRataJadwal(_statsData);
  const totalFokusIni = hitungFokusPeriodeIni(_statsData);
  const totalFokusLalu = hitungFokusSebelumnya(_semuaSesi, jumlahHari);

  _container.innerHTML = /* html */ `
    <div class="progres-page">
      ${renderHeader()}
      ${renderPeriodeToggle()}
      <div class="progres-content">
        ${renderSkorProgres(skor, rataJadwal)}
        ${renderTotalFokus(totalFokusIni, totalFokusLalu)}
        ${renderAktivitasMingguan(_statsMingguan)}
        ${renderStreakManifestasi(_streakData)}
        ${renderInsight(_statsData.length > 0 ? _statsData : _statsMingguan)}
      </div>
    </div>
  `;

  attachEventListeners();
}

// ─── EVENT LISTENERS ──────────────────────────────────────────────────────────

function attachEventListeners() {
  if (!_container) return;

  // Toggle periode
  _container.querySelectorAll('[data-periode]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const periode = btn.dataset.periode;
      if (periode === _periode) return;
      _periode = periode;
      await loadData();
      renderPage();
    });
  });

  // Lihat Detail (bisa dikembangkan nanti)
  const lihatDetail = _container.querySelector('.aktivitas-detail-link');
  if (lihatDetail) {
    lihatDetail.addEventListener('click', () => {
      // placeholder — bisa navigate ke halaman jadwal
    });
    lihatDetail.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') lihatDetail.click();
    });
  }
}

// ─── DATA LOADING ─────────────────────────────────────────────────────────────

async function loadData() {
  if (_periode === 'mingguan') {
    _statsData = await getStatistikMingguan();
  } else {
    _statsData = await getStatistikBulanan();
  }
  // Bar chart selalu 7 hari terakhir
  _statsMingguan = await getStatistikMingguan();
  _streakData = await getStreakManifestasi();
  _semuaSesi = await getSemuaSesiFokus();
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export async function mount(container) {
  _container = container;
  _periode = 'mingguan';

  // Tampilkan skeleton dulu
  _container.innerHTML = /* html */ `
    <div class="progres-page">
      ${renderHeader()}
      ${renderPeriodeToggle()}
      ${renderLoading()}
    </div>
  `;

  await loadData();
  renderPage();
}

export function unmount() {
  if (_container) {
    _container.innerHTML = '';
    _container = null;
  }
  _statsData = [];
  _statsMingguan = [];
  _streakData = { count: 0, terakhir: null };
  _semuaSesi = [];
  _periode = 'mingguan';
}
