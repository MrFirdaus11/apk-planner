import {
  getSemuaJadwal, getSemuaJurnal, getSemuaSesiFokus,
  getAfirmasi, getStreakManifestasi, getSemuaOlahraga,
  getSemuaTransaksi, getSemuaAset, getStatistikMingguan
} from '../store.js';

const FITUR_DOKUMENTASI = `
APK Planner adalah aplikasi perencanaan harian personal berbahasa Indonesia. Berikut fitur-fiturnya:

1. JADWAL (Schedule)
   - Membuat jadwal harian dengan judul, kategori (Kesehatan/Kerja/Pribadi/Belajar/Lainnya), waktu mulai-selesai, lokasi
   - Tandai jadwal selesai dengan swipe atau checkbox
   - Lihat jadwal per tanggal
   - Progress bar penyelesaian jadwal harian

2. FOKUS (Pomodoro Timer)
   - Timer 25 menit fokus, 5 menit istirahat pendek, 15 menit istirahat panjang
   - Bisa memilih tugas dari jadwal hari ini
   - Catat sesi fokus yang已完成
   - Tips produktivitas (mati notif, minum air, musik instrumental)

3. JURNAL (Journal/Diary)
   - Catatan harian dengan mood (Kurang Baik/Biasa Saja/Sangat Baik)
   - Ide pertanyaan dari AI (berdasarkan mood dan waktu)
   - Tag dan foto (dikompres otomatis)
   - Auto-save saat mengetik
   - Riwayat jurnal per bulan

4. MANIFESTASI (Affirmations)
   - Kartu afirmasi pagi dan malam
   - Afirmasi default + afirmasi kustom buatan sendiri
   - Swipe untuk lihat afirmasi berikutnya
   - Repetisi 5x dengan counter
   - Streck harian (data disimpan otomatis)
   - Konfeti saat streak bertambah

5. OLAHRAGA (Exercise)
   - Perencanaan latihan mingguan (Senin-Minggu)
   - Tiap hari: fokus latihan, lokasi (rumah/gym), durasi
   - Drag untuk urutkan latihan dalam satu hari
   - Set dan rep untuk tiap latihan
   - Swipe untuk hapus latihan

6. PROGRES (Statistics)
   - Statistik mingguan: penyelesaian jadwal, total menit fokus, konsistensi jurnal
   - Skor progres (0-100) dari kombinasi jadwal, fokus, dan jurnal
   - Insight otomatis berdasarkan data minggu ini

7. KEUANGAN (Finance)
   - Catat pemasukan dan pengeluaran
   - Multi-aset (Tunai, Bank, Kartu)
   - Transfer antar aset
   - Kategori keuangan: Makanan, Transportasi, Belanja, Tagihan, Hiburan, dll
   - Rekap bulanan: total pemasukan, pengeluaran, selisih
   - Filter berdasarkan bulan

8. PENGATURAN (Settings)
   - Ekspor/Impor data JSON (backup)
   - Mode gelap (Dark mode)
   - Pengaturan API Key AI Chat

Semua data disimpan di browser (IndexedDB) dan tidak dikirim ke server manapun selain AI API.
`;

export function getSystemPrompt() {
  return `Kamu adalah asisten AI yang membantu pengguna aplikasi "APK Planner" — aplikasi perencanaan harian personal berbahasa Indonesia.

${FITUR_DOKUMENTASI}

Gunakan bahasa Indonesia yang santai, ramah, dan hangat seperti teman ngobrol. Berikan jawaban yang informatif, jelas, dan to the point. Jika ditanya di luar konteks aplikasi (misal: matematika, coding, berita), arahkan kembali ke topik aplikasi dengan halus.

Jika pengguna bertanya soal tips produktivitas, manajemen waktu, atau keuangan pribadi, berikan saran yang praktis dan bisa langsung diterapkan.`;
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
  const pemasukan = transaksi.filter(t => t.tipe === 'pemasukan');
  const pengeluaran = transaksi.filter(t => t.tipe === 'pengeluaran');
  const totalPemasukan = pemasukan.reduce((s, t) => s + t.jumlah, 0);
  const totalPengeluaran = pengeluaran.reduce((s, t) => s + t.jumlah, 0);
  const jurnalHariIni = jurnal.find(j => j.tanggal === tgl);
  const totalMenitFokusMinggu = statsMingguan.reduce((s, d) => s + d.totalMenitFokus, 0);
  const rataJadwal = statsMingguan.reduce((s, d) => s + d.persenJadwal, 0) / statsMingguan.length;

  const lines = [
    '=== DATA PENGGUNA SAAT INI ===',
    `Tanggal: ${tgl}`,
    '',
    '--- JADWAL HARI INI ---',
    jadwalHariIni.length
      ? jadwalHariIni.map(j => `- ${j.judul} (${j.waktuMulai}-${j.waktuSelesai}) [${j.selesai ? '✓ SELESAI' : '○ BELUM'}]`).join('\n')
      : 'Tidak ada jadwal hari ini.',
    '',
    '--- JURNAL ---',
    jurnalHariIni
      ? `Mood: ${jurnalHariIni.mood || '-'} | Ada catatan: ${jurnalHariIni.konten ? 'Ya' : 'Tidak'}`
      : 'Belum ada jurnal hari ini.',
    `Total entri jurnal: ${jurnal.length}`,
    '',
    '--- FOKUS ---',
    `Sesi fokus total: ${sesiFokus.length}`,
    `Total menit fokus minggu ini: ${totalMenitFokusMinggu}`,
    '',
    '--- MANIFESTASI ---',
    `Streak saat ini: ${streak.count} hari`,
    `Afirmasi kustom pagi: ${(afirmasi.kustom_pagi || []).length}`,
    `Afirmasi kustom malam: ${(afirmasi.kustom_malam || []).length}`,
    '',
    '--- OLAHRAGA ---',
    olahraga.length
      ? olahraga.map(o => {
          const latihan = (o.latihan || []).length;
          return `- ${o.hari}: ${o.fokus || 'Tidak ada'} (${latihan} latihan)`;
        }).join('\n')
      : 'Belum ada data olahraga.',
    '',
    '--- PROGRES ---',
    `Rata-rata penyelesaian jadwal minggu ini: ${Math.round(rataJadwal)}%`,
    ...statsMingguan.map(s => `  ${s.tanggal}: ${s.persenJadwal}% jadwal selesai, ${s.totalMenitFokus} menit fokus${s.adaJurnal ? ', ada jurnal' : ''}`),
    '',
    '--- KEUANGAN ---',
    `Total pemasukan: Rp${totalPemasukan.toLocaleString('id-ID')}`,
    `Total pengeluaran: Rp${totalPengeluaran.toLocaleString('id-ID')}`,
    `Selisih: Rp${(totalPemasukan - totalPengeluaran).toLocaleString('id-ID')}`,
    `Jumlah aset: ${aset.length}`,
    transaksi.length
      ? `Total transaksi tercatat: ${transaksi.length}`
      : 'Belum ada transaksi.',
    '',
    '=== AKHIR DATA PENGGUNA ===',
  ];

  return lines.join('\n');
}
