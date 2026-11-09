// Settings page. General: your role, and "Become first admin" for the bootstrap account. Users (admins only): everyone who signed in,
// live from Firestore (js/users.js): roles, blocking, and groups on the drag board. People are their uid; an email shows only for people
// who accepted the terms (their permission for the admins to see it).
import { configured } from "./firebase-init.js";
import { adminStatus, becomeFirstAdmin } from "./auth.js";

const roleBox = document.querySelector('#admin-status');
const usersTab = document.querySelector('#users-tab').closest('li');

const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// A steady colour per person, from their uid.
const colour = (id) => `hsl(${[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 55% 42%)`;
// The table's avatar (component "Avatar") reads --avatar-bg, a board chip's (component "Drag board") --chip-color.
const avatar = (p, cls = 'avatar') => (p.photoUrl
  ? `<img class="${cls}" src="${esc(p.photoUrl)}" alt="" referrerpolicy="no-referrer">`
  : `<span class="${cls}" style="${cls === 'avatar' ? '--avatar-bg' : '--chip-color'}: ${colour(p.id)}">${esc(p.name.charAt(0).toUpperCase())}</span>`);
const groupId = (name) => 'g-' + [...name].map((c) => c.charCodeAt(0).toString(36)).join('-'); // any name, as a safe id

// ---- Admins only ----
// The page shows nothing until the role is known, and someone who is not an admin (nor the bootstrap account, while there is no admin
// yet) is sent to their profile. This is only the screen: every admin action and the admin data are refused by firestore.rules anyway.
const pageParts = [document.querySelector('main.paper-tabs-box'), document.querySelector('sel-paper-tabs')?.closest('.container')].filter(Boolean);
pageParts.forEach((el) => { el.hidden = true; });

async function leaveForNonAdmins() {
  const { go, toast } = await import('./ui.js');
  const { t } = await import('./i18n.js');
  toast(t('settings.adminsOnly'), 'warning');
  go('profile.html');
}

// ---- Your role (General tab) ----
async function showRole(user) {
  const status = await adminStatus(user.uid, user.email).catch(() => ({ isAdmin: false, canBootstrap: false, hasAdmins: true }));
  if (!status.isAdmin && !status.canBootstrap) { leaveForNonAdmins(); return; }
  pageParts.forEach((el) => { el.hidden = false; });
  usersTab.hidden = !status.isAdmin;
  if (status.isAdmin) {
    roleBox.innerHTML = '<span class="badge text-bg-primary">Admin</span> You can manage this app: see the Users tab.';
    startUsers(user);
  } else if (status.canBootstrap) {
    roleBox.innerHTML = '<p class="mb-2">There is no admin yet, and you are the account that may become the first one.</p><button type="button" class="btn btn-primary btn-sm" id="become-admin-btn">Become first admin</button>';
    roleBox.querySelector('#become-admin-btn').addEventListener('click', async (event) => {
      event.target.disabled = true;
      await becomeFirstAdmin(user.uid);
      showRole(user);
    });
  } else roleBox.textContent = status.hasAdmins ? 'You are a user. An admin can give you more rights.' : 'There is no admin yet.';
}

