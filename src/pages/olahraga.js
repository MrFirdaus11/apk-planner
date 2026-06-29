import {
  getSemuaOlahraga,
  simpanOlahraga,
  initOlahragaDefault,
} from '../store.js';
import { escapeHtml } from '../utils/helpers.js';
import { bukaModal, tutupModal } from '../components/modal.js';
import { tampilkanToast } from '../components/toast.js';
import '../styles/olahraga.css';
import '../styles/components.css';

const HARI_LIST = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
let _container = null;
let _hariAktif = 'Senin';
let _data = [];

function getHariIndex(hari) {
  return HARI_LIST.indexOf(hari);
}

function getHariAktifData() {
  return _data.find(d => d.hari === _hariAktif) || null;
}

function getTotalLatihan(hari) {
  const d = _data.find(x => x.hari === hari);
  return d ? d.latihan.length : 0;
}

function getTotalLatihanMinggu() {
  return _data.reduce((sum, d) => sum + d.latihan.length, 0);
}

function getHariBerlatih() {
  return _data.filter(d => d.latihan.length > 0).length;
}

function render() {
  if (!_container) return;
  const aktif = getHariAktifData();
  const totalLatihan = getTotalLatihanMinggu();
  const hariBerlatih = getHariBerlatih();

  _container.innerHTML = `
    <div class="olahraga-page">
      <div class="olahraga-header">
        <div>
          <h1 class="page-title">Olahraga</h1>
          <p class="page-subtitle">${hariBerlatih}/7 hari • ${totalLatihan} latihan</p>
        </div>
        <button class="olahraga-streak-badge" id="olahraga-reset-btn" title="Reset minggu">
          <i data-lucide="refresh-cw" width="14" height="14"></i>
          Reset
        </button>
      </div>

      <div class="olahraga-day-tabs" id="olahraga-tabs">
        ${HARI_LIST.map(hari => {
          const count = getTotalLatihan(hari);
          return `
            <button class="olahraga-day-tab ${_hariAktif === hari ? 'active' : ''} ${count > 0 ? 'has-exercise' : ''}"
                    data-hari="${hari}">
              <span class="day-name">${hari[0]}</span>
              <span class="day-label">${hari.slice(0, 3)}</span>
            </button>
          `;
        }).join('')}
      </div>

      ${aktif ? renderDayCard(aktif) : renderEmpty()}
    </div>
  `;

  bindEvents();
  if (window.lucide) window.lucide.createIcons();
}

function renderDayCard(hariData) {
  const isRest = !hariData.fokus && hariData.latihan.length === 0;

  if (isRest) {
    return `
      <div class="olahraga-day-card">
        <div class="olahraga-day-card-header">
          <div class="olahraga-day-fokus">
            <input class="olahraga-day-fokus-input"
                   type="text" placeholder="Hari Istirahat"
                   value="${escapeHtml(hariData.fokus)}"
                   id="olahraga-fokus-input" />
          </div>
          <div class="olahraga-day-actions">
            <button class="olahraga-btn-icon" id="olahraga-toggle-lokasi" title="Ganti lokasi">
              <i data-lucide="${hariData.lokasi === 'gym' ? 'building' : 'home'}" width="18" height="18"></i>
            </button>
          </div>
        </div>
        <div class="olahraga-rest-day">
          <div class="rest-icon">🛌</div>
          <p>Hari istirahat. Tambahkan latihan atau atur fokus hari ini.</p>
          <button class="olahraga-rest-toggle" id="olahraga-add-first">+ Tambah Latihan</button>
        </div>
      </div>
    `;
  }

  return `
    <div class="olahraga-day-card">
      <div class="olahraga-day-card-header">
        <div class="olahraga-day-fokus">
          <input class="olahraga-day-fokus-input"
                 type="text" placeholder="Nama sesi (e.g., Latihan Tangan)"
                 value="${escapeHtml(hariData.fokus)}"
                 id="olahraga-fokus-input" />
          <div class="olahraga-day-meta">
            <span class="olahraga-lokasi-badge ${hariData.lokasi}">
              <i data-lucide="${hariData.lokasi === 'gym' ? 'building' : 'home'}" width="12" height="12"></i>
              ${hariData.lokasi === 'gym' ? 'Gym' : 'Rumah'}
            </span>
            ${hariData.durasi > 0 ? `<span class="olahraga-day-durasi">~${hariData.durasi} menit</span>` : ''}
          </div>
        </div>
        <div class="olahraga-day-actions">
          <button class="olahraga-btn-icon" id="olahraga-toggle-lokasi" title="Ganti lokasi">
            <i data-lucide="shuffle" width="18" height="18"></i>
          </button>
        </div>
      </div>

      <div class="olahraga-exercise-list" id="olahraga-exercise-list">
        ${renderExerciseList(hariData.latihan)}
      </div>

      <button class="olahraga-add-exercise" id="olahraga-add-exercise">
        <i data-lucide="plus" width="16" height="16"></i>
        Tambah Latihan
      </button>
    </div>
  `;
}

