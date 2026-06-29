import { get, set, del, keys } from 'idb-keyval';
import { formatTanggalPendek } from './utils/date-utils.js';

// ─── JADWAL ──────────────────────────────────────────────────────────────────
export async function simpanJadwal(jadwal) {
  const semua = await getSemuaJadwal();
  const idx = semua.findIndex(j => j.id === jadwal.id);
  if (idx >= 0) semua[idx] = jadwal;
  else semua.push(jadwal);
  await set('jadwal', semua);
  return jadwal;
}

export async function getSemuaJadwal() {
  return (await get('jadwal')) || [];
}

export async function getJadwalByTanggal(tanggal) {
  const semua = await getSemuaJadwal();
  const tglStr = typeof tanggal === 'string' ? tanggal : formatTanggalPendek(tanggal);
  return semua
    .filter(j => j.tanggal === tglStr)
    .sort((a, b) => a.waktuMulai.localeCompare(b.waktuMulai));
}

export async function hapusJadwal(id) {
  const semua = await getSemuaJadwal();
  await set('jadwal', semua.filter(j => j.id !== id));
}

export async function toggleJadwalSelesai(id) {
  const semua = await getSemuaJadwal();
  const jadwal = semua.find(j => j.id === id);
  if (jadwal) {
    jadwal.selesai = !jadwal.selesai;
    await set('jadwal', semua);
    return jadwal;
  }
}

// ─── JURNAL ──────────────────────────────────────────────────────────────────
export async function simpanJurnal(entry) {
  const semua = await getSemuaJurnal();
  const tglStr = entry.tanggal || formatTanggalPendek();
  const idx = semua.findIndex(j => j.tanggal === tglStr);
  const data = { ...entry, tanggal: tglStr, diperbarui: Date.now() };
  if (idx >= 0) semua[idx] = data;
  else semua.push(data);
  await set('jurnal', semua);
  return data;
}

export async function getSemuaJurnal() {
  return (await get('jurnal')) || [];
}

export async function getJurnalByTanggal(tanggal) {
  const semua = await getSemuaJurnal();
  const tglStr = typeof tanggal === 'string' ? tanggal : formatTanggalPendek(tanggal);
  return semua.find(j => j.tanggal === tglStr) || null;
}

// ─── SESI FOKUS ──────────────────────────────────────────────────────────────
export async function simpanSesiFokus(sesi) {
  const semua = await getSemuaSesiFokus();
  const idx = semua.findIndex(s => s.id === sesi.id);
  if (idx >= 0) semua[idx] = sesi;
  else semua.push(sesi);
  await set('sesiFokus', semua);
  return sesi;
}

export async function getSemuaSesiFokus() {
  return (await get('sesiFokus')) || [];
}

export async function getSesiFokusByTanggal(tanggal) {
  const semua = await getSemuaSesiFokus();
  const tglStr = typeof tanggal === 'string' ? tanggal : formatTanggalPendek(tanggal);
  return semua.filter(s => s.tanggal === tglStr);
}

// ─── AFIRMASI ─────────────────────────────────────────────────────────────────
export async function getAfirmasi() {
  return (await get('afirmasi')) || { kustom_pagi: [], kustom_malam: [] };
}

export async function simpanAfirmasiKustom(tipe, teks) {
  const data = await getAfirmasi();
  const key = `kustom_${tipe}`;
  if (!data[key]) data[key] = [];
  data[key].push({ id: Date.now().toString(), teks, tipe });
  await set('afirmasi', data);
}

export async function getStreakManifestasi() {
  return (await get('streakManifestasi')) || { count: 0, terakhir: null };
}

export async function updateStreakManifestasi(tanggal) {
  const streak = await getStreakManifestasi();
  const kemarin = new Date();
  kemarin.setDate(kemarin.getDate() - 1);
  const tglKemarin = formatTanggalPendek(kemarin);

  if (streak.terakhir === tanggal) return streak; // Sudah update hari ini
  if (streak.terakhir === tglKemarin) {
    streak.count += 1; // Lanjutkan streak
  } else if (streak.terakhir !== tanggal) {
    streak.count = 1; // Reset streak
  }
  streak.terakhir = tanggal;
  await set('streakManifestasi', streak);
  return streak;
}

// ─── OLAHRAGA ─────────────────────────────────────────────────────────────────
export async function getSemuaOlahraga() {
  return (await get('olahraga')) || [];
}

export async function simpanOlahraga(hariLatihan) {
  const semua = await getSemuaOlahraga();
  const idx = semua.findIndex(o => o.id === hariLatihan.id);
  if (idx >= 0) semua[idx] = hariLatihan;
  else semua.push(hariLatihan);
  await set('olahraga', semua);
  return hariLatihan;
}

