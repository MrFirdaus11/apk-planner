const PROMPTS = {
  kurang: {
    pagi: [
      'Apa satu hal kecil yang bisa kamu syukuri pagi ini?',
      'Apa yang bisa kamu lakukan hari ini untuk merawat dirimu sendiri?',
      'Jika hari ini adalah kanvas kosong, warna apa yang ingin kamu lukis?',
      'Apa satu hal yang membuatmu bangun pagi ini?',
      'Bagaimana kamu bisa memberikan ruang untuk perasaanmu hari ini?',
    ],
    siang: [
      'Apa yang paling memberatkanmu saat ini? Tuliskan tanpa perlu menyelesaikannya.',
      'Apa satu pencapaian kecil yang sudah kamu lakukan hari ini?',
      'Jika seorang teman baik ada di posisimu, apa yang akan kamu katakan padanya?',
      'Apa yang bisa kamu lepaskan saat ini untuk merasa lebih ringan?',
      'Adakah hal kecil yang membuatmu tersenyum hari ini?',
    ],
    malam: [
      'Apa satu hal baik yang terjadi hari ini, sekecil apapun itu?',
      'Jika kamu bisa memeluk dirimu yang lebih muda, apa yang akan kamu katakan?',
      'Apa yang kamu butuhkan saat ini untuk merasa lebih tenang?',
      'Besok adalah kesempatan baru. Satu hal yang kamu harap besok berbeda?',
      'Tulis satu kalimat afirmasi untuk dirimu malam ini.',
    ],
  },
  biasa: {
    pagi: [
      'Apa yang ingin kamu capai hari ini, sekecil apapun itu?',
      'Bagaimana kamu ingin perasaanmu di akhir hari nanti?',
      'Apa satu kebiasaan kecil yang ingin kamu mulai hari ini?',
      'Apa yang paling kamu nantikan hari ini?',
      'Jika hari ini punya tema, apa judulnya?',
    ],
    siang: [
      'Bagaimana progresmu hari ini? Apa yang sudah dan belum dilakukan?',
      'Apa yang menarik perhatianmu hari ini? Bisa apa saja.',
      'Apakah ada momen yang membuatmu berpikir "oh, menarik"?',
      'Apa yang bisa kamu lakukan di sisa hari untuk membuatnya lebih bermakna?',
      'Tulis tentang percakapan atau interaksi yang kamu alami hari ini.',
    ],
    malam: [
      'Apa momen terbaik hari ini? Ceritakan secara detail.',
      'Apa yang kamu pelajari hari ini, dari siapapun atau apapun?',
      'Skala 1-10, bagaimana harimu? Apa yang membuat skor itu naik atau turun?',
      'Apa yang ingin kamu lakukan lebih sering? Apa yang ingin kamu kurangi?',
      'Tulis 3 hal yang kamu syukuri hari ini — sekecil apapun.',
    ],
  },
  baik: {
    pagi: [
      'Apa yang membuatmu bersemangat hari ini?',
      'Apa satu hal hari ini yang paling kamu tunggu-tunggu?',
      'Jika hari ini sempurna, seperti apa jadinya?',
      'Apa kekuatan yang kamu bawa hari ini?',
      'Siapa atau apa yang membuatmu merasa baik akhir-akhir ini?',
    ],
    siang: [
      'Apa momen terbaik hari ini sejauh ini?',
      'Apa yang sedang berjalan dengan baik dalam hidupmu saat ini?',
      'Adakah seseorang yang ingin kamu hargai atau berterima kasih hari ini?',
      'Apa yang membuatmu merasa hidup dan bersemangat?',
      'Tulis tentang sesuatu yang membuatmu bangga pada dirimu sendiri.',
    ],
    malam: [
      'Apa highlight hari ini? Ceritakan semuanya!',
      'Apa yang membuat hari ini spesial? Besar atau kecil, semua berarti.',
      'Bagaimana kamu bisa membawa energi positif ini ke besok?',
      'Siapa yang berkontribusi pada kebahagiaanmu hari ini?',
      'Tulis pesan untuk dirimu di masa depan tentang hari yang luar biasa ini.',
    ],
  },
};

const PROMPTS_WEEKEND = {
  kurang: {
    pagi: [
      'Apa satu hal yang kamu nantikan akhir pekan ini?',
      'Apa yang bisa kamu lakukan untuk recharge energi akhir pekan ini?',
    ],
    siang: [
      'Apa aktivitas santai yang bisa mengangkat moodmu saat ini?',
      'Apa yang biasanya kamu lakukan untuk merasa lebih baik di akhir pekan?',
    ],
    malam: [
      'Apa satu momen menyenangkan akhir pekan ini?',
      'Bagaimana kamu bisa istirahat lebih baik malam ini?',
    ],
  },
  biasa: {
    pagi: [
      'Apa rencana santaimu akhir pekan ini?',
      'Apa yang ingin kamu lakukan hanya untuk bersenang-senang?',
    ],
    siang: [
      'Apa yang kamu lakukan untuk mengisi ulang energimu hari ini?',
      'Apa hal terbaik tentang akhir pekan menurutmu?',
    ],
    malam: [
      'Apa hal paling menyenangkan yang kamu lakukan akhir pekan ini?',
      'Bagaimana akhir pekan ini menurutmu? Apa yang membuatnya spesial?',
    ],
  },
  baik: {
    pagi: [
      'Apa rencana seru akhir pekan ini?',
      'Dengan siapa kamu ingin menghabiskan waktu akhir pekan ini?',
    ],
    siang: [
      'Apa hal terbaik yang sudah kamu lakukan akhir pekan ini?',
      'Apa yang membuat akhir pekan ini terasa istimewa?',
    ],
    malam: [
      'Apa kenangan terbaik akhir pekan ini?',
      'Bagaimana kamu ingin mengingat akhir pekan ini? Apa yang membuatnya bermakna?',
    ],
  },
};

function getWaktu() {
  const jam = new Date().getHours();
  if (jam < 11) return 'pagi';
  if (jam < 17) return 'siang';
  return 'malam';
}

function isWeekend() {
  const hari = new Date().getDay();
  return hari === 0 || hari === 6;
}

export function generatePrompts(mood) {
  const waktu = getWaktu();
  const weekend = isWeekend();
  const pool = weekend ? PROMPTS_WEEKEND : PROMPTS;
  const list = pool[mood]?.[waktu] || PROMPTS[mood]?.[waktu] || PROMPTS.biasa.siang;
  const shuffled = [...list].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3);
}
