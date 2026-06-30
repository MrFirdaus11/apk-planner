import {
  getSemuaTransaksi,
  simpanTransaksi,
  hapusTransaksi,
  getTransaksiByBulan,
  getRekapBulanan,
  getSemuaAset,
  simpanAset,
  initAsetDefault,
} from '../store.js';
import { BULAN, KATEGORI_KEUANGAN, KATEGORI_BY_TIPE } from '../utils/constants.js';
import { escapeHtml } from '../utils/helpers.js';
import { bukaModal, tutupModal } from '../components/modal.js';
import { tampilkanToast } from '../components/toast.js';
import '../styles/keuangan.css';
import '../styles/components.css';

const TIPE_LABEL = { pemasukan: 'Pemasukan', pengeluaran: 'Pengeluaran', transfer: 'Transfer' };
const TIPE_ICON = { pemasukan: '📈', pengeluaran: '📉', transfer: '🔄' };
const TIPE_FILTER = ['semua', 'pemasukan', 'pengeluaran', 'transfer'];

let _container = null;
let _transaksi = [];
let _aset = [];
let _filter = 'semua';
let _tahun = new Date().getFullYear();
let _bulan = new Date().getMonth() + 1;

function formatRupiah(angka) {
  return 'Rp ' + Math.round(angka).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function getNamaBulan(m) {
  return BULAN[m - 1] || '';
}

function getTanggalLabel(tanggalStr) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  if (tanggalStr === todayStr) return 'Hari Ini';
  if (tanggalStr === yesterdayStr) return 'Kemarin';
  const d = new Date(tanggalStr + 'T00:00:00');
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

function getTransaksiTerfilter() {
  const list = _transaksi;
  if (_filter === 'semua') return list;
  return list.filter(t => t.tipe === _filter);
}

function getCountByTipe(tipe) {
  if (tipe === 'semua') return _transaksi.length;
  return _transaksi.filter(t => t.tipe === tipe).length;
}

function getKategoriByTipe(tipe) {
  if (tipe === 'transfer') return {};
  return KATEGORI_BY_TIPE[tipe] || {};
}

async function loadData() {
  _transaksi = await getTransaksiByBulan(_tahun, _bulan);
  _aset = await getSemuaAset();
}

function getNamaAset(id) {
  const a = _aset.find(x => x.id === id);
  return a ? a.nama : id;
}

function getAsetIcon(id) {
  const a = _aset.find(x => x.id === id);
  return a ? a.icon : 'wallet';
}

function render() {
  if (!_container) return;
  const filtered = getTransaksiTerfilter();
  const rekap = { totalPemasukan: 0, totalPengeluaran: 0, selisih: 0 };
  _transaksi.forEach(t => {
    if (t.tipe === 'pemasukan') rekap.totalPemasukan += t.jumlah;
    if (t.tipe === 'pengeluaran') rekap.totalPengeluaran += t.jumlah;
  });
  rekap.selisih = rekap.totalPemasukan - rekap.totalPengeluaran;

  _container.innerHTML = `
    <div class="keuangan-page">
      <div class="keuangan-header">
        <div>
          <h1 class="page-title">Keuangan</h1>
          <p class="page-subtitle">${getNamaBulan(_bulan)} ${_tahun}</p>
        </div>
        <button class="keuangan-periode" id="keuangan-periode-btn" title="Ganti bulan">
          <span data-nav="prev"><i data-lucide="chevron-left" width="14" height="14"></i></span>
          <span class="keuangan-periode-nama" id="keuangan-periode-nama">${getNamaBulan(_bulan)}</span>
          <span data-nav="next"><i data-lucide="chevron-right" width="14" height="14"></i></span>
        </button>
      </div>

      <div class="keuangan-summary">
        <div class="keuangan-summary-card">
          <div class="summary-icon masuk">📈</div>
          <div class="summary-label">Pemasukan</div>
          <div class="summary-nominal positive">${formatRupiah(rekap.totalPemasukan)}</div>
        </div>
        <div class="keuangan-summary-card">
          <div class="summary-icon keluar">📉</div>
          <div class="summary-label">Pengeluaran</div>
          <div class="summary-nominal negative">${formatRupiah(rekap.totalPengeluaran)}</div>
        </div>
        <div class="keuangan-summary-card full">
          <div class="summary-icon selisih">💰</div>
          <div class="summary-label">Selisih</div>
          <div class="summary-nominal ${rekap.selisih >= 0 ? 'positive' : 'negative'}">
            ${formatRupiah(Math.abs(rekap.selisih))}
            <span style="font-size:12px;font-weight:500;color:var(--text-tertiary)">
              ${rekap.selisih >= 0 ? 'surplus' : 'defisit'}
            </span>
          </div>
        </div>
      </div>

      <div class="keuangan-filter" id="keuangan-filter">
        ${TIPE_FILTER.map(t => `
          <button class="keuangan-filter-btn ${_filter === t ? 'active' : ''}" data-filter="${t}">
            ${TIPE_LABEL[t] || 'Semua'}
            <span class="filter-count">${getCountByTipe(t)}</span>
          </button>
        `).join('')}
      </div>

      <div class="keuangan-list" id="keuangan-list">
        ${renderTransaksiList(filtered)}
      </div>

      ${_transaksi.length === 0 ? renderEmpty() : ''}

      <button class="keuangan-fab" id="keuangan-fab" title="Tambah transaksi">
        <i data-lucide="plus" width="24" height="24"></i>
      </button>
    </div>
  `;

  bindEvents();
  if (window.lucide) window.lucide.createIcons();
}

function renderTransaksiList(filtered) {
  if (filtered.length === 0) return '';

  // Group by date
  const groups = {};
  filtered.forEach(t => {
    if (!groups[t.tanggal]) groups[t.tanggal] = [];
    groups[t.tanggal].push(t);
  });

  return Object.entries(groups).map(([tanggal, items]) => `
    <div class="keuangan-date-group">
      <div class="keuangan-date-label">${getTanggalLabel(tanggal)}</div>
      ${items.map(t => renderItem(t)).join('')}
    </div>
  `).join('');
}

function renderItem(t) {
  const kategori = KATEGORI_KEUANGAN[t.kategori] || { label: t.kategori || 'Transfer', color: '#6B7280', bg: '#F3F4F6', icon: 'refresh-cw' };
  const isMasuk = t.tipe === 'pemasukan';
  const isTransfer = t.tipe === 'transfer';
  const jumlahClass = isMasuk ? 'masuk' : isTransfer ? '' : 'keluar';
  const jumlahLabel = isMasuk ? 'pemasukan' : isTransfer ? 'transfer' : 'pengeluaran';

  let asetLabel = '';
  if (isTransfer) {
    asetLabel = `${getNamaAset(t.asalAset)} → ${getNamaAset(t.tujuanAset)}`;
  } else {
    const asetId = t.asalAset || t.tujuanAset;
    if (asetId) asetLabel = getNamaAset(asetId);
  }

  return `
    <div class="keuangan-item" data-id="${escapeHtml(t.id)}">
      <div class="keuangan-item-icon" style="background:${kategori.bg};color:${kategori.color}">
        <i data-lucide="${kategori.icon}" width="18" height="18"></i>
      </div>
      <div class="keuangan-item-info">
        <span class="item-kategori">${kategori.label}</span>
        ${t.catatan ? `<span class="item-catatan">${escapeHtml(t.catatan)}</span>` : ''}
        ${asetLabel ? `<span class="item-aset"><i data-lucide="${getAsetIcon(isTransfer ? t.asalAset : asetLabel)}" width="10" height="10"></i> ${escapeHtml(asetLabel)}</span>` : ''}
      </div>
      <div class="keuangan-item-jumlah">
        <span class="jumlah-nominal ${jumlahClass}">
          ${isTransfer ? '' : isMasuk ? '+' : '-'}${formatRupiah(t.jumlah)}
        </span>
        <span class="jumlah-label">${jumlahLabel}</span>
      </div>
      <div class="swipe-hint">Hapus</div>
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="keuangan-empty">
      <div class="keuangan-empty-icon">💳</div>
      <h3>Belum Ada Catatan</h3>
      <p>Tambahkan pemasukan, pengeluaran, atau transfer untuk mulai mencatat keuangan.</p>
    </div>
  `;
}

function bindEvents() {
  // Filter tabs
  document.querySelectorAll('.keuangan-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _filter = btn.dataset.filter;
      render();
    });
  });

  // Periode — prev/next & month picker
  const periodeBtn = document.getElementById('keuangan-periode-btn');
  if (periodeBtn) {
    periodeBtn.addEventListener('click', async (e) => {
      const navSpan = e.target.closest('[data-nav]');
      if (navSpan) {
        const arah = navSpan.dataset.nav;
        if (arah === 'prev') _bulan--;
        else _bulan++;
        if (_bulan < 1) { _bulan = 12; _tahun--; }
        if (_bulan > 12) { _bulan = 1; _tahun++; }
        await loadData();
        render();
      } else {
        bukaMonthPicker();
      }
    });
  }

  // FAB
  const fab = document.getElementById('keuangan-fab');
  if (fab) fab.addEventListener('click', () => bukaFormTransaksi(null));

  // Click transaction item to edit
  document.querySelectorAll('.keuangan-item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const t = _transaksi.find(x => x.id === id);
      if (t) bukaFormTransaksi(t);
    });
  });

  // Swipe to delete
  initSwipe();
}

