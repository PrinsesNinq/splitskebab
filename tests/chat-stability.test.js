// The chat on iPhones: no offline copy in WebKit's IndexedDB (it hung Firestore after the app was in the background), a composer that is
// never locked for good by a write the server does not answer, and the read time written once per message instead of once per snapshot.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { keepsOfflineCopy } from "../public/js/offline-cache.js";
import { shouldMarkRead, settleWithin } from "../public/js/messaging.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  iphoneHomeScreen: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  ipadDesktopMode: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macSafari: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15",
  macChrome: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  windowsEdge: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0",
  firefox: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
};

test("iPhones, iPads and Safari keep Firestore's copy in memory; other browsers keep it on the device", () => {
  for (const name of ["iphoneSafari", "iphoneChrome", "iphoneHomeScreen", "macSafari"]) assert.equal(keepsOfflineCopy({ userAgent: UA[name] }), false, name);
  assert.equal(keepsOfflineCopy({ userAgent: UA.ipadDesktopMode, maxTouchPoints: 5 }), false, "an iPad that asks for the Mac site");
  for (const name of ["macChrome", "android", "androidWebView", "windowsEdge", "firefox"]) assert.equal(keepsOfflineCopy({ userAgent: UA[name] }), true, name);
  assert.equal(keepsOfflineCopy(), true, "no browser details: the default");
});

test("js/firebase-init.js chooses the cache with keepsOfflineCopy", () => {
  const init = read("public/js/firebase-init.js");
  assert.ok(init.includes('import { keepsOfflineCopy } from "./offline-cache.js";'));
  assert.match(init, /localCache: keepsOfflineCopy\(navigator\)\s*\? fs\.persistentLocalCache\(\{ tabManager: fs\.persistentMultipleTabManager\(\) \}\)\s*: fs\.memoryLocalCache\(\),/);
});

test("the read time is written once per new message, not again while my earlier write is still pending", () => {
  const unread = { lastAt: 100, lastFrom: "anna", readAt: {} };
  assert.equal(shouldMarkRead(unread, "me", 0), true);
  assert.equal(shouldMarkRead(unread, "me", 100), false, "already marked; Firestore still shows my read time as empty");
  assert.equal(shouldMarkRead({ ...unread, lastAt: 200 }, "me", 100), true, "a newer message");
  assert.equal(shouldMarkRead({ ...unread, lastFrom: "me" }, "me", 0), false, "my own message");
  assert.equal(shouldMarkRead({ ...unread, readAt: { me: 150 } }, "me", 0), false, "read already");
  assert.equal(shouldMarkRead(null, "me", 0), false, "no conversation yet");
  const chat = read("public/js/chat.js");
  assert.ok(chat.includes("shouldMarkRead(conversation, me, markedUpTo)") && chat.includes("markedUpTo = conversation.lastAt;"));
});

test("sending frees the composer after a short wait when the server does not answer, and still reports a failure", async () => {
  assert.equal(await settleWithin(Promise.resolve(), 50), "sent");
  assert.equal(await settleWithin(new Promise(() => {}), 20), "pending", "a write the server never confirms");
  await assert.rejects(settleWithin(Promise.reject(new Error("denied")), 50), /denied/);
  const late = new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 30));
  assert.equal(await settleWithin(late, 5), "pending");
  await assert.rejects(late, /late/, "the caller still sees the late failure");
  const chat = read("public/js/chat.js");
  assert.ok(chat.includes('if ((await settleWithin(sending, SEND_WAIT_MS)) === "pending") sending.catch(failed);'));
});
