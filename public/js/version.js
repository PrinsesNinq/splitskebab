// The version of the app's code that is loaded. public/version.json says which version is deployed; js/app.js compares the two when the
// app starts and whenever it comes back to the screen, and reloads when a newer one is live. An installed app on a phone can stay open
// for days: without this it would keep running old code against new security rules (and be refused). Change BOTH this value and
// public/version.json with every deploy that changes code or rules (tests/i18n.test.js checks they match).
export const APP_VERSION = "2026-11-06.11";
