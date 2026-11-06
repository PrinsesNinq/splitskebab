// sel-pull: keeps a project in step with the Shared Element Library. Zero dependencies (Node 18+). Fetch the newest copy of this script
// from the library any time:  node scripts/sel-pull.mjs self-update
//
//   node scripts/sel-pull.mjs init                               set up a NEW project: rule sets base + sel, CLAUDE.md, npm scripts, .gitignore, the Bootstrap theme
//   node scripts/sel-pull.mjs sync                               pull only what the project USES: the sel- elements in its markup, and the theme with just those components' CSS
//   node scripts/sel-pull.mjs elements header-panel stat-block   pull components (ES modules) into the project, and what they import
//   node scripts/sel-pull.mjs elements                           pull the newest version of the components already in sel.lock.json
//   node scripts/sel-pull.mjs rules base                         pull the rule files of a set (Claude rules, commands, templates)
//   node scripts/sel-pull.mjs rules .claude/rules/security.md   ... or single files
//   node scripts/sel-pull.mjs rules                              refresh the rule files already pulled (committed revisions only), and the files new in the sets you pulled
//   node scripts/sel-pull.mjs firebase                           a local dev environment on the Firebase emulators (npm run dev, dev:seed, dev:pull)
//   node scripts/sel-pull.mjs users                              the company's users and groups into .sel/directory.json (never in public/: staff emails); npm run users:import adds them to Firestore
//   node scripts/sel-pull.mjs check [--soft]                     are the pulled elements and rules current? what changed? (exit 2 if not)
//   node scripts/sel-pull.mjs status                             what the lockfile says
//   node scripts/sel-pull.mjs changes [--from x.y.z]             the change notes of the components you use, since the version you pulled (breaking ones marked)
//   node scripts/sel-pull.mjs propose [component ...]           write up your local edits of pulled files for the library: a diff against the library's file, in .sel/proposals/
//   node scripts/sel-pull.mjs firebase-rules [--deploy]         compare firestore.rules.proposed with the rules deployed in the Firebase project; --deploy replaces them (backup, typed confirmation)
//   node scripts/sel-pull.mjs report [--remove]                  tell the hosted library which components this project uses (sync and elements do it by themselves; --remove deletes your record; --no-report or SEL_NO_REPORT=1 turns it off)
//   node scripts/sel-pull.mjs components [search] [--json]       what the library offers: every component with its tag or class and a one-line description (for people and for agents)
//   node scripts/sel-pull.mjs component <name> [--html|--full]   how to use one: tag, classes, import, example markup, attributes and events
//   node scripts/sel-pull.mjs search "<what I need>" [--limit n] [--json]   which components fit a need, best first (read-only)
//   node scripts/sel-pull.mjs diff [--component id] [--full]    what an update would change: the change notes and a compact diff of the pulled files (read-only)
//   node scripts/sel-pull.mjs release [x.y.z] [--plan] [--commit]  give the unreleased CHANGELOG.md notes a version (and package.json), then push the changelog to the Aperam App Store; asks first (--yes), --plan writes nothing
//   node scripts/sel-pull.mjs doctor                         what could be wrong here (library, script, lock, Firebase tools), with the fix; changes nothing
//   node scripts/sel-pull.mjs sync --plan                        what sync would add, replace, keep or remove, WITHOUT writing anything (also for elements, rules, firebase, users)
//   node scripts/sel-pull.mjs self-update                        replace this script with the library's newest (checked before it replaces anything)
//
// init [set ...] pulls the sets you name instead of base and sel (see the Rules & guides section of the library for what exists); --no-theme skips the theme, --no-starter skips the starter theme (public/index.html, css, js, a dev server; only added when there is no public/index.html), --starter <id> picks another one, --firebase also runs "firebase".
// New project in one line (the library running on http://localhost:4000), from the project's root:
//   bash / cmd:   curl -s http://localhost:4000/client/sel-pull.mjs | node --input-type=module - init
//   PowerShell:   (irm http://localhost:4000/client/sel-pull.mjs) | node --input-type=module - init
// sync --only id,id pulls just those components (remembered in sel.lock.json; "--only all" clears it): for adopting them one by one.
// sync --no-theme writes the CSS of the components you use into <out>/components.css (link it before your own stylesheet).
// sync [--also id,id] keeps components you want even though no markup uses them yet (remembered in sel.lock.json as "keep"; "--also none" clears it); --no-theme leaves the theme alone.
//
// Options: --library http://localhost:4000   --theme <id>   --version latest|working|x.y.z (elements; default latest)
//          --out public/vendor/sel (where elements go)   --icons (the icon runtime; sync adds it by itself for <i data-icon> or an import of theme-icons.js; --no-icons drops a remembered --icons)
//          --force (overwrite local edits and files that were not pulled by sel-pull; remove edited files)
//          --break-lock (a command refuses to start while another one seems to run in this project; only when you are SURE none does, this removes
//                        the project lock files and goes on. A lock of a process that is gone, or an unfinished lock file, is cleared without it)
//          --plan (sync, elements, rules, firebase, users: do everything except writing; list what would change; exit 2 if a real run would stop or keep a file)
//          --from <x.y.z> (changes: the version to compare from; default the oldest one pulled)
//          --soft (check: report but always exit 0, and exit quietly if the library is not running)
//          --working (rules: pull the library's uncommitted working copies instead of the committed revisions; only for trying something)
//          --key=value works for every option that takes a value. An unknown option is an error, and so is --dry-run (nothing here previews).
//
// sel.lock.json (commit it) records the library version, the files pulled and a hash of every one. Pulled files are generated: do not edit
// them in the project (check reports it, and a pull refuses to overwrite them without --force). Change the component in the library,
// write its change note there, commit a version, and pull.
//
// What a command promises (every command that writes goes through one plan):
//  - It is the only sel-pull running in this project (a second one is refused while the first runs).
//  - Everything is downloaded and checked before the first file is touched. A file is replaced only when it is one sel-pull wrote and nobody
//    edited, or one that is identical to the new content, or one of its own generated files; a file of your own at the same path stops the
//    command (nothing is changed) unless you pass --force. A removal never deletes an edited file: it is kept and reported (exit 2).
//  - A file that changed while the command was running stops it before it writes anything.
//  - Everything it writes is inside the project: an --out (or a lockfile "out") that is outside it, also through a link, is refused before anything is
//    read or written, so that an interrupted pull can always be put back. A file that already holds exactly the new bytes is not written again.
//  - The library's compatibility policy (client/compat.json) must be readable: only a missing file (404) means no minimum; any other failure stops a write.
//  - Files are replaced one by one through a temporary file, the lockfile last. If a write fails the files already written are put back, and
//    anything that could not be put back is listed.
//  - A killed process or a power cut in the middle of the writes is recovered: before the first file is touched a journal (the list of files
//    and a copy of every original) is saved in the system's temp folder, next to the project lock. The next command that writes finds it, puts
//    the original files back (a file you changed since stays as it is and is listed), says what it did and stops with "run the command again".
//    Limit: the temp folder is not kept across a reboot on every system; then only git, "check" and pulling again (--force) are left.
//  - Test hook (tests only): SEL_PULL_TEST_DIE_AFTER=<n> kills the process right after the n-th file of the apply step; SEL_PULL_TEST_IDLE_MS
//    shortens the 30 second limit on a silent connection.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline/promises';
// <hosted-client> generated from lib/hosted-client.mjs by scripts/sync-hosted.js: do not edit here
import hostedFs from 'node:fs';
import hostedOs from 'node:os';
import hostedPath from 'node:path';
import hostedZlib from 'node:zlib';
import hostedCrypto from 'node:crypto';

const HOSTED_PREFIX = 'firebase://';
/** A refusal the caller can show: status for the Response, message for the person. */
class HostedError extends Error {
  constructor(status, message) { super(message); this.hostedStatus = status; }
}
/** The command that signs in: plain sel login for the company library (the default), with --library for any other. */
const hostedLoginCommand = (project) => (project === 'sel-library-d6ap' ? 'sel login' : `sel login --library firebase://${project}`);
const hostedHome = () => process.env.SEL_HOME || hostedPath.join(hostedOs.homedir(), '.sel');
/** firebase://project/path?query -> { project, path, query }, or null when the URL is not a hosted one. */
function hostedParse(url) {
  const text = String(url);
  if (!text.startsWith(HOSTED_PREFIX)) return null;
  const rest = text.slice(HOSTED_PREFIX.length);
  const slash = rest.indexOf('/');
  const project = slash < 0 ? rest : rest.slice(0, slash);
  const tail = slash < 0 ? '' : rest.slice(slash + 1);
  const q = tail.indexOf('?');
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) throw new HostedError(400, `"${project}" is not a Firebase project id (firebase://<project>).`);
  return { project, path: decodeURIComponent(q < 0 ? tail : tail.slice(0, q)), query: q < 0 ? '' : tail.slice(q + 1) };
}
/** Only the real Google endpoints, or a local stand-in (tests): a token is never sent to another host. */
function hostedEndpoint(variable, real) {
  const value = process.env[variable];
  if (!value) return real;
  try { const u = new URL(value); if (['127.0.0.1', 'localhost'].includes(u.hostname)) return value.replace(/\/$/, ''); } catch { /* ignored */ }
  return real;
}
function hostedCredentials(project) {
  try { return JSON.parse(hostedFs.readFileSync(hostedPath.join(hostedHome(), 'credentials.json'), 'utf8')).projects?.[project] || null; } catch { return null; }
}
const hostedTokens = new Map();
/** A Firebase ID token for the project: SEL_ID_TOKEN, or the saved refresh token exchanged for a short-lived one (kept for the run). */
async function hostedIdToken(project, signal) {
  if (process.env.SEL_ID_TOKEN) return { token: process.env.SEL_ID_TOKEN, email: process.env.SEL_ID_EMAIL || 'the token in SEL_ID_TOKEN' };
  const cached = hostedTokens.get(project);
  if (cached && cached.until > Date.now() + 60000) return cached;
  const saved = hostedCredentials(project);
  if (!saved || !saved.refreshToken || !saved.apiKey) throw new HostedError(401, `You are not signed in to the hosted library ${project}. Run: ${hostedLoginCommand(project)}`);
  const res = await fetch(`${hostedEndpoint('SEL_TOKEN_ENDPOINT', 'https://securetoken.googleapis.com')}/v1/token?key=${encodeURIComponent(saved.apiKey)}`, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(saved.refreshToken)}`, signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.id_token) throw new HostedError(401, `The saved sign-in for ${project} no longer works (${(body.error && body.error.message) || `HTTP ${res.status}`}). Run: ${hostedLoginCommand(project)}`);
  const entry = { token: body.id_token, email: saved.email || 'your account', until: Date.now() + (Number(body.expires_in) || 3600) * 1000 };
  hostedTokens.set(project, entry);
  return entry;
}
function hostedDecode(value) {
  if (!value || typeof value !== 'object') return null;
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('bytesValue' in value) return Buffer.from(value.bytesValue, 'base64');
  if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([k, v]) => [k, hostedDecode(v)]));
  if ('arrayValue' in value) return (value.arrayValue.values || []).map(hostedDecode);
  return null;
}
// What a client accepts from the hosted library. A version is about 210 files and 4.7 MB (the largest file about 700 KB, in at most 2 chunks of 600 KB of
// gzip), so these leave a wide margin; they protect against a damaged publication, not against the trusted publisher. SEL_HOSTED_MAX_DOWNLOAD,
// SEL_HOSTED_MAX_OUTPUT and SEL_HOSTED_MAX_DOCUMENTS (numbers) change the per-run budgets.
const HOSTED_FILE_MAX = 32 * 1024 * 1024; // the content of one file
const HOSTED_CHUNK_MAX = 1000000; // a Firestore document is at most 1 MiB
const HOSTED_FILES_MAX = 2000; // files listed in one version
const hostedBudget = { download: 0, output: 0, documents: 0 };
const hostedLimit = (variable, fallback) => { const n = Number(process.env[variable]); return Number.isFinite(n) && n > 0 ? n : fallback; };
const hostedOver = (what) => new HostedError(502, `The hosted library sent more than expected (${what}). Nothing further was read: this is a damaged publication, or a mirror gone wrong. Try again later; tell the library owner if it stays.`);
const hostedDocs = new Map();
/** One document's fields (decoded), or null when it does not exist. */
async function hostedDoc(project, collection, id, signal) {
  const key = `${project}/${collection}/${id}`;
  if (hostedDocs.has(key)) return hostedDocs.get(key);
  if (++hostedBudget.documents > hostedLimit('SEL_HOSTED_MAX_DOCUMENTS', 5000)) throw hostedOver('too many documents');
  const who = await hostedIdToken(project, signal);
  const base = hostedEndpoint('SEL_FIRESTORE_ENDPOINT', 'https://firestore.googleapis.com');
  const res = await fetch(`${base}/v1/projects/${project}/databases/(default)/documents/${collection}/${encodeURIComponent(id)}`, { headers: { authorization: `Bearer ${who.token}` }, signal });
  if (res.status === 404) return null;
  if (res.status === 401) throw new HostedError(401, `The hosted library refused the sign-in (HTTP 401). Run: ${hostedLoginCommand(project)}`);
  if (res.status === 403) {
    throw new HostedError(403, `The hosted library refused ${who.email}: it is not on the developers list (the user list needs an admin). Ask an admin to add the address, or sign in with the right account: ${hostedLoginCommand(project)}`);
  }
  if (!res.ok) throw new HostedError(502, `The hosted library answered HTTP ${res.status} for ${collection}/${id}.`);
  const fields = hostedDecode({ mapValue: { fields: (await res.json()).fields || {} } });
  hostedDocs.set(key, fields);
  return fields;
}
/** A published file's description as the version document gives it, or an error: the hash, the size and the number of chunks must be plausible. */
function hostedEntry(entry) {
  const ok = entry && typeof entry === 'object' && /^[0-9a-f]{64}$/.test(String(entry.sha)) && Number.isInteger(entry.size) && entry.size >= 0 && entry.size <= HOSTED_FILE_MAX
    && Number.isInteger(entry.chunks) && entry.chunks >= 1 && entry.chunks <= Math.min(64, Math.ceil(entry.size * 1.02 / 600000) + 1);
  if (!ok) throw new HostedError(502, 'The hosted library lists a file with an impossible description (hash, size or number of parts). It was not used.');
  return entry;
}
/** The files of a version (or the rules, or the client scripts): a plain object of a sane size, or an error. */
function hostedFiles(files) {
  if (!files || typeof files !== 'object' || Array.isArray(files) || Object.keys(files).length > HOSTED_FILES_MAX) throw new HostedError(502, 'The hosted library lists more files than a version can have, or a list that is damaged. It was not used.');
  return files;
}
/** The bytes of a published file: its gzip chunks, joined, unzipped (never past the size it declares) and checked against the sha256 the version names. */
async function hostedBlob(project, collection, entry, signal) {
  hostedEntry(entry);
  const parts = [];
  for (let n = 0; n < entry.chunks; n++) {
    const id = `${entry.sha}_${n}`;
    const chunk = await hostedDoc(project, collection, id, signal);
    hostedDocs.delete(`${project}/${collection}/${id}`); // the bytes are used once: not kept for the whole run
    if (!chunk || !Buffer.isBuffer(chunk.data)) throw new HostedError(502, `The hosted library is missing part ${n + 1} of ${entry.chunks} of a file (${entry.sha.slice(0, 12)}): a publish may be unfinished. Try again in a minute.`);
    if (chunk.data.length > HOSTED_CHUNK_MAX) throw new HostedError(502, 'A part of a file from the hosted library is larger than a document can be. It was not used.');
    hostedBudget.download += chunk.data.length;
    if (hostedBudget.download > hostedLimit('SEL_HOSTED_MAX_DOWNLOAD', 256 * 1024 * 1024)) throw hostedOver('too much downloaded');
    parts.push(chunk.data);
  }
  let content;
  try { content = hostedZlib.gunzipSync(Buffer.concat(parts), { maxOutputLength: Math.max(entry.size, 1) }); } catch (e) { throw new HostedError(502, `A file from the hosted library could not be unpacked, or is larger than it says (${e.message}).`); }
  if (content.length !== entry.size) throw new HostedError(502, 'A file from the hosted library is not the size it says. It was not used.');
  hostedBudget.output += content.length;
  if (hostedBudget.output > hostedLimit('SEL_HOSTED_MAX_OUTPUT', 512 * 1024 * 1024)) throw hostedOver('too much unpacked');
  if (hostedCrypto.createHash('sha256').update(content).digest('hex') !== entry.sha) throw new HostedError(502, 'A file from the hosted library does not match its checksum. It was not used.');
  return content;
}
const HOSTED_LOCAL_ONLY = 'The working copy is only served by the local library (npm start). The hosted library has committed versions only.';
/** The answer for one library path: { status, body } (a Buffer or text). */
async function hostedResolve(project, relative, query, signal) {
  const missing = (text) => ({ status: 404, body: text });
  if (/(^|&)working=1(&|$)/.test(query)) return missing(HOSTED_LOCAL_ONLY);
  const parts = relative.split('/');
  if (parts[0] === 'dist' && parts.length >= 3) {
    const theme = parts[1];
    let version = parts[2];
    const file = parts.slice(3).join('/');
    if (version === 'working') return missing(HOSTED_LOCAL_ONLY);
    if (version === 'latest') {
      const meta = await hostedDoc(project, 'libMeta', 'latest', signal);
      version = meta && meta.themes && meta.themes[theme];
      if (!version) return missing('No committed versions yet.');
    }
    const doc = await hostedDoc(project, 'libVersions', `${theme}@${version}`, signal);
    if (!doc || !doc.files) return missing(`No version ${version} of ${theme} in the hosted library.`);
    hostedFiles(doc.files);
    if (!file) return { status: 200, body: JSON.stringify(Object.keys(doc.files)) };
    const entry = Object.prototype.hasOwnProperty.call(doc.files, file) ? doc.files[file] : null;
    if (!entry) return missing(`No such file in theme: ${file}`);
    return { status: 200, body: await hostedBlob(project, entry.admin ? 'libAdminBlobs' : 'libBlobs', entry, signal) };
  }
  if (relative === 'rules/manifest.json') {
    const doc = await hostedDoc(project, 'libRules', 'manifest', signal);
    return doc && typeof doc.manifest === 'string' ? { status: 200, body: doc.manifest } : missing('The hosted library has no rules published yet.');
  }
  if (parts[0] === 'rules' && parts[1] === 'files') {
    const doc = await hostedDoc(project, 'libRules', 'manifest', signal);
    const file = parts.slice(2).join('/');
    const entry = doc && doc.blobs && Object.prototype.hasOwnProperty.call(hostedFiles(doc.blobs), file) ? doc.blobs[file] : null;
    return entry ? { status: 200, body: await hostedBlob(project, 'libBlobs', entry, signal) } : missing(`No such rule file: ${file}`);
  }
  if (parts[0] === 'client') {
    const doc = await hostedDoc(project, 'libClient', 'index', signal);
    const file = parts.slice(1).join('/');
    const entry = doc && doc.files && Object.prototype.hasOwnProperty.call(hostedFiles(doc.files), file) ? doc.files[file] : null;
    return entry ? { status: 200, body: await hostedBlob(project, 'libBlobs', entry, signal) } : missing(`No such client file: ${file}`);
  }
  return missing(`The hosted library has no ${relative}.`);
}
/** fetch() for a library URL: a firebase://project/... one is answered from the hosted library, anything else goes to fetch. */
async function libraryFetch(url, init = {}) {
  if (!String(url).startsWith(HOSTED_PREFIX)) return fetch(url, init);
  try {
    const hosted = hostedParse(url);
    const answer = await hostedResolve(hosted.project, hosted.path, hosted.query, init.signal);
    return new Response(answer.body, { status: answer.status });
  } catch (e) {
    if (e && e.hostedStatus) return new Response(e.message, { status: e.hostedStatus });
    throw e;
  }
}
// ---- usage reports: which components a project uses (collection libUsage, one document per project and developer; hosted/firestore.rules has the rules)
/** The signed-in e-mail (lower-cased) that reports for this project, or null when it is not known (SEL_ID_TOKEN without SEL_ID_EMAIL, no saved sign-in). */
function hostedReporter(project) {
  const email = process.env.SEL_ID_TOKEN ? process.env.SEL_ID_EMAIL : (hostedCredentials(project) || {}).email;
  return typeof email === 'string' && /^\S+@\S+$/.test(email.trim()) ? email.trim().toLowerCase() : null;
}
/** The document id of a project's record by a developer: <project>__<reporterKey>, at most 160 characters. */
function hostedUsageId(projectName, email) {
  const name = String(projectName || '').toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 80) || 'project';
  return `${name}__${String(email).toLowerCase().replace(/[^a-z0-9]/g, '-')}`.slice(0, 160);
}
function hostedValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, hostedValue(v)])) } };
}
/** Writes (a full replace) or, with record null, deletes libUsage/<id> with the developer's token. Throws a HostedError that says why. */
async function hostedUsageWrite(project, id, record, signal) {
  const who = await hostedIdToken(project, signal);
  const base = hostedEndpoint('SEL_FIRESTORE_ENDPOINT', 'https://firestore.googleapis.com');
  const init = { method: record ? 'PATCH' : 'DELETE', headers: { authorization: `Bearer ${who.token}`, ...(record ? { 'content-type': 'application/json' } : {}) }, signal };
  if (record) init.body = JSON.stringify({ fields: Object.fromEntries(Object.entries(record).map(([k, v]) => [k, hostedValue(v)])) });
  const res = await fetch(`${base}/v1/projects/${project}/databases/(default)/documents/libUsage/${encodeURIComponent(id)}`, init);
  if (res.ok || (!record && res.status === 404)) return;
  if (res.status === 401) throw new HostedError(401, `the sign-in was refused (HTTP 401); run: ${hostedLoginCommand(project)}`);
  if (res.status === 403) throw new HostedError(403, `the hosted library refused ${who.email} (HTTP 403: not on the developers list?)`);
  throw new HostedError(502, `the hosted library answered HTTP ${res.status}`);
}
// </hosted-client>

const LOCK_FILE = 'sel.lock.json';
// The version of this script. The library publishes the oldest one it still accepts (client/compat.json, minClient): an older script still
// reads and checks, but a command that writes is refused with "run sel self-update". Bump this when the script gains something projects need.
const CLIENT_VERSION = 9;
const DEFAULTS = { library: 'http://localhost:4000', theme: 'aperam-theme', out: 'public/vendor/sel' };

const COMMANDS = ['init', 'sync', 'elements', 'rules', 'firebase', 'users', 'check', 'status', 'self-update', 'changes', 'doctor', 'propose', 'firebase-rules', 'report', 'components', 'component', 'search', 'diff', 'release', 'help'];
const BOOLEAN_OPTIONS = ['json', 'html', 'full', 'no-report', 'remove','deploy', 'yes', 'plan', 'force', 'soft', 'working', 'icons', 'no-icons', 'firebase', 'no-theme', 'no-starter', 'break-lock', 'commit', 'prune', 'no-prune', 'allow-long'];
const VALUE_OPTIONS = ['library', 'theme', 'version', 'out', 'also', 'starter', 'only', 'from', 'file', 'project', 'limit', 'component', 'app', 'changelog'];
const EMPTY_VALUE_OK = ['only', 'also']; // "--only ''" clears the adopted list

/** The known option closest to a mistyped one, for the error message. */
function suggestion(name) {
  const known = [...BOOLEAN_OPTIONS, ...VALUE_OPTIONS];
  const distance = (a, b) => {
    const row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      let diagonal = row[0];
      row[0] = i;
      for (let j = 1; j <= b.length; j++) {
        const above = row[j];
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
        diagonal = above;
      }
    }
    return row[b.length];
  };
  const best = known.map((k) => [k, distance(name, k)]).sort((x, y) => x[1] - y[1])[0];
  return best && best[1] <= 3 ? ` (did you mean --${best[0]}?)` : '';
}

/** Reads the command line against the known options: { args, errors }. Nothing runs when there is an error. */
function parseArgs(list) {
  const args = { _: [] };
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (!item.startsWith('--')) {
      if (item === 'true' || item === 'false') errors.push(`Unexpected "${item}": an option is on by its name alone (--force), it takes no true or false`);
      args._.push(item);
      continue;
    }
    const eq = item.indexOf('=');
    const key = item.slice(2, eq > 0 ? eq : undefined);
    const inline = eq > 0 ? item.slice(eq + 1) : undefined;
    if (key === 'dry-run') { errors.push('--dry-run is not supported here: it is not an option here. --plan shows what a sync, elements, rules, firebase or users would change, and writes nothing; sel new --dry-run previews a new project'); continue; }
    if (VALUE_OPTIONS.includes(key)) {
      let value = inline;
      if (value === undefined) {
        const next = list[i + 1];
        if (next === undefined || next.startsWith('--')) { errors.push(`--${key} needs a value`); continue; }
        value = next;
        i++;
      }
      if (value === '' && !EMPTY_VALUE_OK.includes(key)) { errors.push(`--${key} needs a value`); continue; }
      args[key] = value;
    } else if (BOOLEAN_OPTIONS.includes(key)) {
      if (inline !== undefined) errors.push(`--${key} takes no value (it is on by its name alone)`);
      else args[key] = true;
    } else errors.push(`Unknown option --${key}${suggestion(key)}`);
  }
  return { args, errors };
}

const [command = 'help', ...rest] = process.argv.slice(2);
const parsed = parseArgs(rest);
if (!COMMANDS.includes(command)) parsed.errors.push(`Unknown command "${command}". Commands: ${COMMANDS.join(', ')}`);
if (parsed.errors.length) {
  console.error('sel-pull: ' + parsed.errors.join('\nsel-pull: '));
  process.exit(1);
}
const args = parsed.args;
// Recognising a flag is not enough: silently ignoring it on the wrong command can
// turn an intended restricted pull into a broader installation.
const OPTIONS_BY_COMMAND = {
  init: ['force', 'working', 'icons', 'no-icons', 'firebase', 'no-theme', 'no-starter', 'break-lock', 'library', 'theme', 'version', 'out', 'also', 'starter', 'only'],
  sync: ['plan', 'force', 'icons', 'no-icons', 'no-theme', 'no-report', 'break-lock', 'library', 'theme', 'version', 'out', 'also', 'only'],
  elements: ['plan', 'force', 'icons', 'no-icons', 'no-report', 'break-lock', 'library', 'theme', 'version', 'out'],
  rules: ['plan', 'force', 'working', 'break-lock', 'library', 'theme'],
  firebase: ['plan', 'force', 'break-lock', 'library', 'theme'], users: ['plan', 'force', 'break-lock', 'library', 'theme', 'version'],
  check: ['soft', 'library', 'theme'], search: ['library', 'theme', 'version', 'json', 'limit'], diff: ['library', 'theme', 'version', 'component', 'full'], status: ['library', 'theme'],
  'self-update': ['break-lock', 'library', 'theme'], changes: ['library', 'theme', 'version', 'from'], doctor: ['library', 'theme'], propose: ['break-lock', 'library', 'theme'], 'firebase-rules': ['library', 'theme', 'deploy', 'yes', 'file', 'project'], components: ['library', 'theme', 'version', 'json'], component: ['library', 'theme', 'version', 'json', 'html', 'full'], report: ['library', 'theme', 'remove'], release: ['library', 'theme', 'project', 'app', 'changelog', 'yes', 'plan', 'commit', 'prune', 'no-prune', 'allow-long'], help: ['library'],
};
for (const key of Object.keys(args).filter((key) => key !== '_')) {
  if (!OPTIONS_BY_COMMAND[command].includes(key)) {
    console.error(`sel-pull: --${key} is not supported by ${command}. Nothing was changed.`);
    process.exit(1);
  }
}
if ((!['init', 'elements', 'rules', 'propose', 'components', 'component', 'search', 'release'].includes(command) && args._.length) || (args.icons && args['no-icons'])) {
  console.error('sel-pull: Unexpected arguments or conflicting --icons / --no-icons options. Nothing was changed.');
  process.exit(1);
}

if (args.out !== undefined) {
  try { assertInsideProject(args.out, '--out'); } catch (e) { console.error('sel-pull: ' + e.message); process.exit(1); }
}

const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');
// Hash what a file MEANS, not how git wrote it to disk: fonts and other binaries byte for byte, text with line endings normalised (a Windows
// checkout may turn LF into CRLF, which is not an edit).
const BINARY = /\.(woff2?|ttf|otf|eot|png|jpe?g|gif|ico|webp)$/i;
const contentHash = (rel, content) => (BINARY.test(rel) ? sha(Buffer.isBuffer(content) ? content : Buffer.from(content)) : sha(String(Buffer.isBuffer(content) ? content.toString('utf8') : content).replace(/\r\n/g, '\n')));
const cmp = (a, b) => {
  const [x, y] = [a, b].map((v) => String(v).split(/[.-]/).map((n) => parseInt(n, 10) || 0));
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0);
  return 0;
};
// --plan: the command runs as usual but writes nothing; what it would say while working is kept and shown under the plan
const planning = !!args.plan || command === 'diff'; // diff runs the sync plan too, and shows it as a diff
const notes = [];
const say = (msg = '') => (planning ? notes.push(msg) : console.log(msg));
/** An error that sets the exit code of the command (2: something was left as it was, 1: it failed). */
const failure = (message, exitCode = 1) => Object.assign(new Error(message), { exitCode });

/** An output folder as one project-relative, slash-separated path: "./public/x/" and "public/x" are the same folder (and so is an absolute path to it). */
const normOut = (p) => path.relative(process.cwd(), path.resolve(String(p))).split(path.sep).join('/') || '.';
/** Whether two output folders are the same folder (compared case-insensitively on Windows only). */
const sameOut = (a, b) => (process.platform === 'win32' ? normOut(a).toLowerCase() === normOut(b).toLowerCase() : normOut(a) === normOut(b));
/** The folder this project's pulled files live in: --out (a move), else where an earlier pull put the scripts, the component CSS or the theme. */
function rootOf() {
  const theme = lock.theme_files && lock.theme_files.out ? String(lock.theme_files.out).replace(/\/theme\/*$/, '') : '';
  return normOut(args.out || (lock.elements && lock.elements.out) || (lock.component_css && lock.component_css.out) || theme || DEFAULTS.out);
}
/** diff plans an update without doing it: the guards that stop a real run must not stop the plan. Not --force: remove() and write() still see what the user gave. */
let diffMode = false;
const bypass = () => !!(args.force || diffMode);

// ------------------------------------------------------------------ files: atomic writes, the lockfile, the project lock
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** Replaces `file` in one step: written next to it, then renamed over it (a few tries: on Windows an antivirus scan can hold the file for a moment). */
function writeAtomic(file, data) {
  const temporary = `${file}.sel-tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, data);
    for (let attempt = 0; ; attempt++) {
      try { fs.renameSync(temporary, file); return; } catch (e) {
        if (attempt >= 4 || !['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e;
        sleepSync(40 * (attempt + 1));
      }
    }
  } catch (e) {
    try { fs.rmSync(temporary, { force: true }); } catch { /* nothing to clean */ }
    throw e;
  }
}

