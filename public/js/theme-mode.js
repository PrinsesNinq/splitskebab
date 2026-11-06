// Light / dark mode, and the colour theme. Loaded in the <head> (before the page paints, so there is no flash of the wrong mode or colours).
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

  // ---- Colour theme (component "Colour themes", picked on the profile page) ----
  // Applied here, before the first paint, so a page never flashes the default purple before the picked colours (the component only
  // applies the choice on the page that shows it). The same logic as the component's applyColourTheme(); the themes are the same list as
  // the <data> children in profile.html (tests/i18n.test.js checks they match). "default" (not listed) is the theme's own colours.
  var THEME_KEY = 'sel-colour-theme';
  var THEMES = {
    midnight: ['#1e3a5f', '#f0a500'],
    forest: ['#2d5a27', '#74c69d'],
    ocean: ['#0a4f6e', '#00b4d8'],
    crimson: ['#8b0000', '#ff6b35'],
    plum: ['#5b2a86', '#ffb703'],
    lagoon: ['#0f766e', '#f6c177'],
    graphite: ['#343a40', '#f4a261']
  };
  function applyColourTheme() {
    var key = null;
    try { key = localStorage.getItem(THEME_KEY); } catch (e) { /* storage blocked: the default colours */ }
    var picked = key && Object.prototype.hasOwnProperty.call(THEMES, key) ? THEMES[key] : null;
    if (picked) {
      root.style.setProperty('--primary', picked[0]);
      root.style.setProperty('--secondary', picked[1]);
      root.style.setProperty('--tertiary', 'color-mix(in srgb, color-mix(in srgb, ' + picked[0] + ' 50%, ' + picked[1] + ') 55%, white 45%)');
      root.setAttribute('data-sel-colour-theme', key);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--secondary');
      root.style.removeProperty('--tertiary');
      root.removeAttribute('data-sel-colour-theme');
    }
    // The phone's status bar and the installed app's title bar take the theme's colour too.
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', picked ? picked[0] : '#6b1f7e');
  }
  applyColourTheme();
  // Picking a theme on the profile page: the component applies it to this page; the title bar colour follows here.
  // The colour comes from the event itself (the component may save the choice after it tells).
  document.addEventListener('colourthemes:change', function (event) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', (event.detail && event.detail.primary) || '#6b1f7e');
  });

  document.addEventListener('DOMContentLoaded', function () {
    sync();
    applyColourTheme(); // the <meta theme-color> is parsed after this script: set it once the page is read
    var toggle = document.getElementById('dark-mode-toggle');
    if (!toggle) return;
    toggle.addEventListener('change', function () {
      var mode = toggle.checked ? 'dark' : 'light';
      apply(mode);
      try { localStorage.setItem(KEY, mode); } catch (e) { /* the mode still applies for this visit */ }
    });
  });
})();
