/* ==========================================================
   MR48H — wheel-game.js
   Logic Roda Amalan Ihsan: render roda dari amalan-list.json,
   spin dengan rate limiter (anti-spam), streak tracker aman via
   storage.js, dan tombol share ke Saluran WhatsApp MR48H.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});
  const config = NS.config;
  const security = NS.security;
  const storage = NS.storage;

  const WHEEL_COLORS = ["#064E3B", "#0F172A", "#F59E0B", "#16213A"];

  let amalanList = [];
  let isSpinning = false;
  let currentRotation = 0;
  let lastResultAmalan = null;
  let cooldownIntervalId = null;

  let rateLimiter = null;
  function getRateLimiter() {
    // Lazy init — jangan panggil security.createRateLimiter(config...) di top-level
    // module. Lihat penjelasan lengkap di countdown.js soal kenapa ini penting:
    // top-level throw di satu modul bisa nge-cascade dan bikin modul lain
    // (yang urutan load-nya sesudahnya) ikut gak jalan sama sekali.
    if (!rateLimiter) {
      const cooldown = (config && config.WHEEL_COOLDOWN_MS) || 6500;
      rateLimiter = security.createRateLimiter(cooldown);
    }
    return rateLimiter;
  }

  /* ---------------------------------------------------------
     Bangun tampilan roda + legend (CSSOM style assignment —
     aman di bawah CSP style-src 'self', bukan inline style attr)
     --------------------------------------------------------- */

  function buildWheelVisual() {
    const wheel = document.getElementById("wheel");
    const legend = document.getElementById("wheelLegend");
    if (!wheel || !legend || !amalanList.length) return;

    const n = amalanList.length;
    const sliceDeg = 360 / n;

    const stops = amalanList
      .map(function (_, i) {
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length];
        const start = (i * sliceDeg).toFixed(2);
        const end = ((i + 1) * sliceDeg).toFixed(2);
        return color + " " + start + "deg " + end + "deg";
      })
      .join(", ");
    wheel.style.background = "conic-gradient(" + stops + ")";

    const labelLayer = document.createElement("div");
    labelLayer.style.position = "absolute";
    labelLayer.style.inset = "0";

    amalanList.forEach(function (_, i) {
      const angle = sliceDeg * i + sliceDeg / 2;
      const num = document.createElement("span");
      num.textContent = String(i + 1);
      num.style.position = "absolute";
      num.style.top = "50%";
      num.style.left = "50%";
      num.style.transform = "rotate(" + angle + "deg) translate(0, -118px) rotate(" + -angle + "deg) translate(-50%, -50%)";
      num.style.color = "#fff";
      num.style.fontWeight = "700";
      num.style.fontSize = "0.78rem";
      num.style.textShadow = "0 1px 3px rgba(0,0,0,0.6)";
      labelLayer.appendChild(num);
    });
    wheel.appendChild(labelLayer);

    const legendFrag = document.createDocumentFragment();
    amalanList.forEach(function (item, i) {
      const li = document.createElement("li");
      const numSpan = document.createElement("span");
      numSpan.className = "legend-num";
      numSpan.textContent = (i + 1) + ".";
      li.appendChild(numSpan);
      li.appendChild(document.createTextNode(" " + item.text));
      legendFrag.appendChild(li);
    });
    legend.appendChild(legendFrag);
  }

  /* ---------------------------------------------------------
     Cooldown ring visual (rate limiter feedback)
     --------------------------------------------------------- */

  function setSpinButtonCooldownVisual(remainingMs, totalMs) {
    const ring = document.getElementById("cooldownRing");
    const progress = document.getElementById("cooldownProgress");
    const hint = document.getElementById("cooldownHint");
    const spinBtn = document.getElementById("spinBtn");
    if (!ring || !progress || !spinBtn) return;

    if (remainingMs <= 0) {
      ring.hidden = true;
      spinBtn.disabled = isSpinning;
      if (hint) hint.textContent = "";
      return;
    }

    ring.hidden = false;
    spinBtn.disabled = true;
    const ratio = 1 - remainingMs / totalMs;
    progress.style.setProperty("--cooldown-progress", String(ratio));
    if (hint) hint.textContent = "Tunggu " + Math.ceil(remainingMs / 1000) + " detik buat mutar lagi...";
  }

  function watchCooldown() {
    if (cooldownIntervalId) clearInterval(cooldownIntervalId);
    cooldownIntervalId = setInterval(function () {
      const remaining = getRateLimiter().remainingMs();
      setSpinButtonCooldownVisual(remaining, config.WHEEL_COOLDOWN_MS);
      if (remaining <= 0) {
        clearInterval(cooldownIntervalId);
        cooldownIntervalId = null;
      }
    }, 150);
  }

  /* ---------------------------------------------------------
     Spin logic
     --------------------------------------------------------- */

  function spinWheel() {
    if (isSpinning || !amalanList.length) return;

    if (!getRateLimiter().tryConsume()) {
      // Diblokir rate limiter — cegah spam klik / kemungkinan auto-click script.
      watchCooldown();
      return;
    }

    isSpinning = true;

    const wheel = document.getElementById("wheel");
    const spinBtn = document.getElementById("spinBtn");
    const spinLabel = document.getElementById("spinBtnLabel");
    const resultBox = document.getElementById("wheelResult");
    const resultText = document.getElementById("wheelResultText");
    const resultDalil = document.getElementById("wheelResultDalil");
    const completeBtn = document.getElementById("completeBtn");
    if (!wheel || !spinBtn || !spinLabel || !resultBox || !resultText || !completeBtn) {
      isSpinning = false;
      return;
    }

    spinBtn.disabled = true;
    spinLabel.textContent = "Roda lagi muter...";
    resultBox.hidden = true;
    completeBtn.disabled = false;
    completeBtn.textContent = "Tandai Selesai ✓";

    const n = amalanList.length;
    const sliceDeg = 360 / n;
    const winnerIndex = Math.floor(Math.random() * n);
    const targetSliceCenter = winnerIndex * sliceDeg + sliceDeg / 2;
    const extraSpins = 6;
    const finalRotation = currentRotation + 360 * extraSpins + (360 - targetSliceCenter) - (currentRotation % 360);

    currentRotation = finalRotation;
    wheel.style.transform = "rotate(" + finalRotation + "deg)";

    setTimeout(function () {
      const amalan = amalanList[winnerIndex];
      lastResultAmalan = amalan;

      resultText.textContent = amalan.text;
      if (resultDalil) resultDalil.textContent = amalan.dalil || "";
      resultBox.hidden = false;

      storage.addWheelHistoryEntry({ date: storage.todayKey(), amalanId: amalan.id, completed: false });
      updateShareLink(amalan);

      spinLabel.textContent = "Putar Lagi";
      isSpinning = false;
      watchCooldown();
      setSpinButtonCooldownVisual(getRateLimiter().remainingMs(), config.WHEEL_COOLDOWN_MS);
    }, config.SPIN_DURATION_MS);
  }

  /**
   * Tombol "Share ke WhatsApp" pake share-intent generik WhatsApp
   * (api.whatsapp.com/send?text=...) TANPA nomor tujuan apa pun — jadi
   * user yang mutusin mau dikirim ke kontak siapa, bukan diarahkan
   * langsung ke satu nomor tertentu. Teksnya sendiri cuma nyebut dua
   * hal yang boleh: link Website MR48H & link WhatsApp Channel MR48H,
   * jadi tetep patuh aturan "semua tautan cuma ke Website/Saluran WA MR48H".
   */
  function updateShareLink(amalan) {
    const shareBtn = document.getElementById("shareWaBtn");
    if (!shareBtn) return;
    const text =
      "Amalan Ihsan hari ini dari MR48H:\n\"" + amalan.text + "\"\n\n" +
      "Yuk curi start Ramadhan 1448H bareng, gabung Saluran WA MR48H: " + config.WA_CHANNEL_URL + " 🌙✨";
    shareBtn.href = "https://api.whatsapp.com/send?text=" + encodeURIComponent(text);
  }

  /* ---------------------------------------------------------
     Tandai selesai -> update streak aman + buka modal
     --------------------------------------------------------- */

  function completeAmalan() {
    if (!lastResultAmalan) return;

    if (storage.hasCompletedToday()) {
      openCompletionModal(storage.getStreak().count, true);
      return;
    }

    const updated = storage.markAmalanCompletedToday();

    const history = storage.getWheelHistory();
    const last = history[history.length - 1];
    if (last && last.amalanId === lastResultAmalan.id) {
      last.completed = true;
      storage.secureSet(config.STORAGE_KEYS.wheelHistory, history);
    }

    const streakCountEl = document.getElementById("streakCount");
    const streakBadge = document.getElementById("streakBadge");
    const completeBtn = document.getElementById("completeBtn");

    if (streakCountEl) streakCountEl.textContent = String(updated.count);
    if (streakBadge) {
      streakBadge.classList.remove("streak-badge--pop");
      requestAnimationFrame(function () { streakBadge.classList.add("streak-badge--pop"); });
    }
    if (completeBtn) {
      completeBtn.disabled = true;
      completeBtn.textContent = "Alhamdulillah, Selesai ✓";
    }

    openCompletionModal(updated.count, false);
  }

  function openCompletionModal(streakCount, alreadyDoneBefore) {
    const modal = document.getElementById("completionModal");
    const descEl = document.getElementById("completionModalDesc");
    const streakNumEl = document.getElementById("modalStreakNum");
    if (!modal) return;

    if (descEl) {
      descEl.textContent = alreadyDoneBefore
        ? "Amalan hari ini udah lo tandai selesai sebelumnya. Semangat terus buat besok!"
        : "Semoga jadi pemberat timbangan, dan jadi langkah kecil menuju Ramadhan yang lebih siap.";
    }
    if (streakNumEl) streakNumEl.textContent = String(streakCount);
    modal.hidden = false;
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  function initStreakDisplay() {
    const streakCountEl = document.getElementById("streakCount");
    const completeBtn = document.getElementById("completeBtn");
    const streak = storage.getStreak();
    if (streakCountEl) streakCountEl.textContent = String(streak.count);
    if (completeBtn && storage.hasCompletedToday()) {
      completeBtn.disabled = true;
      completeBtn.textContent = "Alhamdulillah, Selesai ✓";
    }
  }

  async function loadAmalanList() {
    const spinBtn = document.getElementById("spinBtn");
    const spinLabel = document.getElementById("spinBtnLabel");
    try {
      const res = await fetch(config.DATA_PATHS.amalan, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("Format amalan-list.json harus array");

      amalanList = raw.map(security.validateAmalanItem).filter(Boolean);
      if (!amalanList.length) throw new Error("Amalan list kosong / semua item invalid");

      buildWheelVisual();
    } catch (err) {
      console.warn("[MR48H wheel] gagal load amalan:", err);
      if (spinLabel) spinLabel.textContent = "Roda belum bisa dimuat";
      if (spinBtn) spinBtn.disabled = true;
    }
  }

  function init() {
    initStreakDisplay();
    loadAmalanList();

    const spinBtn = document.getElementById("spinBtn");
    const completeBtn = document.getElementById("completeBtn");
    if (spinBtn) spinBtn.addEventListener("click", spinWheel);
    if (completeBtn) completeBtn.addEventListener("click", completeAmalan);
  }

  NS.wheel = { init: init };
})();