export async function getOlahragaByHari(hari) {
  const semua = await getSemuaOlahraga();
  return semua.find(o => o.hari === hari) || null;
}

export async function hapusOlahraga(id) {
  const semua = await getSemuaOlahraga();
  await set('olahraga', semua.filter(o => o.id !== id));
}

export async function initOlahragaDefault() {
  const semua = await getSemuaOlahraga();
  if (semua.length > 0) return;
  const hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  const defaultData = hariList.map(hari => ({
    id: `olahraga-${hari.toLowerCase()}`,
    hari,
    fokus: '',
    lokasi: 'rumah',
    durasi: 0,
    latihan: [],
  }));
  await set('olahraga', defaultData);
}

// ─── STATISTIK ───────────────────────────────────────────────────────────────
export async function getStatistikHarian(tanggal) {
  const tglStr = typeof tanggal === 'string' ? tanggal : formatTanggalPendek(tanggal);
  const jadwals = await getJadwalByTanggal(tglStr);
  const sesiList = await getSesiFokusByTanggal(tglStr);
  const jurnal = await getJurnalByTanggal(tglStr);

  const totalJadwal = jadwals.length;
  const selesai = jadwals.filter(j => j.selesai).length;
  const totalMenitFokus = sesiList.reduce((sum, s) => sum + (s.menitSelesai || 0), 0);

  return {
    tanggal: tglStr,
    totalJadwal,
    jadwalSelesai: selesai,
    persenJadwal: totalJadwal > 0 ? Math.round((selesai / totalJadwal) * 100) : 0,
    totalMenitFokus,
    adaJurnal: !!jurnal,
    mood: jurnal?.mood || null,
  };
}

export async function getStatistikMingguan(tanggalAcuan = new Date()) {
  const hasil = [];
  for (let i = 6; i >= 0; i--) {
    const tgl = new Date(tanggalAcuan);
    tgl.setDate(tgl.getDate() - i);
    const stat = await getStatistikHarian(tgl);
    hasil.push(stat);
  }
  return hasil;
}

export function hitungSkorProgres(stats) {
  if (!stats || stats.length === 0) return 0;

  let totalSkor = 0;
  let hariDenganAktivitas = 0;

  for (const stat of stats) {
    let skorHari = 0;
    if (stat.totalJadwal > 0) {
      skorHari += stat.persenJadwal * 0.5; // 50% dari skor jadwal
    }
    if (stat.totalMenitFokus > 0) {
      skorHari += Math.min(stat.totalMenitFokus / 120, 1) * 30; // Max 30 poin per 2 jam fokus
    }
    if (stat.adaJurnal) skorHari += 20; // 20 poin per jurnal

    if (stat.totalJadwal > 0 || stat.totalMenitFokus > 0 || stat.adaJurnal) {
      hariDenganAktivitas++;
    }
    totalSkor += skorHari;
  }

  return hariDenganAktivitas > 0 ? Math.round(totalSkor / hariDenganAktivitas) : 0;
}

export function generateInsight(statsMingguan) {
  const totalMenitFokus = statsMingguan.reduce((s, d) => s + d.totalMenitFokus, 0);
  const rataJadwal = statsMingguan.reduce((s, d) => s + d.persenJadwal, 0) / statsMingguan.length;
  const hariDenganJurnal = statsMingguan.filter(d => d.adaJurnal).length;

  const insights = [];

  if (rataJadwal >= 80) {
    insights.push(`Luar biasa! Penyelesaian jadwal Anda minggu ini mencapai ${Math.round(rataJadwal)}%. Pertahankan konsistensi ini!`);
  } else if (rataJadwal >= 50) {
    insights.push(`Progres yang baik! Anda menyelesaikan rata-rata ${Math.round(rataJadwal)}% jadwal harian. Terus tingkatkan!`);
  } else {
    insights.push(`Mulailah dengan jadwal yang lebih sedikit namun konsisten. Kualitas lebih penting dari kuantitas.`);
  }

  if (totalMenitFokus >= 300) {
    const jam = (totalMenitFokus / 60).toFixed(1);
    insights.push(`Total ${jam} jam fokus minggu ini — Anda lebih produktif dari kebanyakan orang!`);
  }

  if (hariDenganJurnal >= 5) {
    insights.push(`Konsistensi jurnal Anda luar biasa (${hariDenganJurnal}/7 hari). Refleksi diri adalah kunci pertumbuhan.`);
  }

  return insights[0] || 'Mulai catat aktivitas Anda untuk mendapatkan insight personal yang lebih akurat.';
}