function renderExerciseList(latihan) {
  if (!latihan || latihan.length === 0) return '';
  return latihan.map((ex, idx) => `
    <div class="olahraga-exercise-item" draggable="true" data-exercise-id="${escapeHtml(ex.id)}" data-index="${idx}">
      <div class="olahraga-exercise-drag">
        <i data-lucide="grip-vertical" width="14" height="14"></i>
      </div>
      <div class="olahraga-exercise-nama">
        <strong>${escapeHtml(ex.nama)}</strong>
        ${ex.catatan ? `<span class="exercise-catatan">${escapeHtml(ex.catatan)}</span>` : ''}
      </div>
      <div class="olahraga-exercise-setrep">
        <span class="setrep-value">${escapeHtml(String(ex.set))} × ${escapeHtml(ex.rep)}</span>
        <span class="setrep-label">set × rep</span>
      </div>
      <button class="olahraga-exercise-edit-btn" data-edit-id="${escapeHtml(ex.id)}" title="Edit">
        <i data-lucide="pencil" width="14" height="14"></i>
      </button>
    </div>
  `).join('');
}

function renderEmpty() {
  return `
    <div class="olahraga-empty">
      <div class="olahraga-empty-icon">🏋️</div>
      <h3>Belum Ada Jadwal Olahraga</h3>
      <p>Atur jadwal latihan mingguan Anda — pilih hari dan tambahkan gerakan.</p>
    </div>
  `;
}

function bindEvents() {
  // Day tabs
  const tabs = document.querySelectorAll('.olahraga-day-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      _hariAktif = tab.dataset.hari;
      render();
    });
  });

  // Fokus input
  const fokusInput = document.getElementById('olahraga-fokus-input');
  if (fokusInput) {
    fokusInput.addEventListener('change', () => {
      const data = getHariAktifData();
      if (data) {
        data.fokus = fokusInput.value.trim();
        simpanOlahraga(data).catch(err => { console.error(err); tampilkanToast('Gagal menyimpan data', 'error'); });
        render();
      }
    });
    // Blur also saves
    fokusInput.addEventListener('blur', () => {
      const data = getHariAktifData();
      if (data && !data.fokus && fokusInput.value.trim()) {
        data.fokus = fokusInput.value.trim();
        simpanOlahraga(data).catch(err => { console.error(err); tampilkanToast('Gagal menyimpan data', 'error'); });
      }
    });
  }

  // Toggle lokasi
  const toggleLokasi = document.getElementById('olahraga-toggle-lokasi');
  if (toggleLokasi) {
    toggleLokasi.addEventListener('click', () => {
      const data = getHariAktifData();
      if (data) {
        data.lokasi = data.lokasi === 'gym' ? 'rumah' : 'gym';
        simpanOlahraga(data).catch(err => { console.error(err); tampilkanToast('Gagal menyimpan data', 'error'); });
        render();
        tampilkanToast(`Lokasi: ${data.lokasi === 'gym' ? 'Gym' : 'Rumah'}`, 'info');
      }
    });
  }

  // Add exercise
  const addBtn = document.getElementById('olahraga-add-exercise');
  if (addBtn) {
    addBtn.addEventListener('click', () => bukaFormLatihan(null));
  }

  const addFirst = document.getElementById('olahraga-add-first');
  if (addFirst) {
    addFirst.addEventListener('click', () => bukaFormLatihan(null));
  }

  // Edit exercise buttons
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.editId;
      const data = getHariAktifData();
      if (data) {
        const ex = data.latihan.find(x => x.id === id);
        if (ex) bukaFormLatihan(ex);
      }
    });
  });

  // Exercise swipe to delete
  initSwipe();

  // Drag to reorder
  initDrag();

  // Reset button
  const resetBtn = document.getElementById('olahraga-reset-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      const total = getTotalLatihanMinggu();
      if (total === 0) return;
      bukaModal({
        judul: 'Reset Minggu Ini?',
        konten: `<p style="text-align:center;color:var(--text-secondary)">Semua latihan akan dihapus. Setiap hari akan kembali kosong.</p>`,
        aksi: [
          { label: 'Batal', kelas: 'btn-ghost', onClick: tutupModal },
          {
            label: 'Reset', kelas: 'btn-danger',
            onClick: () => {
              _data.forEach(d => {
                d.fokus = '';
                d.latihan = [];
                d.durasi = 0;
              });
              Promise.all(_data.map(d => simpanOlahraga(d))).then(() => {
                tutupModal();
                render();
                tampilkanToast('Minggu direset', 'success');
              });
            }
          },
        ],
      });
    });
  }
}