// ─── SWIPE TO DELETE ─────────────────────────────────────
let _swipeState = null;

function docMouseMove(e) {
  if (!_swipeState) return;
  const diff = e.clientX - _swipeState.startX;
  if (diff < 0) {
    _swipeState.el.style.transform = `translateX(${Math.max(diff, -90)}px)`;
  }
}

function docMouseUp() {
  if (!_swipeState) {
    _swipeState = null;
    return;
  }
  _swipeState.el.style.transition = 'transform 0.2s ease';
  if (_swipeState.diff < -60) {
    _swipeState.el.style.transform = 'translateX(-100%)';
    _swipeState.el.style.opacity = '0';
    setTimeout(() => {
      hapusTransaksi(_swipeState.id).then(() => {
        loadData().then(() => render());
        tampilkanToast('Transaksi dihapus', 'info');
      });
    }, 200);
  } else {
    _swipeState.el.style.transform = 'translateX(0)';
  }
  _swipeState = null;
}

function initSwipe() {
  document.querySelectorAll('.keuangan-item').forEach(el => {
    const start = (e) => {
      const x = e.clientX || e.touches?.[0]?.clientX;
      if (!x) return;
      _swipeState = { el, startX: x, id: el.dataset.id, diff: 0 };
      el.style.transition = '';
    };
    const move = (e) => {
      if (!_swipeState) return;
      const x = e.clientX || e.touches?.[0]?.clientX;
      if (x) {
        _swipeState.diff = x - _swipeState.startX;
        docMouseMove({ clientX: x });
        if (Math.abs(_swipeState.diff) > 15) e.preventDefault();
      }
    };
    const end = () => docMouseUp();

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
  });
}

