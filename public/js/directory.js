// Google Workspace directory search for Settings > Users > Add user: the same company directory Gmail suggests from (People API,
// searchDirectoryPeople). It runs in the admin's own browser with their own Google account: a one-time consent popup gives a short-lived
// token for read-only directory access; no server, no service account. On when GOOGLE_OAUTH_CLIENT_ID in js/config.js is set (sel new
// fills it in); without it Add user is a plain email field.
//
// Needs, once per Firebase project (sel new does the first two, and prints the last):
//   - GOOGLE_OAUTH_CLIENT_ID: the web client Firebase made for Google sign-in (Authentication > Sign-in method > Google > Web SDK
//     configuration > Web client ID)
//   - the People API turned on in that project
//   - its OAuth consent screen set to Internal (only your organisation), with the scope .../auth/directory.readonly, and the site's
//     addresses (https://<project>.web.app, http://localhost:5000) under the web client's Authorized JavaScript origins
// The search itself always talks to Google, also on the local emulators (it uses your real Google account, not the emulator's).
import { GOOGLE_OAUTH_CLIENT_ID } from "./config.js";

const SCOPE = "https://www.googleapis.com/auth/directory.readonly";
const TOKEN_KEY = "directoryAccessToken";
let token = null; // { value, expiresAt }
let gis = null;

export const directoryConfigured = () => Boolean(GOOGLE_OAUTH_CLIENT_ID);

// The token lives in memory and in sessionStorage until shortly before it expires (about an hour), so a reload does not ask again.
function currentToken() {
  if (token && token.expiresAt > Date.now()) return token.value;
  try {
    const stored = JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null");
    if (stored && stored.expiresAt > Date.now()) { token = stored; return stored.value; }
  } catch { /* storage blocked: the in-memory token still works */ }
  return null;
}
function storeToken(next) {
  token = next;
  try { if (next) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(next)); else sessionStorage.removeItem(TOKEN_KEY); } catch { /* see above */ }
}

function loadGis() {
  gis ??= new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const script = Object.assign(document.createElement("script"), { src: "https://accounts.google.com/gsi/client", async: true });
    script.onload = () => resolve();
    script.onerror = () => { gis = null; reject(new Error("Could not load Google sign-in.")); };
    document.head.appendChild(script);
  });
  return gis;
}

/** Google's consent popup for the directory scope. Call it from a click. hint: the admin's email, preselected in Google's chooser. */
export async function connectDirectory(hint) {
  await loadGis();
  await new Promise((resolve, reject) => {
    window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope: SCOPE,
      hint,
      callback: (r) => {
        if (r.error) { reject(new Error(r.error_description || r.error)); return; }
        storeToken({ value: r.access_token, expiresAt: Date.now() + (Number(r.expires_in) - 60) * 1000 }); // a minute's margin
        resolve();
      },
      error_callback: (err) => reject(new Error(err?.message || "Google sign-in was closed.")),
    }).requestAccessToken({ prompt: "" });
  });
}