// ─── SWIPE TO DELETE ─────────────────────────────────────
let _swipeState = null;
let _isSwipeActive = false;

function docMouseMove(e) {
  if (!_swipeState) return;
  const diff = e.clientX - _swipeState.startX;
  if (diff < 0) {
    _swipeState.el.style.transform = `translateX(${Math.max(diff, -80)}px)`;
    _isSwipeActive = Math.abs(diff) > 10;
  }
}

function docMouseUp() {
  if (!_swipeState) {
    _swipeState = null;
    return;
  }
  _isSwipeActive = false;
  _swipeState.el.style.transition = 'transform 0.2s ease';
  if (_swipeState.diff < -50) {
    _swipeState.el.style.transform = 'translateX(-100%)';
    _swipeState.el.style.opacity = '0';
    setTimeout(() => {
      hapusLatihan(_swipeState.id);
    }, 200);
  } else {
    _swipeState.el.style.transform = 'translateX(0)';
  }
  _swipeState = null;
}

function initSwipe() {
  document.querySelectorAll('.olahraga-exercise-item').forEach(el => {
    const start = (e) => {
      const x = e.clientX || e.touches?.[0]?.clientX;
      if (!x) return;
      _swipeState = {
        el,
        startX: x,
        id: el.dataset.exerciseId,
        diff: 0,
      };
      el.style.transition = '';
    };
    const move = (e) => {
      if (!_swipeState) return;
      e.preventDefault();
      const x = e.clientX || e.touches?.[0]?.clientX;
      if (x) {
        _swipeState.diff = x - _swipeState.startX;
        docMouseMove({ clientX: x });
      }
    };
    const end = () => {
      docMouseUp();
    };

    el.addEventListener('mousedown', start);
    el.addEventListener('touchstart', start, { passive: true });
    document.addEventListener('mousemove', docMouseMove);
    document.addEventListener('mouseup', docMouseUp);
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', end);
  });
}

function cleanupSwipe() {
  document.removeEventListener('mousemove', docMouseMove);
  document.removeEventListener('mouseup', docMouseUp);
  _swipeState = null;
}

// ─── DRAG TO REORDER ──────────────────────────────────────
let _dragState = null;

function initDrag() {
  const list = document.getElementById('olahraga-exercise-list');
  if (!list) return;

  let dragSourceIndex = null;

  // Event delegation for performance
  list.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.olahraga-exercise-item');
    if (!item) return;
    dragSourceIndex = parseInt(item.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.exerciseId);
    _dragState = { sourceIndex: dragSourceIndex };

    // Defer adding dragging class so default drag image renders clean
    requestAnimationFrame(() => {
      item.classList.add('dragging');
    });
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.olahraga-exercise-item');
    if (!target || dragSourceIndex === null) return;

    const items = [...list.querySelectorAll('.olahraga-exercise-item')];
    const targetIndex = parseInt(target.dataset.index);
    if (targetIndex === dragSourceIndex) return;

    // Determine drop position: above or below target
    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const before = e.clientY < midY;

    // Remove all indicators
    items.forEach(el => el.classList.remove('drop-before', 'drop-after'));

    if (before) {
      target.classList.add('drop-before');
    } else {
      target.classList.add('drop-after');
    }
  });

  list.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.olahraga-exercise-item');
    if (target) {
      target.classList.remove('drop-before', 'drop-after');
    }
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.olahraga-exercise-item');
    if (!target || dragSourceIndex === null) return;

    const targetIndex = parseInt(target.dataset.index);
    if (targetIndex === dragSourceIndex) return;

    const data = getHariAktifData();
    if (!data) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const before = e.clientY < midY;

    // Calculate new index
    let newIndex = targetIndex;
    if (!before && targetIndex < dragSourceIndex) newIndex = targetIndex + 1;
    else if (before && targetIndex > dragSourceIndex) newIndex = targetIndex - 1;
    if (newIndex === dragSourceIndex) return;

    // Reorder array
    const [moved] = data.latihan.splice(dragSourceIndex, 1);
    data.latihan.splice(newIndex, 0, moved);

    // Update durasi
    data.durasi = data.latihan.reduce((sum, ex) => {
      const repNum = parseInt(ex.rep) || 10;
      return sum + Math.ceil((ex.set * repNum * 30) / 60);
    }, 0);

    simpanOlahraga(data).then(() => {
      render();
      tampilkanToast('Urutan diperbarui', 'info');
    });
  });

  list.addEventListener('dragend', () => {
    dragSourceIndex = null;
    _dragState = null;
    list.querySelectorAll('.olahraga-exercise-item').forEach(el => {
      el.classList.remove('dragging', 'drop-before', 'drop-after');
    });
  });
}

