/* =====================================================================
   Tema terang / gelap.
   Dua mode dipilih terpisah lewat CSS custom property, bukan filter invert,
   supaya warna chart tetap lolos kontras di masing-masing surface.
   ===================================================================== */

const Theme = (() => {
  const STORAGE_KEY = "ukara-dashboard-theme";
  const listeners = [];

  function current() {
    const stamped = document.documentElement.getAttribute("data-theme");
    if (stamped) return stamped;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  function apply(mode) {
    document.documentElement.setAttribute("data-theme", mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {
      /* localStorage bisa diblokir saat file dibuka lewat file:// */
    }
    listeners.forEach((fn) => fn(mode));
  }

  function toggle() {
    apply(current() === "dark" ? "light" : "dark");
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  // Baca token warna dari CSS supaya chart selalu sinkron dengan tema aktif
  function token(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function init() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      /* diabaikan */
    }
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }

    // Ikuti OS selama pengguna belum memilih manual
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (!saved) listeners.forEach((fn) => fn(current()));
    });
  }

  return { init, apply, toggle, current, onChange, token };
})();

Theme.init();
