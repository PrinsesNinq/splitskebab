// Anonymous statistics, once a day: the meals of a week ago (so the costs have had time to be filled in) are added to that month's totals
// in stats/{YYYY-MM}, counting only the diners who said yes (users/{uid}.statsConsent, asked in the app and changeable any time on the
// profile; functions/stats-logic.js does the counting). What is written are numbers added to everyone's totals: no uid, no name, no
// meal id. The day itself goes on the month's list of counted days, so a run that happens twice never counts a day twice.
// Logs carry counts only.
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { mealContribution, addUp, monthOf } from "./stats-logic.js";
import { dayInZone } from "./notify-logic.js";

export const STATS_DAYS_BACK = 7;

/** Counts one day (YYYY-MM-DD); returns what was added (totals only), or null when that day was already counted. */
export async function countDay(day) {
  const db = getFirestore();
  const ref = db.doc(`stats/${monthOf(day)}`);
  if ((await ref.get()).get("countedDays")?.includes(day)) return null;

  const meals = (await db.collection("meals").where("date", "==", day).limit(2000).get()).docs.map((d) => d.data());
  const people = [...new Set(meals.flatMap((m) => (Array.isArray(m.participants) ? m.participants : [])))].filter((x) => typeof x === "string" && x);
  const consenting = new Set();
  for (let i = 0; i < people.length; i += 100) {
    const snaps = await db.getAll(...people.slice(i, i + 100).map((id) => db.doc(`users/${id}`)));
    for (const s of snaps) if (s.exists && s.get("statsConsent") === true) consenting.add(s.id);
  }
  const total = addUp(meals.map((m) => mealContribution(m, consenting)));

  // One write: increments, so the month's totals only ever grow by numbers (a field path per recipe and group size: their keys hold ":").
  const update = [
    new FieldPath("countedDays"), FieldValue.arrayUnion(day),
    new FieldPath("updatedAt"), FieldValue.serverTimestamp(),
    new FieldPath("meals"), FieldValue.increment(total.meals),
    new FieldPath("dinners"), FieldValue.increment(total.dinners),
    new FieldPath("spendCents"), FieldValue.increment(total.spendCents),
    new FieldPath("spendDiners"), FieldValue.increment(total.spendDiners),
  ];
  for (const [size, n] of Object.entries(total.groupSizes)) update.push(new FieldPath("groupSizes", size), FieldValue.increment(n));
  for (const [recipe, n] of Object.entries(total.portions)) update.push(new FieldPath("portions", recipe), FieldValue.increment(n));
  await ref.set({}, { merge: true }); // update() needs the document to exist
  await ref.update(...update);
  return total;
}

export async function dailyStats(now = new Date()) {
  const day = dayInZone(now, "Europe/Amsterdam", -STATS_DAYS_BACK);
  const total = await countDay(day);
  logger.info("stats counted", total ? { meals: total.meals, dinners: total.dinners } : { already: true });
}
