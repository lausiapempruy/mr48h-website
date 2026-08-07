/* ==========================================================
   MR48H — tracker.js
   Ramadhan Tracker: dashboard ibadah harian tersimpan aman di
   localStorage (via storage.js) — streak puasa, progres tilawah
   menuju khatam, checklist mutaba'ah yaumiyah, dan share ringkasan
   progres ke WhatsApp.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});

  // Diambil lazy di dalam fungsi (bukan top-level) — konsisten sama
  // perbaikan di countdown.js & wheel-game.js biar gak ada satu pun
  // statement top-level yang bisa throw dan bikin NS.tracker gagal kebentuk.
  function deps() {
    return { config: NS.config, security: NS.security, storage: NS.storage };
  }

  let checklistRateLimiter = null;
  function getChecklistRateLimiter() {
    if (!checklistRateLimiter) {
      const cooldown = (NS.config && NS.config.TRACKER_TOGGLE_COOLDOWN_MS) || 400;
      checklistRateLimiter = NS.security.createRateLimiter(cooldown);
    }
    return checklistRateLimiter;
  }

  /* ---------------------------------------------------------
     Streak Puasa
     --------------------------------------------------------- */

  function renderFastingStreak() {
    const { storage } = deps();
    const countEl = document.getElementById("fastingStreakCount");
    const btn = document.getElementById("fastingToggleBtn");
    if (!countEl || !btn || !storage) return;

    const streak = storage.getFastingStreak();
    countEl.textContent = String(streak.count);

    if (storage.hasFastedToday()) {
      btn.disabled = true;
      btn.textContent = "Alhamdulillah, Puasa Hari Ini ✓";
    } else {
      btn.disabled = false;
      btn.textContent = "Tandai Puasa Hari Ini ✓";
    }
  }

  function handleFastingToggle() {
    const { storage } = deps();
    if (!storage || storage.hasFastedToday()) return;
    storage.markFastedToday();
    renderFastingStreak();
    updateShareSummaryLink();
  }

  /* ---------------------------------------------------------
     Tilawah Tracker
     --------------------------------------------------------- */

  function renderTilawah() {
    const { config, storage } = deps();
    const fillEl = document.getElementById("tilawahFill");
    const percentEl = document.getElementById("tilawahPercent");
    const juzHintEl = document.getElementById("tilawahJuzHint");
    const inputEl = document.getElementById("tilawahInput");
    if (!storage || !config) return;

    const data = storage.getTilawah();
    const total = config.TILAWAH_TOTAL_PAGES;
    const percent = total > 0 ? Math.round((data.pagesRead / total) * 100) : 0;
    const juzEstimate = total > 0 ? Math.round((data.pagesRead / total) * 30 * 10) / 10 : 0;

    if (fillEl) fillEl.style.setProperty("--fill-percent", percent + "%");
    if (percentEl) percentEl.textContent = percent + "%";
    if (juzHintEl) {
      juzHintEl.textContent = data.pagesRead + " dari " + total + " halaman, setara ± Juz " + juzEstimate + " dari 30";
    }
    if (inputEl && document.activeElement !== inputEl) {
      inputEl.value = String(data.pagesRead);
    }
  }

  function handleTilawahSave() {
    const { config, storage } = deps();
    const inputEl = document.getElementById("tilawahInput");
    if (!inputEl || !storage || !config) return;

    storage.setTilawahPages(inputEl.value);
    renderTilawah();
    updateShareSummaryLink();
  }

  /* ---------------------------------------------------------
     Mutaba'ah Yaumiyah
     --------------------------------------------------------- */

  function renderMutabaah() {
    const { storage } = deps();
    const wrap = document.getElementById("mutabaahChecklist");
    if (!wrap || !storage) return;

    const today = storage.getMutabaahToday();
    const checkboxes = wrap.querySelectorAll("[data-mutabaah-key]");
    checkboxes.forEach(function (cb) {
      const key = cb.getAttribute("data-mutabaah-key");
      cb.checked = !!today.items[key];
    });
  }

  function handleMutabaahToggle(e) {
    const cb = e.target.closest("[data-mutabaah-key]");
    if (!cb) return;

    // Rate limiter anti-spam: kalau kecepetan, batalin toggle-nya (revert checkbox).
    if (!getChecklistRateLimiter().tryConsume()) {
      cb.checked = !cb.checked;
      return;
    }

    const { storage } = deps();
    if (!storage) return;

    const key = cb.getAttribute("data-mutabaah-key");
    storage.setMutabaahItem(key, cb.checked);
    updateShareSummaryLink();
  }

  function getMutabaahSummaryText() {
    const { config, storage } = deps();
    if (!config || !storage) return "";
    const today = storage.getMutabaahToday();
    const done = config.MUTABAAH_ITEMS.filter(function (def) { return today.items[def.key]; });
    if (!done.length) return "Belum ada checklist yang ditandai hari ini";
    return done.map(function (def) { return "✓ " + def.label; }).join(", ");
  }

  /* ---------------------------------------------------------
     Share Ringkasan Progress ke WhatsApp
     (share-intent generik, TANPA nomor tujuan — sama pola kayak
     tombol share di Roda Amalan)
     --------------------------------------------------------- */

  function updateShareSummaryLink() {
    const { config, storage } = deps();
    const shareBtn = document.getElementById("trackerShareBtn");
    if (!shareBtn || !config || !storage) return;

    const fasting = storage.getFastingStreak();
    const tilawah = storage.getTilawah();
    const percent = config.TILAWAH_TOTAL_PAGES > 0
      ? Math.round((tilawah.pagesRead / config.TILAWAH_TOTAL_PAGES) * 100)
      : 0;
    const mutabaahText = getMutabaahSummaryText();

    const text =
      "Ringkasan Progress Ramadhan Tracker · MR48H 🌙\n\n" +
      "🔥 Streak Puasa: " + fasting.count + " hari\n" +
      "📖 Tilawah: " + tilawah.pagesRead + "/" + config.TILAWAH_TOTAL_PAGES + " halaman (" + percent + "%)\n" +
      "✅ Mutaba'ah hari ini: " + mutabaahText + "\n\n" +
      "Yuk curi start Ramadhan 1448H bareng, gabung Saluran WA MR48H: " + config.WA_CHANNEL_URL + " ✨";

    shareBtn.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  function init() {
    renderFastingStreak();
    renderTilawah();
    renderMutabaah();
    updateShareSummaryLink();

    const fastingBtn = document.getElementById("fastingToggleBtn");
    if (fastingBtn) fastingBtn.addEventListener("click", handleFastingToggle);

    const tilawahSaveBtn = document.getElementById("tilawahSaveBtn");
    if (tilawahSaveBtn) tilawahSaveBtn.addEventListener("click", handleTilawahSave);

    const mutabaahWrap = document.getElementById("mutabaahChecklist");
    if (mutabaahWrap) mutabaahWrap.addEventListener("change", handleMutabaahToggle);
  }

  NS.tracker = { init: init };
})();
