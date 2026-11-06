// Who should be able to see a house's meals but cannot yet: everyone in the house or group, also people who joined after a meal was
// planned (a meal is only readable by its viewers, see firestore.rules, and those are filled in when it is planned). Pure: store.js
// shareCircleMeals() writes what this finds, tests/sharing.test.js checks it.

export const SHARE_DAYS_BACK = 60; // older dinners are not worth sharing, and it keeps the writes few

/** "YYYY-MM-DD" a number of days before a "YYYY-MM-DD" date (local calendar days, at noon so DST cannot shift the day). */
export function daysBefore(iso, days) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() - days);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The meals (from today minus SHARE_DAYS_BACK on) whose house has members who are not viewers: [{ id, missing: [email] }]. */
export function missingViewers(circles, meals, today) {
  const members = new Map(circles.map((c) => [c.id, c.members]));
  const cutoff = daysBefore(today, SHARE_DAYS_BACK);
  const out = [];
  for (const meal of meals) {
    const circle = members.get(meal.circleId);
    if (!circle || meal.date < cutoff) continue;
    const missing = circle.filter((email) => !meal.viewers.includes(email));
    if (missing.length) out.push({ id: meal.id, missing });
  }
  return out;
}
