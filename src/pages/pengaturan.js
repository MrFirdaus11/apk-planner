import { exportData, downloadJson, parseFile, validasiData, importData } from '../utils/export-import.js';
import { getTheme, toggleTheme } from '../utils/theme.js';
import { tampilkanToast } from '../components/toast.js';
import { bukaModal, tutupModal } from '../components/modal.js';
import { getApiKey, setApiKey } from '../store.js';
import { setApiKey as setAiApiKey } from '../services/ai-chat.js';
import '../styles/pengaturan.css';
import '../styles/components.css';

let containerEl = null;

export async function mount(container) {
  containerEl = container;
  container.innerHTML = renderPage();
  bindEvents();
}

export function unmount() {
  containerEl = null;
}

function renderPage() {
  return `
    <div class="pengaturan-page">
      <header class="pengaturan-header">
        <h1>Pengaturan</h1>
        <p class="pengaturan-subtitle">Kelola data dan backup aplikasi</p>
      </header>

      <div class="pengaturan-section">
        <h2 class="pengaturan-section-title">Backup Data</h2>
        <p class="pengaturan-section-desc">
          Ekspor semua data (jadwal, jurnal, sesi fokus, afirmasi, olahraga, keuangan) ke file JSON.
          Gunakan file ini untuk memulihkan data kapan saja.
        </p>

        <div class="pengaturan-card">
          <div class="pengaturan-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </div>
          <div class="pengaturan-card-body">
            <span class="pengaturan-card-title">Ekspor JSON</span>
            <span class="pengaturan-card-desc">Download semua data sebagai file JSON</span>
          </div>
          <button class="btn btn-primary" id="btn-export">Ekspor</button>
        </div>

        <div class="pengaturan-card">
          <div class="pengaturan-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <div class="pengaturan-card-body">
            <span class="pengaturan-card-title">Impor JSON</span>
            <span class="pengaturan-card-desc">Pulihkan data dari file backup</span>
          </div>
          <button class="btn btn-outline" id="btn-import">Impor</button>
        </div>
      </div>

      <div class="pengaturan-section">
        <h2 class="pengaturan-section-title">Tampilan</h2>
        <div class="pengaturan-card" id="theme-card">
          <div class="pengaturan-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </div>
          <div class="pengaturan-card-body">
            <span class="pengaturan-card-title">Mode Gelap</span>
            <span class="pengaturan-card-desc">Gunakan tema gelap untuk kenyamanan mata</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" id="toggle-darkmode" ${getTheme() === 'dark' ? 'checked' : ''}>
            <span class="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div class="pengaturan-section">
        <h2 class="pengaturan-section-title">Kecerdasan Buatan</h2>
        <p class="pengaturan-section-desc">
          Atur API key untuk mengaktifkan fitur AI Chat. Gunakan NVIDIA API Key.
          Dapatkan API key di <span style="color:var(--primary);">https://build.nvidia.com</span>
        </p>

        <div class="pengaturan-card">
          <div class="pengaturan-card-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div class="pengaturan-card-body" style="flex:1;">
            <span class="pengaturan-card-title">API Key NVIDIA</span>
            <input type="password" class="form-input" id="input-api-key" placeholder="nvapi-..." style="margin-top:6px;font-size:13px;padding:0.5rem 0.75rem;" />
          </div>
        </div>

        <div style="display:flex;gap:var(--space-2);">
          <button class="btn btn-primary" id="btn-save-apikey" style="flex:1;">Simpan API Key</button>
          <button class="btn btn-ghost" id="btn-reset-chat">Reset Chat</button>
        </div>
      </div>

      <div class="pengaturan-section">
        <h2 class="pengaturan-section-title">Tentang</h2>
        <div class="pengaturan-card pengaturan-card-about">
          <p><strong>APK Planner</strong> v1.0.0</p>
          <p>Aplikasi Perencanaan Harian Personal</p>
          <p class="pengaturan-card-desc" style="margin-top:8px;">Data disimpan di browser (IndexedDB). Backup secara berkala untuk menghindari kehilangan data.</p>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
  document.getElementById('btn-export')?.addEventListener('click', handleExport);
  document.getElementById('btn-import')?.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.addEventListener('change', e => {
      if (e.target.files[0]) handleImport(e.target.files[0]);
    });
    input.click();
  });

  const toggleDark = document.getElementById('toggle-darkmode');
  if (toggleDark) {
    toggleDark.addEventListener('change', () => {
      toggleTheme();
    });
  }

  // Load saved API key
  const apiKeyInput = document.getElementById('input-api-key');
  if (apiKeyInput) {
    getApiKey().then(key => {
      if (key) {
        apiKeyInput.value = key;
        setAiApiKey(key);
      }
    });
  }

  const btnSave = document.getElementById('btn-save-apikey');
  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      const key = apiKeyInput.value.trim();
      if (!key) {
        tampilkanToast('Masukkan API Key terlebih dahulu', 'warning');
        return;
      }
      await setApiKey(key);
      setAiApiKey(key);
      tampilkanToast('API Key berhasil disimpan!', 'success');
    });
  }

  const btnReset = document.getElementById('btn-reset-chat');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      tampilkanToast('Riwayat chat akan direset saat next session', 'info');
    });
  }
}

async function handleExport() {
  try {
    const data = await exportData();
    const tgl = data.tanggalEkspor;
    downloadJson(data, `apk-planner-backup-${tgl}.json`);
    tampilkanToast('Data berhasil diekspor!', 'success');
  } catch (err) {
    console.error(err);
    tampilkanToast('Gagal mengekspor data', 'error');
  }
}

async function handleImport(file) {
  try {
    const data = await parseFile(file);
    const hasil = validasiData(data);

    if (!hasil.valid) {
      tampilkanToast(hasil.pesan, 'error');
      return;
    }

    const detail = Object.entries(hasil.count)
      .map(([k, v]) => {
        const label = { jadwal: 'Jadwal', jurnal: 'Jurnal', sesiFokus: 'Sesi Fokus', afirmasi: 'Afirmasi', streakManifestasi: 'Streak', olahraga: 'Olahraga', transaksi: 'Transaksi', aset: 'Aset' };
        return `${label[k] || k}: ${v}`;
      })
      .join('<br>');

    bukaModal({
      judul: 'Impor Data',
      konten: `
        <div style="text-align:center;line-height:1.8">
          <p>Data backup dari: <strong>${hasil.tanggal || '-'}</strong></p>
          <div style="margin:16px 0;padding:12px;background:var(--bg-tertiary);border-radius:12px;font-size:14px;text-align:left;">
            ${detail}
          </div>
          <p style="color:var(--danger);font-weight:600;">Data yang ada saat ini akan ditimpa!</p>
        </div>
      `,
      aksi: [
        { label: 'Batal', id: 'batal', kelas: 'btn-ghost', onClick: tutupModal },
        {
          label: 'Impor',
          id: 'impor',
          kelas: 'btn-primary',
          onClick: async () => {
            try {
              await importData(data);
              tutupModal();
              tampilkanToast('Data berhasil diimpor! Halaman akan dimuat ulang.', 'success');
              setTimeout(() => window.location.reload(), 1500);
            } catch (err) {
              console.error(err);
              tampilkanToast('Gagal mengimpor data', 'error');
            }
          },
        },
      ],
    });
  } catch (err) {
    tampilkanToast(err.message || 'Gagal membaca file', 'error');
  }
}
