import { getJurnalByTanggal, simpanJurnal } from '../store.js';
import { formatTanggalPanjang, formatTanggalPendek } from '../utils/date-utils.js';
import { escapeHtml, kompresGambar } from '../utils/helpers.js';
import { tampilkanToast } from '../components/toast.js';
import '../styles/jurnal.css';
import '../styles/components.css';

// ─── STATE ────────────────────────────────────────────────────
let state = {
  mood: null,
  konten: '',
  tags: [],
  foto: [],
};

const DEFAULT_TAGS = ['Kerja', 'Keluarga', 'Kesehatan', 'Belajar', 'Hobi'];
let autoSaveTimer = null;
let containerEl = null;

// ─── MOUNT ────────────────────────────────────────────────────
export async function mount(container) {
  containerEl = container;

  // Load data hari ini
  const tanggalHariIni = formatTanggalPendek();
  const dataExisting = await getJurnalByTanggal(tanggalHariIni);

  if (dataExisting) {
    state.mood    = dataExisting.mood    ?? null;
    state.konten  = dataExisting.konten  ?? '';
    state.tags    = dataExisting.tags    ?? [...DEFAULT_TAGS];
    state.foto    = dataExisting.foto    ?? [];
  } else {
    state = { mood: null, konten: '', tags: [...DEFAULT_TAGS], foto: [] };
  }

  container.innerHTML = renderPage();
  bindEvents(container);
}

// ─── UNMOUNT ──────────────────────────────────────────────────
export function unmount() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = null;
  }
  containerEl = null;
}

// ─── RENDER ───────────────────────────────────────────────────
function renderPage() {
  return `
    <div class="jurnal-page">
      ${renderHeader()}
      <div class="jurnal-save-indicator" id="saveIndicator">
        <span class="save-dot"></span>
        <span id="saveText">Belum ada perubahan</span>
      </div>
      <div class="jurnal-body">
        ${renderTanggal()}
        ${renderMoodCard()}
        ${renderTulisCard()}
        ${renderTagsCard()}
        ${renderFotoCard()}
      </div>
      <input type="file" id="fotoInput" accept="image/*" multiple style="display:none">
      <input type="file" id="kameraInput" accept="image/*" capture="environment" style="display:none">
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="jurnal-header">
      <button class="jurnal-header-back" id="btnKembali" aria-label="Kembali">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 5l-7 7 7 7"/>
        </svg>
      </button>
      <h1 class="jurnal-header-title">Jurnal Hari Ini</h1>
      <button class="jurnal-header-save" id="btnSimpan" aria-label="Simpan Jurnal">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
      </button>
    </header>
  `;
}

function renderTanggal() {
  return `<div class="jurnal-tanggal">${formatTanggalPanjang()}</div>`;
}

function renderMoodCard() {
  const moods = [
    { value: 'kurang', emoji: '😟', label: 'Kurang Baik' },
    { value: 'biasa',  emoji: '😐', label: 'Biasa Saja' },
    { value: 'baik',   emoji: '😊', label: 'Sangat Baik' },
  ];

  const moodBtns = moods.map(m => `
    <button class="mood-btn${state.mood === m.value ? ' active' : ''}" data-mood="${m.value}" aria-label="${m.label}">
      <span class="mood-emoji">${m.emoji}</span>
      <span class="mood-label">${m.label}</span>
    </button>
  `).join('');

  return `
    <div class="jurnal-card" id="moodCard">
      <div class="jurnal-card-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
        Mood
      </div>
      <p class="mood-question">Bagaimana perasaanmu hari ini?</p>
      <div class="mood-picker">${moodBtns}</div>
    </div>
  `;
}

function renderTulisCard() {
  return `
    <div class="jurnal-tulis-card" id="tulisCard">
      <div class="jurnal-tulis-header">
        <span class="jurnal-tulis-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          Catatan Harian
        </span>
        <span class="jurnal-char-count" id="charCount">${state.konten.length} karakter</span>
      </div>
      <textarea
        class="jurnal-textarea"
        id="jurnalTextarea"
        placeholder="Ceritakan tentang hari mu... Apa yang kamu rasakan? Apa yang kamu pelajari?"
        aria-label="Isi jurnal"
      >${escapeHtml(state.konten)}</textarea>
    </div>
  `;
}

