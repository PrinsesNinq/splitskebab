// The service worker that makes the app installable and lets its pages open without a connection. Network first: a fresh page always
// wins when there is a network (this app changes often, and an old cached page next to new scripts breaks things); the copy in the cache
// is only for when there is none.
//
// What it keeps is an allowlist: the pages at the top of the site and the files under css/, js/, images/ and vendor/ (plus the manifest).
// Anything else (an API of this site, a personalised response, a download) is passed through and never stored, and so is any response that
// says Cache-Control: no-store or private. Firebase, Google and other sites are never touched. A cached copy is found by its exact address;
// only a page that is opened (a navigation) falls back to the same page without its query, and then to index.html.
// Change CACHE when the list below changes; the old cache of this worker is removed when the new one takes over (other caches on this
// address are not ours and are left alone).
const PREFIX = 'app-shell-';
const CACHE = PREFIX + 'v5';
const SHELL = ['index.html', 'meal.html', 'recipes.html', 'houses.html', 'profile.html', 'person.html', 'analytics.html', 'settings.html', 'css/app.css', 'js/app.js', 'js/theme-mode.js', 'manifest.json', 'images/app-icon.svg'];
const BASE = new URL('./', self.registration.scope).pathname;

/** Whether this site's address is one of the files worth keeping: a page at the top, or a file in a static folder. */
function keepable(url) {
  if (!url.pathname.startsWith(BASE)) return false;
  const path = url.pathname.slice(BASE.length);
  return SHELL.includes(path) || /^[\w.-]+\.html$/.test(path) || (/^(?:css|js|images|vendor)\/[\w./-]+$/.test(path) && !path.includes('..'));
}

self.addEventListener('install', (event) => {
  // One missing file must not stop the worker from installing: each one is cached on its own.
  event.waitUntil(caches.open(CACHE).then((cache) => Promise.all(SHELL.map((file) => cache.add(file).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/__/') || !keepable(url)) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const policy = response.headers.get('Cache-Control') || '';
        if (response.ok && !/no-store|private/i.test(policy) && !request.headers.has('Authorization')) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit
        || (request.mode === 'navigate' ? caches.match(request, { ignoreSearch: true }).then((page) => page || caches.match('index.html')) : undefined)
        || Response.error())),
  );
});