/** The real path of a target: links are resolved in the part that exists, the rest is taken as written, so a link in the way cannot lead out unseen. */
function realPathOf(target) {
  const full = path.resolve(target);
  let existing = full;
  while (!fs.existsSync(existing) && path.dirname(existing) !== existing) existing = path.dirname(existing);
  let real;
  try { real = fs.realpathSync(existing); } catch { real = existing; }
  return path.join(real, path.relative(existing, full));
}
/** Whether a path is inside the project (the folder sel-pull runs in), by real path, never by a string prefix. A link that leads out does not count. */
function insideProject(target) {
  const rel = path.relative(fs.realpathSync(process.cwd()), realPathOf(path.resolve(process.cwd(), String(target))));
  return rel === '' || (rel !== '..' && !rel.startsWith('..' + path.sep) && !path.isAbsolute(rel));
}
/** An output folder outside the project is refused before anything is read or written: a crash in the middle of such a pull could not be put back. */
function assertInsideProject(dir, label) {
  if (insideProject(dir)) return;
  const fix = label.startsWith('--') ? 'Name a folder inside the project.' : `Change it to a folder inside the project in ${LOCK_FILE} (move the pulled files there), or delete that entry and run sel sync again.`;
  throw new Error(`${label} is ${JSON.stringify(String(dir))}, which is outside the project. sel-pull only writes inside the project, so that an interrupted pull can always be put back. ${fix} Nothing was changed.`);
}

function readLockFile() {
  if (!fs.existsSync(LOCK_FILE)) return {};
  try {
    const value = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('not an object');
    const object = (x) => x && typeof x === 'object' && !Array.isArray(x);
    for (const key of ['library', 'theme']) if (value[key] !== undefined && (typeof value[key] !== 'string' || !value[key])) throw new Error(`${key} must be nonempty text`);
    for (const key of ['only', 'keep']) if (value[key] !== undefined && (!Array.isArray(value[key]) || value[key].some((id) => typeof id !== 'string'))) throw new Error(`${key} must be a list of names`);
    for (const key of ['elements', 'theme_files', 'component_css', 'firebase_dev', 'rules']) {
      const entry = value[key];
      if (entry === undefined) continue;
      if (!object(entry) || !object(entry.files)) throw new Error(`${key} must contain a files object`);
      if (key !== 'rules' && (typeof entry.out !== 'string' || !entry.out)) throw new Error(`${key}.out must be nonempty text`);
      if (key !== 'rules') assertInsideProject(entry.out, `${LOCK_FILE} ${key}.out`);
      for (const list of ['components', 'roots', 'sets']) if (entry[list] !== undefined && (!Array.isArray(entry[list]) || entry[list].some((id) => typeof id !== 'string'))) throw new Error(`${key}.${list} must be a list of names`);
      for (const hash of Object.values(entry.files)) if (key === 'rules' ? !object(hash) || typeof hash.sha256 !== 'string' : typeof hash !== 'string') throw new Error(`${key}.files contains an invalid hash record`);
    }
    return value;
  } catch (e) {
    console.error(`sel-pull: ${LOCK_FILE} cannot be read (${e.message}): an interrupted write, or a merge that went wrong.\nRestore it with git (git checkout ${LOCK_FILE}), or delete it and run sel-pull sync again.`);
    process.exit(1);
  }
}

const lock = readLockFile();
let library = (args.library || lock.library || DEFAULTS.library).replace(/\/$/, '');
let theme = args.theme || lock.theme || DEFAULTS.theme;

let projectLockHeld = false;
const processAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// A real command lasts seconds to minutes (every request is cut after 30 silent seconds). A lock or journal of a LIVE process that is older than
// this belongs to a process id that was reused after a crash, not to a running sel-pull.
const LIVE_PID_MAX_AGE = 6 * 3600 * 1000;
// The lock is created, written and closed within milliseconds; the claim is held for the length of one read/remove/create. When one is older
// than this, its creator was killed in the middle.
const HALF_WRITTEN_MAX_AGE = 2 * 60 * 1000;
const ageOf = (file) => { try { return Date.now() - fs.statSync(file).mtimeMs; } catch { return 0; } };
const lockBase = () => path.join(os.tmpdir(), `sel-pull-${sha(fs.realpathSync(process.cwd())).slice(0, 20)}`);

/**
 * Only one sel-pull runs in a project at a time: two of them would read the same lockfile and the last to finish would overwrite the other's
 * entries. The lock is a file in the system's temp folder named after the project's folder (nothing is added to the project). It is taken over
 * when its process no longer exists, when it is an unfinished file (its creator was killed) or when it is older than any real command could be
 * (a reused process id). --break-lock removes it by hand for the case none of that applies.
 */
function acquireProjectLock() {
  if (projectLockHeld) return;
  const file = `${lockBase()}.lock`;
  // Serialise the read/remove/create sequence too. Otherwise two contenders can
  // both see a dead PID and the second can unlink the first's newly acquired lock.
  const claim = `${file}.claim`;
  if (args['break-lock']) {
    for (const f of [file, claim]) if (fs.existsSync(f)) { fs.rmSync(f, { force: true }); say(`--break-lock: removed ${f}`); }
  }
  let claimFd;
  for (let attempt = 0; ; attempt++) {
    try { claimFd = fs.openSync(claim, 'wx'); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (attempt === 0 && ageOf(claim) > HALF_WRITTEN_MAX_AGE) { fs.rmSync(claim, { force: true }); continue; } // its creator was killed
      throw failure(`Another sel-pull is acquiring its project lock (${claim}). Run this again in a moment. If none is running and this stays, run it with --break-lock.`);
    }
  }
  try {
    fs.writeSync(claimFd, JSON.stringify({ pid: process.pid }));
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const fd = fs.openSync(file, 'wx');
        try { fs.writeSync(fd, JSON.stringify({ pid: process.pid, started: Date.now(), folder: process.cwd() })); }
        finally { fs.closeSync(fd); }
        projectLockHeld = true;
        process.on('exit', () => {
          try {
            const owner = JSON.parse(fs.readFileSync(file, 'utf8')).pid;
            if (owner === process.pid) fs.rmSync(file, { force: true }); // never a lock another command took over
          } catch { /* it goes with the temp folder */ }
        });
        for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));
        return;
      } catch (e) {
        if (e.code !== 'EEXIST') throw e;
        let info = {};
        try { info = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* a creator may not have written its pid yet */ }
        const validPid = Number.isInteger(info.pid) && info.pid > 0;
        const age = ageOf(file);
        if (!validPid) {
          if (age <= HALF_WRITTEN_MAX_AGE) throw failure(`Another sel-pull is running (or just starting) in this project: its lock ${file} is not complete yet. Run this again in a moment.`);
        } else if (processAlive(info.pid) && age <= LIVE_PID_MAX_AGE) {
          throw failure(`Another sel-pull is running in this project (pid ${info.pid}, started ${new Date(info.started).toLocaleTimeString()}). Wait until it has finished and run this again. If it is stuck, stop that process; if no sel-pull runs at all (the lock is ${file}), run this with --break-lock.`);
        }
        fs.rmSync(file, { force: true }); // its process is gone, it never got finished, or it is too old to be real
      }
    }
    throw failure('Could not take the lock that keeps two sel-pull commands from running at once. Run the command again.');
  } finally {
    fs.closeSync(claimFd);
    fs.rmSync(claim, { force: true });
  }
}

// ------------------------------------------------------------------ the recovery journal (killed process, power cut)
const journalDir = () => `${lockBase()}.journal`;
const rawSha = (data) => crypto.createHash('sha256').update(data).digest('hex');
const rawState = (file) => { try { return rawSha(fs.readFileSync(file)); } catch (e) { return e.code === 'ENOENT' ? null : 'unreadable'; } };

/** Saved before the first file is touched: for every destination the hash of the original (and a copy of it) and the hash it is going to get. */
function openJournal(steps) {
  const dir = journalDir();
  fs.rmSync(dir, { recursive: true, force: true }); // only leftovers of a run that never got to touch anything (a real journal was handled at the start)
  fs.mkdirSync(dir, { recursive: true });
  const entries = new Map();
  steps.forEach(([kind, file, text], i) => {
    const after = kind === 'remove' ? null : rawSha(Buffer.from(text));
    if (entries.has(file)) { entries.get(file).after = after; return; }
    let original = null;
    try { original = fs.readFileSync(file); } catch (e) { if (e.code !== 'ENOENT') throw failure(`${showPath(file)} cannot be read, so it cannot be replaced safely (${e.message}). Nothing was changed.`); }
    if (original) writeAtomic(path.join(dir, `o${i}`), original);
    entries.set(file, { file, original: original ? `o${i}` : null, before: original ? rawSha(original) : null, after });
  });
  // journal.json is written last: a folder without it means nothing was touched yet
  writeAtomic(path.join(dir, 'journal.json'), JSON.stringify({ version: 1, pid: process.pid, started: Date.now(), folder: process.cwd(), command: process.argv.slice(2).join(' '), entries: [...entries.values()] }, null, 1));
  return dir;
}
const closeJournal = () => { try { fs.rmSync(journalDir(), { recursive: true, force: true }); } catch { /* temp folder */ } };

/**
 * At the start of every command that writes (the project lock is held, so the command that wrote the journal is gone): when a journal is left,
 * the run was killed between its writes. Put the originals back, except files that have changed since (the user's own edit), then stop: the
 * project is as it was before that command, and running it again is the next step.
 */
function recoverInterruptedRun() {
  const dir = journalDir();
  if (!fs.existsSync(dir)) return;
  const journalFile = path.join(dir, 'journal.json');
  if (!fs.existsSync(journalFile)) { closeJournal(); return; }
  const aside = () => { const to = `${dir}.damaged-${Date.now()}`; try { fs.renameSync(dir, to); return to; } catch { return dir; } };
  let journal;
  try {
    journal = JSON.parse(fs.readFileSync(journalFile, 'utf8'));
    if (journal.version !== 1 || !Array.isArray(journal.entries) || path.resolve(journal.folder) !== path.resolve(process.cwd())) throw new Error('not the journal of this project');
    for (const e of journal.entries) {
      // by real path: a journal that was edited to name a file outside the project, or one behind a link that leads out, is refused
      if (typeof e.file !== 'string' || !e.file || path.resolve(e.file) === path.resolve(process.cwd()) || !insideProject(e.file)) throw new Error('a file outside the project');
      if ((e.original !== null && !/^o\d+$/.test(e.original)) || ![e.before, e.after].every((h) => h === null || /^[0-9a-f]{64}$/.test(h))) throw new Error('an invalid entry');
    }
  } catch (e) {
    const moved = aside();
    throw failure(`A sel-pull that was interrupted left a recovery journal that cannot be read (${e.message}), so nothing could be put back automatically. It was moved to ${moved}.\nRun: node scripts/sel-pull.mjs check   (git status shows which files changed), then pull again; --force overwrites what check reports as changed.`);
  }
  if (processAlive(journal.pid) && Date.now() - journal.started <= LIVE_PID_MAX_AGE) {
    throw failure(`A sel-pull (pid ${journal.pid}) is still writing to this project: ${journal.command}. Wait until it has finished and run this again.`);
  }
  for (const entry of journal.entries) fs.rmSync(`${entry.file}.sel-tmp-${journal.pid}`, { force: true }); // the temporary file of a write that was cut off
  const restore = [];
  const foreign = [];
  for (const entry of journal.entries) {
    const now = rawState(entry.file);
    if (now === entry.before && now !== entry.after) continue; // never touched
    if (now === entry.after) { if (entry.after !== entry.before) restore.push(entry); continue; } // written (or removed)
    foreign.push(entry); // neither the original nor what the run wrote: changed since
  }
  if (!restore.length && !foreign.length) { closeJournal(); return; } // nothing was touched, or every write had happened: only the journal was left
  const done = [];
  const failed = [];
  for (const entry of restore.reverse()) {
    try {
      if (entry.original === null) fs.rmSync(entry.file, { force: true });
      else {
        const copy = fs.readFileSync(path.join(dir, entry.original));
        if (rawSha(copy) !== entry.before) throw new Error('the saved copy is damaged');
        fs.mkdirSync(path.dirname(entry.file), { recursive: true });
        writeAtomic(entry.file, copy);
      }
      done.push(showPath(entry.file));
    } catch (e) { failed.push(`${showPath(entry.file)} (${e.message})`); }
  }
  const when = new Date(journal.started).toLocaleString();
  let message = `An earlier sel-pull (${journal.command || 'unknown command'}, started ${when}) was interrupted in the middle of its writes. ` +
    `${done.length ? `Put back as they were: ${done.join(', ')}.` : 'Nothing had to be put back.'}`;
  if (foreign.length) message += `\nLeft alone, because they changed after that run (compare them with git): ${foreign.map((e) => showPath(e.file)).join(', ')}.`;
  if (failed.length) message += `\nCOULD NOT be put back: ${failed.join(', ')}. The copies are in ${aside()}.\nRestore them with git, then run: node scripts/sel-pull.mjs check`;
  else closeJournal();
  throw failure(message + '\nThe project is as it was before that command. Run your command again.');
}

// A request is cut when the library stays SILENT this long (no answer, or no new data while the body arrives). A big file on a slow line that keeps
// coming is never cut: the limit is per pause, not per transfer.
const IDLE_MS = Number(process.env.SEL_PULL_TEST_IDLE_MS) || 30000;

/** One GET, read to the end: { ok, status, body }. */
async function requestOnce(url) {
  const controller = new AbortController();
  let timer;
  const touch = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), IDLE_MS); };
  touch();
  try {
    const res = await libraryFetch(url, { signal: controller.signal });
    const chunks = [];
    if (res.body) for await (const chunk of res.body) { touch(); chunks.push(chunk); }
    return { ok: res.ok, status: res.status, body: Buffer.concat(chunks) };
  } catch (e) {
    if (controller.signal.aborted) throw new Error(`${url}: no answer from the library for ${IDLE_MS / 1000} seconds`, { cause: e });
    throw e;
  } finally { clearTimeout(timer); }
}

