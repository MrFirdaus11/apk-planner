import { HARI_SINGKAT, HARI_PANJANG, BULAN } from './constants.js';

export function formatTanggalPanjang(date = new Date()) {
  const d = new Date(date);
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatTanggalPendek(date = new Date()) {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${yyyy}-${mm}-${dd}`;
}

export function formatWaktu(date = new Date()) {
  const d = new Date(date);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function getNamaHari(date = new Date(), panjang = false) {
  const d = new Date(date);
  return panjang ? HARI_PANJANG[d.getDay()] : HARI_SINGKAT[d.getDay()];
}

export function getMingguIni(date = new Date()) {
  const d = new Date(date);
  const hari = d.getDay(); // 0=Min
  const senin = new Date(d);
  senin.setDate(d.getDate() - (hari === 0 ? 6 : hari - 1));

  const minggu = [];
  for (let i = 0; i < 7; i++) {
    const tgl = new Date(senin);
    tgl.setDate(senin.getDate() + i);
    minggu.push(tgl);
  }
  return minggu;
}

export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

export function isToday(date) {
  return isSameDay(date, new Date());
}

export function getWaktuDalamMenit(waktuStr) {
  // waktuStr format: "HH:MM"
  const [jam, menit] = waktuStr.split(':').map(Number);
  return jam * 60 + menit;
}

export function hitungDurasi(waktuMulai, waktuSelesai) {
  const mulai = getWaktuDalamMenit(waktuMulai);
  const selesai = getWaktuDalamMenit(waktuSelesai);
  const diff = selesai - mulai;
  if (diff <= 0) return '';
  const jam = Math.floor(diff / 60);
  const menit = diff % 60;
  if (jam > 0 && menit > 0) return `${jam} jam ${menit} menit`;
  if (jam > 0) return `${jam} jam`;
  return `${menit} menit`;
}

export function formatDetik(totalDetik) {
  const menit = Math.floor(totalDetik / 60);
  const detik = totalDetik % 60;
  return `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
}

export function getWaktuBerikutnya(jam, menit) {
  const sekarang = new Date();
  const target = new Date();
  target.setHours(jam, menit, 0, 0);
  if (target <= sekarang) {
    target.setDate(target.getDate() + 1);
  }
  return target;
}

export function selisihMsKewaktu(waktuStr, tanggalStr = null) {
  const tanggal = tanggalStr ? new Date(tanggalStr) : new Date();
  const [jam, menit] = waktuStr.split(':').map(Number);
  const target = new Date(tanggal);
  target.setHours(jam, menit, 0, 0);
  return target.getTime() - Date.now();
}

export function formatDurasiMenit(totalMenit) {
  if (totalMenit < 60) return `${totalMenit} Menit`;
  const jam = Math.floor(totalMenit / 60);
  const sisa = totalMenit % 60;
  if (sisa === 0) return `${jam} Jam`;
  return `${jam}.${Math.round(sisa / 6)} Jam`;
}
