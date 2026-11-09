// Settings > Statistics (admins only): the anonymous totals (stats/{YYYY-MM}, functions/stats.js) over a chosen period: dinners, the
// average group size, the average spend per diner, the recipes cooked most and how much of each food that took. Everything here is a
// total of the people who said yes; js/stats-view.js does the sums and leaves out recipes with too few portions to name.
import { SDK, db } from "./firebase-init.js";
import { monthBefore, addMonths, summary, topRecipes, foodTotals } from "./stats-view.js";
import { allRecipes } from "./recipe-view.js";
import { todayIso } from "./ui.js";

const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const euro = (cents) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
const number = (n, digits = 0) => new Intl.NumberFormat("en-GB", { maximumFractionDigits: digits }).format(n);

export async function startStats() {
  const $ = (sel) => document.querySelector(sel);
  const { collection, getDocs } = await import(`${SDK}/firebase-firestore.js`);
  let docs = [];
  let recipes = [];

  function render() {
    const back = $("#stats-period").value;
    const today = todayIso();
    const totals = addMonths(docs, back === "all" ? "0000-00" : monthBefore(today, Number(back)), monthBefore(today, 0));
    const s = summary(totals);
    if (!totals.dinners) {
      $("#stats-body").innerHTML = '<p class="text-body-secondary">Nothing counted in this period yet. Meals are counted a week after they took place, and only for people who said yes.</p>';
      return;
    }
    const names = new Map(recipes.map((r) => [`${r.source}:${r.id}`, r.name]));
    const { shown, other } = topRecipes(totals.portions);
    const food = foodTotals(totals.portions, recipes);
    const card = (label, value) => `<div class="col-6 col-md-3"><div class="card card-body h-100"><span class="small text-body-secondary">${esc(label)}</span><span class="fs-4 fw-semibold">${esc(value)}</span></div></div>`;
    $("#stats-body").innerHTML = `
      <div class="row g-2 mb-3">
        ${card("Dinners counted", number(s.dinners))}
        ${card("Meals with someone counted", number(totals.meals))}
        ${card("Average group size", s.avgGroup == null ? "–" : number(s.avgGroup, 1))}
        ${card("Average spend per diner", s.avgSpendCents == null ? "–" : euro(s.avgSpendCents))}
      </div>
      <div class="row g-3">
        <div class="col-12 col-lg-6">
          <h3 class="h6">Recipes (portions)</h3>
          <table class="table table-sm align-middle"><tbody>
            ${shown.map((r) => `<tr><td>${esc(names.get(r.key) || "A recipe that no longer exists")}</td><td class="text-end">${number(r.n)}</td></tr>`).join("")}
            ${other ? `<tr><td class="text-body-secondary">Other recipes (fewer than 3 portions each)</td><td class="text-end">${number(other)}</td></tr>` : ""}
            ${shown.length || other ? "" : '<tr><td class="text-body-secondary">No recipe chosen for these meals.</td></tr>'}
          </tbody></table>
        </div>
        <div class="col-12 col-lg-6">
          <h3 class="h6">Food bought for those recipes (estimate)</h3>
          <table class="table table-sm align-middle"><tbody>
            ${food.map((f) => `<tr><td>${esc(f.label)}</td><td class="text-end">${number(f.qty, 1)} ${esc(f.unit)}</td></tr>`).join("") || '<tr><td class="text-body-secondary">Nothing to add up yet.</td></tr>'}
          </tbody></table>
          <p class="small text-body-secondary">From the recipes' amounts, scaled to the portions counted; staples like salt and oil are left out.</p>
        </div>
      </div>`;
  }

  try {
    const [snap, userRecipes] = await Promise.all([
      getDocs(collection(db, "stats")),
      getDocs(collection(db, "recipes")).then((s) => s.docs.map((d) => ({ id: d.id, ...d.data() }))).catch(() => []),
    ]);
    docs = snap.docs.map((d) => ({ id: d.id, data: d.data() }));
    recipes = allRecipes(userRecipes);
    render();
  } catch (err) {
    console.error("Statistics:", err?.code || err?.message || err);
    $("#stats-error").textContent = `The statistics could not be loaded: ${err?.message || err}`;
    $("#stats-error").classList.remove("d-none");
  }
  $("#stats-period").addEventListener("change", render);
}
