// The calendar page: every meal I can see on a month calendar (or as a list), the meals of the day I tap below it, and what is coming up.
// A meal I am invited to and have not answered is marked; tapping a meal opens it (meal.html).
import { whenUser, esc, colour, onLeave, todayIso, go, avatarStackHtml } from "./ui.js";
import { myMeals, myCircles, people, person } from "./store.js";
import { createCalendar, rememberView } from "./calendar.js";
import { getLang, t, formatDay } from "./i18n.js";
import { formatMoney, mealDebts } from "./money.js";

// Who I am arrives from js/app.js (whenUser); the calendar is drawn before that, so the page is never empty while it waits.
let me = null;
const lang = getLang();
const $ = (sel) => document.querySelector(sel);

let meals = [];
let selected = todayIso();
let calendar = null;
let leaving = false;
const stops = [];

/** Where I stand for this meal: host, joining, not coming, invited (to answer) or not in it. */
function myStatus(meal) {
  if (meal.participants.includes(me)) return meal.host === me ? "host" : "joining";
  if (meal.declined.includes(me)) return "declined";
  if (meal.rsvp || meal.invited.includes(me)) return "invited";
  return "none";
}

const STATUS_BADGE = {
  host: "text-bg-primary",
  joining: "text-bg-success",
  declined: "text-bg-secondary",
  invited: "text-bg-warning",
  none: "text-bg-light",
};

function mealRow(meal, { showDate = false } = {}) {
  const status = myStatus(meal);
  const eaters = meal.participants.map((id) => person(id));
  const guests = meal.guests.length ? ` <span class="text-body-secondary small">+${meal.guests.length}</span>` : "";
  // What I still have to pay for this meal (to one or more of the people who did the groceries).
  const iOwe = mealDebts(meal).filter((d) => d.from === me && !d.settled).reduce((s, d) => s + d.cents, 0);
  const cost = iOwe
    ? `<span class="badge text-bg-danger-subtle text-danger-emphasis">${esc(t("home.youOwe", { amount: formatMoney(iOwe, lang) }))}</span>` : "";
  return `<a class="list-group-item list-group-item-action meal-row" href="meal.html?id=${encodeURIComponent(meal.id)}" style="--meal-color: ${colour(meal.circleId)}">
    <div class="d-flex align-items-center gap-2">
      <span class="meal-row__when">${showDate ? `<span class="d-block small fw-semibold">${esc(formatDay(meal.date))}</span>` : ""}<span class="small text-body-secondary">${esc(meal.time || t("meal.noTime"))}</span></span>
      <span class="flex-grow-1 min-w-0">
        <span class="d-block fw-semibold text-truncate">${esc(meal.title || t("meal.untitled"))}</span>
        <span class="d-block small text-body-secondary text-truncate">${esc(meal.circleName)}</span>
      </span>
      <span class="text-end d-flex flex-column align-items-end gap-1">
        <span class="badge ${STATUS_BADGE[status]}">${esc(t(`status.${status}`))}</span>
        ${cost}
      </span>
    </div>
    ${eaters.length ? `<div class="mt-1 d-flex align-items-center gap-1">${avatarStackHtml(eaters)}${guests}</div>` : ""}
  </a>`;
}

function renderDay() {
  $("#day-title").textContent = formatDay(selected, { weekday: "long" });
  $("#plan-day").href = `meal.html?new=1&date=${selected}`;
  const list = meals.filter((m) => m.date === selected);
  $("#day-list").innerHTML = list.length ? list.map((m) => mealRow(m)).join("") : `<p class="text-body-secondary small mb-0">${esc(t("home.nothingPlanned"))}</p>`;
  for (const cell of document.querySelectorAll(".fc-daygrid-day")) cell.classList.toggle("is-selected", cell.dataset.date === selected);
}

function renderUpcoming() {
  const today = todayIso();
  const soon = meals.filter((m) => m.date >= today).slice(0, 8);
  $("#upcoming-list").innerHTML = soon.length ? soon.map((m) => mealRow(m, { showDate: true })).join("") : `<p class="text-body-secondary small mb-0">${esc(t("home.noUpcoming"))}</p>`;
}

function events() {
  return meals.map((m) => {
    const status = myStatus(m);
    return {
      id: m.id,
      title: m.title || t("meal.untitled"),
      start: m.time ? `${m.date}T${m.time}` : m.date,
      allDay: !m.time,
      classNames: ["meal", `meal--${status}`],
      extendedProps: { color: colour(m.circleId), tooltip: `${m.title || t("meal.untitled")} · ${m.circleName} · ${t(`status.${status}`)}` },
    };
  });
}

function syncTitle() {
  if (!calendar) return;
  $("#cal-title").textContent = calendar.view.title;
  for (const b of document.querySelectorAll("[data-view]")) b.classList.toggle("active", b.dataset.view === calendar.view.type);
  $("#cal-view-label").textContent = t(calendar.view.type === "listMonth" ? "cal.list" : "cal.month");
  renderDay();
}

// Registered before the calendar loads: leaving while it still loads must not leave it (or the listeners) behind.
onLeave(() => {
  leaving = true;
  stops.forEach((stop) => stop());
  calendar?.destroy();
});

$("#cal-today").addEventListener("click", () => { selected = todayIso(); calendar?.today(); renderDay(); });
$("#cal-prev").addEventListener("click", () => calendar?.prev());
$("#cal-next").addEventListener("click", () => calendar?.next());
$("#cal-title").addEventListener("click", () => {
  const input = $("#cal-jump");
  input.value = selected;
  if (input.showPicker) input.showPicker(); else input.click();
});
$("#cal-jump").addEventListener("change", (e) => {
  if (!e.target.value) return;
  selected = e.target.value;
  calendar?.gotoDate(selected);
  renderDay();
});
for (const b of document.querySelectorAll("[data-view]")) {
  b.addEventListener("click", () => { rememberView(b.dataset.view); calendar?.changeView(b.dataset.view); });
}

// The calendar starts loading now, in parallel with signing in: its grid shows at once, the meals fill in when they arrive.
const calendarReady = createCalendar($("#calendar"), {
  lang,
  events,
  initialDate: selected,
  onDay(day) { selected = day; renderDay(); },
  onMeal(id) { go(`meal.html?id=${encodeURIComponent(id)}`); },
}).then((cal) => {
  if (leaving) { cal.destroy(); return; }
  calendar = cal;
  calendar.on("datesSet", syncTitle);
  syncTitle();
  calendar.refetchEvents(); // the meals may have arrived while it loaded
}).catch((err) => {
  console.error(err);
  $("#cal-error").textContent = err.message;
  $("#cal-error").classList.remove("d-none");
});

$("#day-title").textContent = formatDay(selected, { weekday: "long" });

const user = await whenUser();
if (!leaving) {
  me = user.uid;
  stops.push(myMeals(me).subscribe((list, err) => {
    if (err) { $("#cal-error").textContent = t("error.load"); $("#cal-error").classList.remove("d-none"); return; }
    meals = list;
    calendar?.refetchEvents();
    renderDay();
    renderUpcoming();
  }));
  stops.push(myCircles(me).subscribe((circles) => {
    if (!circles) return;
    $("#no-circle").classList.toggle("d-none", circles.length > 0);
  }));
  // Names and photos arrive separately: redraw the lists when they do.
  stops.push(people.subscribe(() => { renderDay(); renderUpcoming(); }));
  renderDay();
  renderUpcoming();
}
await calendarReady;