// Analytics of one house or group (analytics.html?circle=id), for its admins: what it spends in the chosen period, per day as a small
// bar chart (component "Vertical bar chart", one series so no legend; the table view is the accessible alternative), who paid how much,
// and on what (per recipe until receipt photos can sort it into categories). The numbers come from js/analytics.js.
// The meals themselves are readable by every member (they eat them); this page is an admin view of them, not extra access.
import "../vendor/sel/elements/vertical-bar-chart-2.js";
import { whenUser, esc, onLeave, param, todayIso, avatarHtml } from "./ui.js";
import { myCircles, myMeals, people, person, userRecipes } from "./store.js";
import { mealsWithCosts, spendingByDay, summary, paidByPerson, spendingByRecipe, topMeals, isCircleAdmin } from "./analytics.js";
import { daysBefore } from "./sharing.js";
import { allRecipes, findRecipe } from "./recipe-view.js";
import { formatMoney } from "./money.js";
import { getLang, t, formatDay } from "./i18n.js";

const user = await whenUser();
const me = user.email.toLowerCase();
const lang = getLang();
const circleId = String(param("circle") || "");
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let circle = null;
let meals = [];
let recipes = allRecipes([]);
let days = 30;
let chartKey = ""; // what the chart shows now: it is only redrawn when that changes

function fail(message) {
  $("#analytics-error").textContent = message;
  $("#analytics-error").classList.remove("d-none");
  document.querySelector(".analytics-page").querySelectorAll("section, #analytics-stats, #analytics-period").forEach((el) => el.classList.add("d-none"));
}

/** A day as a short axis label: "ma 3" for a week, "3 nov" for a month, "3/11" for three months. */
function dayLabel(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const locale = lang === "nl" ? "nl-NL" : "en-GB";
  if (days <= 7) return date.toLocaleDateString(locale, { weekday: "short", day: "numeric" });
  if (days <= 31) return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
  return `${d}/${m}`;
}

const stat = (label, value) => `<div class="col-6"><div class="card card-body py-2 h-100 stat-tile">
    <span class="small text-body-secondary">${esc(label)}</span><span class="fs-4 fw-semibold">${esc(value)}</span></div></div>`;

/** The bar chart, drawn fresh (the component reads its <data> points once). Empty period: a sentence instead of a flat line of zeros. */
function drawChart(perDay, total) {
  const key = `${days}|${perDay.map((d) => d.cents).join(",")}`;
  if (key === chartKey) return;
  chartKey = key;
  const host = $("#analytics-chart");
  if (!total) {
    host.innerHTML = `<p class="small text-body-secondary mb-0">${esc(t("analytics.nothingSpent"))}</p>`;
    return;
  }
  const el = document.createElement("sel-vertical-bar-chart-2");
  el.className = "vertical-bar-chart-2";
  // The component also has a colour picker; it needs its (empty) spot, but the people using this page do not need the picker.
  el.innerHTML = `
    <div class="vertical-bar-chart-2-pane" data-vertical-bar-chart-2-pane="chart">
      <div class="vertical-bar-chart-2-container analytics-chart__canvas">
        <canvas data-vertical-bar-chart-2-canvas role="img" aria-label="${esc(t("analytics.chartLabel", { total: formatMoney(total, lang) }))}"></canvas>
      </div>
    </div>
    <div class="d-none" data-vertical-bar-chart-2-pane="colors" hidden><div data-vertical-bar-chart-2-legend></div></div>
    ${perDay.map((d) => `<data value="${(d.cents / 100).toFixed(2)}">${esc(dayLabel(d.date))}</data>`).join("")}`;
  host.replaceChildren(el);
}

