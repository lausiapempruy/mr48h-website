/* ==========================================================
   MR48H — countdown.js
   Logic real-time countdown timer + render linimasa milestone
   dari timeline-data.json + deteksi "fase persiapan sekarang".
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});
  const config = NS.config;
  const security = NS.security;

  const TARGET_TIME = new Date(config.RAMADAN_TARGET_ISO).getTime();

  const PILLAR_LABELS = {
    kultummini: "KultumMini",
    ramadhantips: "RamadhanTips",
    amalancheck: "AmalanCheck",
    pollingjumatan: "PollingJumatan"
  };

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  /* ---------------------------------------------------------
     Real-time countdown timer
     --------------------------------------------------------- */

  function tickCountdown() {
    const elDays = document.getElementById("cd-days");
    const elHours = document.getElementById("cd-hours");
    const elMins = document.getElementById("cd-mins");
    const elSecs = document.getElementById("cd-secs");
    if (!elDays || !elHours || !elMins || !elSecs) return;

    let diff = TARGET_TIME - Date.now();
    if (diff < 0) diff = 0;

    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);

    elDays.textContent = pad(days);
    elHours.textContent = pad(hours);
    elMins.textContent = pad(mins);
    elSecs.textContent = pad(secs);
  }

  function startCountdownTimer() {
    tickCountdown();
    setInterval(tickCountdown, 1000);
  }

  function daysRemainingNow() {
    const diff = Math.max(0, TARGET_TIME - Date.now());
    return diff / 86400000;
  }

  /* ---------------------------------------------------------
     Render linimasa milestone (interaktif — bisa diklik)
     --------------------------------------------------------- */

  function renderTimelineItem(milestone, targetDate) {
    const dueDate = new Date(targetDate.getTime() - milestone.hDay * 86400000);
    const dateStr = dueDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    const item = document.createElement("button");
    item.type = "button";
    item.className = "timeline-item";
    item.setAttribute("data-pillar", milestone.pillar);
    item.setAttribute("data-pillar-target", "pilar-" + milestone.pillar);
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-label", milestone.tag + ": " + milestone.desc);

    const tag = document.createElement("span");
    tag.className = "timeline-item__tag";
    tag.textContent = milestone.tag;

    const dateEl = document.createElement("span");
    dateEl.className = "timeline-item__date";
    dateEl.textContent = dateStr;

    const pillarBadge = document.createElement("span");
    pillarBadge.className = "timeline-item__pillar";
    pillarBadge.textContent = "#" + (PILLAR_LABELS[milestone.pillar] || milestone.pillar);

    const desc = document.createElement("p");
    desc.className = "timeline-item__desc";
    desc.textContent = milestone.desc;

    item.appendChild(tag);
    item.appendChild(dateEl);
    item.appendChild(pillarBadge);
    item.appendChild(desc);
    return item;
  }

  async function loadTimeline() {
    const wrap = document.getElementById("timeline");
    const loading = document.getElementById("timelineLoading");
    if (!wrap) return [];

    try {
      const res = await fetch(config.DATA_PATHS.timeline, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);

      const raw = await res.json();
      if (!Array.isArray(raw)) throw new Error("Format timeline-data.json harus array");

      const milestones = raw
        .map(security.validateTimelineItem)
        .filter(Boolean)
        .sort(function (a, b) { return b.hDay - a.hDay; });

      if (!milestones.length) throw new Error("Semua item timeline invalid / kosong");

      if (loading) loading.remove();

      const targetDate = new Date(config.RAMADAN_TARGET_ISO);
      const frag = document.createDocumentFragment();
      milestones.forEach(function (m) {
        frag.appendChild(renderTimelineItem(m, targetDate));
      });
      wrap.appendChild(frag);

      updatePhaseStatus(milestones);
      setInterval(function () { updatePhaseStatus(milestones); }, 60000);

      return milestones;
    } catch (err) {
      console.warn("[MR48H countdown] gagal load timeline:", err);
      if (loading) {
        loading.textContent = "Linimasa belum bisa dimuat. Coba refresh, atau cek koneksi lo.";
      }
      return [];
    }
  }

  /* ---------------------------------------------------------
     Deteksi fase persiapan yang lagi aktif
     --------------------------------------------------------- */

  function updatePhaseStatus(milestones) {
    const valueEl = document.getElementById("phaseStatusValue");
    if (!valueEl || !milestones.length) return;

    const remaining = daysRemainingNow();
    const sortedDesc = milestones.slice().sort(function (a, b) { return b.hDay - a.hDay; });

    let current = null;
    sortedDesc.forEach(function (m) {
      if (remaining <= m.hDay) current = m;
    });

    if (remaining <= 0) {
      valueEl.textContent = "Ramadhan 1448H udah tiba — Marhaban ya Ramadhan! 🌙";
    } else if (!current) {
      valueEl.textContent = "Belum masuk fase resmi — tapi gak ada salahnya mulai niat dari sekarang.";
    } else {
      valueEl.textContent = current.tag + " — " + current.desc;
    }
  }

  NS.countdown = {
    startCountdownTimer: startCountdownTimer,
    loadTimeline: loadTimeline,
    daysRemainingNow: daysRemainingNow
  };
})();
