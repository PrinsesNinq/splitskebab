// The meal calendar: FullCalendar 6 (MIT), loaded from the CDN only on the page that shows it. The loader, the toolbar and the look
// (Google-Calendar-style day headers, transparent grid on the theme background, light and dark) come from the ATLAS project's calendar
// (TDSupport/tdsupport public/js/calendar/calendar-view.js); the work-order logic of that one is left out.
//
// The CDN files are pinned to an exact version with an integrity hash: if the CDN served anything else, the browser refuses to run it.
// Update the version and both hashes together (sha384 of the file, base64).
const FULLCALENDAR = {
  src: "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js",
  integrity: "sha384-B1OFx8Gy9GjPu8UbUyXbGQpzll9ubAUQ9agInFJ8NnD7nYG1u/CLR+Sqr5yifl4q",
};
const DUTCH = {
  src: "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.15/locales/nl.global.min.js",
  integrity: "sha384-A5ryrKy+BHl07u80/FhMRjEX6KpRQJBwb2xHf1XpIdBx5cY6Q5zHmvmxmTxN2ypm",
};

const loading = new Map();
// A real <script> tag, not import(): the CDN "global" build is a UMD bundle (window.FullCalendar), not an ES module. v6 needs no CSS
// file: it injects its own minimal styles.
function loadScript({ src, integrity }) {
  if (!loading.has(src)) {
    loading.set(src, new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.integrity = integrity;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = () => { loading.delete(src); reject(new Error("The calendar could not be loaded. Check the connection and try again.")); };
      document.head.append(script);
    }));
  }
  return loading.get(src);
}

/** FullCalendar, and its Dutch texts when the app is in Dutch. */
export async function loadFullCalendar(lang) {
  if (!window.FullCalendar) await loadScript(FULLCALENDAR);
  if (lang === "nl") await loadScript(DUTCH);
  return window.FullCalendar;
}

const VIEW_KEY = "calendar-view";
export const VIEWS = ["dayGridMonth", "listMonth"];

export function rememberedView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (VIEWS.includes(v)) return v;
  } catch { /* storage can be blocked */ }
  return "dayGridMonth";
}

export function rememberView(view) {
  try { localStorage.setItem(VIEW_KEY, view); } catch { /* still switches for this visit */ }
}

/**
 * A month calendar of meals in el. events: () => FullCalendar event objects. onDay(isoDate) when a day is tapped, onMeal(id) when a meal
 * is. Returns the FullCalendar instance (call .destroy() when the page goes away).
 */
export async function createCalendar(el, { lang, events, onDay, onMeal, initialDate }) {
  const FullCalendar = await loadFullCalendar(lang);
  const locale = lang === "nl" ? "nl" : "en-gb";
  const calendar = new FullCalendar.Calendar(el, {
    headerToolbar: false,
    locale,
    firstDay: 1,
    height: "auto",
    initialView: rememberedView(),
    initialDate,
    dayMaxEvents: 2,
    fixedWeekCount: false,
    eventTimeFormat: { hour: "2-digit", minute: "2-digit", hour12: false },
    noEventsContent: lang === "nl" ? "Geen maaltijden deze maand" : "No meals this month",
    dayHeaderContent(arg) {
      const weekday = arg.date.toLocaleDateString(lang === "nl" ? "nl-NL" : "en-GB", { weekday: "short" });
      return { html: `<span class="gc-dow">${weekday.replace(/[<>&"]/g, "")}</span>` };
    },
    events(info, success) { success(events()); },
    dateClick(info) { onDay(info.dateStr.slice(0, 10)); },
    eventClick(info) {
      info.jsEvent.preventDefault();
      onMeal(info.event.id);
    },
    eventDidMount(info) {
      info.el.setAttribute("title", info.event.extendedProps.tooltip || info.event.title);
    },
  });
  calendar.render();
  return calendar;
}
