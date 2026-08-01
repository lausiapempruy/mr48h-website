/* ==========================================================
   MR48H — config.js
   Satu-satunya tempat "angka ajaib" & konstanta global disimpan.
   Modul lain WAJIB baca dari sini, jangan hardcode ulang di tempat lain.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});

  const config = {
    // ---------------------------------------------------------
    // GANTI dua nilai ini sesuai punya lo, bang, sebelum deploy:
    // ---------------------------------------------------------

    // URL WhatsApp Channel MR48H (fitur "Saluran" WhatsApp, BUKAN nomor pribadi).
    // Sengaja pake Channel, bukan wa.me/nomor — WhatsApp Channel emang
    // didesain buat broadcast publik, followers tinggal ikutin isi kontennya.
    // Format link asli WhatsApp Channel: https://whatsapp.com/channel/<ID_CHANNEL>
    // GANTI placeholder di bawah ini pake link Channel MR48H yang beneran.
    WA_CHANNEL_URL: "https://whatsapp.com/channel/0029VbCnyQTDDmFb64yqT93v",

    // URL Website MR48H yang udah live. Selama masih dev, biarin "#beranda"
    // (link footer "Website MR48H" otomatis balik ke atas halaman ini).
    WEBSITE_URL: "#beranda",

    // ---------------------------------------------------------
    // Target 1 Ramadhan 1448H (WIB / UTC+7)
    // ---------------------------------------------------------
    RAMADAN_TARGET_ISO: "2027-02-08T00:00:00+07:00",

    // ---------------------------------------------------------
    // Path data JSON lokal (frontend-only, gak ada backend)
    // ---------------------------------------------------------
    DATA_PATHS: {
      amalan: "assets/data/amalan-list.json",
      timeline: "assets/data/timeline-data.json"
    },

    // ---------------------------------------------------------
    // Key localStorage — versioned (v1) biar gampang migrasi kalau
    // struktur data berubah di masa depan tanpa nabrak data lama.
    // ---------------------------------------------------------
    STORAGE_KEYS: {
      streak: "mr48h_streak_v1",
      wheelHistory: "mr48h_wheel_history_v1",
      fastingStreak: "mr48h_fasting_streak_v1",
      tilawah: "mr48h_tilawah_v1",
      mutabaah: "mr48h_mutabaah_v1"
    },

    // ---------------------------------------------------------
    // Salt buat checksum anti-tampering localStorage.
    // CATATAN PENTING (biar gak salah paham soal keamanan):
    // ini BUKAN rahasia kriptografis. Semua yang jalan di browser
    // (termasuk string ini) selalu bisa dibaca siapa pun lewat DevTools.
    // Fungsinya cuma buat NGE-DETECT kalau localStorage diedit manual
    // dari console (checksum jadi gak match -> data ditolak & fallback
    // ke default), BUKAN buat mencegah orang yang emang niat ngoprek.
    // Itu batasan wajar untuk aplikasi frontend-only tanpa server.
    // ---------------------------------------------------------
    STORAGE_SALT: "MR48H-1448H-TAZKIYATUNNUFUS",

    // Maksimal riwayat putaran roda yang disimpan (biar localStorage gak bengkak)
    MAX_WHEEL_HISTORY: 30,

    // Durasi animasi spin di CSS (animations.css) = 4.2s. Kasih buffer 100ms
    // biar JS nunggu animasi CSS beres duluan sebelum nampilin hasil.
    SPIN_DURATION_MS: 4300,

    // Rate limit tombol spin: dihitung dari SAAT KLIK, jadi otomatis
    // udah nutupin durasi animasi + kasih jeda ekstra anti-spam.
    WHEEL_COOLDOWN_MS: 6500,

    // ---------------------------------------------------------
    // Ramadhan Tracker
    // ---------------------------------------------------------

    // Total halaman Mushaf Utsmani standar — dipake buat hitung persen tilawah
    TILAWAH_TOTAL_PAGES: 604,

    // Item checklist Mutaba'ah Yaumiyah
    MUTABAAH_ITEMS: [
      { key: "fardhuBerjamaah", label: "Shalat Fardhu Berjamaah" },
      { key: "tarawihWitir", label: "Tarawih / Witir" },
      { key: "sedekahSubuh", label: "Sedekah Subuh" },
      { key: "dhuha", label: "Shalat Dhuha" },
      { key: "tadarus", label: "Tadarus" }
    ],

    // Cooldown toggle checklist tracker (anti-spam klik)
    TRACKER_TOGGLE_COOLDOWN_MS: 400
  };

  // MUTABAAH_ITEMS & DATA_PATHS/STORAGE_KEYS di-freeze terpisah karena array/object nested
  Object.freeze(config.MUTABAAH_ITEMS);

  // Freeze berlapis biar konstanta ini bener-bener immutable dari modul lain
  Object.freeze(config.DATA_PATHS);
  Object.freeze(config.STORAGE_KEYS);
  NS.config = Object.freeze(config);
})();
