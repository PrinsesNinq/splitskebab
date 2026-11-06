// This project's demo data for the local emulators (npm run dev:seed, and the first npm run dev). Yours to edit: grow it with the app,
// small and known, covering every case worth checking by hand (each role, data only some people may see, empty states, long texts).
// Returns { docs: [{ path, data }], people: [{ email, displayName, note }] }; see docs/sel-firebase-dev.md.
import fs from "node:fs";

// The domain and the bootstrap account, as the app has them (js/config.js is browser code, so it is read, not imported).
const config = fs.readFileSync(new URL("../public/js/config.js", import.meta.url), "utf8");
const DOMAIN = config.match(/ALLOWED_DOMAIN = "([^"]+)"/)[1];
const BOOTSTRAP_ADMIN = config.match(/BOOTSTRAP_ADMIN_EMAIL = "([^"]+)"/)[1];

export default function seed() {
  const ADMIN = `admin.test@${DOMAIN}`;
  const USER = `user.test@${DOMAIN}`;
  const people = [
    { email: BOOTSTRAP_ADMIN, displayName: "Bootstrap Admin", note: "admin (the bootstrap account)" },
    { email: ADMIN, displayName: "Admin Test", note: "admin" },
    { email: USER, displayName: "User Test", note: "a normal user" },
    { email: "outsider@gmail.com", displayName: "Outsider", note: `not @${DOMAIN}: sign-in is refused` },
  ];
  const PLANNED = `new.colleague@${DOMAIN}`; // added by an admin, has not signed in yet
  const docs = [
    { path: "settings/admins", data: { emails: [BOOTSTRAP_ADMIN.toLowerCase(), ADMIN] } },
    { path: "settings/groups", data: { names: ["Editors", "Reviewers"] } },
    ...people.filter((p) => p.email.endsWith(`@${DOMAIN}`)).map((p) => ({ path: `userProfiles/${p.email.toLowerCase()}`, data: { displayName: p.displayName, photoUrl: null } })),
    { path: `users/${ADMIN}`, data: { groups: ["Editors", "Reviewers"] } },
    { path: `users/${USER}`, data: { groups: ["Editors"] } },
    { path: `users/${PLANNED}`, data: { groups: ["Reviewers"] } },
  ];
  // The company's users and groups (node scripts/sel-pull.mjs users puts them in .sel/directory.json, outside public/), when there are some:
  // their groups and members, so the board has real names to drag. Admins are not copied: the emulator has its own.
  const file = new URL("../.sel/directory.json", import.meta.url);
  if (fs.existsSync(file)) {
    const directory = JSON.parse(fs.readFileSync(file, "utf8"));
    const groups = docs.find((d) => d.path === "settings/groups").data;
    groups.names = [...new Set([...groups.names, ...directory.groups])];
    for (const u of directory.users.filter((x) => x.email.endsWith(`@${DOMAIN}`) && !docs.some((d) => d.path === `users/${x.email}`))) {
      docs.push({ path: `users/${u.email}`, data: { name: u.name, groups: u.groups } });
    }
  }
  return { docs, people };
}
