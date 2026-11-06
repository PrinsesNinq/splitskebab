// The one Firebase app, database and auth instance, shared by every script. The SDK is loaded from Google's CDN (no build step).
//
// Served from this machine (npm run dev) it talks to the local emulators, never the live project: a local session cannot read or write
// production data. The ports are the ones in firebase.json ("emulators"). Not set up yet (js/config.js still has placeholders): nothing
// is loaded and db / auth stay null; the pages say so.
import { firebaseConfig, configured } from "./config.js";

export const SDK = "https://www.gstatic.com/firebasejs/10.14.1";
export const usingEmulators = ["localhost", "127.0.0.1"].includes(location.hostname);
export { configured };

export let app = null;
export let db = null;
export let auth = null;

if (configured) {
  // The three SDK files in parallel, not one after the other: on a phone each one is a round trip.
  const [{ initializeApp }, fs, { getAuth, connectAuthEmulator }] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-firestore.js`), import(`${SDK}/firebase-auth.js`),
  ]);
  app = initializeApp(firebaseConfig);
  // A copy of what was read is kept on the device (IndexedDB), so the next visit shows the meals, houses and recipes at once and the
  // server's changes stream in after; shared between open tabs. Long polling is switched on by itself where the network breaks
  // Firestore's streaming connection (some mobile networks and proxies), which otherwise stalls the first reads for many seconds.
  // Signing out wipes the copy (js/auth.js). A browser that cannot store it (private mode) just works without one.
  try {
    db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      experimentalAutoDetectLongPolling: true,
    });
  } catch (err) {
    console.warn("Firestore offline cache not available, working without it:", err?.message || err);
    db = fs.getFirestore(app);
  }
  const { connectFirestoreEmulator } = fs;
  auth = getAuth(app);
  if (usingEmulators) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
  }
}
