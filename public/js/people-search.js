// Finding people on the Friends tab: by name (or email) as you type, and the friends of my friends I am not friends with yet. Pure
// functions over the profiles (store.js people: Map email -> { email, name, friends, ... }); tests/people-search.test.js checks them.
import { normalise } from "./recipe-logic.js";

/**
 * People whose name or email matches what was typed (at least 2 characters), best first: a name that starts with it, then a word in the
 * name that starts with it, then a name or email that contains it; ties by name. Leaves out me. Accents and case do not matter
 * ("eli" finds "Élise").
 */
export function searchPeople(query, profiles, me, limit = 8) {
  const q = normalise(query);
  if (q.length < 2 || !profiles) return [];
  const scored = [];
  for (const p of profiles.values()) {
    if (p.email === me) continue;
    const name = normalise(p.name);
    const email = p.email.toLowerCase();
    let score = 0;
    if (name.startsWith(q)) score = 4;
    else if (name.split(" ").some((word) => word.startsWith(q))) score = 3;
    else if (name.includes(q)) score = 2;
    else if (email.includes(q.replace(/ /g, ""))) score = 1;
    if (score) scored.push({ person: p, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.person.name.localeCompare(b.person.name))
    .slice(0, limit)
    .map((s) => s.person);
}

/**
 * Friends of my friends who are not my friends (or asked) yet: [{ person, via: [friend's email] }], the ones with most friends in common
 * first, then by name. Uses the friend list each person keeps on their profile. known: emails already a friend or with a request open.
 */
export function friendsOfFriends(me, myFriends, known, profiles, limit = 10) {
  if (!profiles) return [];
  const skip = new Set([me, ...myFriends, ...known]);
  const via = new Map();
  for (const friend of myFriends) {
    for (const other of profiles.get(friend)?.friends || []) {
      if (skip.has(other) || !profiles.has(other)) continue; // only people with a profile (they have an account)
      if (!via.has(other)) via.set(other, []);
      via.get(other).push(friend);
    }
  }
  return [...via]
    .map(([email, through]) => ({ person: profiles.get(email), via: through }))
    .sort((a, b) => b.via.length - a.via.length || a.person.name.localeCompare(b.person.name))
    .slice(0, limit);
}