// ---- Users (admins) ----
let started = false;
async function startUsers(me) {
  if (started) return;
  started = true;
  const users = await import('./users.js');
  let current = { people: [], groups: [] };
  const tbody = document.querySelector('#users-table-body');
  const problem = (err) => {
    console.error(err);
    document.querySelector('#users-error').textContent = `That did not work: ${err.message || err}`;
    document.querySelector('#users-error').classList.remove('d-none');
  };
  const act = (fn) => (...args) => Promise.resolve(fn(...args)).catch(problem);

  function renderTable() {
    tbody.innerHTML = current.people.map((p) => {
      const self = p.id === me.uid;
      const detail = p.email || (p.registered ? 'Email not shared: terms not accepted yet' : 'Signed in, no account');
      const role = p.blocked ? ['text-bg-danger', 'Blocked'] : p.admin ? ['text-bg-primary', 'Admin'] : !p.registered ? ['text-bg-warning', 'No account']
        : !p.acceptedTerms ? ['text-bg-warning', 'Terms not accepted'] : ['text-bg-secondary', 'User'];
      return `<tr data-id="${esc(p.id)}">
        <td data-value="${esc(p.name)}"><div class="d-flex align-items-center gap-2">${avatar(p)}<div><div>${esc(p.name)}</div><div class="small text-body-secondary">${esc(detail)}</div></div></div></td>
        <td><span class="badge ${role[0]}">${role[1]}</span></td>
        <td data-values="${esc(p.groups.join('|'))}"><div class="d-flex flex-wrap gap-1">${p.groups.map((g) => `<span class="badge text-bg-light border">${esc(g)}</span>`).join('')}</div></td>
        <td class="text-end"><div class="d-flex gap-2 justify-content-end flex-wrap">
          <button type="button" class="btn btn-sm ${p.blocked ? 'btn-outline-success' : 'btn-outline-danger'}" data-action="${p.blocked ? 'unblock' : 'block'}" ${self ? 'disabled title="Not yourself"' : ''}>${p.blocked ? 'Unblock' : 'Block'}</button>
          <button type="button" class="btn btn-sm ${p.admin ? 'btn-outline-danger' : 'btn-outline-primary'}" data-action="${p.admin ? 'demote' : 'promote'}" ${self ? 'disabled title="Not yourself: another admin can"' : ''}>${p.admin ? 'Demote' : 'Promote'}</button>
          <button type="button" class="btn btn-sm btn-outline-danger" data-action="remove" ${self ? 'disabled title="Not yourself"' : 'title="Delete their account, role, groups and profile (they can register again: block them to keep them out)"'}>Remove</button>
        </div></td>
      </tr>`;
    }).join('') || '<tr><td colspan="4" class="text-body-secondary">Nobody yet.</td></tr>';
  }

  // The board is rebuilt from the data (a new <sel-board> sets itself up; the old one cleans up when it is removed).
  function renderBoard() {
    const chip = (p) => `<div class="board-chip" draggable="true" data-item="${esc(p.id)}">${avatar(p, 'board-chip__avatar')}<span class="board-chip__label">${esc(p.name)}</span></div>`;
    const empty = '<p class="board-column__empty text-body-secondary small fst-italic mb-0">Nobody here yet.</p>';
    const column = (name, members) => `<div class="board-column" data-column="${groupId(name)}" data-name="${esc(name)}">
      <div class="board-column__header"><span class="fw-bold">${esc(name)}</span><div class="d-flex align-items-center gap-1"><button type="button" class="board-column__edit" aria-label="Rename or delete ${esc(name)}"><i class="ti board-column__edit-icon" data-icon="pencil-fill"></i></button><span class="badge text-bg-light border" data-count>0</span></div></div>
      <div class="board-column__list">${members.map(chip).join('')}${empty}</div></div>`;
    const board = document.createElement('sel-board');
    board.className = 'board';
    board.id = 'group-board';
    board.innerHTML = `<div class="board-column" data-board-source data-column="everyone">
      <div class="board-column__header"><span class="fw-bold">Everyone</span><div class="d-flex align-items-center gap-1"><span class="badge text-bg-light border" data-count>0</span></div></div>
      <div class="board-column__list">${current.people.filter((p) => p.registered).map(chip).join('')}${empty}</div></div>`
      + current.groups.map((g) => column(g, current.people.filter((p) => p.groups.includes(g)))).join('');
    document.querySelector('#group-board').replaceWith(board);
    if (window.ThemeIcons) window.ThemeIcons.render(board);
  }

  users.watchPeople((data) => { current = data; renderTable(); renderBoard(); }, problem);

  tbody.addEventListener('click', act(async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const { id } = button.closest('tr').dataset;
    const name = current.people.find((p) => p.id === id)?.name || 'this person';
    button.disabled = true;
    if (button.dataset.action === 'block') { if (confirm(`Block ${name}? They lose all access and cannot register again until you unblock them.`)) await users.setBlocked(id, true); else button.disabled = false; }
    else if (button.dataset.action === 'unblock') await users.setBlocked(id, false);
    else if (button.dataset.action === 'promote') await users.setAdmin(id, true);
    else if (button.dataset.action === 'demote') await users.setAdmin(id, false);
    else if (confirm(`Remove ${name}? Their account, role, groups and profile are deleted. They can register again; use Block to keep them out.`)) await users.removePerson(id);
    else button.disabled = false;
  }));

  // "+ Add group" shows or hides the small form above the board.
  const toggle = document.querySelector('#add-group-toggle');
  const groupForm = document.querySelector('#add-group-form');
  toggle.addEventListener('click', () => {
    groupForm.hidden = !groupForm.hidden;
    toggle.setAttribute('aria-expanded', String(!groupForm.hidden));
    if (!groupForm.hidden) groupForm.querySelector('input').focus();
  });
  groupForm.addEventListener('submit', act(async (event) => {
    event.preventDefault();
    const name = document.querySelector('#add-group-name').value.trim();
    if (name) await users.addGroup(name);
    groupForm.reset();
    groupForm.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }));

  // The board says what moved; the person's groups are then whatever columns they are in now.
  const panel = document.querySelector('#users-pane');
  panel.addEventListener('board:change', act(async (event) => {
    const board = event.target.closest('sel-board');
    const id = event.detail.item;
    const groups = [...board.querySelectorAll('.board-column:not([data-board-source])')]
      .filter((col) => [...col.querySelectorAll('.board-chip')].some((c) => c.dataset.item === id))
      .map((col) => col.dataset.name);
    await users.setGroups(id, groups);
  }));
  panel.addEventListener('board:edit', act(async (event) => {
    const col = event.target.closest('sel-board').querySelector(`.board-column[data-column="${event.detail.column}"]`);
    const name = col && col.dataset.name;
    if (!name) return;
    const next = prompt(`Rename the group "${name}" (empty: delete it; its members leave the group):`, name);
    if (next === null || next.trim() === name) return;
    if (!next.trim() && !confirm(`Delete the group "${name}"?`)) return;
    await users.changeGroup(name, next.trim(), current);
  }));
}

if (!configured) roleBox.textContent = 'Firebase is not set up yet.';
else if (window.appUser) showRole(window.appUser);
else document.addEventListener('app:user', (event) => showRole(event.detail.user), { once: true });