function renderTagsCard() {
  const pillsHtml = state.tags.map((tag, i) => {
    const isActive = typeof tag === 'object' ? tag.aktif : true;
    const label    = typeof tag === 'object' ? tag.label : tag;
    const isCustom = typeof tag === 'object' ? tag.custom : false;
    return `
      <span class="tag-pill${isActive ? ' active' : ''}" data-tag-idx="${i}" role="checkbox" aria-checked="${isActive}">
        ${escapeHtml(label)}
        ${isCustom ? `<span class="tag-pill-remove" data-remove-idx="${i}" aria-label="Hapus tag">×</span>` : ''}
      </span>
    `;
  }).join('');

  return `
    <div class="jurnal-card" id="tagsCard">
      <div class="jurnal-card-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
        </svg>
        Tag
      </div>
      <div class="jurnal-tags-wrap" id="tagsWrap">
        ${pillsHtml}
        <button class="tag-add-btn" id="btnTambahTag" aria-label="Tambah tag baru">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Tag
        </button>
      </div>
      <div class="tag-input-wrap" id="tagInputWrap">
        <input class="tag-input" id="tagInputField" type="text" placeholder="Nama tag baru..." maxlength="20" aria-label="Nama tag baru">
        <button class="tag-input-confirm" id="btnKonfirmasiTag">Tambah</button>
        <button class="tag-input-cancel" id="btnBatalTag">Batal</button>
      </div>
    </div>
  `;
}

function renderFotoCard() {
  const fotoItems = state.foto.map((src, i) => `
    <div class="jurnal-photo-item">
      <img src="${src}" alt="Foto jurnal ${i + 1}" loading="lazy">
      <button class="jurnal-photo-remove" data-foto-idx="${i}" aria-label="Hapus foto">×</button>
    </div>
  `).join('');

  return `
    <div class="jurnal-card" id="fotoCard">
      <div class="jurnal-card-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        Foto
      </div>
      <div class="jurnal-photo-grid" id="fotoGrid">
        ${fotoItems}
        <div class="jurnal-photo-add" id="btnTambahFoto" role="button" tabindex="0" aria-label="Tambah foto">
          <span class="jurnal-photo-add-icon">🖼️</span>
          <span class="jurnal-photo-add-label">Tambah Foto</span>
        </div>
        <div class="jurnal-photo-add" id="btnBukaKamera" role="button" tabindex="0" aria-label="Buka kamera">
          <span class="jurnal-photo-add-icon">📷</span>
          <span class="jurnal-photo-add-label">Kamera</span>
        </div>
      </div>
    </div>
  `;
}

