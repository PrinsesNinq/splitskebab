// Profile photos (public/js/photo.js): only a Google photo (https) or a small picture data URL is ever drawn; anything else is refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { safePhoto, MAX_PHOTO_CHARS } from "../public/js/photo.js";

test("a Google photo address and a small JPEG/PNG/WebP picture are accepted", () => {
  assert.equal(safePhoto("https://lh3.googleusercontent.com/a/abc=s96-c"), "https://lh3.googleusercontent.com/a/abc=s96-c");
  for (const type of ["jpeg", "png", "webp"]) assert.ok(safePhoto(`data:image/${type};base64,QUJD`), type);
});

test("anything else is refused: other schemes, SVG, markup, oversized pictures, non-text", () => {
  for (const bad of [
    "javascript:alert(1)", "http://example.com/a.jpg", "data:image/svg+xml;base64,PHN2Zz4=", "data:text/html;base64,PGI+",
    'https://x.com/a.jpg" onerror="alert(1)', "https://x.com/<b>", `data:image/jpeg;base64,${"A".repeat(MAX_PHOTO_CHARS)}`,
    `https://x.com/${"a".repeat(500)}`, null, 42, {},
  ]) assert.equal(safePhoto(bad), null, String(bad).slice(0, 60));
});

test("the size limit matches firestore.rules", async () => {
  const fs = await import("node:fs");
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  assert.match(rules, new RegExp(`d\\.photoUrl\\.size\\(\\) <= ${MAX_PHOTO_CHARS} && d\\.photoUrl\\.matches\\('data:image/\\(jpeg\\|png\\|webp\\)`));
});
