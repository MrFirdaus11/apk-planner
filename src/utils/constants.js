// Constants & Default Data
export const KATEGORI = {
  kesehatan: { label: 'Kesehatan', color: '#10B981', bg: '#D1FAE5', icon: 'heart' },
  kerja: { label: 'Kerja', color: '#6C3CE1', bg: '#EDE5FF', icon: 'briefcase' },
  pribadi: { label: 'Pribadi', color: '#EC4899', bg: '#FCE7F3', icon: 'user' },
  belajar: { label: 'Belajar', color: '#F59E0B', bg: '#FEF3C7', icon: 'book' },
  lainnya: { label: 'Lainnya', color: '#6B7280', bg: '#F3F4F6', icon: 'more-horizontal' },
};

export const AFIRMASI_PAGI = [
  'Hari ini saya penuh dengan energi positif dan keberanian',
  'Saya mampu menghadapi setiap tantangan dengan tenang dan bijak',
  'Saya bersyukur atas semua berkah yang hadir dalam hidup saya',
  'Hari ini saya akan menjadi versi terbaik dari diri saya',
  'Saya layak mendapatkan kesuksesan dan kebahagiaan',
  'Pikiran saya jernih, fokus saya kuat, tujuan saya jelas',
  'Saya menarik hal-hal positif ke dalam hidup saya',
  'Setiap langkah kecil membawa saya lebih dekat ke impian',
];

export const AFIRMASI_MALAM = [
  'Hari ini saya telah berusaha sebaik yang saya bisa',
  'Saya melepaskan semua beban dan menyambut istirahat yang nyaman',
  'Saya bangga dengan setiap progres yang saya capai hari ini',
  'Besok adalah kesempatan baru yang penuh dengan kemungkinan',
  'Saya tidur dengan damai dan bangun dengan semangat',
  'Saya berterima kasih atas pelajaran yang hadir hari ini',
  'Tubuh dan pikiran saya pulih sempurna saat tidur',
  'Saya siap menghadapi hari esok dengan penuh keyakinan',
];

export const TIPS_FOKUS = [
  { icon: 'lightbulb', text: 'Istirahat 5 menit setiap 25 menit kerja untuk produktivitas maksimal.' },
  { icon: 'smartphone', text: 'Matikan notifikasi HP selama sesi fokus untuk konsentrasi penuh.' },
  { icon: 'droplets', text: 'Minum air putih yang cukup — dehidrasi menurunkan konsentrasi 20%.' },
  { icon: 'music', text: 'Musik instrumental atau white noise dapat meningkatkan fokus.' },
  { icon: 'target', text: 'Tentukan satu prioritas utama di pagi hari sebelum memulai kerja.' },
  { icon: 'sun', text: 'Sinar matahari pagi meningkatkan energi dan suasana hati sepanjang hari.' },
];

export const TIMER_PRESET = {
  fokus: 25 * 60,       // 25 menit
  istirahatPendek: 5 * 60,  // 5 menit
  istirahatPanjang: 15 * 60, // 15 menit
  sesiPerSiklus: 4,
};

export const HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const HARI_PANJANG = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const MOOD_LIST = [
  { value: 'buruk', emoji: '😟', label: 'Kurang Baik' },
  { value: 'biasa', emoji: '😐', label: 'Biasa Saja' },
  { value: 'baik', emoji: '😊', label: 'Sangat Baik' },
];

export const JAM_REMINDER_MALAM = { jam: 21, menit: 30 };
export const PESAN_REMINDER = 'Ayoo siapkan planning untuk hari besok! 📋';

// ─── KEUANGAN ─────────────────────────────────────────────────────────────────
export const KATEGORI_KEUANGAN = {
  // Pemasukan
  gaji: { label: 'Gaji', color: '#10B981', bg: '#D1FAE5', icon: 'briefcase', tipe: 'pemasukan' },
  freelance: { label: 'Freelance', color: '#3B82F6', bg: '#DBEAFE', icon: 'laptop', tipe: 'pemasukan' },
  investasi: { label: 'Investasi', color: '#8B5CF6', bg: '#EDE5FF', icon: 'trending-up', tipe: 'pemasukan' },
  hadiah: { label: 'Hadiah', color: '#F59E0B', bg: '#FEF3C7', icon: 'gift', tipe: 'pemasukan' },
  pemasukan_lain: { label: 'Lainnya', color: '#6B7280', bg: '#F3F4F6', icon: 'plus-circle', tipe: 'pemasukan' },

  // Pengeluaran
  makanan: { label: 'Makanan', color: '#EF4444', bg: '#FEE2E2', icon: 'utensils', tipe: 'pengeluaran' },
  transportasi: { label: 'Transportasi', color: '#F97316', bg: '#FFEDD5', icon: 'car', tipe: 'pengeluaran' },
  belanja: { label: 'Belanja', color: '#EC4899', bg: '#FCE7F3', icon: 'shopping-bag', tipe: 'pengeluaran' },
  tagihan: { label: 'Tagihan', color: '#6366F1', bg: '#E0E7FF', icon: 'file-text', tipe: 'pengeluaran' },
  hiburan: { label: 'Hiburan', color: '#14B8A6', bg: '#D1FAE5', icon: 'film', tipe: 'pengeluaran' },
  kesehatan: { label: 'Kesehatan', color: '#10B981', bg: '#D1FAE5', icon: 'heart-pulse', tipe: 'pengeluaran' },
  pendidikan: { label: 'Pendidikan', color: '#8B5CF6', bg: '#EDE5FF', icon: 'book-open', tipe: 'pengeluaran' },
  pengeluaran_lain: { label: 'Lainnya', color: '#6B7280', bg: '#F3F4F6', icon: 'more-horizontal', tipe: 'pengeluaran' },
};

export const KATEGORI_BY_TIPE = {
  pemasukan: Object.fromEntries(
    Object.entries(KATEGORI_KEUANGAN).filter(([, v]) => v.tipe === 'pemasukan')
  ),
  pengeluaran: Object.fromEntries(
    Object.entries(KATEGORI_KEUANGAN).filter(([, v]) => v.tipe === 'pengeluaran')
  ),
};

export const ASET_DEFAULT = [
  { id: 'aset-tunai', nama: 'Tunai', tipe: 'cash', warna: '#10B981', icon: 'wallet' },
  { id: 'aset-bank', nama: 'Bank', tipe: 'bank', warna: '#3B82F6', icon: 'building' },
  { id: 'aset-kartu', nama: 'Kartu', tipe: 'kartu', warna: '#8B5CF6', icon: 'credit-card' },
];
