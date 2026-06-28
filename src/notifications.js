import { getWaktuBerikutnya, selisihMsKewaktu, formatTanggalPendek } from './utils/date-utils.js';
import { JAM_REMINDER_MALAM, PESAN_REMINDER } from './utils/constants.js';
import { getJadwalByTanggal } from './store.js';

let scheduledTimeouts = new Map();

// ─── PERMISSION ──────────────────────────────────────────────────────────────
export async function mintaIzinNotifikasi() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function izinDiberikan() {
  return 'Notification' in window && Notification.permission === 'granted';
}

// ─── KIRIM NOTIFIKASI ─────────────────────────────────────────────────────────
export function kirimNotifikasi(judul, opsi = {}) {
  if (!izinDiberikan()) return;
  const defaultOpsi = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: false,
    ...opsi,
  };
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title: judul,
        options: defaultOpsi,
      });
    } else {
      new Notification(judul, defaultOpsi);
    }
  } catch (e) {
    new Notification(judul, defaultOpsi);
  }
}

// ─── JADWALKAN NOTIFIKASI JADWAL ──────────────────────────────────────────────
export function jadwalkanNotifikasiJadwal(jadwal) {
  if (!jadwal.id || !jadwal.waktuMulai || !jadwal.tanggal) return;

  // Batalkan jika sudah ada
  batalkanNotifikasiJadwal(jadwal.id);

  const selisihMs = selisihMsKewaktu(jadwal.waktuMulai, jadwal.tanggal);
  if (selisihMs <= 0) return; // Sudah lewat

  const timeoutId = setTimeout(() => {
    kirimNotifikasi(`⏰ ${jadwal.judul}`, {
      body: `${jadwal.waktuMulai} - ${jadwal.waktuSelesai} • ${jadwal.kategori ? jadwal.kategori.charAt(0).toUpperCase() + jadwal.kategori.slice(1) : ''}${jadwal.lokasi ? '\n📍 ' + jadwal.lokasi : ''}`,
      tag: `jadwal-${jadwal.id}`,
    });
    scheduledTimeouts.delete(jadwal.id);
  }, selisihMs);

  scheduledTimeouts.set(jadwal.id, timeoutId);

  // Juga kirim ke service worker untuk background
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      id: jadwal.id,
      title: `⏰ ${jadwal.judul}`,
      body: `${jadwal.waktuMulai} • ${jadwal.judul}`,
      timestamp: Date.now() + selisihMs,
    });
  }
}

export function batalkanNotifikasiJadwal(id) {
  if (scheduledTimeouts.has(id)) {
    clearTimeout(scheduledTimeouts.get(id));
    scheduledTimeouts.delete(id);
  }
}

// ─── RESCHEDULE SEMUA JADWAL HARI INI ────────────────────────────────────────
export async function rescheduleSemuaJadwal() {
  const tglHariIni = formatTanggalPendek();
  const jadwalHariIni = await getJadwalByTanggal(tglHariIni);
  jadwalHariIni.forEach(j => {
    if (!j.selesai) jadwalkanNotifikasiJadwal(j);
  });
}

// ─── REMINDER HARIAN 21:30 ───────────────────────────────────────────────────
let reminderTimeoutId = null;

export function jadwalkanReminderHarian() {
  if (reminderTimeoutId) clearTimeout(reminderTimeoutId);

  const target = getWaktuBerikutnya(JAM_REMINDER_MALAM.jam, JAM_REMINDER_MALAM.menit);
  const selisihMs = target.getTime() - Date.now();

  reminderTimeoutId = setTimeout(() => {
    kirimNotifikasi('📋 Pengingat Malam', {
      body: PESAN_REMINDER,
      tag: 'reminder-malam',
      requireInteraction: true,
    });
    // Jadwalkan lagi untuk keesokan hari
    jadwalkanReminderHarian();
  }, selisihMs);

  // Kirim ke service worker untuk backup saat app tertutup
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'SCHEDULE_DAILY_REMINDER',
      jam: JAM_REMINDER_MALAM.jam,
      menit: JAM_REMINDER_MALAM.menit,
      title: '📋 Pengingat Malam',
      body: PESAN_REMINDER,
    });
  }
}

// ─── INISIALISASI ─────────────────────────────────────────────────────────────
export async function initNotifikasi() {
  const granted = await mintaIzinNotifikasi();
  if (!granted) return false;

  await rescheduleSemuaJadwal();
  jadwalkanReminderHarian();
  return true;
}
