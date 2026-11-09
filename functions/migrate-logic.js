// The one-time move from emails to uids as people's ids (functions/migrate.js runs it): pure functions that rewrite one document, given
// a mapper from an old id to a new one. tests/migrate.test.js checks them. Anything that is not an email (a uid already, a guest id
// "guest:<id>") is kept as it is, so running it twice changes nothing; an email with no Google account behind it (someone an admin added
// who never signed in) maps to null and is dropped from lists.

export const isEmail = (v) => typeof v === "string" && v.includes("@");

/** A mapper: email -> uid (from map, lowercase keys), anything else unchanged; null for an email without an account. */
export function makeMapper(map) {
  return (v) => (isEmail(v) ? map.get(v.toLowerCase()) ?? null : v);
}

const list = (v) => (Array.isArray(v) ? v : []);
/** A list of ids, mapped, without the ones that could not be mapped, without doubles. */
export const mapList = (v, m) => [...new Set(list(v).map(m).filter((x) => typeof x === "string" && x))];
/** A map keyed by ids ({ [id]: value }), with mapped keys; entries whose key cannot be mapped are dropped. */
export function mapKeys(obj, m) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) { const id = m(k); if (id) out[id] = v; }
  return out;
}

const VALID = /^[^\s@|>]+@[^\s@|>]+\.[^\s@|>]+$/;
/** The emails in one string: itself, or the parts of a pair ("a>b" settled, "a|b" chat and friendship ids). Only valid addresses. */
const emailsOf = (s) => s.split(/[|>]/).map((x) => x.trim().toLowerCase()).filter((x) => VALID.test(x));

/** Every email in a value (strings, lists, map keys, nested), for looking up their uids in one go: valid addresses only (the lookup
 *  refuses anything else, and one refusal would stop the whole move). */
export function emailsIn(value, out = new Set()) {
  if (isEmail(value)) emailsOf(value).forEach((e) => out.add(e));
  else if (Array.isArray(value)) value.forEach((v) => emailsIn(v, out));
  else if (value && typeof value === "object" && !(typeof value.toDate === "function")) {
    for (const [k, v] of Object.entries(value)) { if (isEmail(k)) emailsOf(k).forEach((e) => out.add(e)); emailsIn(v, out); }
  }
  return out;
}

export function remapCircle(d, m) {
  const members = mapList(d.members, m);
  const owner = m(d.owner);
  return { ...d, members, admins: mapList(d.admins, m), owner: owner && members.includes(owner) ? owner : members[0] || "" };
}

const settleSide = (side, m) => (side.startsWith("guest:") ? side : m(side));

export function remapMeal(d, m) {
  const out = {
    ...d,
    host: m(d.host) || "",
    viewers: mapList(d.viewers, m),
    participants: mapList(d.participants, m),
    declined: mapList(d.declined, m),
  };
  if ("invited" in d) out.invited = mapList(d.invited, m);
  if ("costs" in d) out.costs = mapKeys(d.costs, m);
  if ("declineReasons" in d) out.declineReasons = mapKeys(d.declineReasons, m);
  if (Array.isArray(d.settled)) {
    out.settled = [...new Set(d.settled.map((s) => {
      if (typeof s !== "string") return null;
      if (!s.includes(">")) return settleSide(s, m); // the older format: the eater who paid back
      const [from, to] = s.split(">");
      const a = settleSide(from, m);
      const b = settleSide(to, m);
      return a && b ? `${a}>${b}` : null;
    }).filter(Boolean))];
  }
  if (d.cost && typeof d.cost === "object") {
    const paidBy = m(d.cost.paidBy);
    out.cost = paidBy ? { ...d.cost, paidBy } : null;
  }
  return out;
}

/** A friendship: its new id and data, or null when one of the two has no account. */
export function remapFriendship(d, m) {
  const users = mapList(d.users, m).sort();
  if (users.length !== 2) return null;
  const requester = m(d.requester);
  return { id: `${users[0]}|${users[1]}`, data: { ...d, users, requester: users.includes(requester) ? requester : users[0] } };
}

/** A conversation: its new id and data, or null when someone in it has no account. */
export function remapConversation(id, d, m) {
  const members = mapList(d.members, m);
  let newId;
  if (d.type === "feedback") {
    if (members.length !== 1) return null;
    newId = `feedback|${members[0]}`;
  } else {
    if (members.length !== 2) return null;
    members.sort();
    newId = `${members[0]}|${members[1]}`;
  }
  const lastFrom = d.lastMessage && typeof d.lastMessage === "object" ? m(d.lastMessage.from) : null;
  return {
    id: newId,
    data: {
      ...d,
      members,
      readAt: mapKeys(d.readAt || {}, m),
      lastMessage: d.lastMessage && lastFrom ? { ...d.lastMessage, from: lastFrom } : null,
    },
  };
}

export function remapMessage(d, m) {
  const out = { ...d, from: m(d.from) || "" };
  if (d.reactions && typeof d.reactions === "object") {
    out.reactions = {};
    for (const [emoji, who] of Object.entries(d.reactions)) {
      const ids = mapList(who, m);
      if (ids.length) out.reactions[emoji] = ids;
    }
  }
  return out;
}

/** A private profile (with what an older public profile still held: legacy allergies, payment link, friends). Never an email. */
export function remapPrivateProfile(priv, legacyPub, m) {
  const out = {};
  const pick = (k) => (priv && k in priv ? priv[k] : legacyPub && k in legacyPub ? legacyPub[k] : undefined);
  if (pick("allergies") !== undefined) out.allergies = list(pick("allergies"));
  if (pick("paymentLink") !== undefined) out.paymentLink = typeof pick("paymentLink") === "string" ? pick("paymentLink") : "";
  if (pick("friends") !== undefined) out.friends = mapList(pick("friends"), m);
  if (priv && "readers" in priv) out.readers = mapList(priv.readers, m);
  return out;
}
