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
  const { initializeApp } = await import(`${SDK}/firebase-app.js`);
  const { getFirestore, connectFirestoreEmulator } = await import(`${SDK}/firebase-firestore.js`);
  const { getAuth, connectAuthEmulator } = await import(`${SDK}/firebase-auth.js`);
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  if (usingEmulators) {
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectAuthEmulator(auth, "http://127.0.0.1:9099");
  }
}
