// The service worker that makes the app installable and lets its pages open without a connection. Network first, but not for ever: a
// fresh file wins when the network answers within WAIT_MS (this app changes often, and an old cached page next to new scripts breaks
// things); on a slow or absent connection the saved copy is used, and the network's answer still refreshes the cache for next time. Without
// that limit a weak mobile connection showed a white screen while every one of the app's files waited for the network to give up.
// js/app.js reloads when a newer version is live (version.json is never cached), so a page that started from older copies catches up.
//
// What it keeps is an allowlist: the pages at the top of the site and the files under css/, js/, images/ and vendor/ (plus the manifest).
// Anything else (an API of this site, a personalised response, a download) is passed through and never stored, and so is any response that
// says Cache-Control: no-store or private. The one other site it keeps files from is Google's copy of the Firebase SDK, at its exact
// version (SDK below, the same as js/firebase-init.js): those files never change, so they come from the cache straight away. Firebase's
// own traffic (sign-in, the database) is never touched.
// A cached copy is found by its address without soft navigation's "soft-nav" query (js/vendor page-transitions re-imports a page's script
// with a fresh one each time, which would otherwise never be found again and fill the cache); a page that is opened (a navigation) also
// falls back to the same page without its query, and then to index.html.
// Change CACHE when the list below changes; the old cache of this worker is removed when the new one takes over (other caches on this
// address are not ours and are left alone).
const PREFIX = 'app-shell-';
const CACHE = PREFIX + 'v10';
const SDK = 'https://www.gstatic.com/firebasejs/10.14.1/';
const WAIT_MS = 3000;
const SHELL = ['index.html', 'meal.html', 'recipes.html', 'houses.html', 'profile.html', 'person.html', 'analytics.html', 'messages.html', 'chat.html', 'settings.html', 'css/themes.css', 'css/app.css', 'js/app.js', 'js/theme-mode.js', 'manifest.json', 'images/app-icon.svg', 'images/icon-192.png', 'images/icon-512.png', 'images/apple-touch-icon.png'];
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

// ---- Push notifications (sent by functions/index.js, switched on per device in js/push.js) ----
// The messages are data-only ({ title, body, link, tag }), so this worker shows them itself: every push is shown (iPhones stop
// delivering to an app that receives pushes without showing them), and one per chat or meal (tag) replaces the one before.
// A link is only ever one of this app's own pages: anything else opens the calendar.
const safeLink = (link) => (typeof link === 'string' && /^[a-z]+\.html(?:\?[\w=%.@|+-]*)?$/.test(link) ? link : 'index.html');

self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const data = payload && typeof payload.data === 'object' && payload.data ? payload.data : payload; // FCM wraps it in { data }
  const title = typeof data.title === 'string' && data.title ? data.title.slice(0, 120) : 'Splitskebab';
  event.waitUntil(self.registration.showNotification(title, {
    body: typeof data.body === 'string' ? data.body.slice(0, 300) : '',
    icon: 'images/icon-192.png',
    badge: 'images/icon-192.png',
    tag: typeof data.tag === 'string' && data.tag ? data.tag.slice(0, 200) : undefined,
    renotify: Boolean(data.tag),
    data: { link: safeLink(data.link) },
  }));
});

// A tap opens the page: in a window of the app that is already open (brought forward), or a new one.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(safeLink(event.notification.data?.link), self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (windows) => {
    const open = windows.find((w) => new URL(w.url).origin === self.location.origin);
    if (open) {
      await open.focus();
      return open.navigate(url).catch(() => self.clients.openWindow(url));
    }
    return self.clients.openWindow(url);
  }));
});

/** The address a copy is kept under: without soft navigation's cache-busting query. */
function cacheKey(url) {
  const key = new URL(url.href);
  key.searchParams.delete('soft-nav');
  return key.href;
}

const store = (key, response) => caches.open(CACHE).then((cache) => cache.put(key, response)).catch(() => {});

/** The network's answer when it comes within WAIT_MS, else the saved copy (and the network's answer when there is no copy). */
async function networkFirst(event, request, key) {
  const network = fetch(request).then((response) => {
    const policy = response.headers.get('Cache-Control') || '';
    if (response.ok && !/no-store|private/i.test(policy) && !request.headers.has('Authorization')) store(key, response.clone());
    return response;
  });
  event.waitUntil(network.catch(() => {})); // a late answer still refreshes the cache after the copy was used
  let timer;
  const late = new Promise((resolve) => { timer = setTimeout(resolve, WAIT_MS, 'late'); });
  const first = await Promise.race([network.catch(() => 'failed'), late]);
  clearTimeout(timer);
  if (first !== 'late' && first !== 'failed') return first;
  const hit = await caches.match(key)
    || (request.mode === 'navigate' ? await caches.match(key, { ignoreSearch: true }) || await caches.match('index.html') : undefined);
  if (hit) return hit;
  return first === 'late' ? network.catch(() => Response.error()) : Response.error();
}

/** A file of the pinned Firebase SDK: from the cache, else fetched once and kept (its address names the version, so it never changes). */
async function sdkFile(request) {
  const hit = await caches.match(request.url);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && (response.type === 'cors' || response.type === 'basic')) store(request.url, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.href.startsWith(SDK) && /^[\w./-]+\.js$/.test(url.href.slice(SDK.length)) && !url.search) {
    event.respondWith(sdkFile(request));
    return;
  }
  if (url.origin !== self.location.origin || url.pathname.startsWith('/__/') || !keepable(url)) return;
  event.respondWith(networkFirst(event, request, cacheKey(url)));
});
