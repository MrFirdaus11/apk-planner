import { get, set } from 'idb-keyval';

const KEY_DATA = ['jadwal', 'jurnal', 'sesiFokus', 'afirmasi', 'streakManifestasi'];
const VERSI = 1;

export async function exportData() {
  const data = {};
  for (const key of KEY_DATA) {
    data[key] = (await get(key)) || null;
  }
  return {
    namaApp: 'APK Planner',
    versi: VERSI,
    tanggalEkspor: new Date().toISOString().split('T')[0],
    data,
  };
}

export function downloadJson(obj, filename = 'apk-planner-backup.json') {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        resolve(JSON.parse(e.target.result));
      } catch {
        reject(new Error('File bukan JSON valid'));
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

export function validasiData(data) {
  if (!data || data.namaApp !== 'APK Planner' || !data.data) {
    return { valid: false, pesan: 'File bukan backup APK Planner yang valid.' };
  }

  const keysAda = Object.keys(data.data);
  const missing = KEY_DATA.filter(k => !keysAda.includes(k));

  if (missing.length > 0) {
    return { valid: false, pesan: `Data tidak lengkap. Kurang: ${missing.join(', ')}` };
  }

  const count = {};
  for (const key of KEY_DATA) {
    const val = data.data[key];
    if (Array.isArray(val)) count[key] = val.length;
    else if (val && typeof val === 'object') count[key] = 1;
    else count[key] = 0;
  }

  return { valid: true, count, tanggal: data.tanggalEkspor };
}

export async function importData(data) {
  for (const key of KEY_DATA) {
    await set(key, data.data[key] || []);
  }
}
