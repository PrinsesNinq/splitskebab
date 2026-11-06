// The Notifications section of the profile page: one switch for this device and a check per kind (js/push.js does the work). Every
// change is saved at once. Where the browser cannot do push, the switch stays off and a line says why (and on an iPhone what to do).
import { pushState, pushKinds, enablePush, disablePush, markAsked, KINDS } from "./push.js";
import { toast } from "./ui.js";
import { getLang, t } from "./i18n.js";

const NOTES = { "ios-install": "push.iosInstall", denied: "push.denied", unsupported: "push.unsupported" };

/** Sets up the section for this person; returns nothing to clean up (its listeners live on its own elements). */
export async function attachPushSettings(section, me) {
  const on = section.querySelector("#push-on");
  const kindsBox = section.querySelector("#push-kinds");
  const checks = [...kindsBox.querySelectorAll("input[type=checkbox]")];
  const note = section.querySelector("#push-note");

  const showNote = (key) => { note.hidden = !key; note.textContent = key ? t(key) : ""; };
  const chosen = () => checks.filter((c) => c.checked).map((c) => c.value);
  const render = (kinds) => {
    on.checked = kinds.length > 0;
    kindsBox.hidden = !on.checked;
    if (kinds.length) for (const c of checks) c.checked = kinds.includes(c.value);
  };

  const state = await pushState().catch(() => "unsupported");
  if (!section.isConnected) return; // the page was left meanwhile
  if (state !== "ok") { on.disabled = true; render([]); showNote(NOTES[state]); return; }
  on.disabled = false;
  render(pushKinds(me));

  // One change at a time: the controls are locked while it is saved, and show what was really saved afterwards.
  const apply = async (kinds) => {
    markAsked(me); // a choice made here is the answer: the first-time offer never switches them back on
    on.disabled = true;
    checks.forEach((c) => { c.disabled = true; });
    try {
      if (kinds.length) await enablePush(me, kinds, getLang());
      else await disablePush();
      showNote(null);
      toast(t(kinds.length ? "push.saved" : "push.off"), "success");
    } catch (err) {
      if (err?.message === "denied") showNote("push.denied");
      else { console.error("Push settings:", err?.code || err?.message || err); toast(t("push.failed"), "danger"); }
    } finally {
      render(pushKinds(me));
      on.disabled = Notification.permission === "denied";
      checks.forEach((c) => { c.disabled = false; });
    }
  };

  on.addEventListener("change", () => {
    if (on.checked && !chosen().length) checks.forEach((c) => { c.checked = true; }); // switching on with nothing ticked: everything
    apply(on.checked ? chosen() : []);
  });
  for (const c of checks) c.addEventListener("change", () => apply(KINDS.filter((k) => chosen().includes(k))));
}
