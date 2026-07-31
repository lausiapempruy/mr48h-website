/* ==========================================================
   MR48H — app.js
   Main entry JS: inisialisasi semua modul, wiring link WA/Website,
   modal, navigasi linimasa, starfield background, scroll-reveal,
   dan CSP verification listener.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});
  const config = NS.config;
  const security = NS.security;

  /* ---------------------------------------------------------
     Wiring tautan — HANYA ke Saluran WhatsApp MR48H & Website MR48H
     --------------------------------------------------------- */

  function wireStaticLinks() {
    // Langsung ke WhatsApp Channel MR48H — gak ada nomor pribadi yang dirakit di sini.
    ["navWaBtn", "heroWaBtn", "footerWaBtn"].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.href = config.WA_CHANNEL_URL;
    });

    const websiteBtn = document.getElementById("footerWebsiteBtn");
    if (websiteBtn) websiteBtn.href = config.WEBSITE_URL;
  }

  /* ---------------------------------------------------------
     Modal generik (buka/tutup, klik backdrop, tombol X, Escape)
     --------------------------------------------------------- */

  function wireModal() {
    const modal = document.getElementById("completionModal");
    const closeBtn = document.getElementById("modalCloseBtn");
    if (!modal) return;

    function closeModal() {
      modal.hidden = true;
    }

    modal.querySelectorAll("[data-modal-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    if (closeBtn) closeBtn.addEventListener("click", closeModal);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }

  /* ---------------------------------------------------------
     Klik item linimasa -> scroll ke pilar terkait + highlight sesaat
     --------------------------------------------------------- */

  function wireTimelineNavigation() {
    const wrap = document.getElementById("timeline");
    if (!wrap) return;

    wrap.addEventListener("click", function (e) {
      const item = e.target.closest("[data-pillar-target]");
      if (!item) return;

      const targetId = item.getAttribute("data-pillar-target");
      const targetEl = document.getElementById(targetId);
      if (!targetEl) return;

      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
      targetEl.focus({ preventScroll: true });
      targetEl.classList.add("timeline-item--active");
      setTimeout(function () {
        targetEl.classList.remove("timeline-item--active");
      }, 1600);
    });
  }

  /* ---------------------------------------------------------
     Starfield background — bintang kelap-kelip halus
     --------------------------------------------------------- */

  function initStarfield() {
    const canvas = document.getElementById("starfield");
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext("2d");
    let stars = [];
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const count = Math.floor((w * h) / 9000);
      stars = Array.from({ length: count }, function () {
        return {
          x: Math.random() * w,
          y: Math.random() * h * 0.85,
          r: Math.random() * 1.3 + 0.3,
          baseAlpha: Math.random() * 0.5 + 0.2,
          speed: Math.random() * 0.015 + 0.005,
          phase: Math.random() * Math.PI * 2,
          hue: Math.random() > 0.85 ? "#F59E0B" : "#E9EEF7"
        };
      });
    }

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const grad = ctx.createRadialGradient(w * 0.5, -h * 0.1, 0, w * 0.5, -h * 0.1, w);
      grad.addColorStop(0, "#0d1a30");
      grad.addColorStop(0.45, "#0F172A");
      grad.addColorStop(1, "#060B16");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      stars.forEach(function (s) {
        const twinkle = Math.sin(t * s.speed + s.phase) * 0.5 + 0.5;
        ctx.globalAlpha = s.baseAlpha * twinkle + 0.08;
        ctx.fillStyle = s.hue;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", security.debounce(resize, 200));
    resize();
    requestAnimationFrame(draw);
  }

  /* ---------------------------------------------------------
     Scroll reveal — hierarki halus pas section masuk viewport
     --------------------------------------------------------- */

  function initReveal() {
    const targets = document.querySelectorAll(
      ".section__head, .hijri-card, .phase-status, .pillar-card, .wheel-area, .ambience-card"
    );
    targets.forEach(function (el) { el.classList.add("reveal"); });

    if (!("IntersectionObserver" in window)) {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }

    const io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    targets.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     CSP verification — bantu ketauan kalau ada resource yang
     keblokir CSP pas development, tanpa harus buka console manual.
     --------------------------------------------------------- */

  function watchCspViolations() {
    window.addEventListener("securitypolicyviolation", function (e) {
      console.warn(
        "[MR48H CSP] Ada resource yang diblokir CSP -> blockedURI:",
        e.blockedURI,
        "| directive:",
        e.violatedDirective
      );
    });
  }

  /* ---------------------------------------------------------
     Init
     --------------------------------------------------------- */

  function init() {
    watchCspViolations();
    wireStaticLinks();
    wireModal();
    wireTimelineNavigation();
    initStarfield();
    initReveal();

    NS.hijri.renderToday();
    NS.countdown.startCountdownTimer();
    NS.countdown.loadTimeline();
    NS.wheel.init();
    NS.audio.init();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
