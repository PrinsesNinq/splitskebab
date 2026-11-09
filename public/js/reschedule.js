// Moving a meal to another day or time (dragging it on the calendar, js/home.js, or editing it, js/meal.js): everyone who was asked to
// come answers again, because a yes for Friday is not a yes for Saturday. Asked means: everyone who sees the meal when the host asked
// everyone (rsvp), otherwise the friends who were invited. Their yes or no is taken back, so the bell, the calendar and the meal page
// ask them again, and functions/index.js sends them a push. Who moved it and the host keep theirs; the people simply ticked as eating
// (in a house, without being asked) stay ticked. Pure: tests/reschedule.test.js checks it.

/** Whether the meal really moves: another date, or another time. */
export const moves = (meal, { date, time = "" }) => meal.date !== date || (meal.time || "") !== (time || "");

/** The people who are asked again when the meal moves (uids), without the host and without me. */
export function askedAgain(meal, me) {
  const asked = meal.rsvp ? meal.viewers : meal.invited;
  const answered = new Set([...meal.participants, ...meal.declined]);
  return [...new Set(asked)].filter((id) => id !== meal.host && id !== me && answered.has(id));
}

/** The update that moves the meal: the new date and time, and the asked people's answers taken back. */
export function rescheduleChanges(meal, me, { date, time = "" }) {
  const again = new Set(askedAgain(meal, me));
  return {
    date,
    time: time || "",
    participants: meal.participants.filter((id) => !again.has(id)),
    declined: meal.declined.filter((id) => !again.has(id)),
  };
}
