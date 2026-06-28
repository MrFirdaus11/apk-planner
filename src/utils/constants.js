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