function cleanupSwipe() {
  document.removeEventListener('mousemove', docMouseMove);
  document.removeEventListener('mouseup', docMouseUp);
  _swipeState = null;
}

// ─── FORM MODAL ───────────────────────────────────────────
function bukaFormTransaksi(existing) {
  const isEdit = !!existing;
  const judul = isEdit ? 'Edit Transaksi' : 'Tambah Transaksi';
  let tipe = existing?.tipe || 'pengeluaran';
  let kategori = existing?.kategori || '';
  let tanggal = existing?.tanggal || new Date().toISOString().slice(0, 10);
  let jumlah = existing?.jumlah || '';
  let asalAset = existing?.asalAset || (_aset[0]?.id || '');
  let tujuanAset = existing?.tujuanAset || (_aset[1]?.id || _aset[0]?.id || '');
  let catatan = existing?.catatan || '';

  function renderForm() {
    const kategoris = getKategoriByTipe(tipe);
    const isTransfer = tipe === 'transfer';

    return `
      <div class="keuangan-form-tipe">
        ${['pemasukan', 'pengeluaran', 'transfer'].map(t => `
          <button class="keuangan-form-tipe-btn ${tipe === t ? 'active' : ''}" data-tipe="${t}">
            <span class="tipe-icon">${TIPE_ICON[t]}</span>
            ${TIPE_LABEL[t]}
          </button>
        `).join('')}
      </div>

      <div class="keuangan-form-group">
        <label class="keuangan-form-label">Tanggal</label>
        <input class="keuangan-form-input" type="date" id="keu-tanggal" value="${tanggal}" />
      </div>

      <div class="keuangan-form-group">
        <label class="keuangan-form-label">Jumlah (Rp)</label>
        <input class="keuangan-form-input" type="text" id="keu-jumlah" inputmode="numeric" placeholder="0" value="${typeof jumlah === 'number' ? jumlah.toLocaleString('id-ID') : jumlah}" />
      </div>

      ${!isTransfer ? `
        <label class="keuangan-form-label">Kategori</label>
        <div class="keuangan-kategori-grid" id="keu-kategori-grid">
          ${Object.entries(kategoris).map(([key, kat]) => `
            <button class="keuangan-kategori-btn ${kategori === key ? 'active' : ''}" data-kategori="${key}">
              <span class="kategori-dot" style="background:${kat.color}"></span>
              ${kat.label}
            </button>
          `).join('')}
        </div>
      ` : ''}

      ${isTransfer ? `
        <div class="keuangan-form-row">
          <div class="keuangan-form-group">
            <label class="keuangan-form-label">Dari Aset</label>
            <select class="keuangan-aset-select" id="keu-aset-asal">
              ${_aset.map(a => `<option value="${a.id}" ${asalAset === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
            </select>
          </div>
          <div class="keuangan-form-group">
            <label class="keuangan-form-label">Ke Aset</label>
            <select class="keuangan-aset-select" id="keu-aset-tujuan">
              ${_aset.map(a => `<option value="${a.id}" ${tujuanAset === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
            </select>
          </div>
        </div>
      ` : `
        <div class="keuangan-form-group">
          <label class="keuangan-form-label">${tipe === 'pemasukan' ? 'Ke Aset' : 'Dari Aset'}</label>
          <select class="keuangan-aset-select" id="keu-aset">
            ${_aset.map(a => `<option value="${a.id}" ${(tipe === 'pemasukan' ? tujuanAset : asalAset) === a.id ? 'selected' : ''}>${a.nama}</option>`).join('')}
          </select>
        </div>
      `}

      <div class="keuangan-form-group">
        <label class="keuangan-form-label">Catatan (opsional)</label>
        <input class="keuangan-form-input" type="text" id="keu-catatan" placeholder="Misal: Gaji Bulanan" value="${escapeHtml(catatan)}" />
      </div>
    `;
  }

  const konten = document.createElement('div');
  konten.innerHTML = renderForm();

  const sheet = bukaModal({
    judul,
    konten,
    ukuran: 'besar',
    aksi: [
      { label: 'Batal', kelas: 'btn-ghost', onClick: tutupModal },
      {
        label: isEdit ? 'Simpan' : 'Tambah', kelas: 'btn-primary', icon: 'check',
        onClick: () => {
          const tipeBaru = konten.querySelector('.keuangan-form-tipe-btn.active')?.dataset.tipe;
          const jumlahVal = parseFloat((konten.querySelector('#keu-jumlah')?.value || '').replace(/\./g, ''));
          const tanggalVal = konten.querySelector('#keu-tanggal')?.value;
          const catatanVal = konten.querySelector('#keu-catatan')?.value.trim() || '';
          const isTransfer = tipeBaru === 'transfer';

          if (!jumlahVal || jumlahVal <= 0) {
            tampilkanToast('Masukkan jumlah yang valid', 'error');
            return;
          }

          let kategoriVal = '';
          let asalAsetVal = '';
          let tujuanAsetVal = '';

          if (isTransfer) {
            asalAsetVal = konten.querySelector('#keu-aset-asal')?.value;
            tujuanAsetVal = konten.querySelector('#keu-aset-tujuan')?.value;
            if (asalAsetVal === tujuanAsetVal) {
              tampilkanToast('Aset asal dan tujuan harus berbeda', 'error');
              return;
            }
          } else {
            const activeKat = konten.querySelector('.keuangan-kategori-btn.active');
            kategoriVal = activeKat ? activeKat.dataset.kategori : '';
            if (!kategoriVal) {
              tampilkanToast('Pilih kategori', 'error');
              return;
            }
            const asetEl = konten.querySelector('#keu-aset');
            if (tipeBaru === 'pemasukan') tujuanAsetVal = asetEl?.value;
            else asalAsetVal = asetEl?.value;
          }

          const data = {
            id: existing?.id || Date.now().toString() + Math.random().toString(36).slice(2, 6),
            tanggal: tanggalVal || new Date().toISOString().slice(0, 10),
            tipe: tipeBaru,
            jumlah: jumlahVal,
            kategori: kategoriVal,
            asalAset: asalAsetVal,
            tujuanAset: tujuanAsetVal,
            catatan: catatanVal,
            createdAt: existing?.createdAt || Date.now(),
          };

          simpanTransaksi(data).then(() => {
            tutupModal();
            loadData().then(() => render());
            tampilkanToast(isEdit ? 'Transaksi diperbarui' : 'Transaksi ditambahkan', 'success');
          });
        }
      },
    ],
  });

  bindFormEvents(konten);

  setTimeout(() => {
    const inp = konten.querySelector('#keu-jumlah');
    if (inp) inp.focus();
  }, 400);

  function bindFormEvents(konten) {
    // Kategori buttons
    konten.querySelectorAll('.keuangan-kategori-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        konten.querySelectorAll('.keuangan-kategori-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Tipe toggle
    konten.querySelectorAll('.keuangan-form-tipe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        tipe = btn.dataset.tipe;
        if (!existing) {
          kategori = '';
          asalAset = _aset[0]?.id || '';
          tujuanAset = _aset[1]?.id || _aset[0]?.id || '';
        }
        konten.innerHTML = renderForm();
        bindFormEvents(konten);
        if (window.lucide) window.lucide.createIcons();
      });
    });
  }
}

// ─── MONTH PICKER ─────────────────────────────────────────
async function bukaMonthPicker() {
  let tahun = _tahun;
  let bulan = _bulan;

  function renderPicker() {
    return `
      <div class="month-picker">
        <div class="month-picker-year">
          <button class="month-picker-year-btn" id="mp-tahun-prev">
            <i data-lucide="chevron-left" width="16" height="16"></i>
          </button>
          <span class="month-picker-year-label">${tahun}</span>
          <button class="month-picker-year-btn" id="mp-tahun-next">
            <i data-lucide="chevron-right" width="16" height="16"></i>
          </button>
        </div>
        <div class="month-picker-grid">
          ${BULAN.map((nama, i) => {
            const m = i + 1;
            const isActive = tahun === _tahun && m === _bulan;
            const isSelected = tahun === tahun && m === bulan;
            return `
              <button class="month-picker-btn${isSelected ? ' selected' : ''}${isActive ? ' active' : ''}" data-bulan="${m}">
                ${nama.slice(0, 3)}
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  const konten = document.createElement('div');
  konten.innerHTML = renderPicker();

  const sheet = bukaModal({
    judul: 'Pilih Bulan',
    konten,
    ukuran: 'normal',
    aksi: [
      { label: 'Batal', kelas: 'btn-ghost', onClick: tutupModal },
      {
        label: 'Pilih', kelas: 'btn-primary', icon: 'check',
        onClick: () => {
          _tahun = tahun;
          _bulan = bulan;
          tutupModal();
          loadData().then(() => render());
        }
      },
    ],
  });

  // Year nav
  konten.querySelector('#mp-tahun-prev')?.addEventListener('click', () => {
    tahun--;
    konten.innerHTML = renderPicker();
    bindPickerEvents();
    if (window.lucide) window.lucide.createIcons();
  });
  konten.querySelector('#mp-tahun-next')?.addEventListener('click', () => {
    tahun++;
    konten.innerHTML = renderPicker();
    bindPickerEvents();
    if (window.lucide) window.lucide.createIcons();
  });

  function bindPickerEvents() {
    konten.querySelectorAll('.month-picker-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        konten.querySelectorAll('.month-picker-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        bulan = parseInt(btn.dataset.bulan, 10);
      });
    });
    konten.querySelector('#mp-tahun-prev')?.addEventListener('click', () => {
      tahun--;
      konten.innerHTML = renderPicker();
      bindPickerEvents();
      if (window.lucide) window.lucide.createIcons();
    });
    konten.querySelector('#mp-tahun-next')?.addEventListener('click', () => {
      tahun++;
      konten.innerHTML = renderPicker();
      bindPickerEvents();
      if (window.lucide) window.lucide.createIcons();
    });
  }
}

// ─── MOUNT / UNMOUNT ──────────────────────────────────────
export async function mount(container) {
  _container = container;
  await initAsetDefault();
  await loadData();
  render();
}

export function unmount() {
  cleanupSwipe();
  _container = null;
  _transaksi = [];
  _aset = [];
}
