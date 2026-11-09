// Who gets which push notification, and what it says: pure functions, no Firebase, so tests/push.test.js runs them directly.
// functions/index.js feeds them the Firestore documents and sends the result. The shapes are the ones in public/js/store.js.
//
// Three kinds, each one switch on a device (devices/{token}.types, chosen on the profile page):
//   messages  a new chat message (direct), or feedback (the admins get the person's, the person gets the admins' answers)
//   meals     asked to come to a meal (planned with "ask everyone", or invited later), asked again when it moved to another day or time,
//             and a reminder the day before when not answered
//   money     someone added what they paid for a meal you ate at

export const KINDS = ["messages", "meals", "money"];
export const LANGS = ["en", "nl"];
const MAX_RECIPIENTS = 200;

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);
const cap = (emails) => [...new Set(emails)].slice(0, MAX_RECIPIENTS);

/** Who is told about a new message: everyone in the conversation but the writer; for feedback, the admins or the person who gave it. */
export function messageRecipients(conversation, from, admins = []) {
  if (!conversation) return [];
  const members = list(conversation.members);
  if (conversation.type === "feedback") {
    const giver = members[0];
    return cap(from === giver ? list(admins).filter((a) => a !== from) : [giver].filter(Boolean));
  }
  return cap(members.filter((m) => m !== from));
}

/** Who is asked to answer for a meal: everyone who sees it when the host asked everyone (rsvp), else the people invited. */
function asked(meal) {
  return list(meal?.rsvp ? meal.viewers : meal?.invited);
}
const answered = (meal) => new Set([...list(meal?.participants), ...list(meal?.declined), meal?.host]);

/** Who is newly asked to come: on a new meal everyone asked, on a change only the ones asked since. Never the host or who answered. */
export function invitationRecipients(before, after) {
  if (!after) return [];
  const done = answered(after);
  const was = new Set(before ? asked(before) : []);
  return cap(asked(after).filter((e) => !was.has(e) && !done.has(e)));
}

/**
 * A meal moved to another day or time (public/js/reschedule.js took the asked people's answers back): everyone asked who has no answer
 * now is told, except the ones newly invited in the same change (they get the invitation).
 */
export function moveRecipients(before, after) {
  if (!before || !after || (before.date === after.date && (before.time || "") === (after.time || ""))) return [];
  const invited = new Set(invitationRecipients(before, after));
  return reminderRecipients(after).filter((e) => !invited.has(e));
}

/** The reminder the day before: everyone asked who has not answered yet. */
export function reminderRecipients(meal) {
  const done = answered(meal);
  return cap(asked(meal).filter((e) => !done.has(e)));
}

/**
 * Costs added or raised on a meal: one entry per payer whose amount went up, with the people who ate (participants) other than them.
 * Lowering or removing an amount is a correction, not news.
 */
export function costChanges(before, after) {
  const prev = before?.costs && typeof before.costs === "object" ? before.costs : {};
  const next = after?.costs && typeof after.costs === "object" ? after.costs : {};
  const out = [];
  for (const [payer, cents] of Object.entries(next)) {
    if (!Number.isInteger(cents) || cents <= 0 || cents <= (Number.isInteger(prev[payer]) ? prev[payer] : 0)) continue;
    const recipients = cap(list(after.participants).filter((e) => e !== payer));
    if (recipients.length) out.push({ payer, cents, recipients });
  }
  return out;
}

/** Today's date ("YYYY-MM-DD") in a time zone, plus some days: the meal dates are local dates in the Netherlands. */
export function dayInZone(now, timeZone = "Europe/Amsterdam", plusDays = 0) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .formatToParts(now).map((p) => [p.type, p.value]));
  const d = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + plusDays));
  return d.toISOString().slice(0, 10);
}

export const euro = (cents, lang) => new Intl.NumberFormat(lang === "nl" ? "nl-NL" : "en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);

const TEXT = {
  en: {
    message: ["{name}", "{text}"],
    feedback: ["Feedback from {name}", "{text}"],
    feedbackAnswer: ["Answer to your feedback", "{name}: {text}"],
    invited: ["{name} asks: are you coming?", "{title} on {day}{time}"],
    reminder: ["Are you coming tomorrow?", "{title}{time}: {name} would like to know"],
    moved: ["{title} has moved", "Now on {day}{time}. Are you still coming?"],
    paid: ["{name} paid {amount}", "for {title}. Open the meal to see what you owe."],
  },
  nl: {
    message: ["{name}", "{text}"],
    feedback: ["Feedback van {name}", "{text}"],
    feedbackAnswer: ["Antwoord op je feedback", "{name}: {text}"],
    invited: ["{name} vraagt: eet je mee?", "{title} op {day}{time}"],
    reminder: ["Eet je morgen mee?", "{title}{time}: {name} wil het graag weten"],
    moved: ["{title} is verplaatst", "Nu op {day}{time}. Eet je nog mee?"],
    paid: ["{name} heeft {amount} betaald", "voor {title}. Open de maaltijd om te zien wat je moet betalen."],
  },
};

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
const short = (s, max) => (s.length > max ? s.slice(0, max - 1) + "…" : s);

/** The title and body of a notification in a language; texts from people are cut to fit a notification. */
export function notificationText(kind, lang, vars = {}) {
  const t = TEXT[LANGS.includes(lang) ? lang : "en"][kind];
  if (!t) throw new Error(`unknown notification ${kind}`);
  const v = {
    ...vars,
    name: short(String(vars.name || ""), 60),
    title: short(String(vars.title || ""), 80),
    text: short(String(vars.text || "").replace(/\s+/g, " ").trim(), 160),
    time: vars.time ? ` ${lang === "nl" ? "om" : "at"} ${vars.time}` : "",
    day: vars.day ? formatDay(vars.day, lang) : "",
  };
  return { title: fill(t[0], v), body: fill(t[1], v) };
}

/** "2026-11-07" as "Saturday 7 November" / "zaterdag 7 november". */
export function formatDay(day, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  const [y, m, d] = day.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "nl" ? "nl-NL" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

/** The page a notification opens: only this app's own pages, with an id that cannot break out of the query. */
export function linkTo(page, param, id) {
  if (!/^[a-z]+\.html$/.test(page)) throw new Error("not a page");
  return id ? `${page}?${param}=${encodeURIComponent(id)}` : page;
}

/** The devices to send to: only those whose owner is a recipient and that have this kind switched on. */
export function devicesFor(devices, recipients, kind) {
  const who = new Set(recipients);
  return devices.filter((d) => who.has(d.owner) && list(d.types).includes(kind));
}