// ─── BIND EVENTS ──────────────────────────────────────────────
function bindEvents(container) {
  // Tombol kembali — navigasi ke halaman jadwal
  container.querySelector('#btnKembali')?.addEventListener('click', () => {
    window.location.hash = '#jadwal';
  });

  // Tombol simpan manual
  container.querySelector('#btnSimpan')?.addEventListener('click', () => simpanManual());

  // Mood buttons
  container.querySelectorAll('.mood-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mood = btn.dataset.mood;
      state.mood = mood;
      // Re-render mood buttons saja
      container.querySelectorAll('.mood-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mood === mood);
      });
      jadwalkanAutoSave(container);
    });
  });

  // Textarea auto-resize dan auto-save
  const textarea = container.querySelector('#jurnalTextarea');
  if (textarea) {
    autoResize(textarea);
    textarea.addEventListener('input', () => {
      state.konten = textarea.value;
      const cc = container.querySelector('#charCount');
      if (cc) cc.textContent = `${state.konten.length} karakter`;
      autoResize(textarea);
      jadwalkanAutoSave(container);
    });
  }

  // Tags — toggle
  container.querySelector('#tagsWrap')?.addEventListener('click', e => {
    const pill = e.target.closest('.tag-pill');
    const removeBtn = e.target.closest('.tag-pill-remove');

    if (removeBtn) {
      e.stopPropagation();
      const idx = parseInt(removeBtn.dataset.removeIdx, 10);
      state.tags.splice(idx, 1);
      rerenderTags(container);
      jadwalkanAutoSave(container);
      return;
    }

    if (pill) {
      const idx = parseInt(pill.dataset.tagIdx, 10);
      const tag = state.tags[idx];
      if (typeof tag === 'object') {
        tag.aktif = !tag.aktif;
      } else {
        state.tags[idx] = { label: tag, aktif: false, custom: false };
      }
      rerenderTags(container);
      jadwalkanAutoSave(container);
    }
  });

  // Tambah tag
  container.querySelector('#btnTambahTag')?.addEventListener('click', () => {
    const wrap = container.querySelector('#tagInputWrap');
    wrap?.classList.add('visible');
    container.querySelector('#tagInputField')?.focus();
  });

  container.querySelector('#btnBatalTag')?.addEventListener('click', () => {
    tutupInputTag(container);
  });

  container.querySelector('#btnKonfirmasiTag')?.addEventListener('click', () => {
    tambahTagBaru(container);
  });

  container.querySelector('#tagInputField')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') tambahTagBaru(container);
    if (e.key === 'Escape') tutupInputTag(container);
  });

  // Foto — tambah
  container.querySelector('#btnTambahFoto')?.addEventListener('click', () => {
    container.querySelector('#fotoInput')?.click();
  });

  container.querySelector('#btnTambahFoto')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') container.querySelector('#fotoInput')?.click();
  });

  container.querySelector('#fotoInput')?.addEventListener('change', e => {
    handleFotoUpload(e.target.files, container);
    e.target.value = '';
  });

  // Foto — kamera
  container.querySelector('#btnBukaKamera')?.addEventListener('click', () => {
    container.querySelector('#kameraInput')?.click();
  });

  container.querySelector('#btnBukaKamera')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') container.querySelector('#kameraInput')?.click();
  });

  container.querySelector('#kameraInput')?.addEventListener('change', e => {
    handleFotoUpload(e.target.files, container);
    e.target.value = '';
  });

  // Foto — hapus (delegasi)
  container.querySelector('#fotoGrid')?.addEventListener('click', e => {
    const removeBtn = e.target.closest('.jurnal-photo-remove');
    if (removeBtn) {
      const idx = parseInt(removeBtn.dataset.fotoIdx, 10);
      state.foto.splice(idx, 1);
      rerenderFoto(container);
      jadwalkanAutoSave(container);
    }
  });
}

// ─── AUTO RESIZE ──────────────────────────────────────────────
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

// ─── AUTO-SAVE ────────────────────────────────────────────────
function jadwalkanAutoSave(container) {
  setSaveIndicator(container, 'idle');
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => simpanData(container), 3000);
}

async function simpanManual() {
  if (!containerEl) return;
  await simpanData(containerEl);
  tampilkanToast('Jurnal berhasil disimpan ✨', 'success');
}

async function simpanData(container) {
  setSaveIndicator(container, 'saving');
  try {
    const tanggal = formatTanggalPendek();
    await simpanJurnal({
      tanggal,
      mood:   state.mood,
      konten: state.konten,
      tags:   state.tags,
      foto:   state.foto,
    });
    setSaveIndicator(container, 'saved');
    // Reset ke idle setelah 3 detik
    setTimeout(() => setSaveIndicator(container, 'idle'), 3000);
  } catch (err) {
    setSaveIndicator(container, 'idle');
    tampilkanToast('Gagal menyimpan jurnal', 'error');
    console.error('[Jurnal] Gagal simpan:', err);
  }
}

function setSaveIndicator(container, status) {
  const el   = container?.querySelector('#saveIndicator');
  const text = container?.querySelector('#saveText');
  if (!el || !text) return;
  el.className = 'jurnal-save-indicator';
  if (status === 'saving') {
    el.classList.add('saving');
    text.textContent = 'Menyimpan...';
  } else if (status === 'saved') {
    el.classList.add('saved');
    text.textContent = 'Tersimpan';
  } else {
    text.textContent = 'Belum ada perubahan';
  }
}