// ─── FORM MODAL ───────────────────────────────────────────
function bukaFormLatihan(existing) {
  const data = getHariAktifData();
  if (!data) return;

  const isEdit = !!existing;
  const judul = isEdit ? 'Edit Latihan' : 'Tambah Latihan';
  const nama = existing?.nama || '';
  const set = existing?.set || 3;
  const rep = existing?.rep || '10';
  const catatan = existing?.catatan || '';

  const konten = document.createElement('div');
  konten.innerHTML = `
    <div class="olahraga-form-group">
      <label for="ex-nama">Nama Gerakan</label>
      <input type="text" id="ex-nama" placeholder="e.g., Bench Press" value="${escapeHtml(nama)}" />
    </div>
    <div class="olahraga-form-row">
      <div class="olahraga-form-group">
        <label for="ex-set">Jumlah Set</label>
        <input type="number" id="ex-set" min="1" max="20" value="${set}" />
      </div>
      <div class="olahraga-form-group">
        <label for="ex-rep">Repetisi</label>
        <input type="text" id="ex-rep" placeholder="e.g., 10-12" value="${escapeHtml(rep)}" />
      </div>
    </div>
    <div class="olahraga-form-group">
      <label for="ex-catatan">Catatan (opsional)</label>
      <textarea id="ex-catatan" placeholder="Misal: gunakan dumbbell 10kg">${escapeHtml(catatan)}</textarea>
    </div>
  `;

  bukaModal({
    judul,
    konten,
    ukuran: 'normal',
    aksi: [
      { label: 'Batal', kelas: 'btn-ghost', onClick: tutupModal },
      {
        label: isEdit ? 'Simpan' : 'Tambah', kelas: 'btn-primary', icon: 'check',
        onClick: () => {
          const inpNama = document.getElementById('ex-nama');
          const inpSet = document.getElementById('ex-set');
          const inpRep = document.getElementById('ex-rep');
          const inpCatatan = document.getElementById('ex-catatan');

          const namaVal = inpNama.value.trim();
          if (!namaVal) {
            inpNama.focus();
            inpNama.style.borderColor = 'var(--danger)';
            return;
          }

          const setVal = parseInt(inpSet.value) || 3;
          const repVal = inpRep.value.trim() || '10';

          if (isEdit) {
            existing.nama = namaVal;
            existing.set = setVal;
            existing.rep = repVal;
            existing.catatan = inpCatatan.value.trim();
          } else {
            data.latihan.push({
              id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
              nama: namaVal,
              set: setVal,
              rep: repVal,
              catatan: inpCatatan.value.trim(),
            });
          }

          // Update durasi
          const totalMenit = data.latihan.reduce((sum, ex) => {
            const repNum = parseInt(ex.rep) || 10;
            return sum + Math.ceil((ex.set * repNum * 30) / 60);
          }, 0);
          data.durasi = totalMenit;

          simpanOlahraga(data).then(() => {
            tutupModal();
            render();
            tampilkanToast(isEdit ? 'Latihan diperbarui' : 'Latihan ditambahkan', 'success');
          });
        }
      },
    ],
  });

  // Focus first input
  setTimeout(() => {
    const inp = document.getElementById('ex-nama');
    if (inp) inp.focus();
  }, 300);
}

function hapusLatihan(id) {
  const data = getHariAktifData();
  if (!data) return;
  data.latihan = data.latihan.filter(ex => ex.id !== id);
  const totalMenit = data.latihan.reduce((sum, ex) => {
    const repNum = parseInt(ex.rep) || 10;
    return sum + Math.ceil((ex.set * repNum * 30) / 60);
  }, 0);
  data.durasi = totalMenit;
  simpanOlahraga(data).then(() => {
    render();
    tampilkanToast('Latihan dihapus', 'info');
  });
}

// ─── MOUNT / UNMOUNT ──────────────────────────────────────
export async function mount(container) {
  _container = container;
  await initOlahragaDefault();
  _data = await getSemuaOlahraga();
  render();
}

export function unmount() {
  cleanupSwipe();
  _dragState = null;
  _container = null;
  _data = [];
}
