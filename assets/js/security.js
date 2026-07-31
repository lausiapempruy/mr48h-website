/* ==========================================================
   MR48H — security.js
   Utility Keamanan Level 3: sanitizer data eksternal, validator
   bentuk JSON, checksum anti-tampering localStorage, base64
   encode/decode, rate limiter client-side, dan debounce.
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});

  const ALLOWED_PILLARS = ["kultummini", "ramadhantips", "amalancheck", "pollingjumatan"];

  /**
   * Bersihin string dari karakter kontrol & batasi panjangnya.
   * Semua render ke DOM tetep wajib pake textContent (bukan innerHTML),
   * jadi ini lapisan kedua: jaga-jaga data dari JSON gak "aneh"
   * (kepanjangan, ada karakter kontrol, dsb) sebelum dipakai di mana pun.
   */
  function sanitizeString(value, maxLen) {
    const limit = typeof maxLen === "number" ? maxLen : 500;
    if (typeof value !== "string") return "";
    const stripped = value.replace(/[\u0000-\u001F\u007F]/g, "");
    return stripped.trim().slice(0, limit);
  }

  function isPlainObject(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  /**
   * Validasi + sanitasi 1 item dari amalan-list.json.
   * Return null kalau bentuknya gak valid (item itu di-skip, bukan bikin crash).
   */
  function validateAmalanItem(raw) {
    if (!isPlainObject(raw)) return null;
    const idOk = typeof raw.id === "string" || typeof raw.id === "number";
    if (!idOk) return null;
    const text = sanitizeString(raw.text, 200);
    if (!text) return null;
    const dalil = typeof raw.dalil === "string" ? sanitizeString(raw.dalil, 300) : "";
    return { id: raw.id, text: text, dalil: dalil };
  }

  /**
   * Validasi + sanitasi 1 item dari timeline-data.json.
   */
  function validateTimelineItem(raw) {
    if (!isPlainObject(raw)) return null;
    const hDay = Number(raw.hDay);
    if (!Number.isFinite(hDay) || hDay < 0 || hDay > 365) return null;
    const tag = sanitizeString(raw.tag, 20);
    const pillar = ALLOWED_PILLARS.indexOf(raw.pillar) !== -1 ? raw.pillar : null;
    const desc = sanitizeString(raw.desc, 220);
    if (!tag || !pillar || !desc) return null;
    return { hDay: hDay, tag: tag, pillar: pillar, desc: desc };
  }

  /* ---------------------------------------------------------
     Checksum non-kriptografis (djb2 variant) — buat integrity
     check localStorage, BUKAN buat keamanan data rahasia.
     --------------------------------------------------------- */
  function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  function computeChecksum(payloadStr, salt) {
    return djb2(String(salt) + payloadStr + String(salt));
  }

  /* ---------------------------------------------------------
     Base64 unicode-safe (buat obfuscation ringan localStorage,
     bukan enkripsi beneran — sesuai batasan frontend-only).
     --------------------------------------------------------- */
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function b64decode(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------------------------------------------------------
     Rate limiter client-side — dipakai buat cooldown tombol
     spin roda amalan (cegah spam klik / auto-click script).
     --------------------------------------------------------- */
  function createRateLimiter(cooldownMs) {
    let lastTs = 0;
    return {
      cooldownMs: cooldownMs,
      tryConsume: function () {
        const now = Date.now();
        if (now - lastTs >= cooldownMs) {
          lastTs = now;
          return true;
        }
        return false;
      },
      remainingMs: function () {
        const now = Date.now();
        const rem = cooldownMs - (now - lastTs);
        return rem > 0 ? rem : 0;
      },
      reset: function () {
        lastTs = 0;
      }
    };
  }

  function debounce(fn, waitMs) {
    let timer = null;
    return function debounced() {
      const args = arguments;
      const ctx = this;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(ctx, args);
      }, waitMs);
    };
  }

  NS.security = {
    ALLOWED_PILLARS: ALLOWED_PILLARS,
    sanitizeString: sanitizeString,
    isPlainObject: isPlainObject,
    validateAmalanItem: validateAmalanItem,
    validateTimelineItem: validateTimelineItem,
    computeChecksum: computeChecksum,
    b64encode: b64encode,
    b64decode: b64decode,
    createRateLimiter: createRateLimiter,
    debounce: debounce
  };
})();
