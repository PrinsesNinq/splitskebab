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
  // Splitskebab's own themes, each a colour on eggshell white: Carnivore (the default), Herbivore and Pescetarian. Their full palettes are
  // in css/themes.css, keyed on <html data-sel-colour-theme>; this only puts the key there before the first paint (so a page never
  // flashes another theme's colours), and gives the phone's status bar the theme's colour. Keep the keys and colours the same as
  // css/themes.css and the <data> swatches in profile.html (tests/themes.test.js checks them). A key saved by an older version of the
  // app (the company themes) is not one of these: such a device gets Carnivore.
  var THEME_KEY = 'sel-colour-theme';
  var THEMES = {
    carnivore: '#8b1a1a',
    herbivore: '#4e6b3a',
    pescetarian: '#1d5c8a'
  };
  var DEFAULT_THEME = 'carnivore';
  function themeKey() {
    var key = null;
    try { key = localStorage.getItem(THEME_KEY); } catch (e) { /* storage blocked: the default theme */ }
    return key && Object.prototype.hasOwnProperty.call(THEMES, key) ? key : DEFAULT_THEME;
  }
  function setBarColour(key) {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[key] || THEMES[DEFAULT_THEME]);
  }
  function applyColourTheme() {
    var key = themeKey();
    root.setAttribute('data-sel-colour-theme', key);
    setBarColour(key);
  }
  applyColourTheme();
  // Picking a theme on the profile page: the component sets the key on <html> (css/themes.css does the rest); the status bar follows here.
  document.addEventListener('colourthemes:change', function (event) {
    var key = event.detail && event.detail.theme;
    setBarColour(Object.prototype.hasOwnProperty.call(THEMES, key) ? key : DEFAULT_THEME);
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