// ─── TAGS HELPERS ─────────────────────────────────────────────
function rerenderTags(container) {
  const wrap = container.querySelector('#tagsWrap');
  if (!wrap) return;

  const pillsHtml = state.tags.map((tag, i) => {
    const isActive = typeof tag === 'object' ? tag.aktif : true;
    const label    = typeof tag === 'object' ? tag.label : tag;
    const isCustom = typeof tag === 'object' ? tag.custom : false;
    return `
      <span class="tag-pill${isActive ? ' active' : ''}" data-tag-idx="${i}" role="checkbox" aria-checked="${isActive}">
        ${escapeHtml(label)}
        ${isCustom ? `<span class="tag-pill-remove" data-remove-idx="${i}" aria-label="Hapus tag">×</span>` : ''}
      </span>
    `;
  }).join('');

  wrap.innerHTML = `
    ${pillsHtml}
    <button class="tag-add-btn" id="btnTambahTag" aria-label="Tambah tag baru">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      Tambah Tag
    </button>
  `;

  // Re-bind tombol tambah tag
  container.querySelector('#btnTambahTag')?.addEventListener('click', () => {
    const inputWrap = container.querySelector('#tagInputWrap');
    inputWrap?.classList.add('visible');
    container.querySelector('#tagInputField')?.focus();
  });
}

function tambahTagBaru(container) {
  const input = container.querySelector('#tagInputField');
  const label = input?.value.trim();
  if (!label) return;

  // Cek duplikat
  const sudahAda = state.tags.some(t =>
    (typeof t === 'object' ? t.label : t).toLowerCase() === label.toLowerCase()
  );
  if (sudahAda) {
    tampilkanToast('Tag sudah ada!', 'warning');
    return;
  }

  state.tags.push({ label, aktif: true, custom: true });
  tutupInputTag(container);
  rerenderTags(container);
  jadwalkanAutoSave(container);
}

function tutupInputTag(container) {
  const wrap  = container.querySelector('#tagInputWrap');
  const input = container.querySelector('#tagInputField');
  wrap?.classList.remove('visible');
  if (input) input.value = '';
}

// ─── FOTO HELPERS ─────────────────────────────────────────────
function handleFotoUpload(files, container) {
  if (!files || files.length === 0) return;
  const promises = Array.from(files).map(file => kompresGambar(file));
  Promise.all(promises).then(results => {
    state.foto.push(...results);
    rerenderFoto(container);
    jadwalkanAutoSave(container);
  }).catch(() => {
    tampilkanToast('Gagal memuat foto', 'error');
  });
}

function rerenderFoto(container) {
  const grid = container.querySelector('#fotoGrid');
  if (!grid) return;

  const fotoItems = state.foto.map((src, i) => `
    <div class="jurnal-photo-item">
      <img src="${src}" alt="Foto jurnal ${i + 1}" loading="lazy">
      <button class="jurnal-photo-remove" data-foto-idx="${i}" aria-label="Hapus foto">×</button>
    </div>
  `).join('');

  grid.innerHTML = `
    ${fotoItems}
    <div class="jurnal-photo-add" id="btnTambahFoto" role="button" tabindex="0" aria-label="Tambah foto">
      <span class="jurnal-photo-add-icon">🖼️</span>
      <span class="jurnal-photo-add-label">Tambah Foto</span>
    </div>
    <div class="jurnal-photo-add" id="btnBukaKamera" role="button" tabindex="0" aria-label="Buka kamera">
      <span class="jurnal-photo-add-icon">📷</span>
      <span class="jurnal-photo-add-label">Kamera</span>
    </div>
  `;

  container.querySelector('#btnTambahFoto')?.addEventListener('click', () => {
    container.querySelector('#fotoInput')?.click();
  });

  container.querySelector('#btnTambahFoto')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') container.querySelector('#fotoInput')?.click();
  });

  container.querySelector('#btnBukaKamera')?.addEventListener('click', () => {
    container.querySelector('#kameraInput')?.click();
  });

  container.querySelector('#btnBukaKamera')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') container.querySelector('#kameraInput')?.click();
  });
}


