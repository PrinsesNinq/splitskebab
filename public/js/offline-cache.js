// Whether this browser keeps Firestore's offline copy on the device (IndexedDB, js/firebase-init.js), pure (tests/chat-stability.test.js).
// Not in WebKit (every browser on an iPhone or iPad, and Safari on a Mac): its IndexedDB loses its connection when the app goes to the
// background and then hangs instead of failing (WebKit bugs 197050 and 273827, firebase-js-sdk issues 7940 and 8068). Firestore then waits
// for it forever: the chat froze, messages could not be sent, and only closing and reopening the app (sometimes several times) helped.
// There the copy is kept in memory: the first data after a start comes from the server, a little later, but nothing hangs.

/** False for WebKit-only browsers (iOS, iPadOS, Safari on a Mac), true elsewhere. */
export function keepsOfflineCopy({ userAgent = "", maxTouchPoints = 0 } = {}) {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1); // an iPad asks for the Mac site
  const safari = /Version\/[\d.]+.*Safari\//.test(userAgent) && !/Chrome|Chromium|Android/.test(userAgent);
  return !(ios || safari);
}
