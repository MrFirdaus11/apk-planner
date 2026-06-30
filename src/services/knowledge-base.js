import {
  getSemuaJadwal, getSemuaJurnal, getSemuaSesiFokus,
  getAfirmasi, getStreakManifestasi, getSemuaOlahraga,
  getSemuaTransaksi, getSemuaAset, getStatistikMingguan
} from '../store.js';

const FITUR_DOKUMENTASI = `
APK Planner adalah aplikasi perencanaan harian personal berbahasa Indonesia. Fitur:

1. JADWAL — buat jadwal harian (kategori: Kesehatan/Kerja/Pribadi/Belajar/Lainnya), tandai selesai, progress bar
2. FOKUS — Pomodoro timer 25/5/15 menit, catat sesi, pilih tugas dari jadwal
3. JURNAL — catatan harian + mood + tag + foto, auto-save
4. MANIFESTASI — afirmasi pagi/malam, swipe, streak harian, konfeti
5. OLAHRAGA — rencana latihan mingguan, set/rep, drag reorder
6. PROGRES — statistik mingguan, skor progres, insight otomatis
7. KEUANGAN — catat pemasukan/pengeluaran/transfer, multi-aset, rekap bulanan
8. PENGATURAN — backup JSON, dark mode, API key AI

Semua data lokal di browser (IndexedDB).`;

export function getSystemPrompt() {
  return `Kamu adalah asisten AI untuk "APK Planner" — aplikasi perencanaan harian personal berbahasa Indonesia.

${FITUR_DOKUMENTASI}

Gunakan bahasa Indonesia santai, ramah, to the point. Jika ditanya di luar konteks aplikasi, arahkan kembali dengan halus. Beri saran produktivitas/keuangan yang praktis.`;
}

export async function getDataKonteks() {
  const now = new Date();
  const tgl = now.toISOString().slice(0, 10);
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [jadwal, jurnal, sesiFokus, afirmasi, streak, olahraga, transaksi, aset, statsMingguan] =
    await Promise.all([
      getSemuaJadwal(),
      getSemuaJurnal(),
      getSemuaSesiFokus(),
      getAfirmasi(),
      getStreakManifestasi(),
      getSemuaOlahraga(),
      getSemuaTransaksi(),
      getSemuaAset(),
      getStatistikMingguan(now),
    ]);

  const jadwalHariIni = jadwal.filter(j => j.tanggal === tgl);
  const jurnalHariIni = jurnal.find(j => j.tanggal === tgl);
  const jmlSelesai = jadwalHariIni.filter(j => j.selesai).length;
  const totalMenitFokusMinggu = statsMingguan.reduce((s, d) => s + d.totalMenitFokus, 0);
  const rataJadwal = statsMingguan.reduce((s, d) => s + d.persenJadwal, 0) / statsMingguan.length;
  const hariLatihan = olahraga.filter(o => o.fokus || (o.latihan || []).length > 0).length;

  const transBulan = transaksi.filter(t => t.tanggal?.startsWith(`${tahun}-${String(bulan).padStart(2, '0')}`));
  const totalPemasukan = transBulan.filter(t => t.tipe === 'pemasukan').reduce((s, t) => s + t.jumlah, 0);
  const totalPengeluaran = transBulan.filter(t => t.tipe === 'pengeluaran').reduce((s, t) => s + t.jumlah, 0);

  return [
    `=== DATA PENGGUNA ===`,
    `Tanggal: ${tgl}`,
    `Jadwal hari ini: ${jadwalHariIni.length} (${jmlSelesai} selesai)`,
    `Jurnal: ${jurnal.length} entri` + (jurnalHariIni ? ` | Mood: ${jurnalHariIni.mood || '-'}` : ''),
    `Fokus minggu ini: ${totalMenitFokusMinggu} menit (${Math.round(totalMenitFokusMinggu / 60 * 10) / 10} jam)`,
    `Afirmasi streak: ${streak.count} hari`,
    `Olahraga: ${hariLatihan}/${olahraga.length} hari terisi minggu ini`,
    `Keuangan bulan ini: Rp${totalPemasukan.toLocaleString('id-ID')} masuk / Rp${totalPengeluaran.toLocaleString('id-ID')} keluar`,
    `Rata-rata jadwal selesai minggu ini: ${Math.round(rataJadwal)}%`,
    `Skor progres: ${statsMingguan.length ? statsMingguan[statsMingguan.length - 1]?.persenJadwal || 0 : 0}%`,
  ].join('\n');
}
