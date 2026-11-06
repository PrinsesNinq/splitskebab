// Profile photos. A person's photo is either their Google photo (an https address) or a picture they chose, shrunk on the device to a
// small square JPEG and stored with their profile as a data: URL (Firebase Storage needs the paid plan; an avatar this size fits in the
// profile document). safePhoto() is what every page draws; firestore.rules checks the same shapes and sizes.

export const PHOTO_SIZE = 128; // pixels, square: avatars are drawn at most ~64 px, twice that for sharp screens
export const MAX_PHOTO_CHARS = 60000; // firestore.rules allows the same

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

/** The photo to draw, or null: an https address of a sane length, or a small picture data URL. Anything else (javascript:, svg...) is not. */
export function safePhoto(value) {
  if (typeof value !== "string") return null;
  if (/^https:\/\//.test(value) && value.length <= 500 && !/["'<>\s]/.test(value)) return value;
  if (value.length <= MAX_PHOTO_CHARS && DATA_URL.test(value)) return value;
  return null;
}

/**
 * A picture file shrunk to a PHOTO_SIZE square JPEG (the middle of the picture, so a portrait is not squashed), as a data URL.
 * Throws an Error with a message for the person when the file is not a picture the browser can read.
 */
export async function shrinkPhoto(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error("not-an-image");
  const bitmap = await createImageBitmap(file).catch(() => { throw new Error("not-an-image"); });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = PHOTO_SIZE;
  canvas.height = PHOTO_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
  bitmap.close?.();
  // Lower the quality until it fits (a very detailed photo can be larger at the first try).
  for (const quality of [0.85, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL("image/jpeg", quality);
    if (url.length <= MAX_PHOTO_CHARS) return url;
  }
  throw new Error("too-large");
}
