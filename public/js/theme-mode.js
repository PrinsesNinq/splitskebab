// Light / dark mode. Loaded in the <head> (before the page paints, so there is no flash of the wrong mode).
// The page follows the operating system until someone flips the "Dark mode" switch in the account menu; that choice is remembered.
// Bootstrap switches every colour from the data-bs-theme attribute on <html>.
(function () {
  var KEY = 'theme-mode';
  var root = document.documentElement;
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; } // storage can be blocked
  }
  function apply(mode) { root.setAttribute('data-bs-theme', mode); }
  function sync() {
    var toggle = document.getElementById('dark-mode-toggle');
    if (toggle) toggle.checked = root.getAttribute('data-bs-theme') === 'dark';
  }

  apply(stored() || (media.matches ? 'dark' : 'light'));

  // Without a saved choice the page keeps following the system setting.
  media.addEventListener('change', function (event) {
    if (stored()) return;
    apply(event.matches ? 'dark' : 'light');
    sync();
  });

  document.addEventListener('DOMContentLoaded', function () {
    sync();
    var toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;
    toggle.addEventListener('change', function () {
      var mode = toggle.checked ? 'dark' : 'light';
      apply(mode);
      try { localStorage.setItem(KEY, mode); } catch (e) { /* the mode still applies for this visit */ }
    });
  });
})();