/** A GET that survives a dropped connection: a network error (not an HTTP error status) is tried again, twice. */
async function get(url) {
  for (let attempt = 0; ; attempt++) {
    try { return await requestOnce(url); } catch (e) {
      if (attempt >= 2) throw e;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

async function fetchText(url) {
  const res = await get(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status} ${res.body.toString('utf8').slice(0, 160)}`);
  return res.body.toString('utf8');
}
async function fetchBuffer(url) {
  const res = await get(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.body;
}
// "latest" is resolved ONCE per run, to its version number: every file of one pull then comes from the same release, even when a version is
// committed in the library while the pull is running (the lockfile records one version, so the files must be that version).
let latestPromise = null;
const pinnedLatest = () => latestPromise || (latestPromise = fetchText(`${library}/dist/${encodeURIComponent(theme)}/latest/theme.manifest.json`).then((text) => JSON.parse(text).version));
const resolveVersion = async (version) => (version === 'latest' ? pinnedLatest() : version);
const distBuffer = async (version, file) => fetchBuffer(`${library}/dist/${encodeURIComponent(theme)}/${encodeURIComponent(await resolveVersion(version))}/${file}`);
const dist = async (version, file) => fetchText(`${library}/dist/${encodeURIComponent(theme)}/${encodeURIComponent(await resolveVersion(version))}/${file}`);

/**
 * The full path of `rel` inside `root`, or an error. Every path that comes from outside (the library's manifest, a rule or starter file
 * list, the lockfile) goes through here before it is read, written or deleted, so a malformed or tampered list can never reach
 * outside the folder it belongs in: no absolute or drive paths, no .. segments, no backslashes, and no symlink that leads out.
 */
function safePath(root, rel) {
  const text = String(rel);
  if (!text || path.isAbsolute(text) || /^[a-zA-Z]:/.test(text) || text.includes('\\') || text.includes('\0') || text.split('/').includes('..')) {
    throw new Error(`Refusing a path outside the target folder: ${JSON.stringify(text)}`);
  }
  const base = path.resolve(root);
  const full = path.resolve(base, text);
  const inside = (p, b) => { const r = path.relative(b, p); return r !== '' && !r.startsWith('..') && !path.isAbsolute(r); };
  if (!inside(full, base)) throw new Error(`Refusing a path outside the target folder: ${JSON.stringify(text)}`);
  // a symlink in the way (an existing folder or file that points elsewhere) must not redirect the write
  // (lstat, not existsSync: a dangling link "exists" as a link but not as a file, and writing through it would create its target)
  const lexists = (p) => { try { fs.lstatSync(p); return true; } catch (e) { return false; } };
  let existing = full;
  while (!lexists(existing) && existing !== base) existing = path.dirname(existing);
  if (lexists(existing)) {
    let real;
    try { real = fs.realpathSync(existing); } catch (e) { throw new Error(`Refusing a path through a link that points nowhere: ${JSON.stringify(text)}`, { cause: e }); }
    const realBase = fs.realpathSync(base);
    if (real !== realBase && !inside(real, realBase)) throw new Error(`Refusing a path that leads outside the target folder through a link: ${JSON.stringify(text)}`);
  }
  return full;
}

/** A component id as the library names them: letters, digits, - and _ (it ends up in a file name and a URL). */
function safeId(id) {
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(String(id))) throw new Error(`Not a valid component name: ${JSON.stringify(String(id))}`);
  return String(id);
}

const showPath = (file) => path.relative(process.cwd(), file).split(path.sep).join('/') || '.';
/** What a file holds, as a hash (null: it does not exist). */
function fileState(file) {
  try { return contentHash(file, fs.readFileSync(file)); } catch (e) { return e.code === 'ENOENT' ? null : 'unreadable'; }
}

/** Local files (relative to `root`) whose content no longer matches what the lockfile recorded: edited by hand, or deleted. */
function locallyModified(files, root = '.') {
  return Object.entries(files || {}).filter(([rel, hash]) => {
    const file = safePath(root, rel);
    if (stage) observe(file);
    return !fs.existsSync(file) || contentHash(rel, fs.readFileSync(file)) !== hash;
  }).map(([rel]) => rel);
}

// ------------------------------------------------------------------ one plan for a command: staged, checked, applied, lockfile last
let stage = null;

/** The files the lockfile says sel-pull wrote: absolute path -> the hash recorded. Taken when the command starts. */
function ownedFiles() {
  const owned = new Map();
  const add = (root, files) => {
    for (const [rel, value] of Object.entries(files || {})) {
      try { owned.set(safePath(root, rel), typeof value === 'string' ? value : value && value.sha256); } catch { /* a bad entry owns nothing */ }
    }
  };
  if (lock.elements) add(lock.elements.out || DEFAULTS.out, lock.elements.files);
  if (lock.theme_files) add(lock.theme_files.out, lock.theme_files.files);
  if (lock.component_css) add(lock.component_css.out, lock.component_css.files);
  if (lock.firebase_dev) add(lock.firebase_dev.out, lock.firebase_dev.files);
  if (lock.rules) add('.', lock.rules.files);
  return owned;
}

/** Remembers what a file held when this command first looked at it: if it differs when the files are written, someone changed it meanwhile. */
function observe(file) {
  if (stage && !stage.seen.has(file)) stage.seen.set(file, fileState(file));
}

// Project configuration can be created by a starter and amended later in the
// same transaction. Read the plan so the later write includes those additions.
function projectText(rel, fallback = '') {
  const file = safePath('.', rel);
  observe(file);
  const pending = stage && [...stage.writes].reverse().find(([dest]) => dest === file);
  return pending ? String(pending[1]) : fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : fallback;
}

// What sel-pull may replace without being told to, besides the files it owns: its own generated files (they say so in their first line).
const GENERATED_MARKER = /^(# Generated: do not edit|\/\/ Generated by sel-)/;

/**
 * Plans a file. A file of the project's own that merely gets an update (package.json, .gitignore, firebase.json) is `{ project: true }`.
 * Otherwise an existing file is replaced only when sel-pull owns it, it is identical, it is a generated file, or --force was given.
 */
function write(root, rel, text, { project = false } = {}) {
  const file = safePath(root, rel);
  if (!stage) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    writeAtomic(file, text);
    return;
  }
  observe(file);
  if (!project && !args.force) {
    const now = fileState(file);
    if (now !== null) {
      const owner = stage.owned.get(file);
      const same = now === contentHash(file, text);
      if (owner === undefined && !same && !GENERATED_MARKER.test(fs.readFileSync(file, 'utf8'))) stage.blocked.push(showPath(file));
      else if (owner !== undefined && owner !== now && !same) stage.changed.push(showPath(file));
    }
  }
  stage.writes.push([file, text]);
}

/** Plans the removal of a file sel-pull wrote. An edited one is kept (and reported), unless --force. */
function remove(root, rel) {
  const file = safePath(root, rel);
  if (!stage) { fs.rmSync(file, { force: true }); return; }
  observe(file);
  if (!args.force) {
    const now = fileState(file);
    const owner = stage.owned.get(file);
    if (now === null) return;
    if (owner === undefined || owner !== now) { stage.kept.push(showPath(file)); return; }
  }
  stage.removes.push(file);
}

/** Whether remove() kept this file because it was edited: it stays listed in the lockfile, so the next run reports it again (and --force removes it). */
const wasKept = (root, rel) => !!stage && stage.kept.includes(showPath(safePath(root, rel)));

/** Whether a file holds exactly these bytes (line endings count: the one rule applyStage, --plan and diff share). */
const sameBytes = (file, text) => rawState(file) === rawSha(Buffer.isBuffer(text) ? text : Buffer.from(String(text)));
/** The operations of a plan by final destination: a file planned twice ends with its last text, and a removal of a path that is also written is dropped (the write wins). */
function finalOps(plan) {
  const key = (file) => (process.platform === 'win32' ? file.toLowerCase() : file);
  const last = new Map(plan.writes.map(([file, text]) => [file, text]));
  const written = new Set([...last.keys()].map(key));
  return { last, removes: [...new Set(plan.removes)].filter((file) => !written.has(key(file))) };
}

/** The lockfile is written with the rest, last: whatever `lock` holds when the files have been written. */
function commitLock() {
  if (stage) stage.lockWanted = true;
  else writeAtomic(path.resolve(LOCK_FILE), JSON.stringify(lock, null, 2) + '\n');
}

/** A lockfile's content without the time of the pull: two that differ only in that are the same lockfile. */
const withoutTimes = (text) => { try { return JSON.stringify(JSON.parse(text), (key, value) => (key === 'pulledAt' ? undefined : value)); } catch { return text; } };

function applyStage(plan) {
  if (plan.changed.length) {
    throw failure(`${[...new Set(plan.changed)].join(', ')} changed while sel-pull was running (or just before the write). Nothing was changed: run the command again; --force overwrites it.`);
  }
  if (plan.blocked.length) {
    throw failure(`These files already exist and were not pulled by sel-pull, so they were not replaced: ${[...new Set(plan.blocked)].join(', ')}.\nIf they are your own copies, move them away (or compare them with the library) and run this again; --force replaces them. Nothing was changed.`, 2);
  }
  if (!args.force) {
    for (const [file, was] of plan.seen) {
      if (fileState(file) !== was) throw failure(`${showPath(file)} changed while sel-pull was running. Nothing was changed: run the command again.`);
    }
  }
  // A file that already holds exactly these bytes is not written again: no new modification time for a file watcher or a build, no copy in the journal.
  // Raw bytes, not the line-ending-insensitive hash: a file that differs only in its line endings is still replaced. The lockfile is skipped when only
  // the time of the pull would change (the plan says the same, see reportPlan).
  const lockFile = path.resolve(LOCK_FILE);
  const ops = finalOps(plan);
  const writes = [...ops.last].filter(([file, text]) => file !== lockFile && !sameBytes(file, text));
  const steps = [...ops.removes.map((file) => ['remove', file]), ...writes.map(([file, text]) => ['write', file, text])];
  if (plan.lockWanted) {
    const lockText = JSON.stringify(lock, null, 2) + '\n';
    let now = null;
    try { now = fs.readFileSync(lockFile, 'utf8'); } catch { /* no lockfile yet */ }
    if (now === null || withoutTimes(now) !== withoutTimes(lockText)) steps.push(['write', lockFile, lockText]);
  }
  if (steps.length) openJournal(steps); // from here on a killed process is recovered by the next command
  const undo = [];
  const dieAfter = Number(process.env.SEL_PULL_TEST_DIE_AFTER) || 0; // tests only: see the header
  try {
    for (const [kind, file, text] of steps) {
      undo.push({ file, before: fs.existsSync(file) ? fs.readFileSync(file) : null });
      if (kind === 'remove') fs.rmSync(file, { force: true });
      else { fs.mkdirSync(path.dirname(file), { recursive: true }); writeAtomic(file, text); }
      if (dieAfter && undo.length === dieAfter) process.kill(process.pid, 'SIGKILL');
    }
  } catch (e) {
    const failed = [];
    for (const { file, before } of undo.reverse()) {
      try { if (before === null) fs.rmSync(file, { force: true }); else writeAtomic(file, before); } catch (err) { failed.push(`${showPath(file)} (${err.message})`); }
    }
    if (failed.length) e.message += `\n\nROLLBACK INCOMPLETE: these files could not be put back as they were: ${failed.join(', ')}.\nRestore them with git, then run: node scripts/sel-pull.mjs check (the next command also tries again to put them back).`;
    else closeJournal();
    throw e;
  }
  if (steps.length) closeJournal();
  if (plan.kept.length) {
    say(`\nKept, because they were edited locally (they are not removed without --force): ${[...new Set(plan.kept)].join(', ')}`);
    process.exitCode = 2;
  }
}

/**
 * The oldest client the library accepts (client/compat.json). Only a missing file (HTTP 404: a library from before there was one) means "no minimum";
 * any other answer that is not a valid policy (a server or network error, a refusal, damaged JSON, a number that is not a positive integer) stops the
 * command before it writes, because a policy that cannot be read cannot be applied.
 */
async function minClient() {
  const unreadable = (why) => failure(`Could not read the library's compatibility policy (client/compat.json: ${why}). Nothing was changed. Try again; if it stays, run: sel doctor.`);
  let res;
  try { res = await get(`${library}/client/compat.json`); } catch (e) { throw unreadable(e.message); }
  if (res.status === 404) return 1;
  if (!res.ok) throw unreadable(`HTTP ${res.status} ${res.body.toString('utf8').slice(0, 300).trim()}`.trim()); // a hosted library says why (not signed in, not on the list)
  let value;
  try { value = JSON.parse(res.body.toString('utf8')).minClient; } catch { throw unreadable('not valid JSON'); }
  if (!Number.isInteger(value) || value < 1) throw unreadable('minClient is not a positive whole number');
  return value;
}
async function requireCurrentClient() {
  const min = await minClient();
  if (CLIENT_VERSION < min) throw failure(`This scripts/sel-pull.mjs (version ${CLIENT_VERSION}) is older than the library accepts (version ${min} or newer). Nothing was changed. Run: sel self-update   (or node scripts/sel-pull.mjs self-update), then run this again.`);
}

/** --plan: what the command would do, in words. Nothing was written; the exit code is 2 when a real run would stop or keep a file. */
function reportPlan(plan) {
  const ops = finalOps(plan);
  const last = ops.last;
  const lockFile = path.resolve(LOCK_FILE);
  const created = [];
  const replaced = [];
  let unchanged = 0;
  for (const [file, text] of last) {
    if (file === lockFile) continue;
    const now = fileState(file);
    if (now === null) created.push(showPath(file));
    else if (sameBytes(file, text)) unchanged++;
    else replaced.push(showPath(file));
  }
  const removed = ops.removes.filter((file) => fileState(file) !== null).map(showPath);
  const lockText = JSON.stringify(lock, null, 2) + '\n';
  // the time of the pull is the only thing that always differs: a lockfile that would change only in that is not a change
  let lockNow = null;
  try { lockNow = fs.readFileSync(lockFile, 'utf8'); } catch { /* none yet */ }
  const lockChanges = plan.lockWanted && (lockNow === null || withoutTimes(lockNow) !== withoutTimes(lockText));
  const output = [`sel plan (${process.argv[2]}): nothing was written.`];
  const section = (title, items, why) => { if (items.length) output.push('', title, ...items.map((i) => '  ' + i), ...(why ? ['  ' + why] : [])); };
  section(`WOULD ADD (${created.length})`, created);
  section(`WOULD REPLACE (${replaced.length})`, replaced);
  section(`WOULD REMOVE (${removed.length})`, removed);
  const kept = [...new Set(plan.kept)];
  section('WOULD KEEP, because they were edited locally', kept, 'They are not removed without --force.');
  const blocked = [...new Set(plan.blocked)];
  section('WOULD STOP, these files exist and were not pulled by sel-pull', blocked, 'Move them away, or run with --force to replace them. Nothing would be changed.');
  const changed = [...new Set(plan.changed)];
  section('WOULD STOP, these pulled files were edited locally', changed, 'Put the change in the library, or run with --force to discard it. Nothing would be changed.');
  if (!created.length && !replaced.length && !removed.length && !blocked.length && !changed.length) output.push('', lockChanges ? 'No file would change except sel.lock.json.' : 'Nothing to change: the project is current.');
  else if (lockChanges) output.push('', 'sel.lock.json would be updated.');
  if (unchanged) output.push('', `${unchanged} file(s) are already identical and would not be touched.`);
  const current = !created.length && !replaced.length && !removed.length && !lockChanges;
  const shown = current ? [] : notes.filter((n) => String(n).trim());
  if (shown.length) output.push('', 'NOTES, as the command would say them', ...shown.map((n) => '  ' + String(n).split('\n').join('\n  ')));
  console.log(output.join('\n'));
  if (blocked.length || changed.length || kept.length) process.exitCode = 2;
}

async function transaction(work) {
  if (stage) return work(); // already inside one (sync pulls the elements)
  acquireProjectLock();
  if (planning) {
    if (fs.existsSync(journalDir())) throw failure('An earlier sel-pull was interrupted and left a recovery journal. A plan cannot be made on a half-changed project: run the command itself (without --plan) once, it puts the files back first.');
  } else recoverInterruptedRun(); // before anything is read: a killed run is undone first
  // the lockfile as it is NOW that this is the only sel-pull running (it was read before the lock was held)
  for (const key of Object.keys(lock)) delete lock[key];
  Object.assign(lock, readLockFile());
  library = (args.library || lock.library || DEFAULTS.library).replace(/\/$/, '');
  theme = args.theme || lock.theme || DEFAULTS.theme;
  if (command !== 'self-update') await requireCurrentClient();
  stage = { writes: [], removes: [], blocked: [], changed: [], kept: [], seen: new Map(), owned: ownedFiles(), lockWanted: false };
  observe(path.resolve(LOCK_FILE));
  for (const rel of ['package.json', '.gitignore', 'firebase.json', 'CLAUDE.md', DEV_SEED, 'scripts/sel-pull.mjs']) observe(safePath('.', rel));
  let result;
  try { result = await work(); } catch (e) { stage = null; throw e; }
  const done = stage;
  stage = null;
  if (planning) { if (command === 'diff') await diffReport(done); else reportPlan(done); return result; }
  applyStage(done);
  return result;
}

// ------------------------------------------------------------------ users and groups
const DIRECTORY_FILE = '.sel/directory.json';

/**
 * The company's people and groups (the library's Users & groups page) into .sel/directory.json, outside public/ on purpose: Hosting serves
 * everything in public/ to anyone, and this is staff data (emails, groups, who is an admin). Nothing here is sent anywhere: a Firebase project
 * adds it to Firestore with npm run users:import (a dry run unless --apply). The folder is git-ignored.
 */
async function pullUsers() {
  const requested = args.version || 'latest';
  let text;
  try { text = await dist(requested, 'directory.json'); } catch (e) {
    throw new Error(`The library has no users and groups in version ${requested} (${e.message}). Fill the Users & groups page in the library and commit a version.`, { cause: e });
  }
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.users) || !Array.isArray(data.groups)) throw new Error('directory.json from the library is not a users and groups list');
  write('.', DIRECTORY_FILE, text, { project: true });
  const ignore = projectText('.gitignore');
  if (!ignore.split(/\r?\n/).some((l) => l.trim() === '.sel/')) {
    write('.', '.gitignore', ignore + (ignore && !ignore.endsWith('\n') ? '\n' : '') + '# Staff data pulled from the library (sel-pull users): never commit it.\n.sel/\n', { project: true });
  }
  say(`${data.users.length} users and ${data.groups.length} groups written to ${DIRECTORY_FILE}.`);
  if (fs.existsSync('scripts/sel-dev/import-users.mjs')) say('Add them to the app: npm run users:import (shows what would change), then npm run users:import -- --apply. See the script for --admins and --emulator.');
  else say('For a Firebase project: sel-pull firebase brings npm run users:import, which adds them to Firestore.');
}

// ------------------------------------------------------------------ elements
/** The elements in `dropped` (paths relative to `out`) that the project's own code still imports, as ids. */
function stillImported(dropped, out) {
  if (!dropped.length) return [];
  const imported = scanProject([out]).imports;
  return dropped.map((rel) => /^elements\/([\w-]+)\.js$/.exec(rel)).filter((m) => m && imported.has(m[1])).map((m) => ({ id: m[1], file: imported.get(m[1])[0] }));
}

async function pullElements(only, { icons, iconsExplicit, ghosts = [] } = {}) {
  const prior = lock.elements || {};
  const out = rootOf();
  const priorOut = prior.out || out; // the files of an earlier pull are where THAT pull put them
  const moved = !!prior.out && !sameOut(prior.out, out);
  const refresh = prior.roots && prior.roots.length ? prior.roots : prior.components;
  const wanted = (only || (args._.length ? args._ : refresh || [])).map(safeId);
  const withIcons = icons !== undefined ? icons : !!(args.icons || (prior.icons && !args['no-icons'])); // sync decides from the markup; elements keeps the choice
  if (!wanted.length && !withIcons && !ghosts.length) throw new Error('Name the components to pull, e.g. header-panel');
  const requested = args.version || 'latest';

  const modified = locallyModified(prior.files, priorOut);
  if (modified.length && !bypass()) {
    throw new Error(`These pulled files were changed locally: ${modified.join(', ')}.\nThey are generated: put the change in the library instead (or pass --force to discard the local edits).`);
  }

  const manifest = JSON.parse(await dist(requested, 'theme.manifest.json'));
  const files = new Map();
  files.set('theme-lit.js', await dist(requested, 'theme-lit.js'));
  if (withIcons) files.set('theme-icons.js', await dist(requested, 'theme-icons.js'));
  const queue = [...wanted];
  const components = new Set();
  while (queue.length) {
    const id = safeId(queue.shift());
    if (components.has(id)) continue;
    components.add(id);
    const code = await dist(requested, `elements/${id}.js`);
    files.set(`elements/${id}.js`, code);
    for (const m of code.matchAll(/from\s*"\.\/([\w-]+)\.js"/g)) queue.push(m[1]); // components this one imports
  }

  // Remove what an earlier pull wrote and this one does not need any more, then write the new set. But never an element the project's own code
  // still imports: that would break its pages (a component pulled by hand and left out of a later "sel-pull elements a b" call, say). A file
  // the library no longer has but the project still imports stays where it is, and stays in the lockfile.
  // We cannot resolve an upstream-retired module's dependency graph reliably.
  // Preserve its installed support files too; otherwise keeping just the entry
  // module can still break its imports. A later sync can prune after it is gone.
  if (ghosts.length && moved) throw new Error('Cannot move the output while it contains imported components retired upstream. Resolve those imports before changing --out. Nothing was changed.');
  const ghostFiles = new Set(ghosts.length ? Object.keys(prior.files || {}) : []);
  if (ghosts.length && !bypass() && files.has('theme-lit.js')) {
    // The retired modules stay as they are and keep importing the runtime they were built with: a new runtime can drop an export they use.
    let installed = null;
    try { installed = fs.readFileSync(safePath(priorOut, 'theme-lit.js')); } catch { /* none installed */ }
    if (installed !== null && contentHash('theme-lit.js', installed) !== contentHash('theme-lit.js', files.get('theme-lit.js'))) {
      const kept = ghosts.map((id) => `${priorOut}/elements/${id}.js`).join(', ');
      throw failure(`This update changes the shared runtime (theme-lit.js), but ${kept} (imported by the project, no longer in the library) stay${ghosts.length === 1 ? 's' : ''} as installed and may need the old one. Nothing was changed.
Move the project's imports to the library's replacement and run sync again, or pass --force to update anyway.`);
    }
  }
  const dropped = Object.keys(prior.files || {}).filter((rel) => (moved || !files.has(rel)) && !ghostFiles.has(rel));
  if (dropped.length && !bypass() && !moved) {
    const inUse = stillImported(dropped, out);
    if (inUse.length) {
      throw new Error(`This pull would remove elements the project still imports: ${inUse.map((x) => `${x.id} (${x.file})`).join(', ')}.\n` +
        `Pull them as well (sel-pull elements ${[...new Set([...wanted, ...inUse.map((x) => x.id)])].join(' ')}), or run sel-pull sync, which keeps what the code imports. Pass --force to remove them anyway.`);
    }
  }
  for (const rel of dropped) remove(priorOut, rel);
  const hashes = {};
  for (const [rel, text] of files) { write(out, rel, text); hashes[rel] = contentHash(rel, text); }
  for (const rel of ghostFiles) if (!files.has(rel) && prior.files && prior.files[rel] && !moved) hashes[rel] = prior.files[rel];
  for (const rel of dropped) if (!moved && wasKept(priorOut, rel)) hashes[rel] = prior.files[rel]; // edited, so not removed: still listed
  const versionLabel = requested === 'working' ? `${manifest.version}+working` : manifest.version;
  write(out, 'README.md', `# Generated: do not edit\n\nPulled from the Shared Element Library (theme "${manifest.name}" v${versionLabel}) by sel-pull. Change the component in the library, commit a version there, and pull again.\n\nFiles: ${[...files.keys()].join(', ')}\n`);
  if (moved) say(`Moved from ${priorOut} to ${out}: the old files are removed (one you edited stays). Update the import paths in your pages.`);

  // Pulling components by name while the project keeps an adopted list (sync --only): the names join that list, or the next sync would delete them again.
  if (!only && args._.length && lock.only) {
    const added = wanted.filter((id) => !lock.only.includes(id));
    if (added.length) {
      lock.only = [...lock.only, ...added];
      say(`Added ${added.join(', ')} to the adopted list ("only" in ${LOCK_FILE}), so sync keeps ${added.length === 1 ? 'it' : 'them'}.`);
    }
  }
  lock.library = library;
  lock.theme = theme;
  lock.elements = {
    version: versionLabel, requested, out, components: [...components].sort(), roots: [...new Set(wanted)].sort(), pulledAt: new Date().toISOString(), icons: withIcons,
    ...(iconsExplicit !== undefined ? (iconsExplicit ? { iconsExplicit: true } : {}) : ((prior.iconsExplicit && !args['no-icons']) || args.icons ? { iconsExplicit: true } : {})), files: hashes,
  };
  commitLock();
  say(`Pulled ${files.size} files (v${versionLabel}) into ${out}:`);
  for (const rel of files.keys()) say('  ' + rel);
  if (requested === 'working') say('\nNote: pulled from the library\'s UNCOMMITTED working copy. Commit a version there and pull again so this is reproducible.');
}

// ------------------------------------------------------------------ theme + sync (pull only what the project uses)
const SKIP_DIRS = new Set(['node_modules', '.git', '.firebase', '.claude', '.sel', 'dist', 'build', 'coverage', '.next', '.cache']);
const SOURCE_EXT = /\.(html?|m?js|cjs|jsx|tsx?|vue|svelte|astro|php)$/i;

/**
 * Which sel- elements and CSS classes the project's own markup and scripts use (pulled files, the generated sel-pull and dev scripts, and docs are
 * not looked at: their own text mentions tags and icons). An import of a pulled script counts whatever follows its name (a ?v=1 cache buster).
 */
function scanProject(skip) {
  const tags = new Map(); // tag -> [files]
  const classes = new Map(); // class -> [files]
  const icons = []; // files with <i data-icon="..."> or ThemeIcons.html(...) / .render(...): they need the icon runtime
  const imports = new Map(); // component id (or "theme-icons") -> [files] that import its pulled script, whatever the markup looks like
  const skipped = []; // source files that were NOT read, with the reason: a usage in them is invisible to this scan
  const note = (map, key, file) => { if (!map.has(key)) map.set(key, []); const list = map.get(key); if (list.length < 3 && !list.includes(file)) list.push(file); };
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { skipped.push({ rel: dir.split(path.sep).join('/').replace(/^\.\//, ''), why: 'folder not readable' }); return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      const rel = full.split(path.sep).join('/').replace(/^\.\//, '');
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || skip.some((s) => rel === s || rel.startsWith(s + '/')) || /(^|\/)vendor\/sel(\/|$)/.test(rel) || rel === 'scripts/sel-dev') continue;
        walk(full);
      } else if (rel !== 'scripts/sel-pull.mjs' && SOURCE_EXT.test(entry.name)) {
        let text;
        try {
          if (entry.name.endsWith('.min.js')) { skipped.push({ rel, why: 'minified' }); continue; }
          if (fs.statSync(full).size >= 1024 * 1024) { skipped.push({ rel, why: 'over 1 MB' }); continue; }
          text = fs.readFileSync(full, 'utf8');
        } catch (e) { skipped.push({ rel, why: 'not readable' }); continue; }
        for (const m of text.matchAll(/<\/?(sel-[a-z0-9-]+)/g)) note(tags, m[1], rel);
        for (const m of text.matchAll(/["'`](sel-[a-z0-9-]+)["'`]/g)) note(tags, m[1], rel);
        for (const m of text.matchAll(/["'`][^"'`\n]*\/elements\/([\w-]+)\.js(?:[?#][^"'`\n]*)?["'`]/g)) note(imports, m[1], rel);
        for (const m of text.matchAll(/["'`][^"'`\n]*\/(theme-icons)\.js(?:[?#][^"'`\n]*)?["'`]/g)) note(imports, m[1], rel);
        for (const m of text.matchAll(/class(?:Name)?\s*=\s*["'`{]+([^"'`}]+)/g)) for (const k of m[1].split(/\s+/)) if (/^[a-z_][\w-]*$/i.test(k)) note(classes, k, rel);
        for (const m of text.matchAll(/classList\.(?:add|toggle|replace)\(([^)]*)\)/g)) for (const k of m[1].matchAll(/["'`]([a-z_][\w-]*)["'`]/gi)) note(classes, k[1], rel);
        if (icons.length < 3 && /data-icon=["']|ThemeIcons\.(?:html|render)\(/.test(text)) icons.push(rel);
      }
    }
  };
  walk('.');
  return { tags, classes, icons, imports, skipped };
}

/** One line when the scan could not read some source files: a usage in them is invisible, which explains a component that is "not used". */
function reportSkipped(usage) {
  if (!usage.skipped.length) return;
  const shown = usage.skipped.slice(0, 3).map((x) => `${x.rel} (${x.why})`).join(', ');
  say(`Not scanned: ${usage.skipped.length} file${usage.skipped.length === 1 ? '' : 's'} (${shown}${usage.skipped.length > 3 ? ', ...' : ''}). A component only they use is not seen: name it with --only / --also, or import it by its pulled path from a scanned file.`);
}

/** The Bootstrap theme: the base CSS, Bootstrap's JS and the icon fonts, plus the CSS of the custom components the project uses, joined into one theme.css. */
async function pullTheme(requested, cssIds, map) {
  const prior = lock.theme_files || {};
  const out = rootOf() + '/theme';
  const priorOut = prior.out || out;
  const moved = !sameOut(priorOut, out);
  const modified = locallyModified(prior.files, priorOut);
  if (modified.length && !bypass()) throw new Error(`These pulled theme files were changed locally: ${modified.join(', ')}. They are generated: change the theme in the library (or pass --force).`);

  const manifest = JSON.parse(await dist(requested, 'theme.manifest.json'));
  const files = new Map();
  let css = await dist(requested, 'theme.base.min.css');
  for (const id of map.order.filter((x) => cssIds.has(x) && map.components[x].hasCss)) css += '\n' + await dist(requested, `components/${id}.css`);
  files.set('theme.css', css);
  files.set('bootstrap.bundle.min.js', await dist(requested, 'bootstrap.bundle.min.js'));
  for (const rel of manifest.files.filter((f) => f.startsWith('fonts/'))) files.set(rel, await distBuffer(requested, rel));

  for (const rel of Object.keys(prior.files || {})) if (moved || !files.has(rel)) remove(priorOut, rel);
  const hashes = {};
  for (const [rel, content] of files) {
    write(out, rel, content);
    hashes[rel] = contentHash(rel, content);
  }
  const versionLabel = requested === 'working' ? `${manifest.version}+working` : manifest.version;
  write(out, 'README.md', `# Generated: do not edit\n\nThe Bootstrap theme "${manifest.name}" v${versionLabel}, pulled by sel-pull sync: theme.css is the base theme plus the CSS of the components this project uses (${[...cssIds].sort().join(', ') || 'none yet'}). Run sel-pull sync again after using another component.\n`);
  for (const rel of Object.keys(prior.files || {})) if (!moved && !files.has(rel) && wasKept(priorOut, rel)) hashes[rel] = prior.files[rel];
  lock.theme_files = { version: versionLabel, requested, out, components: [...cssIds].sort(), pulledAt: new Date().toISOString(), files: hashes };
  return { out, version: versionLabel, files };
}

/**
 * For projects that keep their own Bootstrap and theme (sync --no-theme): only the CSS of the components the project uses, joined into one
 * generated <out>/components.css to link before the project's own stylesheet. Without this such a project would have to paste each
 * component's CSS into its own files by hand, and the copies would drift from the library.
 */
async function pullComponentCss(requested, cssIds, map) {
  const prior = lock.component_css || {};
  const out = rootOf();
  const priorOut = prior.out || out;
  const modified = locallyModified(prior.files, priorOut);
  if (modified.length && !bypass()) throw new Error(`These pulled files were changed locally: ${modified.join(', ')}. They are generated: change the component in the library (or pass --force).`);
  const manifest = JSON.parse(await dist(requested, 'theme.manifest.json'));
  const ids = map.order.filter((x) => cssIds.has(x) && map.components[x].hasCss);
  if (!ids.length) {
    for (const rel of Object.keys(prior.files || {})) remove(priorOut, rel);
    const left = Object.keys(prior.files || {}).filter((rel) => wasKept(priorOut, rel));
    if (left.length) lock.component_css = { ...prior, components: [], files: Object.fromEntries(left.map((rel) => [rel, prior.files[rel]])) };
    else delete lock.component_css;
    return null;
  }
  let css = `/* Generated by sel-pull sync from the Shared Element Library, do not edit. Components: ${ids.join(', ')}. */\n`;
  for (const id of ids) css += '\n' + await dist(requested, `components/${id}.css`);
  if (!sameOut(priorOut, out)) for (const rel of Object.keys(prior.files || {})) remove(priorOut, rel);
  write(out, 'components.css', css);
  const versionLabel = requested === 'working' ? `${manifest.version}+working` : manifest.version;
  lock.component_css = { version: versionLabel, requested, out, components: ids, pulledAt: new Date().toISOString(), files: { 'components.css': contentHash('components.css', css) } };
  return { out, version: versionLabel, ids };
}

/**
 * Pulls what this project actually uses: scans its markup and scripts for sel- elements and for the CSS classes only a component owns,
 * pulls those elements (scripts) and the theme with just those components' CSS, and drops what is no longer used.
 */
async function sync() {
  const requested = args.version || 'latest';
  const prior = lock.elements || {};
  const out = rootOf();
  const map = JSON.parse(await dist(requested, 'elements.json'));
  const usage = scanProject([out]);
  reportSkipped(usage);

  // A project that adopts the library step by step (its own copies of some components are still in place) names the ones it has switched
  // over: only those are pulled, however many class names the project happens to share with other components. --only is remembered in the
  // lockfile; --only all (or an empty list) goes back to pulling everything the project uses.
  if (args.only !== undefined) {
    const named = String(args.only).split(',').map((x) => x.trim()).filter((x) => x && x !== 'all');
    for (const id of named) if (!map.components[id]) throw new Error(`--only: there is no component called "${id}"`);
    if (named.length) lock.only = named; else delete lock.only;
  }
  const only = lock.only ? new Set(lock.only) : null;

  // --also: components the project wants although no markup uses them yet. They are remembered ("keep" in the lockfile), so the next plain
  // sync does not forget them; --also none clears the list.
  if (args.also !== undefined) {
    const named = String(args.also).split(',').map((x) => x.trim()).filter(Boolean);
    if (named.includes('none') || !named.length) delete lock.keep;
    else {
      for (const id of named) if (!map.components[id]) throw new Error(`--also: there is no component called "${id}"`);
      lock.keep = [...new Set([...(lock.keep || []), ...named])];
    }
  }

  for (const id of [...(only || []), ...(lock.keep || [])]) {
    if (!map.components[id]) {
      const inOnly = (lock.only || []).includes(id);
      throw new Error(`The retained component "${id}" is no longer in the library. Nothing was changed.\n` +
        (inOnly ? 'Name the adopted ones again without it: sync --only <the others>  (or sync --only all).' : 'Clear the kept list with sync --also none, then add the others again with --also <names>.'));
    }
  }
  const jsIds = new Set();
  const cssIds = new Set();
  const why = new Map();
  for (const [id, c] of Object.entries(map.components)) {
    if (only && !only.has(id)) continue;
    const tag = c.tags.find((t) => usage.tags.has(t));
    const cls = c.classes.find((k) => usage.classes.has(k));
    if (tag && c.hasJs) { jsIds.add(id); why.set(id, `<${tag}> in ${usage.tags.get(tag)[0]}`); }
    if ((tag || cls) && c.hasCss) { cssIds.add(id); if (!why.has(id)) why.set(id, `class "${cls}" in ${usage.classes.get(cls)[0]}`); }
  }
  for (const id of only || []) {
    if (!why.has(id)) {
      if (map.components[id].hasJs) jsIds.add(id);
      if (map.components[id].hasCss) cssIds.add(id);
      why.set(id, 'adopted with --only');
    }
  }
  // A component the project's code imports is in use whatever the adopted list says: leaving it out would delete a script its pages load.
  // One the library no longer has stays where it is (it is not pulled again, and not removed): the project still depends on it.
  const ghosts = [];
  for (const [id, importers] of usage.imports) {
    if (id === 'theme-icons') continue;
    const c = map.components[id];
    if (!c) {
      if (prior.files && prior.files[`elements/${id}.js`]) { ghosts.push(id); say(`Imported but no longer in the library: ${id} (${importers[0]}). Its pulled file stays where it is; remove the import, or the file, when you no longer need it.`); }
      continue;
    }
    if ((!c.hasJs && !c.hasCss) || jsIds.has(id)) continue;
    if (c.hasJs) jsIds.add(id);
    if (c.hasCss) cssIds.add(id);
    why.set(id, `imported by ${importers[0]}`);
    if (lock.only && !lock.only.includes(id)) lock.only.push(id); // and it joins the adopted list, so this stays true
  }
  for (const id of lock.keep || []) {
    if (!map.components[id]) { say(`Kept with --also but no longer in the library: ${id}`); continue; }
    if (map.components[id].hasJs) jsIds.add(id);
    if (map.components[id].hasCss) cssIds.add(id);
    if (!why.has(id)) why.set(id, 'kept with --also');
  }
  const retiredStyles = ghosts.filter((id) => [lock.theme_files, lock.component_css].some((section) => (section?.components || []).includes(id)));
  if (retiredStyles.length && !bypass()) throw new Error(`Imported components retired upstream still have installed styles: ${retiredStyles.join(', ')}. Their CSS cannot be rebuilt safely. Nothing was changed; remove those imports, or pass --force to drop their styles (the scripts stay).`);
  // A component's script imports others, and their styles belong with it (docked-search draws the suggestions list: its CSS must come along).
  const needed = [...new Set([...jsIds, ...cssIds])];
  for (let i = 0; i < needed.length; i++) {
    for (const dep of (map.components[needed[i]] || {}).imports || []) {
      const d = map.components[dep];
      if (!d || needed.includes(dep)) continue;
      needed.push(dep);
      if (d.hasCss) { cssIds.add(dep); if (!why.has(dep)) why.set(dep, `used by ${needed[i]}`); }
    }
  }
  const unknown = [...usage.tags.keys()].filter((t) => !Object.values(map.components).some((c) => c.tags.includes(t)));

  say(`Used by this project (${requested}): ${[...new Set([...jsIds, ...cssIds])].sort().map((id) => `${id} (${why.get(id)})`).join(', ') || 'no components yet'}`);
  if (unknown.length) say(`Not in the library: ${unknown.join(', ')}`);

  // The icon runtime comes along when the markup uses <i data-icon> or imports theme-icons.js (or --icons asks for it, which is remembered
  // until --no-icons): without it those icons stay empty.
  const iconsExplicit = !!(args.icons || (prior.iconsExplicit && !args['no-icons']));
  const icons = !!(iconsExplicit || usage.icons.length || usage.imports.has('theme-icons'));
  if (usage.icons.length) say(`Icons: <i data-icon> in ${usage.icons[0]}, so the icon runtime (theme-icons.js) comes along.`);
  else if (usage.imports.has('theme-icons')) say(`Icons: ${usage.imports.get('theme-icons')[0]} imports theme-icons.js, so the icon runtime stays.`);
  if (jsIds.size || icons || ghosts.length) {
    await pullElements([...jsIds], { icons, iconsExplicit, ghosts });
  } else if (prior.files) {
    const gone = Object.keys(prior.files);
    const inUse = bypass() ? [] : stillImported(gone, out);
    if (inUse.length) throw new Error(`Nothing in the markup uses these any more, but the project's code still imports them: ${inUse.map((x) => `${x.id} (${x.file})`).join(', ')}.\nRemove those imports first, or pass --force to remove the files anyway.`);
    for (const rel of gone) remove(prior.out || out, rel);
    const left = gone.filter((rel) => wasKept(prior.out || out, rel));
    if (left.length) lock.elements = { ...prior, components: [], roots: [], files: Object.fromEntries(left.map((rel) => [rel, prior.files[rel]])) };
    else delete lock.elements;
    say('No elements used: removed the pulled ones (one you edited stays).');
  }
  if (usage.skipped.length && stage && stage.removes.length) say(`Careful: ${stage.removes.length} pulled file(s) are being removed as unused, and ${usage.skipped.length} source file(s) were not scanned (see "Not scanned" above). If one of them uses a removed component, restore it with: sel-pull sync --also <name>`);
  const mode = args['no-theme'] ? 'components-css' : 'theme';
  if (lock.mode && lock.mode !== mode) {
    say(mode === 'theme'
      ? 'Switching from components.css (sync --no-theme) to the full theme: theme.css carries the components\' CSS itself, so components.css is removed.'
      : 'Switching from the full theme to components.css (sync --no-theme): the pulled theme files are no longer updated, link components.css before your own stylesheet.');
  }
  lock.mode = mode;
  if (!args['no-theme']) {
    // The full theme carries the components' CSS itself: a components.css from an earlier --no-theme sync would only duplicate it.
    if (lock.component_css) {
      const cc = lock.component_css;
      for (const rel of Object.keys(cc.files || {})) remove(cc.out, rel);
      const left = Object.keys(cc.files || {}).filter((rel) => wasKept(cc.out, rel));
      if (left.length) lock.component_css = { ...cc, components: [], files: Object.fromEntries(left.map((rel) => [rel, cc.files[rel]])) };
      else delete lock.component_css;
    }
    const t = await pullTheme(requested, cssIds, map);
    lock.library = library;
    lock.theme = theme;
    commitLock();
    say(`Theme v${t.version} pulled into ${t.out} (${cssIds.size} component stylesheets joined into theme.css).`);
    say(`\nIn your pages:\n  <link rel="stylesheet" href="${t.out.replace(/^public\//, '')}/theme.css">\n  <script src="${t.out.replace(/^public\//, '')}/bootstrap.bundle.min.js"></script>` +
      (jsIds.size || icons ? `\n  <script type="module">${icons ? ` import "./${out.replace(/^public\//, '')}/theme-icons.js";` : ''}${[...jsIds].sort().map((id) => ` import "./${out.replace(/^public\//, '')}/elements/${id}.js";`).join('')} </script>` : ''));
  } else {
    const c = await pullComponentCss(requested, cssIds, map);
    lock.library = library;
    lock.theme = theme;
    if (c) say(`Component CSS v${c.version} pulled into ${c.out}/components.css (${c.ids.length} components). Link it before your own stylesheet:\n  <link rel="stylesheet" href="vendor/sel/components.css">`.replace('vendor/sel', c.out.replace(/^public\//, '')));
    commitLock();
  }
}

// ------------------------------------------------------------------ rules
async function pullRules() {
  const prior = lock.rules || { files: {} };
  prior.files = prior.files || {};
  const query = args.working ? '?working=1' : ''; // the library serves committed revisions unless asked for the working copies
  const manifest = JSON.parse(await fetchText(`${library}/rules/manifest.json${query}`));
  const wanted = args._;
  const sets = new Set(manifest.sets);
  const pulledSets = new Set(prior.sets || []);
  let picks;
  if (wanted.length) {
    picks = new Set();
    for (const w of wanted) {
      if (sets.has(w)) { manifest.files.filter((f) => f.sets.includes(w)).forEach((f) => picks.add(f.path)); pulledSets.add(w); }
      else if (manifest.files.some((f) => f.path === w)) picks.add(w);
      else throw new Error(`No rule set or file called "${w}". Sets: ${manifest.sets.join(', ') || '(none)'}`);
    }
  } else {
    // a refresh: the files already pulled, and whatever is new in the sets that were pulled
    picks = new Set(Object.keys(prior.files || {}));
    for (const set of pulledSets) if (sets.has(set)) manifest.files.filter((f) => f.sets.includes(set)).forEach((f) => picks.add(f.path));
    if (!picks.size) throw new Error(`Name a set or file to pull. Sets: ${manifest.sets.join(', ') || '(none)'}`);
  }

  const modified = new Set(locallyModified(prior.files && Object.fromEntries(Object.entries(prior.files).map(([p, v]) => [p, v.sha256]))));
  const blocked = [];
  const written = [];
  const restored = [];
  for (const rel of [...picks].sort()) {
    safePath('.', rel);
    const entry = manifest.files.find((f) => f.path === rel);
    if (!entry) { say(`  ${rel}: no longer in the library (left as is)`); continue; }
    const known = prior.files && prior.files[rel];
    const existsLocally = fs.existsSync(rel);
    if (!args.force && existsLocally && ((known && modified.has(rel)) || (!known && contentHash(rel, fs.readFileSync(rel)) !== entry.sha256))) { blocked.push(rel); continue; }
    const text = await fetchText(`${library}/rules/files/${rel.split('/').map(encodeURIComponent).join('/')}${query}`);
    if (contentHash(rel, text) !== entry.sha256) throw new Error(`${rel}: what the library sent is not what its manifest announced (it changed while pulling?). Nothing more was written; run the pull again.`);
    if (known && !existsLocally) restored.push(rel);
    write('.', rel, text);
    prior.files[rel] = { rev: entry.rev, sha256: contentHash(rel, text) };
    written.push(`${rel} (rev ${entry.rev})`);
  }
  lock.library = library;
  lock.theme = theme;
  lock.rules = { ...prior, ...(pulledSets.size ? { sets: [...pulledSets].sort() } : {}), pulledAt: new Date().toISOString() };
  commitLock();
  say(written.length ? `Pulled ${written.length} rule file(s):\n  ` + written.join('\n  ') : 'Rules already up to date.');
  if (restored.length) say(`Restored (they had been deleted locally): ${restored.join(', ')}`);
  if (blocked.length) {
    say(`\nSkipped (you have local changes, or a file of your own at that path): ${blocked.join(', ')}\nCompare them with the library, then pass --force to take the library's version.`);
    process.exitCode = 2;
  }
}

// ------------------------------------------------------------------ firebase (local dev environment on the emulators)
const DEV_OUT = 'scripts/sel-dev';
const DEV_SEED = 'scripts/dev-seed.mjs';
const DEV_SCRIPTS = { dev: 'node scripts/sel-dev/start.mjs', 'dev:seed': 'node scripts/sel-dev/seed.mjs', 'dev:pull': 'node scripts/sel-dev/pull-live.mjs', 'dev:load': 'node scripts/sel-dev/load.mjs', 'users:import': 'node scripts/sel-dev/import-users.mjs' };
const DEV_IGNORE = ['.emulator/', '*-debug.log', 'firebase.dev.json'];
// What firebase.json gets when it has no "emulators" block yet: one emulator per service the project uses, plus Auth and the UI.
const EMULATOR_PORTS = { auth: 9099, firestore: 8080, hosting: 5000, storage: 9199, functions: 5001, database: 9000 };

/**
 * Sets up the local dev environment of a Firebase project: the emulators in firebase.json, the generic scripts in scripts/sel-dev/
 * (generated: hashed in the lockfile, replaced by the next pull), scripts/dev-seed.mjs for the project's own demo data (only when missing:
 * the project owns it), the npm scripts, firebase-admin as a dev dependency and the .gitignore lines. Never overwrites the project's files.
 */
async function firebaseDev() {
  if (!fs.existsSync('firebase.json') || !fs.existsSync('.firebaserc')) {
    throw new Error('This is not a Firebase project yet (no firebase.json and .firebaserc). Run "firebase init" first (Hosting and Firestore), then this again.');
  }
  const done = [];
  const prior = lock.firebase_dev || {};
  const modified = locallyModified(prior.files, DEV_OUT);
  if (modified.length && !args.force) {
    throw new Error(`These pulled files were changed locally: ${modified.map((f) => `${DEV_OUT}/${f}`).join(', ')}.\nThey are generated: put the change in the library instead (or pass --force to discard the local edits). This project's own data goes in ${DEV_SEED}.`);
  }
  const manifest = JSON.parse(await fetchText(`${library}/client/firebase-dev/files.json`));
  const files = new Map();
  for (const name of manifest.generated) files.set(safeId(name.replace(/\.mjs$/, '')) + '.mjs', await fetchText(`${library}/client/firebase-dev/${name}`));
  const template = fs.existsSync(DEV_SEED) ? null : await fetchText(`${library}/client/firebase-dev/${manifest.template}`);

  for (const rel of Object.keys(prior.files || {})) if (!files.has(rel)) remove(DEV_OUT, rel);
  const hashes = {};
  for (const [rel, text] of files) { write(DEV_OUT, rel, text); hashes[rel] = contentHash(rel, text); }
  write(DEV_OUT, 'README.md', `# Generated: do not edit\n\nThe local dev environment on the Firebase emulators, pulled from the Shared Element Library by sel-pull firebase: ${[...files.keys()].join(', ')}. This project's own demo data is ${DEV_SEED}. Change these scripts in the library and pull again.\n`);
  done.push(`${DEV_OUT}/: ${[...files.keys()].join(', ')}`);
  if (template) { write('.', DEV_SEED, template); done.push(`${DEV_SEED} created from the template: put this project's demo data and accounts in it`); }
  else done.push(`${DEV_SEED} exists: left as is`);

  const config = JSON.parse(projectText('firebase.json'));
  if (config.emulators) done.push('firebase.json already has an "emulators" block: left as is');
  else {
    const emulators = { singleProjectMode: true };
    for (const [name, port] of Object.entries(EMULATOR_PORTS)) if (name === 'auth' || config[name]) emulators[name] = { host: '127.0.0.1', port };
    if (!emulators.firestore) emulators.firestore = { host: '127.0.0.1', port: EMULATOR_PORTS.firestore }; // the scripts work on Firestore
    emulators.ui = { enabled: true, host: '127.0.0.1', port: 4001 }; // 4000 is the library's own port
    config.emulators = emulators;
    write('.', 'firebase.json', JSON.stringify(config, null, 2) + '\n', { project: true });
    done.push(`firebase.json: emulators added (${Object.keys(emulators).filter((k) => k !== 'singleProjectMode').map((k) => `${k} ${emulators[k].port}`).join(', ')})`);
  }

  const pkg = JSON.parse(projectText('package.json', '{"private":true}'));
  pkg.scripts = pkg.scripts || {};
  const added = [];
  const kept = [];
  for (const [name, cmd] of Object.entries(DEV_SCRIPTS)) {
    // the starter's plain file server is replaced: a Firebase project runs on the Hosting emulator
    if (!pkg.scripts[name] || (name === 'dev' && pkg.scripts.dev === 'node scripts/serve.mjs')) { pkg.scripts[name] = cmd; added.push(name); }
    else if (pkg.scripts[name] !== cmd) kept.push(name);
  }
  pkg.devDependencies = pkg.devDependencies || {};
  const needsAdmin = !pkg.devDependencies['firebase-admin'] && !(pkg.dependencies || {})['firebase-admin'];
  if (needsAdmin) pkg.devDependencies['firebase-admin'] = manifest.firebaseAdmin;
  if (added.length || needsAdmin) write('.', 'package.json', JSON.stringify(pkg, null, 2) + '\n', { project: true });
  if (added.length) done.push('package.json scripts added: ' + added.join(', '));
  if (kept.length) done.push(`package.json already has its own ${kept.join(', ')}: left as is (the dev environment's: ${kept.map((k) => DEV_SCRIPTS[k]).join(', ')})`);
  if (needsAdmin) done.push(`package.json: firebase-admin ${manifest.firebaseAdmin} added as a dev dependency (run npm install)`);

  const ignore = projectText('.gitignore');
  const lines = ignore.split(/\r?\n/).map((l) => l.trim());
  const missing = DEV_IGNORE.filter((l) => !lines.includes(l));
  if (missing.length) {
    write('.', '.gitignore', ignore + (ignore && !ignore.endsWith('\n') ? '\n' : '') + '\n# Local emulator data (npm run dev). .emulator/live-copy.json is production data: never commit it.\n' + missing.join('\n') + '\n', { project: true });
    done.push('.gitignore: ' + missing.join(', '));
  }

  lock.library = library;
  lock.theme = theme;
  lock.firebase_dev = { out: DEV_OUT, pulledAt: new Date().toISOString(), files: hashes };
  commitLock();
  const port = (name) => (config.emulators[name] || {}).port || EMULATOR_PORTS[name];
  say('Local dev environment (Firebase emulators):\n' + done.map((d) => '  - ' + d).join('\n'));
  say(`
Still to do in the project (see docs/sel-firebase-dev.md, pulled with: node scripts/sel-pull.mjs rules sel):
  1. npm install   (firebase-admin; the Firebase CLI and Java must be installed too)
  2. Point the app at the emulators when it runs on this machine, where it initialises Firebase:
       if (["localhost", "127.0.0.1"].includes(location.hostname)) {
         connectFirestoreEmulator(db, "127.0.0.1", ${port('firestore')});
         connectAuthEmulator(auth, "http://127.0.0.1:${port('auth')}");
       }
     and skip registering a service worker there (a cached shell hides your edits).
  3. Put the project's demo data in ${DEV_SEED}, then: npm run dev`);
}

// ------------------------------------------------------------------ init
const SCRIPTS = {
  'pull:elements': 'node scripts/sel-pull.mjs elements',
  'pull:rules': 'node scripts/sel-pull.mjs rules',
  'sel:check': 'node scripts/sel-pull.mjs check',
  'sel:check:soft': 'node scripts/sel-pull.mjs check --soft',
  'sel:sync': 'node scripts/sel-pull.mjs sync',
};

/** Sets up a new project (or adopts an existing one): pulls the rule sets, makes CLAUDE.md, adds the npm scripts, un-ignores .claude/. Never overwrites. */
async function init() {
  const sets = args._.length ? args._ : ['base', 'sel'];
  args._ = sets;
  const done = [];
  await transaction(async () => {
    // Run as a one-liner (curl ... | node --input-type=module - init) there is no scripts/sel-pull.mjs yet, and the npm scripts need it.
    if (!fs.existsSync('scripts/sel-pull.mjs')) {
      write('.', 'scripts/sel-pull.mjs', await fetchText(`${library}/client/sel-pull.mjs`), { project: true });
      done.push('scripts/sel-pull.mjs installed (update it with: node scripts/sel-pull.mjs self-update)');
    }
    await pullRules();

    if (!fs.existsSync('CLAUDE.md')) {
      try {
        write('.', 'CLAUDE.md', await fetchText(`${library}/rules/files/templates/CLAUDE.md`));
        done.push('CLAUDE.md created from the template: fill in the project name, stack and commands');
      } catch (e) { done.push('CLAUDE.md template not available: ' + e.message); }
    } else done.push('CLAUDE.md already exists: left as is');

    // A starting point to develop on right away: a starter theme of the library's theme (edited in its app, committed with the components).
    // Only for a project that has no public/index.html yet; nothing is ever overwritten, and the project owns the files afterwards (not locked).
    let serverAdded = fs.existsSync('scripts/serve.mjs');
    if (args['no-starter']) done.push('Starter theme skipped (--no-starter)');
    else if (fs.existsSync('public/index.html')) done.push('public/index.html exists: starter theme not added');
    else {
      const version = args.version || 'latest';
      let list = null;
      try {
        list = JSON.parse(await dist(version, 'starters.json'));
      } catch (e) {
        // Only a library that has no starters at all (404: an older version) is fine to go without; any other failure is a failure to report.
        done.push(`Starter theme NOT added (${/HTTP 404/.test(e.message) ? 'this library version has none' : 'the list of starters could not be read, run the command again'}): ${e.message}`);
        if (!/HTTP 404/.test(e.message)) process.exitCode = 1;
      }
      if (list) {
        try {
          const wanted = args.starter || 'default';
          const starter = list.find((x) => x.id === wanted);
          if (!starter) throw new Error(`No starter theme called "${wanted}" in the requested version.` + (list.length ? ` Available: ${list.map((x) => x.id).join(', ')}` : ' The library has none committed yet.'));
          else {
            // With --firebase the starter's Firebase layer goes on top: its files replace the starter's of the same name, and add the rest.
            const layer = args.firebase ? starter.firebase || [] : [];
            if (args.firebase && !layer.length) done.push(`Starter theme "${starter.name}" has no Firebase layer: its plain files are added, the Firebase pages (sign-in, ...) are up to you`);
            const sources = new Map(starter.files.map((rel) => [rel, `starters/${starter.id}/${rel}`]));
            for (const rel of layer) sources.set(rel, `starters/${starter.id}/firebase/${rel}`);
            // All files are downloaded before the first is written: a download that fails halfway leaves no half a starter (public/index.html
            // would then make every retry skip it), and the failure is reported as one (exit 1) so a script like sel new stops there.
            const staged = [];
            for (const [rel, source] of sources) {
              safePath('.', rel);
              if (!/^(public|scripts)\//.test(rel)) throw new Error(`Starter file outside public/ and scripts/: ${rel}`);
              observe(safePath('.', rel));
              if (fs.existsSync(rel)) continue;
              staged.push([rel, await dist(version, source)]);
            }
            for (const [rel, text] of staged) write('.', rel, text);
            const added = staged.map(([rel]) => rel);
            done.push(`Starter theme "${starter.name}"${layer.length ? ' with its Firebase layer' : ''} added: ${added.join(', ')}` + (list.length > 1 ? ` (others: ${list.filter((x) => x.id !== starter.id).map((x) => x.id).join(', ')}; pick with --starter <id>)` : ''));
            if (added.includes('scripts/serve.mjs')) serverAdded = true;
          }
        } catch (e) {
          done.push('Starter theme NOT added (nothing of it was written, run the command again): ' + e.message);
          process.exitCode = 1;
        }
      }
    }
    if (serverAdded) SCRIPTS.dev = 'node scripts/serve.mjs';

    if (fs.existsSync('package.json')) {
      const pkg = JSON.parse(projectText('package.json'));
      pkg.scripts = pkg.scripts || {};
      const added = Object.keys(SCRIPTS).filter((name) => !pkg.scripts[name]);
      added.forEach((name) => { pkg.scripts[name] = SCRIPTS[name]; });
      if (added.length) { write('.', 'package.json', JSON.stringify(pkg, null, 2) + '\n', { project: true }); done.push('package.json scripts added: ' + added.join(', ')); }
      else done.push('package.json already has the sel scripts');
    } else done.push('No package.json: run the script with node scripts/sel-pull.mjs ...');

    const ignoreLine = /^\.claude\/\s*$/m;
    if (ignoreLine.test(projectText('.gitignore'))) {
      const next = projectText('.gitignore').replace(ignoreLine, '# Claude Code: rules, commands and skills are shared with the team; only local state stays out\n.claude/settings.local.json\n.claude/*.lock');
      write('.', '.gitignore', next, { project: true });
      done.push('.gitignore: .claude/ is no longer ignored (only settings.local.json and lock files are)');
    }
  });
  say('\n' + done.map((d) => '  - ' + d).join('\n'));
  if (!args['no-theme']) {
    say('\nThe Bootstrap theme and the components this project already uses:');
    args._ = [];
    await transaction(sync);
  }
  if (args.firebase) {
    say('');
    try { await transaction(firebaseDev); } catch (e) { say('Firebase dev environment not set up: ' + e.message); process.exitCode = 1; }
  }
  say('\nNext: write your pages with the library\'s components, then npm run sel:sync pulls exactly what they use; npm run sel:check says whether everything is current.\nAdapt .claude/rules/code-style.md, testing.md and security.md to this project: they are starting points.');
}

// ------------------------------------------------------------------ check / status
async function check() {
  const soft = !!args.soft;
  let latest;
  try {
    latest = JSON.parse(await dist('latest', 'theme.manifest.json'));
  } catch (e) {
    if (soft) { say(`sel: the library is not reachable at ${library}, skipping the check.`); return; }
    say(`sel: cannot reach the library at ${library}: ${e.message}`);
    process.exitCode = 3;
    return;
  }
  let behind = false;
  const lines = [];
  let wanted = 1;
  try { wanted = await minClient(); } catch (e) { behind = true; lines.push('! ' + e.message.split('\n')[0]); }
  if (CLIENT_VERSION < wanted) { behind = true; lines.push(`! scripts/sel-pull.mjs (version ${CLIENT_VERSION}) is older than the library accepts (${wanted} or newer): pulling is refused until you run: sel self-update`); }
  try {
    // breaking notes first: the components this project uses, since the oldest version it pulled, with the project files that use them
    const used = [lock.elements, lock.theme_files, lock.component_css].filter(Boolean);
    const oldest = used.map((x) => String(x.version).replace(/\+working$/, '')).sort(cmp)[0];
    if (oldest && cmp(latest.version, oldest) > 0) {
      const log = JSON.parse(await dist('latest', 'changelog.json'));
      const ids = [...new Set(used.flatMap((x) => x.components || []))].sort();
      const groups = [];
      if (lock.theme_files) groups.push({ name: 'theme', entries: notesSince(log.theme_changes, oldest, latest.version) });
      for (const id of ids) groups.push({ name: id, entries: notesSince((log.components[id] || {}).history, oldest, latest.version) });
      lines.unshift(...(await breakingLines(groups.filter((g) => g.entries.length), 'latest')));
    }
  } catch { /* an older library without changelog.json: the lines below say what they can */ }

  if (lock.elements) {
    const have = lock.elements.version;
    const haveNum = String(have).replace(/\+working$/, '');
    const modified = locallyModified(lock.elements.files, lock.elements.out);
    if (modified.length) { behind = true; lines.push(`! Pulled files edited locally: ${modified.join(', ')} (they are generated: change the component in the library)`); }
    if (String(have).endsWith('+working')) { behind = true; lines.push(`! Elements came from the library's uncommitted working copy (v${haveNum}+working): commit a version there and pull again.`); }
    if (cmp(latest.version, haveNum) > 0) {
      behind = true;
      lines.push(`! Elements are at v${haveNum}; the library has v${latest.version}.`);
      try {
        const log = JSON.parse(await dist('latest', 'changelog.json'));
        for (const id of lock.elements.components) {
          const news = ((log.components[id] || {}).history || []).filter((e) => e.version !== 'unreleased' && cmp(e.version, haveNum) > 0);
          for (const e of news) lines.push(`    ${id} (${e.version}): ${e.note}`);
        }
        const unused = Object.keys(log.components).filter((id) => !lock.elements.components.includes(id) && log.components[id].history.some((e) => e.version !== 'unreleased' && cmp(e.version, haveNum) > 0));
        if (unused.length) lines.push(`    (also changed, but not used here: ${unused.join(', ')})`);
      } catch { /* an older library without changelog.json */ }
      lines.push('  Update with: node scripts/sel-pull.mjs elements   (then run the project checks)');
    } else if (!modified.length && !String(have).endsWith('+working')) lines.push(`ok Elements are current (v${haveNum}).`);
  } else lines.push('- No elements pulled yet.');

  if (lock.theme_files) {
    const t = lock.theme_files;
    const haveNum = String(t.version).replace(/\+working$/, '');
    const modified = locallyModified(t.files, t.out);
    const working = String(t.version).endsWith('+working');
    if (modified.length) { behind = true; lines.push(`! Pulled theme files edited locally: ${modified.join(', ')}`); }
    if (working) { behind = true; lines.push(`! The theme came from the library's uncommitted working copy (v${haveNum}+working): commit a version there and pull again.`); }
    if (cmp(latest.version, haveNum) > 0) {
      behind = true;
      lines.push(`! The theme is at v${haveNum}; the library has v${latest.version}.`);
      try {
        const log = JSON.parse(await dist('latest', 'changelog.json'));
        for (const e of (log.theme_changes || []).filter((x) => x.version !== 'unreleased' && cmp(x.version, haveNum) > 0)) lines.push(`    theme (${e.version}): ${e.note}`);
        for (const id of t.components.filter((x) => !(lock.elements && lock.elements.components.includes(x)))) {
          for (const e of ((log.components[id] || {}).history || []).filter((x) => x.version !== 'unreleased' && cmp(x.version, haveNum) > 0)) lines.push(`    ${id} (${e.version}): ${e.note}`);
        }
      } catch { /* an older library without changelog.json */ }
      lines.push('  Update with: node scripts/sel-pull.mjs sync');
    } else if (!modified.length && !working) lines.push(`ok The theme is current (v${haveNum}).`);
  }

  if (lock.component_css) {
    const t = lock.component_css;
    const haveNum = String(t.version).replace(/\+working$/, '');
    const modified = locallyModified(t.files, t.out);
    const working = String(t.version).endsWith('+working');
    if (modified.length) { behind = true; lines.push(`! Pulled component CSS edited locally: ${modified.join(', ')}`); }
    if (working) { behind = true; lines.push(`! The component CSS came from the library's uncommitted working copy (v${haveNum}+working): commit a version there and pull again.`); }
    if (cmp(latest.version, haveNum) > 0) {
      behind = true;
      lines.push(`! The component CSS is at v${haveNum}; the library has v${latest.version}.`);
      lines.push('  Update with: node scripts/sel-pull.mjs sync --no-theme');
    } else if (!modified.length && !working) lines.push(`ok The component CSS is current (v${haveNum}).`);
  }

  if (lock.firebase_dev) {
    const t = lock.firebase_dev;
    const modified = locallyModified(t.files, t.out);
    if (modified.length) { behind = true; lines.push(`! Pulled dev scripts edited locally: ${modified.map((f) => `${t.out}/${f}`).join(', ')} (they are generated: change them in the library; the project's own data is ${DEV_SEED})`); }
    try {
      const manifest = JSON.parse(await fetchText(`${library}/client/firebase-dev/files.json`));
      const newer = [];
      for (const name of manifest.generated) {
        const text = await fetchText(`${library}/client/firebase-dev/${name}`);
        if (t.files[name] !== contentHash(name, text)) newer.push(name);
      }
      if (newer.length && !modified.length) { behind = true; lines.push(`! The library has newer dev scripts (${newer.join(', ')}).\n  Update with: node scripts/sel-pull.mjs firebase`); }
      else if (!newer.length && !modified.length) lines.push('ok The dev scripts are current.');
    } catch (e) { behind = true; lines.push(`! Could not read the library's dev scripts, so they were not checked: ${e.message}`); }
  }

  if (lock.rules) {
    try {
      const manifest = JSON.parse(await fetchText(`${library}/rules/manifest.json`));
      const stale = [];
      const edited = [];
      const missing = [];
      const retired = [];
      const different = [];
      for (const [rel, info] of Object.entries(lock.rules.files || {})) {
        const entry = manifest.files.find((f) => f.path === rel);
        if (!fs.existsSync(rel)) missing.push(rel);
        else if (contentHash(rel, fs.readFileSync(rel)) !== info.sha256) edited.push(rel);
        if (!entry) { retired.push(rel); continue; }
        if (entry.rev > info.rev) stale.push(`${rel} (rev ${info.rev} -> ${entry.rev}: ${entry.note || 'edited'})`);
        else if (entry.rev === info.rev && entry.sha256 !== info.sha256) different.push(rel);
      }
      const added = [];
      for (const set of lock.rules.sets || []) {
        for (const f of manifest.files.filter((x) => x.sets.includes(set) && !(lock.rules.files || {})[x.path])) added.push(`${f.path} (set ${set})`);
      }
      if (stale.length) { behind = true; lines.push('! Rules updated in the library:\n    ' + stale.join('\n    ') + '\n  Update with: node scripts/sel-pull.mjs rules'); }
      if (added.length) { behind = true; lines.push('! New rule files in the sets you pulled:\n    ' + added.join('\n    ') + '\n  Pull them with: node scripts/sel-pull.mjs rules'); }
      if (missing.length) { behind = true; lines.push(`! Rule files missing from the project: ${missing.join(', ')} (restore them with: node scripts/sel-pull.mjs rules)`); }
      if (different.length) { behind = true; lines.push(`! These rule files are at the library's revision number but their content differs (pulled from the working copy, or the library changed them without a new revision): ${different.join(', ')}\n  Pull the committed revisions with: node scripts/sel-pull.mjs rules --force`); }
      if (retired.length) lines.push(`~ Rule files the library no longer has (they stay in your project until you delete them and remove them from ${LOCK_FILE}): ${retired.join(', ')}`);
      if (edited.length) lines.push(`~ Rule files edited locally (fine for project rules; a pull will not overwrite them without --force): ${edited.join(', ')}`);
      if (!stale.length && !added.length && !missing.length && !different.length) lines.push(`ok Rules are current (${Object.keys(lock.rules.files || {}).length} files).`);
    } catch (e) { behind = true; lines.push(`! Could not read the rules, so they were not checked: ${e.message}`); }
  }
  say('sel check (' + library + ')\n' + lines.map((l) => '  ' + l).join('\n'));
  if (behind && !soft) process.exitCode = 2;
}

/**
 * The change notes of the components this project uses, from the version it pulled (or --from) to the library's newest (or --version):
 * { base, manifest, ids, hasTheme, groups: [{ name, entries }] }, oldest first. Reads only.
 */
async function loadChanges() {
  const sections = [lock.elements, lock.theme_files, lock.component_css].filter(Boolean);
  if (!sections.length) throw failure('Nothing pulled yet, so there is nothing to compare. Run: sel sync');
  const have = (section) => String(section.version).replace(/\+working$/, '');
  const base = args.from || sections.map(have).sort(cmp)[0];
  let manifest;
  let log;
  try {
    manifest = JSON.parse(await dist(args.version || 'latest', 'theme.manifest.json'));
    log = JSON.parse(await dist(args.version || 'latest', 'changelog.json'));
  } catch (e) {
    throw failure(`Cannot read the change notes from the library at ${library}: ${e.message}`, 3);
  }
  const ids = [...new Set(sections.flatMap((section) => section.components || []))].sort();
  const groups = [];
  if (lock.theme_files) groups.push({ name: 'theme', entries: notesSince(log.theme_changes, base, manifest.version) });
  for (const id of ids) groups.push({ name: id, entries: notesSince((log.components[id] || {}).history, base, manifest.version) });
  return { base, manifest, ids, groups: groups.filter((g) => g.entries.length) };
}

/**
 * The breaking notes of `groups` first, in a block of their own, each with the project files that use the component (found by its tag, its
 * pulled import or, for a component without a tag, its classes). Returns the lines to print, or [] when no note breaks anything.
 */
async function breakingLines(groups, version) {
  const hits = groups.map((g) => ({ name: g.name, entries: g.entries.filter((e) => isBreakingNote(e.note)) })).filter((g) => g.entries.length);
  if (!hits.length) return [];
  let meta = {};
  try { meta = (JSON.parse(await dist(version || 'latest', 'elements.json')).components) || {}; } catch { /* no tags known: the files cannot be named */ }
  const found = findReferences(hits.map((g) => g.name).filter((n) => n !== 'theme'), meta);
  const count = hits.reduce((n, g) => n + g.entries.length, 0);
  const lines = [`BREAKING: ${count} note${count === 1 ? '' : 's'} for what this project uses. Read them before you update; fix the files named, in the same change.`];
  for (const g of hits) {
    for (const e of g.entries) lines.push(`  ${g.name} ${e.version}  ${String(e.note).split('\n').join('\n      ')}`);
    if (g.name === 'theme') continue;
    const files = found.refs.get(g.name) || [];
    lines.push(files.length ? `    used in: ${files.join(', ')}${files.length >= REFERENCE_FILES ? ', ...' : ''}` : '    used in: no project file found (it may be used through a pulled file only)');
  }
  if (found.note) lines.push(`  (${found.note})`);
  return lines;
}

/**
 * changes: the change notes of the components this project uses, from the version it pulled to the library's newest (or --version), oldest
 * first. A note that says it breaks something is marked, and the breaking ones come first with the project files that use the component.
 * Reads only; the notes are written for the people who pull the component.
 */
async function changes() {
  const { base, manifest, ids, groups } = await loadChanges();
  const lines = [];
  let breaking = 0;
  for (const g of groups) {
    lines.push(`  ${g.name}`);
    for (const e of g.entries) {
      const flag = isBreakingNote(e.note) ? ' [BREAKING?]' : '';
      if (flag) breaking++;
      lines.push(`    ${e.version}${flag}  ${String(e.note).split('\n').join('\n      ')}`);
    }
  }
  say(`sel changes: v${base} -> v${manifest.version} (${library})`);
  if (!lines.length) say(`  Nothing changed since v${base} in the components you use (${ids.length}).`);
  else {
    const block = await breakingLines(groups, args.version);
    if (block.length) say('\n' + block.join('\n') + '\n');
    say(lines.join('\n'));
    if (breaking) say(`\n${breaking} note(s) mention a break: read them before you pull. [BREAKING?] is a guess from the words of the note, not a promise either way.`);
    say('\nPull it with: sel sync');
  }
}

/** doctor: what could be wrong on this machine or in this project, with the fix next to each. Reads only (takes no project lock, repairs nothing). */
async function doctor() {
  const results = [];
  const add = (level, text, fix) => results.push({ level, text, fix });
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 18) add('ok', `Node ${process.versions.node}`);
  else add('fail', `Node ${process.versions.node} is too old (18 or newer is needed)`, 'Install a current Node.js LTS.');

  let latest = null;
  try {
    latest = JSON.parse(await dist('latest', 'theme.manifest.json'));
    add('ok', `The library at ${library} answers (newest committed version v${latest.version})`);
  } catch (e) {
    add('fail', `The library at ${library} cannot be reached: ${e.message}`, 'Start it with npm start in the library project, or pass --library <url> / set SEL_LIBRARY.');
  }

  // the project's own script is looked at with or without a lockfile: a script the library refuses never gets to write one
  const script = path.join('scripts', 'sel-pull.mjs');
  if (fs.existsSync(script) && latest) {
    let wanted = 1;
    try { wanted = await minClient(); } catch (e) { add('warn', e.message.split(' Nothing was changed')[0], 'Run it again in a moment; the library may be busy.'); }
    const found = /const CLIENT_VERSION = (\d+);/.exec(fs.readFileSync(script, 'utf8'));
    const localVersion = found ? Number(found[1]) : 1; // no constant: a script from before there was one // the project's copy, which may not be the script running now
    if (localVersion < wanted) add('fail', `scripts/sel-pull.mjs (version ${localVersion}) is older than the library accepts (${wanted} or newer): pulling is refused`, 'Run: sel self-update');
    else {
      try {
        const newest = await fetchText(`${library}/client/sel-pull.mjs`);
        if (contentHash(script, fs.readFileSync(script)) === contentHash(script, newest)) add('ok', 'scripts/sel-pull.mjs is the library\'s newest');
        else add('warn', 'scripts/sel-pull.mjs is older than the library\'s (or edited)', 'Run: sel self-update');
      } catch (e) { add('warn', `Could not compare scripts/sel-pull.mjs with the library\'s (${e.message})`); }
    }
  }
  if (!lock.library) add('warn', 'No sel.lock.json here, so this folder is not a sel project (yet)', 'Run sel init in the project folder, or sel new for a new project.');
  else {
    add('ok', `sel.lock.json is readable (library ${lock.library})`);
    if (!fs.existsSync(script)) add('warn', 'scripts/sel-pull.mjs is missing: sel falls back to the library\'s copy for each run', 'Run: sel init   (installs it)');
    for (const [name, section] of [['elements', lock.elements], ['theme', lock.theme_files], ['component CSS', lock.component_css]]) {
      if (!section) continue;
      const number = String(section.version).replace(/\+working$/, '');
      if (String(section.version).endsWith('+working')) add('warn', `The ${name} came from the library's uncommitted working copy (v${section.version})`, 'Commit a version in the library, then run: sel sync');
      if (latest) {
        try { await dist(number, 'theme.manifest.json'); } catch (e) {
          if (/HTTP 404/.test(e.message)) add('warn', `The ${name} are from v${number}, which the library no longer has (deleted or pruned)`, 'Run: sel sync   (it pulls the newest committed version; what you have keeps working).');
          else add('warn', `Could not check whether v${number} still exists (${e.message})`);
        }
      }
      const edited = locallyModified(section.files, section.out);
      if (edited.length) add('warn', `Pulled ${name} files edited or missing: ${edited.slice(0, 5).join(', ')}${edited.length > 5 ? ` and ${edited.length - 5} more` : ''}`, 'They are generated. Move the change into the library, or restore them: sel sync --force');
    }
    const lockFile = `${lockBase()}.lock`;
    if (fs.existsSync(`${journalDir()}/journal.json`)) add('fail', 'An interrupted sel-pull left a recovery journal', 'Run sel sync (or any command that writes): it puts the original files back first.');
    if (fs.existsSync(lockFile)) {
      let info = {};
      try { info = JSON.parse(fs.readFileSync(lockFile, 'utf8')); } catch { /* unfinished */ }
      if (Number.isInteger(info.pid) && processAlive(info.pid) && ageOf(lockFile) <= LIVE_PID_MAX_AGE) add('warn', `A sel-pull is running in this project (pid ${info.pid})`, 'Wait for it. If it is stuck, stop that process.');
      else add('warn', 'A stale project lock is left (its process is gone)', 'The next command clears it by itself; sel sync --break-lock does so by hand.');
    } else add('ok', 'No other sel-pull is running in this project');
  }

  if ((lock.firebase_dev || fs.existsSync('scripts/sel-dev')) && fs.existsSync('package.json')) {
    const probe = (command, argv) => spawnSync([command, ...argv].join(' '), { encoding: 'utf8', shell: true, timeout: 15000 });
    const firebase = probe('firebase', ['--version']);
    if (firebase.status === 0) add('ok', `Firebase CLI ${String(firebase.stdout).trim().split('\n').pop()}`);
    else add('fail', 'The Firebase CLI is not installed or does not start', 'npm install -g firebase-tools');
    const java = probe('java', ['-version']);
    if (java.status === 0) add('ok', 'Java is installed (the emulators need it)');
    else add('warn', 'Java was not found: npm run dev (the emulators) will not start', 'Install a JDK (21 or newer) and restart the terminal.');
    if (fs.existsSync(path.join('node_modules', 'firebase-admin'))) add('ok', 'firebase-admin is installed (dev:pull, users:import)');
    else add('warn', 'firebase-admin is not installed in this project: dev:pull and users:import will not run', 'Run: npm install   (or sel firebase, which adds it as a dev dependency).');
  }

  const mark = { ok: 'ok  ', warn: 'warn', fail: 'FAIL' };
  say('sel doctor');
  for (const r of results) {
    say(`  ${mark[r.level]}  ${r.text}`);
    if (r.fix) say(`        -> ${r.fix}`);
  }
  const failed = results.filter((r) => r.level === 'fail').length;
  const warned = results.filter((r) => r.level === 'warn').length;
  say(`\n${failed ? `${failed} problem(s)` : 'No problems'}${warned ? `, ${warned} to look at` : ''}. Nothing was changed.`);
  if (failed) process.exitCode = 1;
  else if (warned) process.exitCode = 2;
}

// ------------------------------------------------------------------ propose: local edits of pulled files, as a proposal for the library
/** A unified diff of two texts (context 3), or '' when equal. A plain longest-common-subsequence on lines; a very long file is shown whole. */
function unifiedDiff(a, b, nameA, nameB) {
  const x = a.replace(/\r\n/g, '\n').split('\n');
  const y = b.replace(/\r\n/g, '\n').split('\n');
  if (x.join('\n') === y.join('\n')) return '';
  let ops = [];
  if (x.length * y.length > 30e6) ops = [...x.map((l) => ['-', l]), ...y.map((l) => ['+', l])];
  else {
    const width = y.length + 1;
    const table = new Uint32Array((x.length + 1) * width);
    for (let i = x.length - 1; i >= 0; i--) for (let j = y.length - 1; j >= 0; j--) table[i * width + j] = x[i] === y[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    let i = 0;
    let j = 0;
    while (i < x.length && j < y.length) {
      if (x[i] === y[j]) { ops.push([' ', x[i]]); i++; j++; } else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) ops.push(['-', x[i++]]); else ops.push(['+', y[j++]]);
    }
    while (i < x.length) ops.push(['-', x[i++]]);
    while (j < y.length) ops.push(['+', y[j++]]);
  }
  const out = [`--- ${nameA}`, `+++ ${nameB}`];
  const changed = ops.map((op, k) => (op[0] === ' ' ? -1 : k)).filter((k) => k >= 0);
  let k = 0;
  while (k < changed.length) {
    let from = Math.max(0, changed[k] - 3);
    let to = Math.min(ops.length, changed[k] + 4);
    while (k + 1 < changed.length && changed[k + 1] - 3 <= to) { k++; to = Math.min(ops.length, changed[k] + 4); }
    k++;
    const before = ops.slice(0, from);
    const startA = before.filter((o) => o[0] !== '+').length + 1;
    const startB = before.filter((o) => o[0] !== '-').length + 1;
    const slice = ops.slice(from, to);
    out.push(`@@ -${startA},${slice.filter((o) => o[0] !== '+').length} +${startB},${slice.filter((o) => o[0] !== '-').length} @@`, ...slice.map(([sign, line]) => sign + line));
  }
  return out.join('\n') + '\n';
}

/**
 * propose [component ...]: for every pulled file edited in this project, the library's file at the version it was pulled from and a diff to your
 * edit, written to .sel/proposals/<time>/ with a short explanation. Nothing in the project changes except that folder (and .gitignore, so it is
 * not committed). The pulled files are generated from the component's source in the library: the diff shows what to port there.
 */
async function propose() {
  const wanted = args._.map(safeId);
  const sections = [['elements', lock.elements], ['theme', lock.theme_files]].filter(([, s]) => s);
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').replace('T', '-');
  const folder = `.sel/proposals/${stamp}`;
  const entries = [];
  const skipped = [];
  for (const [name, section] of sections) {
    const number = String(section.version).replace(/\+working$/, '');
    for (const rel of locallyModified(section.files, section.out)) {
      const file = safePath(section.out, rel);
      if (!fs.existsSync(file)) continue; // deleted, not edited
      const id = /^elements\/([\w-]+)\.js$/.exec(rel)?.[1] || rel;
      if (wanted.length && !wanted.includes(id)) continue;
      let original;
      try { original = await dist(number, rel); } catch (e) { skipped.push(`${rel}: the library has no ${rel} in v${number} (${e.message.split(':').pop().trim()})`); continue; }
      const local = fs.readFileSync(file, 'utf8');
      const diff = unifiedDiff(original, local, `library v${number}/${rel}`, `${showPath(file)} (your edit)`);
      if (diff) entries.push({ name, id, rel, number, diff, local });
    }
  }
  if (lock.component_css && locallyModified(lock.component_css.files, lock.component_css.out).length) skipped.push('components.css: it is built from several components in this project, so there is no single library file to compare it with');
  if (!entries.length) {
    say(wanted.length ? `No edited pulled files for ${wanted.join(', ')}.` : 'No pulled file has been edited here: nothing to propose.');
    for (const s of skipped) say('  Not compared: ' + s);
    return;
  }
  const readme = [
    '# Proposal for the Shared Element Library',
    '',
    `Made by sel propose on ${new Date().toLocaleString()} in ${path.basename(process.cwd())} against the library ${library}.`,
    '',
    'The files below were edited in this project. Pulled files are GENERATED from the components in the library, so the edit is lost at the next pull',
    'unless the library gets it. For each file: the diff shows what changed against the library\'s file in the version this project pulled; the',
    'edited file is next to it. To adopt a change: open the component in the library, make the same change in its CSS / JS / HTML tab, write a change',
    'note (what changed, and whether it breaks anything), commit a version. Then in this project: sel sync --force (drops your edit for the library\'s).',
    '',
    ...entries.flatMap((e) => [`## ${e.id}`, `File ${e.rel} (${e.name}), based on library v${e.number}. Diff: ${e.id.replace(/[^\w.-]/g, '_')}.diff`, '']),
    ...(skipped.length ? ['## Not compared', '', ...skipped.map((s) => `- ${s}`), ''] : []),
  ].join('\n');
  write('.', `${folder}/README.md`, readme, { project: true });
  for (const e of entries) {
    const safeName = e.id.replace(/[^\w.-]/g, '_');
    write('.', `${folder}/${safeName}.diff`, e.diff, { project: true });
    write('.', `${folder}/${safeName}.edited${path.extname(e.rel)}`, e.local, { project: true });
  }
  const ignore = projectText('.gitignore');
  if (!ignore.split(/\r?\n/).some((l) => l.trim() === '.sel/')) write('.', '.gitignore', ignore + (ignore && !ignore.endsWith('\n') ? '\n' : '') + '# Staff data and proposals made by sel-pull: never commit them.\n.sel/\n', { project: true });
  say(`${entries.length} edited file(s) written up in ${folder}/: ${entries.map((e) => e.id).join(', ')}.`);
  say('Open README.md there, make the change in the library, commit a version, then run sel sync --force here. Your edited files were not touched.');
  for (const s of skipped) say('  Not compared: ' + s);
}

// ------------------------------------------------------------------ firebase-rules: replace a project's deployed security rules, with a diff and a confirmation
/** An access token from your own Google login for scripts (gcloud auth application-default login), or null. Tests set SEL_NEW_GOOGLE_TOKEN. */
function googleToken() {
  if (process.env.SEL_NEW_GOOGLE_TOKEN !== undefined) return process.env.SEL_NEW_GOOGLE_TOKEN || null;
  const r = spawnSync('gcloud auth application-default print-access-token', { shell: true, encoding: 'utf8' });
  return r.status === 0 && /^\S+$/.test((r.stdout || '').trim()) ? r.stdout.trim() : null;
}
/** The security rules deployed in the project now (text), or { error } when they cannot be read. Tests set SEL_NEW_GOOGLE_APIS. (The same code as in sel-new.mjs: tests/sel-new.test.js keeps them equal.) */
async function liveRules(project) {
  const token = googleToken();
  if (!token) return { error: 'no Google login for scripts on this machine (gcloud auth application-default login)' };
  const base = process.env.SEL_NEW_GOOGLE_APIS ? `${process.env.SEL_NEW_GOOGLE_APIS}/firebaserules.googleapis.com` : 'https://firebaserules.googleapis.com';
  const headers = { Authorization: `Bearer ${token}`, 'x-goog-user-project': project };
  try {
    const release = await fetch(`${base}/v1/projects/${project}/releases/cloud.firestore`, { headers, signal: AbortSignal.timeout(30000) });
    if (release.status === 404) return { text: '' }; // nothing deployed yet
    if (!release.ok) return { error: `the rules release could not be read (HTTP ${release.status})` };
    const { rulesetName } = await release.json();
    const set = await fetch(`${base}/v1/${rulesetName}`, { headers, signal: AbortSignal.timeout(30000) });
    if (!set.ok) return { error: `the rule set could not be read (HTTP ${set.status})` };
    const body = await set.json();
    return { text: ((body.source && body.source.files) || []).map((file) => file.content).join('\n') };
  } catch (e) {
    return { error: e.message };
  }
}
/** A line diff of two texts as "- removed" / "+ added" lines with a little context (longest common subsequence; rule files are short). */
function lineDiff(before, after) {
  const a = before.split(/\r?\n/), b = after.split(/\r?\n/);
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { out.push(`  ${a[i]}`); i++; j++; } else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) out.push(`+ ${b[j++]}`); else out.push(`- ${a[i++]}`);
  }
  return out;
}

/**
 * firebase-rules [--file f] [--project id] [--deploy] [--yes]: compares the rules in a file (default firestore.rules.proposed, which sel new --existing writes) with
 * the rules deployed in the Firebase project and shows the difference; nothing else happens without --deploy. --deploy saves the rules deployed now
 * (firestore.rules.live-backup), asks you to type the project id (--yes skips the question, for a script), and deploys only the Firestore rules, from a
 * temporary copy, so the project's own firebase.json is never read or changed.
 */
async function firebaseRules() {
  const file = args.file || 'firestore.rules.proposed';
  if (!insideProject(file)) throw failure(`--file ${JSON.stringify(file)} is outside the project. Nothing was changed.`);
  const where = path.resolve(file);
  if (!fs.existsSync(where)) throw failure(`${file} does not exist. sel new --existing writes the starter's rules to firestore.rules.proposed; or name a file with --file. Nothing was changed.`);
  const proposed = fs.readFileSync(where, 'utf8');
  if (!/service\s+cloud\.firestore/.test(proposed)) throw failure(`${file} does not look like Firestore security rules (no "service cloud.firestore"). Nothing was changed.`);
  let project = args.project;
  if (!project) { try { project = JSON.parse(fs.readFileSync('.firebaserc', 'utf8')).projects.default; } catch { /* named below */ } }
  if (!project || !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(String(project))) throw failure('Which Firebase project? Name it with --project <id>, or run this in a project with a .firebaserc. Nothing was changed.');

  const live = await liveRules(project);
  say(`Security rules of ${project}: deployed now compared with ${file}`);
  let readable = false;
  if (live.error) say(`  The rules deployed now could not be read (${live.error}). Open https://console.firebase.google.com/project/${project}/firestore/rules and copy them somewhere safe first.`);
  else if (!live.text.trim()) say('  No rules are deployed in this project yet: nothing is replaced.');
  else {
    readable = true;
    const changed = lineDiff(live.text, proposed).filter((line) => line[0] !== ' ');
    if (!changed.length) { say('  They are identical: nothing to deploy.'); return; }
    say(`  Replacing them changes ${changed.length} lines:`);
    for (const line of changed.slice(0, 80)) say(`    ${line}`);
    if (changed.length > 80) say(`    ... and ${changed.length - 80} more`);
    say('  Every collection these rules have no rule for is closed after this, for every app on this project.');
  }
  if (!args.deploy) { say('\nNothing was changed. To replace the deployed rules with these: sel firebase-rules --deploy'); return; }

  if (readable) { writeAtomic(path.resolve('firestore.rules.live-backup'), live.text); say('The rules deployed now are saved in firestore.rules.live-backup.'); }
  if (!args.yes) {
    if (!process.stdin.isTTY) throw failure('There is no terminal to ask at, so nothing was deployed. Add --yes to replace the rules without being asked.');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const typed = await rl.question(`Type the project id (${project}) to replace its security rules: `);
    rl.close();
    if (typed.trim() !== project) throw failure('Not the project id: the security rules were not replaced.');
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'sel-rules-'));
  try {
    fs.writeFileSync(path.join(temporary, 'firestore.rules'), proposed);
    fs.writeFileSync(path.join(temporary, 'firebase.json'), JSON.stringify({ firestore: { rules: 'firestore.rules' } }));
    const stub = process.env.SEL_NEW_FIREBASE; // tests point this at a stand-in for the Firebase CLI
    const r = stub
      ? spawnSync(process.execPath, [stub, 'deploy', '--only', 'firestore:rules', '--project', project], { cwd: temporary, stdio: 'inherit' })
      : spawnSync(['firebase', 'deploy', '--only', 'firestore:rules', '--project', project].join(' '), { cwd: temporary, stdio: 'inherit', shell: true }); // the project id was checked above
    if (r.status !== 0) throw failure(`firebase deploy failed (exit ${r.status === null ? 'killed' : r.status}). The rules deployed in ${project} are as they were${readable ? ' (a copy is in firestore.rules.live-backup)' : ''}.`);
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  say(`The security rules of ${project} were replaced with ${file}.`);
}

// ------------------------------------------------------------------ search, diff and the breaking block: what the daily commands add
const REFERENCE_FILES = 5; // project files named per component in the BREAKING block
const REFERENCE_MAX_FILES = 2000; // source files read at most
const REFERENCE_MAX_BYTES = 1024 * 1024; // larger files are not read

// <daily-pure> pure helpers, no input or output: tests load this block on its own, so keep it free of anything outside it
/** Whether a change note says it breaks something (the same words changes has always marked). */
function isBreakingNote(note) { return /\bbreak/i.test(String(note)); }

const STOPWORDS = new Set(['an', 'the', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'with', 'me', 'my', 'we', 'need', 'needs', 'want', 'that', 'which', 'is', 'are', 'it', 'be', 'can', 'how', 'do', 'show', 'make', 'use', 'using', 'some', 'from', 'by', 'as', 'at', 'this', 'like', 'get', 'give', 'build', 'create', 'something', 'component', 'page', 'any', 'all', 'so', 'if', 'when', 'where', 'what', 'who', 'will', 'has', 'have', 'into', 'out', 'up', 'their', 'its', 'your', 'our']);
/** A simple stem: plural s / es / ies, -ing and -ed come off, so "lists", "sorting" and "sorted" meet "list" and "sort". */
function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2);
  else if (w.length > 4 && /(ches|shes|xes|sses)$/.test(w)) return w.slice(0, -2);
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w !== word && w.length > 3 && w[w.length - 1] === w[w.length - 2] && !/[aeiou]/.test(w[w.length - 1])) w = w.slice(0, -1); // dragg -> drag
  return w;
}
/** Words of a text: lower case, split on anything that is not a letter or digit, stop words and one-letter words dropped, stemmed. */
function tokenize(text) {
  return String(text || '').toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 1 && !STOPWORDS.has(w)).map(stem);
}
/**
 * The catalog components that fit a free-text need, best first: [{ ...component, score, matched: ['name', 'tag', ...] }], only those with a score.
 * Words found in the id or name weigh most, then tags and classes, then the group, the one-line summary and the rest of what the component says
 * about itself; an exact word beats the start of a word, a component that matches every word of the query gets a bonus, and so does one whose
 * name or summary holds the whole query.
 */
function rankComponents(catalog, query) {
  const words = [...new Set(tokenize(query))];
  if (!words.length) return [];
  const phrase = String(query).toLowerCase().replace(/\s+/g, ' ').trim();
  const out = [];
  for (const c of catalog) {
    const fields = {
      name: tokenize(`${c.id} ${c.name}`),
      tag: tokenize([...(c.tags || []), ...(c.classes || [])].join(' ')).filter((w) => w !== 'sel'),
      group: tokenize(c.group),
      summary: tokenize(c.summary),
      doc: tokenize(c.doc),
    };
    let score = 0;
    const matched = new Set();
    const hit = new Set();
    for (const w of words) {
      const exact = (list) => list.filter((x) => x === w).length;
      const partial = (list) => w.length >= 3 && list.some((x) => x !== w && ((x.length >= 3 && x.startsWith(w)) || (x.length >= 4 && w.startsWith(x))));
      const add = (points, field) => { score += points; matched.add(field); hit.add(w); };
      if (exact(fields.name)) add(10, 'name'); else if (partial(fields.name)) add(5, 'name');
      if (exact(fields.tag)) add(5, 'tag'); else if (partial(fields.tag)) add(2.5, 'tag');
      if (exact(fields.group)) add(2, 'group');
      if (exact(fields.summary)) add(4, 'summary');
      const inDoc = exact(fields.doc);
      if (inDoc) add(1 + Math.min(inDoc - 1, 2) * 0.5, 'doc');
    }
    if (!score) continue;
    if (words.length > 1 && hit.size === words.length) score += 6;
    if (words.length > 1 && `${c.name} ${c.summary}`.toLowerCase().replace(/\s+/g, ' ').includes(phrase)) score += 5;
    score *= 0.5 + 0.5 * (hit.size / words.length);
    out.push({ ...c, score: Math.round(score * 10) / 10, matched: [...matched] });
  }
  return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

/**
 * A compact unified diff of two texts (compactDiff): the lines of hunks ("@@ -a,b +c,d @@", " context", "-removed", "+added"), with `context` lines around each change;
 * [] when they are the same. Equal start and end are cut off first; a middle too large for an exact diff (over 4 million cells) shows as removed, then added.
 */
function compactDiff(oldText, newText, context = 2) {
  const a = String(oldText).replace(/\r\n/g, '\n').split('\n');
  const b = String(newText).replace(/\r\n/g, '\n').split('\n');
  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
  let ea = a.length;
  let eb = b.length;
  while (ea > lo && eb > lo && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  if (lo === ea && lo === eb) return [];
  const A = a.slice(lo, ea);
  const B = b.slice(lo, eb);
  const ops = []; // { t: ' ' | '-' | '+', line, ao, bo } with ao / bo: the old / new line number it sits at
  const head = Math.min(context, lo);
  for (let k = lo - head; k < lo; k++) ops.push({ t: ' ', line: a[k], ao: k + 1, bo: k + 1 });
  let ao = lo + 1;
  let bo = lo + 1;
  const push = (t, line) => { ops.push({ t, line, ao, bo }); if (t !== '+') ao++; if (t !== '-') bo++; };
  const n = A.length;
  const m = B.length;
  if (n * m > 4000000) {
    A.forEach((line) => push('-', line));
    B.forEach((line) => push('+', line));
  } else {
    const w = m + 1;
    const table = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) table[i * w + j] = A[i] === B[j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && A[i] === B[j]) { push(' ', A[i]); i++; j++; }
      else if (i < n && (j >= m || table[(i + 1) * w + j] >= table[i * w + j + 1])) { push('-', A[i]); i++; }
      else { push('+', B[j]); j++; }
    }
  }
  for (let k = 0; k < Math.min(context, a.length - ea); k++) ops.push({ t: ' ', line: a[ea + k], ao: ea + k + 1, bo: eb + k + 1 });
  const ranges = [];
  ops.forEach((op, index) => {
    if (op.t === ' ') return;
    const from = Math.max(0, index - context);
    const to = Math.min(ops.length - 1, index + context);
    if (ranges.length && from <= ranges[ranges.length - 1][1] + 1) ranges[ranges.length - 1][1] = to; else ranges.push([from, to]);
  });
  const lines = [];
  for (const [from, to] of ranges) {
    const part = ops.slice(from, to + 1);
    const removed = part.filter((op) => op.t !== '+').length;
    const added = part.filter((op) => op.t !== '-').length;
    lines.push(`@@ -${part[0].ao},${removed} +${part[0].bo},${added} @@`);
    for (const op of part) lines.push(op.t + op.line);
  }
  return lines;
}
// </daily-pure>

// <release-pure> pure helpers of sel release, no input or output: tests load this block on its own, so keep it free of anything outside it
const RELEASE_LIMITS = { notes: 12, chars: 2500, note: 400 }; // per release entry: notes, characters in all, characters in one note
const RELEASE_MAX_VERSIONS = 500;
const RELEASE_VERSION = /^\d{1,9}(\.\d{1,9}){0,3}$/; // a plain dotted version: what sel release <version> accepts
const RELEASE_HEADING = /^##\s+\[?([^\]\s]+)\]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;

/** Numeric, dot-separated version comparison (1.10.0 is higher than 1.9.0); a segment that is not a number falls back to a plain string compare. */
function compareVersions(a, b) {
  const partsA = String(a).split('.');
  const partsB = String(b).split('.');
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = Number(partsA[i] ?? '0');
    const numB = Number(partsB[i] ?? '0');
    if (Number.isNaN(numA) || Number.isNaN(numB)) return String(partsA[i] ?? '').localeCompare(String(partsB[i] ?? ''));
    if (numA !== numB) return numA - numB;
  }
  return 0;
}
/** The lines of a text with the offset each starts at; \r\n and \n both end a line. */
function changelogLines(markdown) {
  const lines = [];
  const end = /\r\n|\n/g;
  let start = 0;
  let m;
  while ((m = end.exec(markdown))) { lines.push({ text: markdown.slice(start, m.index), start }); start = m.index + m[0].length; }
  lines.push({ text: markdown.slice(start), start });
  return lines;
}
/**
 * Reads a Keep a Changelog file: { lines, eol, versions (every heading with its notes, empty ones too), unreleased: { notes, heading, first } }.
 * The unreleased block is what sits under a "## [Unreleased]" heading, or, when the file has none, the bullets before the first version heading.
 */
function scanChangelog(markdown) {
  const lines = changelogLines(markdown);
  const versions = [];
  const top = { notes: [], first: -1, heading: -1 };
  const under = { notes: [], first: -1, heading: -1 };
  let current = null;
  let seenVersion = false;
  lines.forEach((line, i) => {
    const heading = RELEASE_HEADING.exec(line.text);
    if (heading) {
      const name = heading[1].replace(/^v/i, '');
      if (/^unreleased$/i.test(name)) { current = under; if (under.heading < 0) under.heading = i; return; }
      current = { version: name, date: heading[2] || null, notes: [], line: i };
      versions.push(current);
      seenVersion = true;
      return;
    }
    const bullet = /^\s*[-*]\s+(.+)/.exec(line.text);
    if (!bullet) return;
    const note = bullet[1].trim();
    if (current === under) { under.notes.push(note); if (under.first < 0) under.first = i; }
    else if (current) current.notes.push(note);
    else if (!seenVersion) { top.notes.push(note); if (top.first < 0) top.first = i; }
  });
  return { lines, eol: markdown.includes('\r\n') ? '\r\n' : '\n', versions, unreleased: under.heading >= 0 ? under : top };
}
/** The versions of a changelog that have notes: [{ version, date, notes }]. A heading without bullets, and the unreleased block, are not releases. */
function parseChangelog(markdown) {
  return scanChangelog(markdown).versions.filter((v) => v.notes.length > 0).map(({ version, date, notes }) => ({ version, date, notes }));
}
/** The unreleased notes of a changelog (the block sel release <version> would give a version). */
function splitUnreleased(markdown) {
  return scanChangelog(markdown).unreleased.notes.slice();
}
/** The Firestore document id of a version ("/" becomes "-"), or null when it cannot be one. */
function releaseDocId(version) {
  const id = String(version).replace(/\//g, '-');
  return /^[A-Za-z0-9][A-Za-z0-9._+-]{0,99}$/.test(id) && !id.includes('..') && !/^__.*__$/.test(id) ? id : null;
}
/** How a release entry stands against the limits: { count, chars, long: [{ n, length }], over }. */
function releaseProblems(entry) {
  const notes = entry.notes || [];
  const chars = notes.reduce((sum, note) => sum + note.length, 0);
  const long = [];
  notes.forEach((note, i) => { if (note.length > RELEASE_LIMITS.note) long.push({ n: i + 1, length: note.length }); });
  return { count: notes.length, chars, long, over: notes.length > RELEASE_LIMITS.notes || chars > RELEASE_LIMITS.chars || long.length > 0 };
}
/** The sentence that names what is over the limits of one release entry. */
function describeProblems(version, p) {
  const parts = [];
  if (p.count > RELEASE_LIMITS.notes) parts.push(`${p.count} notes (at most ${RELEASE_LIMITS.notes})`);
  if (p.chars > RELEASE_LIMITS.chars) parts.push(`${p.chars} characters in all (at most ${RELEASE_LIMITS.chars})`);
  if (p.long.length) parts.push(`${p.long.length} note${p.long.length === 1 ? '' : 's'} over ${RELEASE_LIMITS.note} characters (${p.long.slice(0, 5).map((x) => `note ${x.n}: ${x.length}`).join(', ')}${p.long.length > 5 ? ', ...' : ''})`);
  return `${version} has ${parts.join(', ')}`;
}
/** What is wrong with the entries as documents (an id that cannot be one, two entries with one id, too many); [] when all is well. */
function checkReleaseEntries(entries) {
  const errors = [];
  const seen = new Map();
  if (entries.length > RELEASE_MAX_VERSIONS) errors.push(`The changelog has ${entries.length} versions with notes; at most ${RELEASE_MAX_VERSIONS} are pushed.`);
  for (const e of entries) {
    const id = releaseDocId(e.version);
    if (!id) { errors.push(`The version "${e.version}" cannot be a document id (letters, digits, . _ + - only, at most 100 characters, no "..").`); continue; }
    if (seen.has(id)) errors.push(`The versions "${seen.get(id)}" and "${e.version}" would both be stored as "${id}": each version can appear once.`);
    else seen.set(id, e.version);
  }
  return errors;
}
/**
 * What the App Store holds against what the file says. `remote` is a Map of document id -> { version, notes, dateMs }; the result lists the new
 * entries, the ones whose notes (or heading date) changed, the unchanged ones, the ids no longer in the file, and the latest version.
 */
function planChangelogPush(entries, remote, remoteLatest) {
  const creates = [];
  const updates = [];
  const same = [];
  const ids = new Set();
  for (const e of entries) {
    const id = releaseDocId(e.version);
    const parsed = e.date ? Date.parse(e.date + 'T00:00:00Z') : NaN;
    const item = { id, version: e.version, notes: e.notes, dateMs: Number.isNaN(parsed) ? null : parsed };
    ids.add(id);
    const old = remote.get(id);
    if (!old) { creates.push(item); continue; }
    const sameNotes = old.notes.length === item.notes.length && old.notes.every((note, i) => note === item.notes[i]);
    if (sameNotes && old.version === item.version && (item.dateMs === null || item.dateMs === old.dateMs)) same.push(item); else updates.push(item);
  }
  const removals = [...remote.keys()].filter((id) => !ids.has(id)).sort();
  const latest = entries.length ? entries.reduce((best, e) => (compareVersions(e.version, best.version) > 0 ? e : best)).version : null;
  return { creates, updates, same, removals, latest, latestChanged: latest !== null && latest !== remoteLatest };
}
/**
 * Gives the unreleased notes a version: { ok: true, text, notes, eol } with "## [version] - today" put directly above them (below an Unreleased heading,
 * which stays), or { ok: false, error }. The file's own line endings are kept; nothing else in it moves.
 */
function prepareRelease(markdown, version, today) {
  if (!RELEASE_VERSION.test(version)) return { ok: false, error: `"${version}" is not a plain dotted version (1.6.0, 2.0, 1.2.3.4).` };
  const scan = scanChangelog(markdown);
  const block = scan.unreleased;
  if (!block.notes.length) return { ok: false, error: 'There are no unreleased notes to give a version: add bullets under "## [Unreleased]" (or at the top of CHANGELOG.md, above the first version) first.' };
  let highest = null;
  for (const v of scan.versions) {
    if (releaseDocId(v.version) === releaseDocId(version)) return { ok: false, error: `Version ${version} is already in the changelog.` };
    if (RELEASE_VERSION.test(v.version) && (highest === null || compareVersions(v.version, highest) > 0)) highest = v.version;
  }
  if (highest !== null && compareVersions(version, highest) <= 0) return { ok: false, error: `Version ${version} must be higher than ${highest}, the highest in the changelog.` };
  const lines = scan.lines;
  let p;
  if (block.heading >= 0) { p = block.heading + 1; if (p < lines.length && lines[p].text.trim() === '') p++; } else p = block.first;
  const at = p < lines.length ? lines[p].start : markdown.length;
  const needBreak = at === markdown.length && markdown.length > 0 && !/\n$/.test(markdown);
  const needBlank = p > 0 && lines[p - 1].text.trim() !== '';
  const insertion = (needBreak ? scan.eol : '') + (needBlank ? scan.eol : '') + `## [${version}] - ${today}` + scan.eol + scan.eol;
  return { ok: true, text: markdown.slice(0, at) + insertion + markdown.slice(at), notes: block.notes.slice(), eol: scan.eol };
}
/** Sets the top-level "version" of package.json text without touching anything else: { text, old }, or null when there is no such text field. */
function bumpPackageVersion(text, version) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{' || c === '[') depth++;
    else if (c === '}' || c === ']') depth--;
    else if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      const after = /^\s*:\s*/.exec(text.slice(j + 1));
      if (depth === 1 && after && text.slice(i + 1, j) === 'version') {
        const open = j + 1 + after[0].length;
        if (text[open] !== '"') return null;
        let close = open + 1;
        while (close < text.length && text[close] !== '"') close += text[close] === '\\' ? 2 : 1;
        return { text: text.slice(0, open + 1) + version + text.slice(close), old: text.slice(open + 1, close) };
      }
      i = j;
    }
  }
  return null;
}
// </release-pure>

/** The change notes of one component (or the theme) newer than `base` and not newer than `upto`, oldest first. */
const notesSince = (entries, base, upto) => (entries || []).filter((e) => e.version !== 'unreleased' && cmp(e.version, base) > 0 && cmp(e.version, upto) <= 0).sort((a, b) => cmp(a.version, b.version));

/**
 * Which of the project's own files use these components: { refs: Map(id -> [files]), note }. A file counts when it holds the component's tag, imports
 * its pulled script, or (for a component that has no tag) uses one of its classes. Looks only at source files inside the project: not node_modules, .git,
 * the pulled folders, links of any kind (a link could lead out), files over 1 MB or beyond the first 2000; `note` says what was left out.
 */
function findReferences(ids, meta) {
  const refs = new Map();
  const wanted = ids.filter((id) => /^[\w-]+$/.test(id));
  if (!wanted.length) return { refs, note: '' };
  const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matchers = wanted.map((id) => {
    const m = (meta && meta[id]) || {};
    const tags = (m.tags || []).filter((t) => /^[\w-]+$/.test(t));
    return {
      id,
      tag: tags.length ? new RegExp(`<\\/?(?:${tags.map(escape).join('|')})(?![\\w-])|["'\`](?:${tags.map(escape).join('|')})["'\`]`) : null,
      classes: tags.length ? [] : (m.classes || []).filter((k) => /^[\w-]+$/.test(k)),
      importPath: `/elements/${id}.js`,
    };
  });
  const pulledFolders = [lock.elements, lock.theme_files, lock.component_css].filter(Boolean).map((x) => String(x.out || '').replace(/^\.\//, '').replace(/\/$/, '')).filter(Boolean);
  let read = 0;
  let tooBig = 0;
  let unreadable = 0;
  let stopped = false;
  const walk = (dir) => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }).sort((x, y) => (x.name < y.name ? -1 : 1)); } catch { unreadable++; return; }
    for (const entry of entries) {
      if (stopped) return;
      const full = path.join(dir, entry.name);
      const rel = full.split(path.sep).join('/').replace(/^\.\//, '');
      if (entry.isSymbolicLink()) continue; // a link (or a Windows junction) could lead anywhere
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || /(^|\/)vendor\/sel(\/|$)/.test(rel) || rel === 'scripts/sel-dev' || pulledFolders.some((f) => rel === f || rel.startsWith(f + '/'))) continue;
        if (!insideProject(full)) continue;
        walk(full);
      } else if (entry.isFile() && SOURCE_EXT.test(entry.name) && rel !== 'scripts/sel-pull.mjs' && !pulledFolders.some((f) => rel.startsWith(f + '/'))) {
        if (read >= REFERENCE_MAX_FILES) { stopped = true; return; }
        read++;
        let text;
        try {
          if (fs.lstatSync(full).size > REFERENCE_MAX_BYTES) { tooBig++; continue; }
          if (!insideProject(full)) continue;
          text = fs.readFileSync(full, 'utf8');
        } catch { unreadable++; continue; }
        let classTokens = null;
        for (const x of matchers) {
          const list = refs.get(x.id) || [];
          if (list.length >= REFERENCE_FILES || list.includes(rel)) continue;
          let used = (x.tag && x.tag.test(text)) || text.includes(x.importPath);
          if (!used && x.classes.length) {
            if (!classTokens) { classTokens = new Set(); for (const c of text.matchAll(/class(?:Name)?\s*=\s*["'`{]+([^"'`}]+)/g)) for (const k of c[1].split(/\s+/)) classTokens.add(k); }
            used = x.classes.some((k) => classTokens.has(k));
          }
          if (used) { list.push(rel); refs.set(x.id, list); }
        }
      }
    }
  };
  walk('.');
  const notes = [];
  if (stopped) notes.push(`only the first ${REFERENCE_MAX_FILES} source files were searched for uses`);
  if (tooBig) notes.push(`${tooBig} file${tooBig === 1 ? '' : 's'} over 1 MB not read`);
  if (unreadable) notes.push(`${unreadable} file${unreadable === 1 ? '' : 's'} or folder${unreadable === 1 ? '' : 's'} not readable`);
  return { refs, note: notes.join('; ') };
}

/** search "<what I need>": the components that fit a free-text need, best first. Reads the library only. */
async function search() {
  const query = args._.join(' ').trim();
  if (!query) throw failure('Say what you need, e.g. sel search "a list I can sort". sel components lists everything.');
  const limit = args.limit === undefined ? 8 : Number(args.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw failure('--limit is a whole number from 1 to 100 (default 8).');
  const catalog = await loadCatalog();
  const ranked = rankComponents(catalog, query);
  const shown = ranked.slice(0, limit);
  if (args.json) { say(JSON.stringify(shown.map(({ html, doc, ...rest }) => rest), null, 2)); return; }
  if (!ranked.length) { say(`No component fits "${query}" (of ${catalog.length}). Try other words, or read the full list: sel components`); return; }
  say(`${shown.length}${ranked.length > shown.length ? ` of ${ranked.length}` : ''} component${shown.length === 1 ? '' : 's'} fit "${query}" in ${library}, best first:`);
  const width = Math.max(...shown.map((c) => c.id.length));
  for (const c of shown) {
    const how = c.tags[0] ? `<${c.tags[0]}>` : c.classes[0] ? `.${c.classes[0]}` : '';
    say(`  ${c.id.padEnd(width)}  ${how.padEnd(26)} ${c.summary || c.name}  [${c.matched.join(', ')}]`);
  }
  say('\nsel component <name> shows the markup, the attributes and the events. Use a library component before writing your own; sel components lists them all.');
}

// ------------------------------------------------------------------ diff
let diffContext = null;
/**
 * diff: what an update would change, for the components the project uses: their change notes since the pulled version (breaking ones first), and a
 * compact diff of each pulled file against the library's newest. It runs the sync plan (what sync would write) and writes nothing.
 */
async function diff() {
  const info = await loadChanges();
  if (args.component && !info.ids.includes(args.component)) throw failure(`${args.component} is not one of the components this project has pulled: ${info.ids.join(', ') || '(none)'}.`);
  // The plan is made the way sel update would make it (same mode); diffMode (not --force) lets the plan go on past a pulled file you edited, to show it as a difference; remove() and write() still decide as a real run would.
  args['no-theme'] = lock.mode === 'components-css';
  diffMode = true;
  diffContext = info;
  await transaction(sync);
}

/** Prints the notes and the file differences of a diff, from the plan sync made. Nothing is written. */
async function diffReport(plan) {
  const { base, manifest, groups } = diffContext;
  const shownGroups = args.component ? groups.filter((g) => g.name === args.component) : groups;
  const out = [`sel diff: v${base} -> v${manifest.version} (${library}). Nothing is written.`];
  const block = await breakingLines(shownGroups, args.version);
  if (block.length) out.push('', ...block);
  out.push('', 'CHANGE NOTES');
  if (!shownGroups.length) out.push(`  None since v${base}${args.component ? ` for ${args.component}` : ' for the components you use'}.`);
  for (const g of shownGroups) {
    out.push(`  ${g.name}`);
    for (const e of g.entries) out.push(`    ${e.version}${isBreakingNote(e.note) ? ' [BREAKING?]' : ''}  ${String(e.note).split('\n').join('\n      ')}`);
  }
  const cap = args.full ? Infinity : 40;
  const ops = finalOps(plan);
  const last = ops.last;
  const lockFile = path.resolve(LOCK_FILE);
  const blockedNow = new Set(plan.blocked);
  const matches = (rel) => !args.component || rel.endsWith(`/elements/${args.component}.js`);
  const files = [];
  let same = 0;
  let hidden = 0;
  for (const [file, text] of last) {
    if (file === lockFile) continue;
    const rel = showPath(file);
    if (typeof text === 'string' && text.startsWith('# Generated: do not edit')) continue; // the README the pull writes
    if (!matches(rel)) { hidden++; continue; }
    if (blockedNow.has(rel)) { files.push([`! ${rel}  (would stop: existing file, not pulled by sel-pull)`]); continue; }
    let now = null;
    try { now = fs.readFileSync(file); } catch { /* new file */ }
    if (now === null) { files.push([`+ ${rel}  (new file${typeof text === 'string' ? `, ${text.split('\n').length} lines` : ''})`]); continue; }
    if (sameBytes(file, text)) { same++; continue; }
    const owner = plan.owned.get(file);
    const edited = owner !== undefined && owner !== contentHash(file, now) ? '  (edited locally: the difference is against your edited file)' : '';
    if (BINARY.test(rel)) { files.push([`~ ${rel}  (binary file, differs)${edited}`]); continue; }
    const body = compactDiff(now.toString('utf8'), String(text)).map((line) => (line.length > 160 ? line.slice(0, 157) + '...' : line));
    if (!body.length) { files.push([`~ ${rel}  (line endings only)${edited}`]); continue; }
    const shown = body.slice(0, cap);
    files.push([`~ ${rel}${edited}`, ...shown, ...(body.length > cap ? [`... ${body.length - cap} more lines (--full for all)`] : [])]);
  }
  for (const file of ops.removes) {
    const rel = showPath(file);
    if (fileState(file) !== null && matches(rel)) files.push([`- ${rel}  (would be removed)`]);
  }
  for (const rel of new Set(plan.kept)) if (matches(rel)) files.push([`- ${rel}  (kept, edited locally; a real update does not remove it without --force)`]);
  out.push('', 'FILES');
  if (!files.length) out.push(`  ${hidden && args.component ? `${args.component}'s pulled script would not change.` : 'No pulled file would change.'}`);
  for (const f of files) out.push(...f.map((line, i) => (i === 0 ? '  ' + line : '    ' + line)));
  if (same) out.push('', `${same} file(s) are identical and would not change.`);
  if (hidden) out.push(`${hidden} shared file(s) (theme.css and the like) are not shown with --component.`);
  out.push('', files.length || shownGroups.length ? 'Update with: sel update   (or sel sync). sel plan lists the files without the diff.' : 'The project is current.');
  console.log(out.join('\n'));
}

// ------------------------------------------------------------------ components / component: what the library offers, for people and for agents
/** The leading comment of a source text as plain lines (asterisks and comment marks removed), or ''. */
function leadingComment(text, open, close) {
  const s = String(text || '').trimStart();
  if (!s.startsWith(open)) return '';
  const end = s.indexOf(close, open.length);
  if (end < 0) return '';
  return s.slice(open.length, end).split('\n').map((line) => line.replace(/^\s*\*+\s?/, '').replace(/\s+$/, '')).join('\n').trim();
}
/** What a component says about itself: the leading comment of its script, else of its CSS, else of its HTML (the first one that has one). */
function docOf(c) {
  return leadingComment(c.js, '/*', '*/') || leadingComment(c.css, '/*', '*/') || leadingComment(c.html, '<!--', '-->');
}
/** The first sentence of that description, on one line (at most 140 characters). */
function summaryOf(c) {
  const text = docOf(c).replace(/\s+/g, ' ').trim();
  const sentence = (/^(.*?[.!?])(\s|$)/.exec(text) || [])[1] || text;
  return sentence.length > 140 ? sentence.slice(0, 137).trimEnd() + '...' : sentence;
}

/** Every component of a library version: what elements.json says about its tags and classes plus what components.json holds (markup, script, style). */
async function loadCatalog() {
  const requested = args.version || 'latest';
  const [elements, list] = (await Promise.all([dist(requested, 'elements.json'), dist(requested, 'components.json')])).map((text) => JSON.parse(text));
  const meta = (elements && elements.components) || {};
  return list.map((c) => {
    const m = meta[c.id] || {};
    return { id: c.id, name: c.name || c.id, group: c.group || '', base: c.base || '', summary: c.base === 'bootstrap' ? `${c.name}: the Bootstrap component, styled by the theme (use Bootstrap's own markup)` : summaryOf(c), tags: m.tags || [], classes: m.classes || [], hasJs: !!m.hasJs, hasCss: !!m.hasCss, imports: m.imports || [], html: c.html || '', doc: docOf(c) };
  }).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

/** components [search]: every component with its tag or class and a one-line description, grouped; a search filters on name, group, tags, classes and description. */
async function components() {
  const catalog = await loadCatalog();
  const query = args._.join(' ').toLowerCase().trim();
  const found = catalog.filter((c) => !query || [c.id, c.name, c.group, c.summary, ...c.tags, ...c.classes].join(' ').toLowerCase().includes(query));
  if (args.json) { say(JSON.stringify(found.map(({ html, doc, ...rest }) => rest), null, 2)); return; }
  if (!found.length) { say(`No component matches "${query}" (of ${catalog.length}). sel components lists them all; try a shorter word.`); return; }
  say(`${found.length} of ${catalog.length} components${query ? ` matching "${query}"` : ''} in ${library}:`);
  const width = Math.max(...found.map((c) => c.id.length));
  let group = null;
  for (const c of found) {
    if (c.group !== group) { group = c.group; say(`\n${group || 'Other'}`); }
    const how = c.tags[0] ? `<${c.tags[0]}>` : c.classes[0] ? `.${c.classes[0]}` : '';
    say(`  ${c.id.padEnd(width)}  ${how.padEnd(26)} ${c.summary || c.name}`);
  }
  say('\nsel component <name> shows the markup, the classes, the attributes and the events of one. Use a library component before writing your own.');
}

/** component <name>: how to use one component: its tag and classes, the import, an example of the markup and what it says about itself (attributes, events). */
async function component() {
  if (args._.length !== 1) throw failure('Name one component: sel component <name>. sel components lists them.');
  const name = String(args._[0]);
  const catalog = await loadCatalog();
  const c = catalog.find((x) => x.id === name.toLowerCase()) || catalog.find((x) => x.name.toLowerCase() === name.toLowerCase());
  if (!c) {
    const near = catalog.filter((x) => `${x.id} ${x.name}`.toLowerCase().includes(name.toLowerCase())).map((x) => x.id).slice(0, 6);
    throw failure(`No component called "${name}".${near.length ? ` Did you mean: ${near.join(', ')}?` : ' sel components lists them all.'}`);
  }
  if (args.json) { say(JSON.stringify(c, null, 2)); return; }
  if (args.html) { say(c.html.trim()); return; }
  const out = (lock.elements && lock.elements.out) || DEFAULTS.out;
  const clip = (text, limit) => { const lines = text.split('\n'); return lines.length > limit && !args.full ? [...lines.slice(0, limit), `... (${lines.length - limit} more lines: sel component ${c.id} --full)`].join('\n') : text; };
  say(`${c.name}  (${c.id}, ${c.group || 'no group'}${c.base ? `, ${c.base}` : ''})`);
  say(c.summary ? `\n${c.summary}` : '');
  say('\nHOW TO USE IT');
  if (c.tags.length) say(`  Tag:      ${c.tags.map((t) => `<${t}>`).join(', ')}`);
  if (c.classes.length) say(`  Classes:  ${c.classes.slice(0, args.full ? c.classes.length : 12).map((k) => `.${k}`).join(', ')}${c.classes.length > 12 && !args.full ? `  (+${c.classes.length - 12} more: --full)` : ''}`);
  if (c.hasJs) say(`  Script:   import "<relative path to>/${out}/elements/${c.id}.js"   (defines the element; sel sync adds it when your markup uses it)`);
  if (c.hasCss) say('  Style:    comes with the theme (sel sync pulls the CSS of what your markup uses)');
  if (c.imports.length) say(`  Brings:   ${c.imports.join(', ')}`);
  say(`  Pull it:  sel sync   (or: sel elements ${c.id})`);
  if (c.html.trim()) say(`\nMARKUP (an example; the library's own preview)\n${clip(c.html.trim().replace(/^/gm, '  '), 70)}`);
  if (c.doc) say(`\nWHAT IT SAYS ABOUT ITSELF (attributes, events, behaviour; where it says "the HTML tab", that is the MARKUP above)\n${clip(c.doc.replace(/^/gm, '  '), 40)}`);
}

function status() {
  if (!lock.library) return say('Nothing pulled yet (no sel.lock.json).');
  say(`Library: ${lock.library}   theme: ${lock.theme}${library !== lock.library ? `   (in effect for this command: ${library})` : ''}`);
  if (lock.elements) say(`Elements v${lock.elements.version} -> ${lock.elements.out}: ${lock.elements.components.join(', ')}${lock.elements.icons ? '  (+ icon runtime)' : ''}${lock.elements.iconsExplicit ? ' (asked for with --icons)' : ''}`);
  if (lock.only) say(`Adopted with --only: ${lock.only.join(', ')}`);
  if (lock.keep) say(`Kept with --also: ${lock.keep.join(', ')}`);
  if (lock.theme_files) say(`Theme v${lock.theme_files.version} -> ${lock.theme_files.out} (CSS of ${lock.theme_files.components.length} components)`);
  if (lock.component_css) say(`Component CSS v${lock.component_css.version} -> ${lock.component_css.out}/components.css (${lock.component_css.components.length} components)`);
  if (lock.rules) say(`Rules: ${Object.entries(lock.rules.files || {}).map(([p, v]) => `${p} (rev ${v.rev})`).join(', ')}${lock.rules.sets ? `   sets: ${lock.rules.sets.join(', ')}` : ''}`);
  if (lock.firebase_dev) say(`Dev scripts -> ${lock.firebase_dev.out}: ${Object.keys(lock.firebase_dev.files).join(', ')} (pulled ${lock.firebase_dev.pulledAt})`);
  const working = [lock.elements, lock.theme_files, lock.component_css].filter((x) => x && String(x.version).endsWith('+working'));
  if (working.length) say('Note: some of this came from the library\'s UNCOMMITTED working copy (+working): commit a version there and pull again.');
  if (lock.client) say(`This script: sha256 ${String(lock.client.sha256).slice(0, 12)} (updated ${lock.client.updatedAt})`);
}

/**
 * Replaces this script with the library's newest, but only with one that is a complete sel-pull that parses and starts: the file is written
 * beside the script, checked, and renamed over it. A library that answers with an error page, an empty body or a broken file changes nothing.
 */
async function selfUpdate() {
  let mine;
  // The project's own script is what gets replaced. This copy may be a temporary one the launcher fetched from the library (an old project script
  // cannot read a hosted library, so the library's newest runs the update for it).
  const projectScript = path.resolve('scripts', 'sel-pull.mjs');
  try { mine = fs.existsSync(projectScript) ? projectScript : fileURLToPath(import.meta.url); fs.accessSync(mine); } catch {
    throw new Error('self-update replaces scripts/sel-pull.mjs in a project, and this copy is not running from a file (it was piped into node). Run init to install the script first.');
  }
  observe(mine);
  const text = await fetchText(`${library}/client/sel-pull.mjs`);
  if (!text.trim()) throw new Error('The library sent an empty file: nothing was changed.');
  if (/^\s*<(!doctype|html)/i.test(text)) throw new Error('The library sent a web page instead of sel-pull (is the address right?): nothing was changed.');
  if (!text.startsWith('// sel-pull:')) throw new Error('What the library sent does not look like sel-pull (its first line is not "// sel-pull:"): nothing was changed.');
  if (text === fs.readFileSync(mine, 'utf8')) return say('sel-pull is already the library\'s newest.');
  const temporary = path.join(path.dirname(mine), `.sel-pull-update-${process.pid}.mjs`);
  try {
    fs.writeFileSync(temporary, text);
    const syntax = spawnSync(process.execPath, ['--check', temporary], { encoding: 'utf8', timeout: 10000 });
    if (syntax.status !== 0) throw new Error(`The new sel-pull does not parse (${String(syntax.stderr || '').split('\n').find((l) => l.trim()) || 'syntax error'}): nothing was changed.`);
    const smoke = spawnSync(process.execPath, [temporary, 'help'], { encoding: 'utf8', cwd: os.tmpdir(), timeout: 10000 });
    if (smoke.status !== 0 || !/sel-pull/.test(smoke.stdout || '')) throw new Error('The new sel-pull does not start: nothing was changed.');
    write(path.dirname(mine), path.basename(mine) + '.prev', fs.readFileSync(mine), { project: true });
    write(path.dirname(mine), path.basename(mine), text, { project: true });
    // the previous script is a backup, not project source: keep it out of git (only where the project already has a .gitignore)
    const prevRel = showPath(mine) + '.prev';
    const ignore = projectText('.gitignore', null);
    if (ignore !== null && !prevRel.startsWith('..') && !ignore.split(/\r?\n/).some((l) => l.trim() === prevRel)) {
      write('.', '.gitignore', ignore + (ignore && !ignore.endsWith('\n') ? '\n' : '') + prevRel + '\n', { project: true });
    }
  } finally {
    fs.rmSync(temporary, { force: true });
  }
  if (fs.existsSync(LOCK_FILE)) {
    lock.client = { sha256: sha(text), updatedAt: new Date().toISOString() };
    commitLock();
  }
  say('sel-pull updated.');
}

// ------------------------------------------------------------------ report: which components this project uses, told to the hosted library
/** The project's name for the report: package.json "name", else the folder name. */
function reportProjectName() {
  try { const name = JSON.parse(fs.readFileSync('package.json', 'utf8')).name; if (typeof name === 'string' && name.trim()) return name.trim(); } catch { /* none */ }
  return path.basename(process.cwd());
}

/** The record sent to libUsage: names, versions and the signed-in e-mail of the reporter; no paths. */
function usageRecord(hosted, reporter) {
  const components = {};
  const versions = {};
  for (const [key, section] of [['elements', lock.elements], ['theme', lock.theme_files], ['componentCss', lock.component_css]]) {
    if (!section) continue;
    if (section.version) versions[key] = String(section.version);
    for (const id of section.components || []) if (!(id in components)) components[id] = String(section.version || '');
  }
  const name = reportProjectName().toLowerCase().replace(/[^a-z0-9._-]/g, '-').slice(0, 80) || 'project';
  const record = { project: name, reporter, reportedAt: new Date().toISOString(), library: `firebase://${hosted.project}` };
  if (lock.mode) record.mode = String(lock.mode);
  record.versions = versions;
  record.components = components;
  record.clientVersion = CLIENT_VERSION;
  return record;
}

/**
 * Tells the hosted library which components this project uses (after a successful sync or elements, or sel-pull report). Best effort: unless `explicit`,
 * nothing here can fail the command; it says in one line what happened. Returns quietly when there is nothing to report to.
 */
async function reportUsage({ explicit = false, remove = false } = {}) {
  let hosted = null;
  try { hosted = hostedParse(library); } catch { /* not a usable address */ }
  if (!hosted) {
    if (explicit) throw failure('report sends to a hosted library (firebase://<project>); this project\'s library is not one. Nothing was sent.');
    return;
  }
  const reporter = hostedReporter(hosted.project);
  if (!reporter) {
    if (explicit) throw failure(`The e-mail of the signed-in person is not known (run: ${hostedLoginCommand(hosted.project)}; with SEL_ID_TOKEN also set SEL_ID_EMAIL). Nothing was sent.`);
    return;
  }
  if (!remove && !lock.elements && !lock.theme_files && !lock.component_css) {
    if (explicit) throw failure('Nothing is pulled in this project yet (no sel.lock.json): run sel sync first. Nothing was sent.');
    return;
  }
  const record = usageRecord(hosted, reporter);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    await hostedUsageWrite(hosted.project, hostedUsageId(record.project, reporter), remove ? null : record, controller.signal);
    const count = Object.keys(record.components).length;
    console.log(remove ? `Usage report of ${record.project} removed from the library.` : `Usage reported to the library: ${count} component${count === 1 ? '' : 's'} in ${record.project} (sel ${command} --no-report turns this off).`);
  } catch (e) {
    const why = e && e.name === 'AbortError' ? 'no answer in 15 seconds' : (e && e.message) || String(e);
    if (explicit) throw failure(`Could not report usage: ${why}`);
    console.log(`Could not report usage: ${why}`);
  } finally { clearTimeout(timer); }
}

/** After a successful sync or elements run: report, unless it was switched off. */
async function reportAfterPull() {
  if (planning || args['no-report'] || process.env.SEL_NO_REPORT === '1' || process.exitCode) return;
  try { await reportUsage(); } catch (e) { console.log(`Could not report usage: ${e.message}`); }
}

// ------------------------------------------------------------------ release: CHANGELOG.md to the Aperam App Store (Firestore REST, no dependencies)
const RELEASE_DEFAULT_PROJECT = 'app-store-jewo';
const RELEASE_KEY_FILE = 'service-account-appstore.json';
const RELEASE_MAX_FILE = 1024 * 1024; // CHANGELOG.md and package.json
const RELEASE_MAX_KEY = 100 * 1024; // a service account key file
const RELEASE_MAX_ANSWER = 8 * 1024 * 1024; // one answer of Google
const RELEASE_BATCH = 450; // writes in one commit (Firestore allows 500)
const RELEASE_NO_CREDENTIALS = [
  'No Google credentials to push with. Two ways to fix it:',
  '  1. gcloud auth application-default login   with an account that has the Cloud Datastore User role on the App Store project (recommended: no key file)',
  `  2. a service account key of that project, saved as ./${RELEASE_KEY_FILE} (never commit it)`,
].join('\n');

/** A file of the project read as text: inside the project by real path, a regular file, not larger than `max`. Returns { real, text }. */
function releaseReadFile(file, label, max) {
  if (!insideProject(file)) throw failure(`${label} (${file}) is outside the project, or a link leads out of it. sel release only reads and writes files inside the project. Nothing was changed.`);
  let real;
  let stat;
  try { real = fs.realpathSync(file); stat = fs.statSync(real); } catch { throw failure(`${label} (${file}) was not found. Nothing was changed.`); }
  if (!stat.isFile()) throw failure(`${label} (${file}) is not a file. Nothing was changed.`);
  if (stat.size > max) throw failure(`${label} (${file}) is larger than ${Math.round(max / 1024)} KB, which is more than sel release reads. Nothing was changed.`);
  return { real, text: fs.readFileSync(real, 'utf8') };
}

/** One answer of Google as text, stopped when it is larger than expected. */
async function releaseAnswer(res) {
  const chunks = [];
  let size = 0;
  for await (const chunk of res.body || []) {
    size += chunk.length;
    if (size > RELEASE_MAX_ANSWER) throw failure('The answer of Google was larger than expected; stopped. Nothing was changed.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
const releaseWhy = (e) => (e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'no answer in 30 seconds' : (e && e.message) || String(e));

/** A service account key file -> an access token (a signed JWT exchanged at Google's token endpoint). Returns { token, domain }. Nothing of the key is ever printed. */
async function releaseServiceAccount(file, label) {
  let real;
  let stat;
  try { real = fs.realpathSync(file); stat = fs.statSync(real); } catch { throw failure(`${label}: the key file ${file} does not exist.`); }
  if (!stat.isFile()) throw failure(`${label}: ${file} is not a file.`);
  if (stat.size > RELEASE_MAX_KEY) throw failure(`${label}: ${file} is larger than ${RELEASE_MAX_KEY / 1024} KB, so it is not a service account key.`);
  let key;
  try { key = JSON.parse(fs.readFileSync(real, 'utf8')); } catch { throw failure(`${label}: ${file} is not valid JSON, so it is not a service account key.`); }
  if (!key || typeof key.client_email !== 'string' || typeof key.private_key !== 'string' || !/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(key.private_key)) throw failure(`${label}: ${file} is not a service account key (it needs client_email and private_key).`);
  const domain = /^[a-z0-9.-]+$/i.test(key.client_email.split('@')[1] || '') ? key.client_email.split('@')[1] : 'an unknown service account';
  const b64 = (x) => Buffer.from(x).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iss: key.client_email, sub: key.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  let signature;
  try { signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url'); } catch { throw failure(`${label}: the private key in ${file} cannot be used to sign.`); }
  let res;
  let body;
  try {
    res = await fetch(hostedEndpoint('SEL_APPSTORE_TOKEN_ENDPOINT', 'https://oauth2.googleapis.com/token'), {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(`${unsigned}.${signature}`)}`,
      signal: AbortSignal.timeout(30000),
    });
    body = JSON.parse(await releaseAnswer(res));
  } catch (e) { if (e.exitCode) throw e; throw failure(`${label}: could not get a token from Google (${releaseWhy(e)}).`); }
  if (!res.ok || typeof body.access_token !== 'string' || !/^[\x21-\x7e]{1,4096}$/.test(body.access_token)) {
    const code = typeof body.error === 'string' && /^[a-z_]{1,40}$/.test(body.error) ? ` (${body.error})` : '';
    throw failure(`${label}: Google did not accept the service account key${code}. It may have been deleted or disabled; make a new key, or use gcloud auth application-default login.`);
  }
  return { token: body.access_token, domain };
}

/** The access token to push with, and where it came from: { token, source }. The first that is there wins; one that is there but broken stops with its own reason. */
async function releaseCredentials() {
  const fromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (fromEnv) {
    const got = await releaseServiceAccount(fromEnv, 'GOOGLE_APPLICATION_CREDENTIALS');
    return { token: got.token, source: `GOOGLE_APPLICATION_CREDENTIALS (a service account of ${got.domain})` };
  }
  if (fs.existsSync(RELEASE_KEY_FILE)) {
    const ignored = spawnSync('git', ['check-ignore', '-q', RELEASE_KEY_FILE], { stdio: 'ignore', windowsHide: true });
    if (ignored.status === 1) console.log(`Warning: ./${RELEASE_KEY_FILE} is not ignored by git. Add service-account*.json to .gitignore so the key is never committed.`);
    const got = await releaseServiceAccount(RELEASE_KEY_FILE, `./${RELEASE_KEY_FILE}`);
    return { token: got.token, source: `./${RELEASE_KEY_FILE} (a service account of ${got.domain})` };
  }
  const given = process.env.SEL_APPSTORE_TOKEN;
  if (given) {
    if (!/^[\x21-\x7e]{1,4096}$/.test(given)) throw failure('SEL_APPSTORE_TOKEN is not an access token (it must be one line of plain characters).');
    return { token: given, source: 'SEL_APPSTORE_TOKEN (a ready access token)' };
  }
  const r = spawnSync('gcloud auth application-default print-access-token', { encoding: 'utf8', shell: true, timeout: 30000, windowsHide: true });
  const token = String(r.stdout || '').trim();
  if (r.status === 0 && /^[\x21-\x7e]{1,4096}$/.test(token)) return { token, source: 'gcloud application-default credentials' };
  throw failure(RELEASE_NO_CREDENTIALS);
}

/** One call to the Firestore REST API. Retries once with the quota project header when Google asks for it. Returns { ok, status, json }. */
async function releaseCall(ctx, method, url, body) {
  for (let attempt = 0; ; attempt++) {
    let res;
    let text;
    try {
      res = await fetch(url, {
        method,
        headers: { authorization: `Bearer ${ctx.token}`, ...(body ? { 'content-type': 'application/json' } : {}), ...(ctx.userProject ? { 'x-goog-user-project': ctx.project } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });
      text = await releaseAnswer(res);
    } catch (e) { if (e.exitCode) throw e; throw failure(`Could not reach the App Store database (${releaseWhy(e)}). Nothing was changed.`); }
    let json = {};
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    if (!res.ok && res.status === 403 && !ctx.userProject && attempt === 0 && /quota project|SERVICE_DISABLED|has not been used in project|API has not been enabled/i.test(JSON.stringify(json.error || {}))) { ctx.userProject = true; continue; }
    return { ok: res.ok, status: res.status, json };
  }
}
/** The plain sentence for an answer of Google that is not a success. */
function releaseRefusal(ctx, status) {
  if (status === 401) return `Google refused the credentials (HTTP 401): the ${ctx.source.split(' (')[0]} is expired or not valid. Sign in again with gcloud auth application-default login, or use a new key.`;
  if (status === 403) return `This account may not write to ${ctx.project}: it needs the Cloud Datastore User role (or be a service account of that project).`;
  if (status === 404) return `The App Store project ${ctx.project} or its database was not found (HTTP 404). Check --project.`;
  if (status === 429) return 'Google says there are too many requests (HTTP 429): wait a minute and try again.';
  if (status >= 500) return `Google answered HTTP ${status}: try again in a minute.`;
  return `Google answered HTTP ${status}.`;
}
const releaseText = (field) => (field && typeof field.stringValue === 'string' ? field.stringValue : null);
/** The changelog documents the App Store holds for an app: Map id -> { version, notes, dateMs }, and the latestVersion of the app. */
async function releaseRemote(ctx, app) {
  const db = `${ctx.base}/v1/projects/${encodeURIComponent(ctx.project)}/databases/(default)/documents`;
  const appDoc = await releaseCall(ctx, 'GET', `${db}/apps/${encodeURIComponent(app)}`);
  if (!appDoc.ok && appDoc.status !== 404) throw failure(releaseRefusal(ctx, appDoc.status));
  const latest = appDoc.ok ? releaseText((appDoc.json.fields || {}).latestVersion) : null;
  const remote = new Map();
  let token = '';
  for (let page = 0; page < 50; page++) {
    const listed = await releaseCall(ctx, 'GET', `${db}/apps/${encodeURIComponent(app)}/changelog?pageSize=300${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
    if (!listed.ok) throw failure(releaseRefusal(ctx, listed.status));
    for (const doc of Array.isArray(listed.json.documents) ? listed.json.documents : []) {
      const id = decodeURIComponent(String(doc.name || '').split('/').pop());
      const fields = doc.fields || {};
      const date = fields.date && typeof fields.date.timestampValue === 'string' ? Date.parse(fields.date.timestampValue) : NaN;
      const values = fields.notes && fields.notes.arrayValue && Array.isArray(fields.notes.arrayValue.values) ? fields.notes.arrayValue.values : [];
      remote.set(id, { version: releaseText(fields.version), notes: values.map((v) => releaseText(v) ?? ''), dateMs: Number.isNaN(date) ? null : date });
    }
    token = typeof listed.json.nextPageToken === 'string' ? listed.json.nextPageToken : '';
    if (!token) return { remote, latest };
  }
  throw failure('The App Store holds more changelog entries for this app than expected (over 15000). Nothing was changed.');
}
/** The writes of a plan, in commit-sized batches: new and changed entries, removals, and last of all the latest version. */
function releaseWrites(ctx, app, plan, prune, now) {
  const root = `projects/${ctx.project}/databases/(default)/documents/apps/${app}`;
  const writes = [];
  for (const item of [...plan.creates, ...plan.updates]) {
    const withDate = item.dateMs !== null || plan.creates.includes(item);
    const fields = { version: { stringValue: item.version }, notes: { arrayValue: { values: item.notes.map((stringValue) => ({ stringValue })) } } };
    if (withDate) fields.date = { timestampValue: new Date(item.dateMs !== null ? item.dateMs : now).toISOString() };
    writes.push({ update: { name: `${root}/changelog/${item.id}`, fields }, updateMask: { fieldPaths: Object.keys(fields) } });
  }
  if (prune) for (const id of plan.removals) writes.push({ delete: `${root}/changelog/${id}` });
  if (plan.latestChanged) writes.push({ update: { name: root, fields: { latestVersion: { stringValue: plan.latest } } }, updateMask: { fieldPaths: ['latestVersion'] } });
  const batches = [];
  for (let i = 0; i < writes.length; i += RELEASE_BATCH) batches.push(writes.slice(i, i + RELEASE_BATCH));
  return batches;
}

/** git for --commit: only the two files, never a push, a tag or a change of the configuration. Returns the error text, or null when it worked. */
function releaseGit(args2, label) {
  const r = spawnSync('git', args2, { encoding: 'utf8', windowsHide: true });
  if (r.error) return `${label}: git could not be run (${r.error.code === 'ENOENT' ? 'git is not installed' : r.error.message}).`;
  if (r.status !== 0) return `${label} failed: ${String(r.stderr || r.stdout).trim().split('\n').slice(0, 3).join(' | ')}`;
  return null;
}
const releaseToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** sel release [version]: gives the unreleased notes a version (CHANGELOG.md, package.json), then mirrors the changelog into the App Store. */
async function release() {
  const say2 = (text = '') => console.log(text);
  if (args._.length > 1) throw failure('sel release takes at most one argument, the new version (sel release 1.6.0). Nothing was changed.');
  if (args.prune && args['no-prune']) throw failure('--prune and --no-prune cannot be used together. Nothing was changed.');
  const version = args._[0] || null;
  if (version !== null && !RELEASE_VERSION.test(version)) throw failure(`"${version}" is not a plain dotted version (1.6.0, 2.0, 1.2.3.4). Nothing was changed.`);
  if (args.commit && !version) throw failure('--commit needs a version: sel release 1.6.0 --commit. Nothing was changed.');

  const project = args.project || process.env.SEL_APPSTORE_PROJECT || RELEASE_DEFAULT_PROJECT;
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) throw failure(`"${project}" is not a Firebase project id. Nothing was changed.`);

  const packageFile = releaseReadFile('package.json', 'package.json', RELEASE_MAX_FILE);
  let packageJson;
  try { packageJson = JSON.parse(packageFile.text.replace(/^﻿/, '')); } catch { throw failure('package.json is not valid JSON. Nothing was changed.'); }
  const app = args.app !== undefined ? args.app : (packageJson && typeof packageJson.name === 'string' ? packageJson.name : '');
  if (!/^[a-z0-9][a-z0-9._-]{0,99}$/.test(app) || app.includes('..')) {
    throw failure(`${args.app !== undefined ? '--app' : 'The "name" in package.json'} (${JSON.stringify(app)}) is not an App Store app id (lower case letters, digits, . _ - only, at most 100 characters). ${args.app !== undefined ? '' : 'Set "name" to the app id shown on the App Store Settings page, or pass --app <id>. '}Nothing was changed.`);
  }

  const changelogName = args.changelog || 'CHANGELOG.md';
  const changelogFile = releaseReadFile(changelogName, args.changelog ? '--changelog' : 'CHANGELOG.md', RELEASE_MAX_FILE);
  const planOnly = !!args.plan;

  // 1. the local part: what the file says, and what giving the unreleased notes a version would do to the files
  let text = changelogFile.text;
  let edit = null;
  let packageEdit = null;
  const unreleased = splitUnreleased(text);
  say2(`sel release: ${app} -> App Store project ${project}`);
  if (version) {
    const prepared = prepareRelease(text, version, releaseToday());
    if (!prepared.ok) throw failure(`${prepared.error} Nothing was changed.`);
    edit = prepared;
    text = prepared.text;
    packageEdit = bumpPackageVersion(packageFile.text, version);
    say2(`${changelogName}: ${planOnly ? 'would add' : 'adds'} "## [${version}] - ${releaseToday()}" above ${prepared.notes.length} unreleased note${prepared.notes.length === 1 ? '' : 's'}`);
    if (packageEdit) say2(`package.json: version ${packageEdit.old} -> ${version}`);
    else say2('package.json: no "version" text field, so it is left as it is');
    if (args.commit) say2(`git: ${planOnly ? 'would commit' : 'commits'} ${changelogName}${packageEdit ? ' and package.json' : ''} as "Release ${version}" (no push, no tag)`);
  }
  const entries = parseChangelog(text);
  const bad = checkReleaseEntries(entries);
  if (bad.length) throw failure(`${bad.join('\n')}\nNothing was changed.`);
  const newest = entries.length ? entries.reduce((best, e) => (compareVersions(e.version, best.version) > 0 ? e : best)).version : null;
  if (!entries.length) {
    say2(`${changelogName}: no version with notes in it, nothing to push.`);
    if (unreleased.length && !version) say2(`Not pushed: ${unreleased.length} unreleased note${unreleased.length === 1 ? '' : 's'}. Give them a version: sel release <version>`);
    return;
  }
  say2(`${changelogName}: ${entries.length} version${entries.length === 1 ? '' : 's'} with notes, newest ${newest}`);

  // the guard against a long leftover block becoming one huge entry: the entry this run creates is checked now, before anything is written
  const overLong = (e) => releaseProblems(e).over;
  const refuseLong = (list) => {
    if (!list.length) return;
    const lines = list.map((e) => `  ${describeProblems(e.version, releaseProblems(e))}`);
    if (args['allow-long']) { say2(`Warning (--allow-long): ${list.length === 1 ? 'an entry is' : 'entries are'} over the limits of a release entry:\n${lines.join('\n')}`); return; }
    throw failure(`Refused: ${list.length === 1 ? 'a release entry is' : 'release entries are'} over the limits of ${RELEASE_LIMITS.notes} notes, ${RELEASE_LIMITS.chars} characters in all and ${RELEASE_LIMITS.note} characters per note:\n${lines.join('\n')}\nSplit the notes over several versions (one sel release <version> for each batch of notes), or write them as shorter bullets, then run this again. --allow-long pushes them anyway. Nothing was written, neither the files nor the App Store.`);
  };
  if (version) refuseLong(entries.filter((e) => e.version === version && overLong(e)));

  // 2. the credentials and the App Store's side: needed to build the plan
  const ctx = { project, base: hostedEndpoint('SEL_APPSTORE_ENDPOINT', 'https://firestore.googleapis.com'), token: '', source: '', userProject: false };
  let state;
  try {
    const got = await releaseCredentials();
    ctx.token = got.token;
    ctx.source = got.source;
    say2(`credentials: ${ctx.source}`);
    state = await releaseRemote(ctx, app);
  } catch (e) {
    if (!(planOnly && e.exitCode)) throw e;
    say2('');
    say2(`The App Store's side cannot be shown: ${e.message}`);
    process.exitCode = 1;
    return;
  }
  const plan = planChangelogPush(entries, state.remote, state.latest);
  refuseLong([...plan.creates, ...plan.updates].filter((e) => !(version && e.version === version) && overLong(e)));

  say2('');
  const order = (list) => list.slice().sort((a, b) => compareVersions(b.version, a.version));
  for (const e of order(plan.creates)) say2(`  + ${e.version} (new, ${e.notes.length} note${e.notes.length === 1 ? '' : 's'}${e.dateMs !== null ? `, ${new Date(e.dateMs).toISOString().slice(0, 10)}` : ''})`);
  for (const e of order(plan.updates)) say2(`  ~ ${e.version} (notes changed)`);
  if (plan.same.length) say2(`  = ${plan.same.length} unchanged`);
  const existing = state.remote.size;
  const refusePrune = !args['no-prune'] && !args.prune && plan.removals.length > 0 && (plan.removals.length === existing || plan.removals.length > existing / 2);
  for (const id of plan.removals) say2(`  - ${(state.remote.get(id) || {}).version || id} (${args['no-prune'] ? 'no longer in the file, kept: --no-prune' : 'no longer in the file'})`);
  say2(plan.latestChanged ? `latest: ${state.latest || '(none)'} -> ${plan.latest}` : `latest: ${plan.latest} (unchanged)`);
  if (!version && unreleased.length) say2(`Not pushed: ${unreleased.length} unreleased note${unreleased.length === 1 ? '' : 's'}. Give them a version: sel release <version>`);

  if (refusePrune) throw failure(`Refused: this would delete ${plan.removals.length === existing ? 'every' : `${plan.removals.length} of the ${existing}`} changelog entr${existing === 1 ? 'y' : 'ies'} of ${app} that the App Store holds (${plan.removals.length} not in ${changelogName}). If the file is the truth, run it again with --prune; --no-prune keeps them. Nothing was written.`);
  const doPrune = !args['no-prune'];
  const writes = plan.creates.length + plan.updates.length + (doPrune ? plan.removals.length : 0) + (plan.latestChanged ? 1 : 0);
  if (!writes && !edit) { say2('Nothing to push: the App Store already has this.'); return; }
  if (planOnly) { say2(''); say2('Plan only (--plan): nothing was written.'); return; }

  if (args.commit) {
    const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8', windowsHide: true });
    if (inside.error || inside.status !== 0 || inside.stdout.trim() !== 'true') throw failure(`--commit needs git and a git repository here (${inside.error ? 'git is not installed' : 'this folder is not in one'}). Nothing was changed.`);
  }

  // 3. confirm, write the files, commit, push
  if (!args.yes) {
    if (!process.stdin.isTTY) throw failure('There is no terminal to ask at, so nothing was written. Add --yes to push without being asked (--plan only shows).');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('\nType yes to push: ');
    rl.close();
    if (answer.trim().toLowerCase() !== 'yes') { say2('Nothing was written.'); process.exitCode = 1; return; }
  }
  if (edit) {
    const written = [];
    try {
      writeAtomic(changelogFile.real, text);
      written.push([changelogFile.real, changelogFile.text]);
      if (packageEdit) { writeAtomic(packageFile.real, packageEdit.text); written.push([packageFile.real, packageFile.text]); }
    } catch (e) {
      for (const [file, original] of written.reverse()) { try { writeAtomic(file, original); } catch { /* reported below */ } }
      throw failure(`Could not write ${changelogName} / package.json (${e.message}). They were put back as they were. Nothing was pushed.`);
    }
    say2(`Wrote ${changelogName}${packageEdit ? ' and package.json' : ''}.`);
    if (args.commit) {
      const paths = [path.relative(process.cwd(), changelogFile.real), ...(packageEdit ? [path.relative(process.cwd(), packageFile.real)] : [])];
      const problem = releaseGit(['add', '--', ...paths], 'git add') || releaseGit(['commit', '-m', `Release ${version}`, '--', ...paths], 'git commit');
      if (problem) throw failure(`${problem}\nThe files are written (${paths.join(', ')}); the push to the App Store did not run. Commit by hand, then run sel release to push.`);
      say2(`Committed "Release ${version}" (only ${paths.join(' and ')}; not pushed to any git remote).`);
    }
  }
  const now = Date.now();
  const batches = releaseWrites(ctx, app, plan, doPrune, now);
  const db = `${ctx.base}/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents:commit`;
  for (const [i, batch] of batches.entries()) {
    const sent = await releaseCall(ctx, 'POST', db, { writes: batch });
    if (!sent.ok) throw failure(`${releaseRefusal(ctx, sent.status)}${i ? ` The first ${i} of ${batches.length} batches were written; run sel release again to finish.` : ' Nothing was pushed.'}`);
  }
  say2(`Pushed ${plan.creates.length + plan.updates.length} changelog entr${plan.creates.length + plan.updates.length === 1 ? 'y' : 'ies'} for "${app}"${doPrune && plan.removals.length ? `, removed ${plan.removals.length} stale` : ''}. Latest: ${plan.latest}.`);
}

/** The usage text: the header comment of this file (when it runs from a file; piped into node there is none to read). */
function help() {
  try {
    const lines = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n');
    const header = [];
    for (const line of lines) { if (!line.startsWith('//')) break; header.push(line.replace(/^\/\/ ?/, '')); }
    return header.join('\n');
  } catch {
    return 'sel-pull: init | sync | elements | rules | check | status | changes | doctor | propose | firebase-rules | report | self-update  (see scripts/sel-pull.mjs, or the Getting started page of the library)';
  }
}

try {
  if (command === 'init') await init();
  else if (command === 'sync') { await transaction(sync); await reportAfterPull(); }
  else if (command === 'elements') { await transaction(() => pullElements()); await reportAfterPull(); }
  else if (command === 'report') await reportUsage({ explicit: true, remove: !!args.remove });
  else if (command === 'rules') await transaction(pullRules);
  else if (command === 'firebase') await transaction(firebaseDev);
  else if (command === 'users') await transaction(pullUsers);
  else if (command === 'check') await check();
  else if (command === 'status') status();
  else if (command === 'changes') await changes();
  else if (command === 'components') await components();
  else if (command === 'component') await component();
  else if (command === 'search') await search();
  else if (command === 'diff') await diff();
  else if (command === 'release') await release();
  else if (command === 'propose') await transaction(propose);
  else if (command === 'firebase-rules') await firebaseRules();
  else if (command === 'doctor') await doctor();
  else if (command === 'self-update') await transaction(selfUpdate);
  else say(help());
} catch (e) {
  console.error('sel-pull: ' + e.message);
  process.exitCode = e.exitCode || 1;
}
