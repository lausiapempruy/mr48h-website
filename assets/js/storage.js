/* ==========================================================
   MR48H — storage.js
   Secure Storage Helper: CRUD localStorage yang terintegrasi
   sama security.js (base64 + checksum anti-tampering), plus
   helper domain-specific: streak amalan, riwayat roda, dan
   Ramadhan Tracker (streak puasa, tilawah, mutaba'ah yaumiyah).
   ========================================================== */

(function () {
  "use strict";

  const NS = (window.MR48H = window.MR48H || {});
  const config = NS.config;
  const security = NS.security;

  /* ---------------------------------------------------------
     Low-level secure read/write
     --------------------------------------------------------- */

  function secureSet(key, value) {
    try {
      const json = JSON.stringify(value);
      const encoded = security.b64encode(json);
      const checksum = security.computeChecksum(encoded, config.STORAGE_SALT);
      const wrapper = JSON.stringify({ v: encoded, c: checksum, t: Date.now() });
      window.localStorage.setItem(key, wrapper);
      return true;
    } catch (err) {
      console.warn("[MR48H storage] gagal nulis '" + key + "':", err);
      return false;
    }
  }

  function secureGet(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return fallback;

      const wrapper = JSON.parse(raw);
      if (!wrapper || typeof wrapper.v !== "string" || typeof wrapper.c !== "string") {
        return fallback;
      }

      const expected = security.computeChecksum(wrapper.v, config.STORAGE_SALT);
      if (expected !== wrapper.c) {
        console.warn("[MR48H storage] checksum '" + key + "' gak cocok — data dianggap corrupt/diedit manual, pakai default.");
        return fallback;
      }

      const json = security.b64decode(wrapper.v);
      return JSON.parse(json);
    } catch (err) {
      console.warn("[MR48H storage] gagal baca '" + key + "':", err);
      return fallback;
    }
  }

  function secureRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn("[MR48H storage] gagal hapus '" + key + "':", err);
    }
  }

  /* ---------------------------------------------------------
     Helper tanggal (dipakai buat kunci streak harian)
     --------------------------------------------------------- */

  function todayKey(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  /* ---------------------------------------------------------
     Streak generic (dipake buat streak amalan roda & streak puasa)
     --------------------------------------------------------- */

  function getStreakByKey(storageKey) {
    const fallback = { count: 0, lastCompletedDateKey: null, totalCompleted: 0 };
    const data = secureGet(storageKey, fallback);
    if (!security.isPlainObject(data)) return fallback;
    return {
      count: Number.isFinite(data.count) ? data.count : 0,
      lastCompletedDateKey: typeof data.lastCompletedDateKey === "string" ? data.lastCompletedDateKey : null,
      totalCompleted: Number.isFinite(data.totalCompleted) ? data.totalCompleted : 0
    };
  }

  function hasCompletedTodayByKey(storageKey) {
    return getStreakByKey(storageKey).lastCompletedDateKey === todayKey();
  }

  function markStreakTodayByKey(storageKey) {
    const streak = getStreakByKey(storageKey);
    const key = todayKey();

    if (streak.lastCompletedDateKey === key) {
      return streak; // udah ditandai hari ini, jangan dobel-hitung
    }

    const yesterdayKey = todayKey(new Date(Date.now() - 86400000));
    const isConsecutive = streak.lastCompletedDateKey === yesterdayKey;

    const updated = {
      count: isConsecutive ? streak.count + 1 : 1,
      lastCompletedDateKey: key,
      totalCompleted: streak.totalCompleted + 1
    };

    secureSet(storageKey, updated);
    return updated;
  }

  /* ---------------------------------------------------------
     Streak amalan (Roda Amalan Ihsan) — wrapper dari generic di atas
     --------------------------------------------------------- */

  function getStreak() {
    return getStreakByKey(config.STORAGE_KEYS.streak);
  }

  function hasCompletedToday() {
    return hasCompletedTodayByKey(config.STORAGE_KEYS.streak);
  }

  function markAmalanCompletedToday() {
    return markStreakTodayByKey(config.STORAGE_KEYS.streak);
  }

  /* ---------------------------------------------------------
     Streak Puasa (Ramadhan Tracker) — wrapper dari generic di atas
     --------------------------------------------------------- */

  function getFastingStreak() {
    return getStreakByKey(config.STORAGE_KEYS.fastingStreak);
  }

  function hasFastedToday() {
    return hasCompletedTodayByKey(config.STORAGE_KEYS.fastingStreak);
  }

  function markFastedToday() {
    return markStreakTodayByKey(config.STORAGE_KEYS.fastingStreak);
  }

  /* ---------------------------------------------------------
     Riwayat putaran roda (dicap maksimal N entri)
     --------------------------------------------------------- */

  function getWheelHistory() {
    const list = secureGet(config.STORAGE_KEYS.wheelHistory, []);
    return Array.isArray(list) ? list : [];
  }

  function addWheelHistoryEntry(entry) {
    const list = getWheelHistory();
    list.push(entry);
    const capped = list.slice(-config.MAX_WHEEL_HISTORY);
    secureSet(config.STORAGE_KEYS.wheelHistory, capped);
    return capped;
  }

  /* ---------------------------------------------------------
     Tilawah Tracker (progres halaman Al-Qur'an)
     --------------------------------------------------------- */

  function getTilawah() {
    const data = secureGet(config.STORAGE_KEYS.tilawah, { pagesRead: 0 });
    const pagesRead = security.sanitizeInt(data && data.pagesRead, 0, config.TILAWAH_TOTAL_PAGES, 0);
    return { pagesRead: pagesRead };
  }

  function setTilawahPages(pages) {
    const clamped = security.sanitizeInt(pages, 0, config.TILAWAH_TOTAL_PAGES, 0);
    secureSet(config.STORAGE_KEYS.tilawah, { pagesRead: clamped });
    return { pagesRead: clamped };
  }

  /* ---------------------------------------------------------
     Mutaba'ah Yaumiyah (checklist harian, auto-reset tiap hari baru)
     --------------------------------------------------------- */

  function buildEmptyMutabaahItems() {
    const items = {};
    config.MUTABAAH_ITEMS.forEach(function (def) { items[def.key] = false; });
    return items;
  }

  function getMutabaahToday() {
    const key = todayKey();
    const data = secureGet(config.STORAGE_KEYS.mutabaah, null);

    if (!security.isPlainObject(data) || data.dateKey !== key || !security.isPlainObject(data.items)) {
      return { dateKey: key, items: buildEmptyMutabaahItems() };
    }

    const validKeys = config.MUTABAAH_ITEMS.map(function (def) { return def.key; });
    const cleanItems = buildEmptyMutabaahItems();
    validKeys.forEach(function (k) {
      cleanItems[k] = !!data.items[k];
    });
    return { dateKey: key, items: cleanItems };
  }

  function setMutabaahItem(itemKey, checked) {
    const validKeys = config.MUTABAAH_ITEMS.map(function (def) { return def.key; });
    if (validKeys.indexOf(itemKey) === -1) return getMutabaahToday();

    const current = getMutabaahToday();
    current.items[itemKey] = !!checked;
    secureSet(config.STORAGE_KEYS.mutabaah, current);
    return current;
  }

  NS.storage = {
    secureSet: secureSet,
    secureGet: secureGet,
    secureRemove: secureRemove,
    todayKey: todayKey,
    getStreak: getStreak,
    hasCompletedToday: hasCompletedToday,
    markAmalanCompletedToday: markAmalanCompletedToday,
    getFastingStreak: getFastingStreak,
    hasFastedToday: hasFastedToday,
    markFastedToday: markFastedToday,
    getWheelHistory: getWheelHistory,
    addWheelHistoryEntry: addWheelHistoryEntry,
    getTilawah: getTilawah,
    setTilawahPages: setTilawahPages,
    getMutabaahToday: getMutabaahToday,
    setMutabaahItem: setMutabaahItem
  };
})();