/** [{ name, email, photoUrl }] in the directory matching the start of a name or email. needsConnect on the error: connect (again). */
export async function searchDirectory(query) {
  const accessToken = currentToken();
  if (!accessToken) throw Object.assign(new Error("Not connected to the Google directory."), { needsConnect: true });
  const params = new URLSearchParams({ query, readMask: "names,emailAddresses,photos", sources: "DIRECTORY_SOURCE_TYPE_DOMAIN_PROFILE", pageSize: "8" });
  const res = await fetch(`https://people.googleapis.com/v1/people:searchDirectoryPeople?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (res.status === 401) { storeToken(null); throw Object.assign(new Error("The Google directory connection expired."), { needsConnect: true }); }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error?.message || `Directory search failed (${res.status}).`);
  return ((await res.json()).people || []).map((p) => ({
    name: p.names?.[0]?.displayName || "",
    email: ((p.emailAddresses || []).find((e) => e.metadata?.primary) || (p.emailAddresses || [])[0])?.value?.toLowerCase() || "",
    photoUrl: (p.photos || []).find((x) => !x.default)?.url || "",
  })).filter((p) => p.email);
}

const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Suggestions under a text field (the library's suggestion list, component "Mention autocomplete"): typing 2+ characters searches;
 * Up / Down move, Enter picks, Escape closes. Before the admin has connected (or once the hourly token has expired) it offers a
 * "Connect" button instead (a click, because it opens Google's popup). Only addresses on `domain`; people in known() can't be picked.
 */
export function attachDirectorySearch(input, { domain, hint, known = () => new Set(), onPick }) {
  const host = input.closest(".input-group")?.parentElement || input.parentElement;
  host.classList.add("position-relative");
  const menu = document.createElement("ul");
  menu.className = "dropdown-menu mention-menu mention-menu--below";
  menu.setAttribute("role", "listbox");
  host.appendChild(menu);
  input.setAttribute("autocomplete", "off");
  let results = [];
  let active = -1;
  let timer = null;
  let seq = 0;

  const show = (html) => { menu.innerHTML = html; menu.classList.add("show"); };
  const close = () => { menu.classList.remove("show"); results = []; active = -1; };
  const status = (text) => `<li><span class="dropdown-item-text small text-body-secondary">${esc(text)}</span></li>`;
  const connect = () => '<li><button type="button" class="dropdown-item" data-connect>Connect the Google directory, to search by name</button></li>';
  const render = () => {
    if (!results.length) { show(status("No one in the directory matches.")); return; }
    show(results.map((p, i) => {
      const already = known().has(p.email);
      const face = p.photoUrl ? `<img class="avatar avatar-sm" src="${esc(p.photoUrl)}" alt="" referrerpolicy="no-referrer">` : `<span class="avatar avatar-sm">${esc((p.name || p.email).charAt(0).toUpperCase())}</span>`;
      return `<li><button type="button" class="dropdown-item d-flex align-items-center gap-2 ${i === active ? "active" : ""}" data-index="${i}" role="option" aria-selected="${i === active}" ${already ? "disabled" : ""}>
        ${face}<span class="d-flex flex-column min-w-0"><span class="text-truncate">${esc(p.name || p.email)}</span><small class="text-truncate opacity-75">${esc(p.email)}</small></span>
        ${already ? '<small class="ms-auto text-nowrap">Already added</small>' : ""}</button></li>`;
    }).join(""));
  };
  async function search() {
    const query = input.value.trim();
    if (query.length < 2 || query.includes("@")) { close(); return; }
    if (!currentToken()) { show(connect()); return; }
    const mine = ++seq;
    show(status("Searching the directory..."));
    try {
      const people = await searchDirectory(query);
      if (mine !== seq) return; // a newer search started
      results = people.filter((p) => p.email.endsWith(`@${domain}`));
      active = results.findIndex((p) => !known().has(p.email));
      render();
    } catch (err) {
      if (mine === seq) show(err.needsConnect ? connect() : status(err.message));
    }
  }
  const pick = (p) => { if (p && !known().has(p.email)) { close(); onPick(p); } };

  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(search, 250); });
  input.addEventListener("keydown", (event) => {
    if (!menu.classList.contains("show")) return;
    const pickable = results.map((p, i) => (known().has(p.email) ? -1 : i)).filter((i) => i >= 0);
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && pickable.length) {
      event.preventDefault();
      const pos = pickable.indexOf(active) + (event.key === "ArrowDown" ? 1 : -1);
      active = pickable[(pos + pickable.length) % pickable.length];
      render();
    } else if (event.key === "Enter" && active >= 0 && results[active]) {
      event.preventDefault(); // pick instead of submitting half a name
      pick(results[active]);
    } else if (event.key === "Escape") { event.preventDefault(); close(); }
  });
  input.addEventListener("blur", () => setTimeout(() => { if (!host.contains(document.activeElement)) close(); }, 150));
  menu.addEventListener("mousedown", (event) => { if (event.target.closest("[data-index], [data-connect]")) event.preventDefault(); }); // before the blur
  menu.addEventListener("click", async (event) => {
    if (event.target.closest("[data-connect]")) {
      try { await connectDirectory(hint); input.focus(); search(); } catch (err) { show(status(err.message)); }
      return;
    }
    const item = event.target.closest("[data-index]");
    if (item) pick(results[Number(item.dataset.index)]);
  });
  return { close };
}
