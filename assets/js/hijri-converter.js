/* ==========================================================
   MR48H — hijri-converter.js
   Algoritma konversi Masehi -> Hijriah (tabular/Kuwaiti algorithm),
   estimasi mengikuti pola kalender NU. Plus fungsi render buat
   kartu tanggal hari ini di section #hijriah.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});

  const HIJRI_MONTHS = [
    "Muharram", "Safar", "Rabiul Awal", "Rabiul Akhir",
    "Jumadil Awal", "Jumadil Akhir", "Rajab", "Sya'ban",
    "Ramadhan", "Syawal", "Dzulqa'dah", "Dzulhijjah"
  ];

  /**
   * Konversi tanggal Masehi ke Hijriah (estimasi tabular).
   * Bisa selisih 1 hari dari hasil rukyat/hisab resmi setempat —
   * makanya di UI selalu dilabelin "estimasi versi NU".
   */
  function gregorianToHijri(date) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    let jd =
      Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
      Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
      Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
      d - 32075;

    let l = jd - 1948440 + 10632;
    const n = Math.floor((l - 1) / 10631);
    l = l - 10631 * n + 354;
    const j =
      Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) +
      Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
    l =
      l -
      Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
      Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
      29;
    const month = Math.floor((24 * l) / 709);
    const day = l - Math.floor((709 * month) / 24);
    const year = 30 * n + j - 30;

    return { day: day, month: month - 1, year: year }; // month 0-based buat index array
  }

  function renderToday() {
    const masehiEl = document.getElementById("masehiDate");
    const hijriEl = document.getElementById("hijriDate");
    if (!masehiEl || !hijriEl) return;

    const today = new Date();
    masehiEl.textContent = today.toLocaleDateString("id-ID", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });

    const h = gregorianToHijri(today);
    const monthName = HIJRI_MONTHS[h.month] || "";
    hijriEl.textContent = h.day + " " + monthName + " " + h.year + "H";
  }

  NS.hijri = {
    HIJRI_MONTHS: HIJRI_MONTHS,
    gregorianToHijri: gregorianToHijri,
    renderToday: renderToday
  };
})();
