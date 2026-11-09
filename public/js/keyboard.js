// The bottom bar while typing on a phone. A fixed bar belongs to the whole page, not to the part of it that is visible above the on-screen
// keyboard, so while someone types (a chat, a search, the meal form) phones showed it floating halfway up the screen, and iPhones sometimes
// left it there after the keyboard closed. So while the keyboard is open the bar (and the "Plan a meal" button) hide (html.keyboard-open,
// css/app.css), as in most phone apps; when it closes, the page is nudged so iOS puts fixed elements back where they belong.
// The keyboard counts as open when a text field has the focus on a touch screen and the visible part of the page has shrunk (a tablet
// with a hardware keyboard keeps its bar). Runs once (js/app.js): the listeners are on the document and stay for the app's lifetime.
// While it is open, --keyboard-inset on <html> is how much of the bottom of the page the keyboard covers, so something docked to the
// bottom (the chat composer) can sit on top of the keyboard instead of behind it.
export const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=reset]):not([type=file]):not([type=range]):not([type=color]), textarea, select, [contenteditable=''], [contenteditable='true']";

/** Whether the on-screen keyboard is up: on a touch screen, a text field is focused and the visible area is clearly smaller than the window. */
export function keyboardOpen({ coarse, typing, visualHeight, windowHeight }) {
  if (!coarse || !typing) return false;
  return visualHeight == null ? true : visualHeight < windowHeight * 0.85;
}

/** How many pixels of the page's bottom the keyboard covers: below the visible area (which iOS also scrolls up: offsetTop). */
export function keyboardInset({ open, visualHeight, visualTop = 0, windowHeight }) {
  if (!open || visualHeight == null) return 0;
  return Math.max(0, Math.round(windowHeight - visualHeight - visualTop));
}

if (typeof document !== "undefined") {
  const touch = window.matchMedia("(pointer: coarse)");
  const root = document.documentElement;
  let open = false;
  const update = () => {
    const next = keyboardOpen({
      coarse: touch.matches,
      typing: Boolean(document.activeElement?.matches?.(TEXT)),
      visualHeight: window.visualViewport?.height,
      windowHeight: window.innerHeight,
    });
    const inset = keyboardInset({ open: next, visualHeight: window.visualViewport?.height, visualTop: window.visualViewport?.offsetTop, windowHeight: window.innerHeight });
    root.style.setProperty("--keyboard-inset", `${inset}px`); // measured, so a custom property (css/app.css .chat-dock)
    if (next === open) return;
    open = next;
    root.classList.toggle("keyboard-open", open);
    if (!open) requestAnimationFrame(() => window.scrollTo(window.scrollX, window.scrollY)); // iOS: re-place fixed elements
  };
  // focusout fires before the next field's focusin when moving between fields: wait a moment so the bar does not flash in between.
  document.addEventListener("focusin", update);
  document.addEventListener("focusout", () => setTimeout(update, 100));
  window.visualViewport?.addEventListener("resize", update); // the keyboard opening, closing (Android's back button) or resizing
  window.visualViewport?.addEventListener("scroll", update); // iOS moves the visible area over the page while the keyboard is open
}