function render() {
  if (!circle) return;
  $("#analytics-title").textContent = t("analytics.title", { name: circle.name });
  const to = todayIso();
  const from = daysBefore(to, days - 1);
  const inPeriod = mealsWithCosts(meals, circle.id, from, to);
  const s = summary(inPeriod);
  const perDay = spendingByDay(inPeriod, from, to);

  $("#analytics-stats").innerHTML = [
    stat(t("analytics.total"), formatMoney(s.total, lang)),
    stat(t("analytics.meals"), String(s.meals)),
    stat(t("analytics.perMeal"), formatMoney(s.perMeal, lang)),
    stat(t("analytics.perPerson"), formatMoney(s.perPerson, lang)),
  ].join("");

  drawChart(perDay, s.total);
  const withSpending = perDay.filter((d) => d.cents > 0).reverse();
  $("#analytics-table").innerHTML = withSpending.length
    ? withSpending.map((d) => `<tr><td>${esc(formatDay(d.date))}</td><td class="text-end">${esc(formatMoney(d.cents, lang))}</td></tr>`).join("")
    : `<tr><td colspan="2" class="text-body-secondary">${esc(t("analytics.nothingSpent"))}</td></tr>`;

  // Who paid: a quiet bar per person in the text colour family (one series: the length is the value, the label says it).
  const payers = paidByPerson(inPeriod);
  const most = payers[0]?.cents || 1;
  $("#analytics-payers").innerHTML = payers.length ? payers.map((p) => {
    const who = person(p.email);
    return `<li class="mb-2">
      <div class="d-flex align-items-center gap-2 small">${avatarHtml(who, "avatar avatar-sm")}<span class="flex-grow-1 text-truncate">${esc(who.name)}</span><strong>${esc(formatMoney(p.cents, lang))}</strong></div>
      <div class="share-bar mt-1" aria-hidden="true"><span style="--share: ${Math.max(2, Math.round((p.cents / most) * 100))}%"></span></div>
    </li>`;
  }).join("") : `<li class="small text-body-secondary">${esc(t("analytics.nothingSpent"))}</li>`;

  const groups = spendingByRecipe(inPeriod);
  $("#analytics-recipes").innerHTML = groups.length ? groups.slice(0, 8).map((g) => {
    const name = g.recipe ? findRecipe(g.recipe, recipes)?.name || t("analytics.deletedRecipe") : t("analytics.noRecipe");
    return `<li class="d-flex justify-content-between gap-2 small mb-1"><span class="text-truncate">${esc(name)} <span class="text-body-secondary">(${esc(t("analytics.timesCooked", { n: g.meals }))})</span></span><strong>${esc(formatMoney(g.cents, lang))}</strong></li>`;
  }).join("") : `<li class="small text-body-secondary">${esc(t("analytics.nothingSpent"))}</li>`;

  $("#analytics-top").innerHTML = topMeals(inPeriod).map(({ meal, cents }) => `
    <a class="list-group-item list-group-item-action px-0 d-flex justify-content-between gap-2" href="meal.html?id=${encodeURIComponent(meal.id)}">
      <span class="min-w-0"><span class="d-block text-truncate">${esc(meal.title || t("meal.untitled"))}</span><span class="small text-body-secondary">${esc(formatDay(meal.date))}</span></span>
      <strong class="text-nowrap">${esc(formatMoney(cents, lang))}</strong>
    </a>`).join("") || `<p class="small text-body-secondary mb-0">${esc(t("analytics.nothingSpent"))}</p>`;
}

$("#analytics-period").addEventListener("change", (e) => {
  days = Number(e.target.value) || 30;
  render();
});

stops.push(myCircles(me).subscribe((list, err) => {
  if (err) { fail(t("error.load")); return; }
  if (!list) return;
  circle = list.find((c) => c.id === circleId) || null;
  if (!circle) { fail(t("analytics.notFound")); return; }
  if (!isCircleAdmin(circle, me)) { circle = null; fail(t("analytics.adminsOnly")); return; }
  render();
}));
stops.push(myMeals(me).subscribe((list) => { if (list) { meals = list; render(); } }));
stops.push(userRecipes.subscribe((list) => { if (list) { recipes = allRecipes(list); render(); } }));
stops.push(people.subscribe(() => render()));
