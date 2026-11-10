// The small rules of the message system, pure (tests/messaging.test.js): conversation ids, who the other person is, what is unread,
// and the one-line preview. Times are milliseconds (store.js turns Firestore timestamps into them).

export const MAX_MESSAGE = 2000; // characters per message (firestore.rules allows the same)
export const MAX_PREVIEW = 140; // the last message shown in the list (firestore.rules allows up to 160)

/** One direct conversation per pair, whoever starts it: the two uids sorted and joined by "|" (as firestore.rules expects). */
export const directId = (a, b) => [a, b].sort().join("|");
/** A person's feedback to the admins. */
export const feedbackId = (uid) => `feedback|${uid}`;

/** The other person in a direct conversation; for feedback, the person who gave it. */
export function otherMember(conversation, me) {
  return conversation.type === "feedback" ? conversation.members[0] : conversation.members.find((m) => m !== me) || me;
}

/** Whether there is a message I have not seen: someone else wrote the last one, after I last read the conversation. */
export function isUnread(conversation, me) {
  if (!conversation.lastAt || !conversation.lastFrom || conversation.lastFrom === me) return false;
  const read = conversation.readAt?.[me] || 0;
  return read < conversation.lastAt;
}

/**
 * Whether to write my read time now: the conversation is unread and its last message is newer than the one I already marked. Until the
 * server confirms the write, Firestore shows my pending read time as empty, so the conversation still looks unread: without remembering
 * what was marked (markedUpTo, the lastAt of the last write), every snapshot wrote again.
 */
export function shouldMarkRead(conversation, me, markedUpTo) {
  return Boolean(conversation) && isUnread(conversation, me) && conversation.lastAt > (markedUpTo || 0);
}

/**
 * "sent" when the promise resolves within ms, "pending" when it is still going (it rejects when it fails first). Firestore resolves a write
 * only once the server has it; on a stalled phone connection that can be never, and the composer stayed locked. The write is already on
 * the screen and goes out when the connection is back, so after a short wait the box is freed for the next message.
 */
export function settleWithin(promise, ms) {
  let timer;
  const waiting = new Promise((resolve) => { timer = setTimeout(() => resolve("pending"), ms); });
  return Promise.race([promise.then(() => "sent"), waiting]).finally(() => clearTimeout(timer));
}

/** A message as one line of at most MAX_PREVIEW characters, for the conversation list. */
export function preview(text) {
  const line = String(text ?? "").replace(/\s+/g, " ").trim();
  return line.length > MAX_PREVIEW ? `${line.slice(0, MAX_PREVIEW - 1)}…` : line;
}

/**
 * The reactions after I react (or take my reaction back: emoji null): { emoji: [uid] }. Each person has at most one reaction per
 * message, so mine is first taken off whatever it was. Emojis nobody uses any more are dropped.
 */
export function react(reactions, me, emoji) {
  const next = {};
  for (const [e, people] of Object.entries(reactions || {})) {
    const rest = (Array.isArray(people) ? people : []).filter((p) => p !== me);
    if (rest.length) next[e] = rest;
  }
  if (emoji) next[emoji] = [...(next[emoji] || []), me];
  return next;
}
