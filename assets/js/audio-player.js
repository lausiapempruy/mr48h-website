/* ==========================================================
   MR48H — audio-player.js
   Logic Ambient Sound Player: toggle play/pause, sinkronisasi
   state antara tombol section & floating button, restore
   preferensi dari localStorage (via storage.js), dan fallback
   yang sopan kalau file assets/audio/ambient-night.mp3 belum ada.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});
  const storage = NS.storage;

  let isPlaying = false;
  let autoResumeListenerAdded = false;

  function getAudioEl() {
    return document.getElementById("ambientAudio");
  }

  function syncToggleUI(playing, unavailable) {
    const toggleBtn = document.getElementById("audioToggle");
    const floatBtn = document.getElementById("floatAudioToggle");
    const floatIcon = document.getElementById("floatAudioIcon");
    if (!toggleBtn || !floatBtn) return;

    const toggleText = toggleBtn.querySelector(".ambience-toggle__text");
    const toggleIcon = toggleBtn.querySelector(".ambience-toggle__icon");

    if (unavailable) {
      toggleBtn.disabled = true;
      floatBtn.disabled = true;
      if (toggleText) toggleText.textContent = "File audio belum tersedia";
      return;
    }

    toggleBtn.setAttribute("aria-pressed", String(playing));
    floatBtn.setAttribute("aria-pressed", String(playing));
    if (toggleIcon) toggleIcon.textContent = playing ? "⏸" : "▶";
    if (toggleText) toggleText.textContent = playing ? "Matikan Suasana Malam" : "Putar Suasana Malam";
    if (floatIcon) floatIcon.textContent = playing ? "🔊" : "☾";
  }

  function play() {
    const audio = getAudioEl();
    if (!audio) return Promise.reject(new Error("elemen audio tidak ditemukan"));
    return audio.play();
  }

  function pause() {
    const audio = getAudioEl();
    if (audio) audio.pause();
  }

  function toggle() {
    const audio = getAudioEl();
    if (!audio) return;

    if (isPlaying) {
      pause();
      isPlaying = false;
      storage.setAudioPref(false);
      syncToggleUI(false, false);
      return;
    }

    play()
      .then(function () {
        isPlaying = true;
        storage.setAudioPref(true);
        syncToggleUI(true, false);
      })
      .catch(function (err) {
        console.warn("[MR48H audio] gagal muter audio:", err);
        isPlaying = false;
        storage.setAudioPref(false);
        syncToggleUI(false, true);
      });
  }

  /**
   * Browser modern nge-blok autoplay bersuara tanpa gesture user.
   * Kalau preferensi tersimpan = ON, coba resume otomatis; kalau
   * diblokir, tunggu interaksi pertama user di halaman lalu coba lagi
   * sekali — biar preferensi tetep "kepake" tanpa maksa autoplay.
   */
  function tryAutoResume() {
    play()
      .then(function () {
        isPlaying = true;
        syncToggleUI(true, false);
      })
      .catch(function () {
        if (autoResumeListenerAdded) return;
        autoResumeListenerAdded = true;

        const resumeOnce = function () {
          document.removeEventListener("pointerdown", resumeOnce);
          document.removeEventListener("keydown", resumeOnce);
          play()
            .then(function () {
              isPlaying = true;
              syncToggleUI(true, false);
            })
            .catch(function () {
              /* tetep diblokir / file gak ada — biarin user toggle manual */
            });
        };

        document.addEventListener("pointerdown", resumeOnce, { once: true });
        document.addEventListener("keydown", resumeOnce, { once: true });
      });
  }

  function init() {
    const audio = getAudioEl();
    const toggleBtn = document.getElementById("audioToggle");
    const floatBtn = document.getElementById("floatAudioToggle");
    if (!audio || !toggleBtn || !floatBtn) return;

    audio.addEventListener("error", function () {
      syncToggleUI(false, true);
    });

    toggleBtn.addEventListener("click", toggle);
    floatBtn.addEventListener("click", toggle);

    syncToggleUI(false, false);

    const pref = storage.getAudioPref();
    if (pref) tryAutoResume();
  }

  NS.audio = { init: init, toggle: toggle };
})();
