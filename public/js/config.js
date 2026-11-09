// This project's Firebase settings. sel-new fills them in; otherwise copy them from the Firebase console (Project settings > Your apps >
// the web app > SDK setup and configuration). Until then the pages run without Firebase and say so.
export const firebaseConfig = /* firebase-config */ {
  projectId: "splitskebab-1fb8",
  appId: "1:736652207016:web:ed06e1a8f4450bae63339d",
  storageBucket: "splitskebab-1fb8.firebasestorage.app",
  apiKey: "AIzaSyB5-gqHqfNQBcqzEuk6fjV9QAu5SOeDVIo",
  authDomain: "splitskebab-1fb8.firebaseapp.com",
  messagingSenderId: "736652207016",
  projectNumber: "736652207016",
  version: "2",
} /* /firebase-config */;

// The app's name, shown on the sign-in page.
export const APP_NAME = "Splitskebab";

// The domain Google accounts must be on to sign in, or "" for any Google account (Gmail, a university account...). Splitskebab uses "":
// who gets in is decided by invitation instead (an admin adds the address in Settings > Users; firestore.rules allowed()). If you set a
// domain here, set the same one in firestore.rules (signedIn()): rules cannot import JS.
export const ALLOWED_DOMAIN = "";

// The one account that may make itself the first admin (Settings > General), when there is no admin yet. Also in firestore.rules
// (isBootstrapAdmin()). After that, admins are listed in the settings/admins document.
export const BOOTSTRAP_ADMIN_EMAIL = "nino.otten@aperam.com";

// The OAuth web client Firebase made for Google sign-in, kept for the library's setup tools (sel new). Splitskebab itself no longer uses
// it: there is no directory search, people are found by name and nobody is added by email.
export const GOOGLE_OAUTH_CLIENT_ID = "666699245055-tb1gave0fk4mlh28d38jc24r2lr4b323.apps.googleusercontent.com";

export const configured = !firebaseConfig.apiKey.startsWith("<");
