/* Theme icon runtime: style "bi". <i data-icon="name"></i> or ThemeIcons.html("name"); switch with <html data-icon-style="bi|emoji">. */
(function () {
  if (window.ThemeIcons) { window.ThemeIcons.register({"airplane":{"e":"✈️"},"alarm":{"e":"⏰"},"arrow-clockwise":{"e":"🔄"},"award":{"e":"🏆"},"bag":{"e":"🛍️"},"bandaid":{"e":"🩹"},"bar-chart":{"e":"📊"},"bell":{"e":"🔔"},"bezier2":{"e":"✒️"},"bicycle":{"e":"🚲"},"book":{"e":"📚"},"bookmark":{"e":"🔖"},"box":{"e":"📦"},"box-arrow-up-right":{"e":"↗️"},"box-seam":{"e":"📦"},"boxes":{"e":"📦"},"bug":{"e":"🐛"},"building":{"e":"🏢"},"building-gear":{"e":"🏭"},"buildings":{"e":"🏙️"},"bus-front":{"e":"🚌"},"calendar-check":{"e":"📅"},"calendar-date":{"e":"📅"},"calendar-event":{"e":"📅"},"camera":{"e":"📷"},"capsule":{"e":"💊"},"car-front":{"e":"🚗"},"card-checklist":{"e":"📝"},"caret-up-fill":{},"cart":{"e":"🛒"},"cash-coin":{"e":"💶"},"chat-dots":{"e":"💬"},"check-circle-fill":{"e":"✅"},"check-lg":{"e":"✔️"},"chevron-down":{"e":"▾"},"chevron-right":{"e":"▸"},"clipboard-check":{"e":"📋"},"clipboard-data":{"e":"📋"},"clock":{"e":"🕐"},"cloud-arrow-up":{"e":"☁️"},"cloud-upload":{"e":"☁️"},"copy":{"e":"📋"},"cpu":{"e":"🔳"},"currency-euro":{"e":"💶"},"display":{"e":"🖥️"},"download":{"e":"📥"},"droplet":{"e":"💧"},"emoji-smile":{"e":"🙂"},"envelope":{"e":"✉️"},"exclamation-circle":{"e":"⚠️"},"exclamation-circle-fill":{"e":"❗"},"exclamation-triangle":{"e":"⚠️"},"eyedropper":{"e":"🧪"},"file-earmark-check":{"e":"📄"},"file-earmark-pdf":{"e":"📄"},"file-earmark-ruled":{"e":"📄"},"file-earmark-text":{"e":"📄"},"fire":{"e":"🔥"},"flag":{"e":"🚩"},"folder":{"e":"📁"},"folder2-open":{"e":"📂"},"funnel":{"e":"🔽"},"gear":{"e":"⚙️"},"gear-wide-connected":{"e":"⚙️"},"geo-alt":{"e":"📍"},"globe":{"e":"🌍"},"graph-up":{"e":"📈"},"hammer":{"e":"🔨"},"hand-thumbs-up":{"e":"👍"},"hdd":{"e":"💽"},"heart-pulse":{"e":"💓"},"hourglass-split":{"e":"⏳"},"house":{"e":"🏠"},"image":{"e":"🖼️"},"journal-text":{"e":"📓"},"key":{"e":"🔑"},"lightbulb":{"e":"💡"},"lightning-charge":{"e":"⚡"},"link-45deg":{"e":"🔗"},"list-check":{"e":"📝"},"lock":{"e":"🔒"},"map":{"e":"🗺️"},"mortarboard":{"e":"🎓"},"paperclip":{"e":"📎"},"patch-check":{"e":"✅"},"pencil":{"e":"✏️"},"pencil-fill":{"e":"✏️"},"pencil-square":{"e":"📝"},"people":{"e":"👥"},"person":{"e":"👤"},"person-badge":{"e":"🪪"},"person-check":{"e":"👤"},"person-plus":{"e":"👤"},"person-workspace":{"e":"🧑‍💻"},"phone":{"e":"📱"},"pie-chart":{"e":"📊"},"plug":{"e":"🔌"},"plus-circle":{"e":"➕"},"plus-lg":{"e":"➕"},"printer":{"e":"🖨️"},"qr-code":{"e":"📱"},"radioactive":{"e":"☢️"},"recycle":{"e":"♻️"},"rocket-takeoff":{"e":"🚀"},"search":{"e":"🔍"},"shield-check":{"e":"🛡️"},"shield-exclamation":{"e":"🛡️"},"shield-lock":{"e":"🛡️"},"shop":{"e":"🏪"},"speedometer2":{"e":"⏱️"},"star":{"e":"⭐"},"star-fill":{"e":"⭐"},"tag":{"e":"🏷️"},"tags":{"e":"🏷️"},"telephone":{"e":"📞"},"thermometer-half":{"e":"🌡️"},"three-dots-vertical":{"e":"⋮"},"tools":{"e":"🛠️"},"train-front":{"e":"🚆"},"trash":{"e":"🗑️"},"tree":{"e":"🌳"},"trophy":{"e":"🏆"},"truck":{"e":"🚚"},"truck-flatbed":{"e":"🚚"},"unlock":{"e":"🔓"},"upc-scan":{"e":"🔢"},"upload":{"e":"📤"},"virus":{"e":"🦠"},"water":{"e":"💧"},"wifi":{"e":"📶"},"wrench":{"e":"🔧"},"wrench-adjustable":{"e":"🔧"},"x":{"e":"✖️"},"x-lg":{"e":"✖️"}}); window.ThemeIcons.style = "bi"; window.ThemeIcons.render(document); return; }
  var REG = {"airplane":{"e":"✈️"},"alarm":{"e":"⏰"},"arrow-clockwise":{"e":"🔄"},"award":{"e":"🏆"},"bag":{"e":"🛍️"},"bandaid":{"e":"🩹"},"bar-chart":{"e":"📊"},"bell":{"e":"🔔"},"bezier2":{"e":"✒️"},"bicycle":{"e":"🚲"},"book":{"e":"📚"},"bookmark":{"e":"🔖"},"box":{"e":"📦"},"box-arrow-up-right":{"e":"↗️"},"box-seam":{"e":"📦"},"boxes":{"e":"📦"},"bug":{"e":"🐛"},"building":{"e":"🏢"},"building-gear":{"e":"🏭"},"buildings":{"e":"🏙️"},"bus-front":{"e":"🚌"},"calendar-check":{"e":"📅"},"calendar-date":{"e":"📅"},"calendar-event":{"e":"📅"},"camera":{"e":"📷"},"capsule":{"e":"💊"},"car-front":{"e":"🚗"},"card-checklist":{"e":"📝"},"caret-up-fill":{},"cart":{"e":"🛒"},"cash-coin":{"e":"💶"},"chat-dots":{"e":"💬"},"check-circle-fill":{"e":"✅"},"check-lg":{"e":"✔️"},"chevron-down":{"e":"▾"},"chevron-right":{"e":"▸"},"clipboard-check":{"e":"📋"},"clipboard-data":{"e":"📋"},"clock":{"e":"🕐"},"cloud-arrow-up":{"e":"☁️"},"cloud-upload":{"e":"☁️"},"copy":{"e":"📋"},"cpu":{"e":"🔳"},"currency-euro":{"e":"💶"},"display":{"e":"🖥️"},"download":{"e":"📥"},"droplet":{"e":"💧"},"emoji-smile":{"e":"🙂"},"envelope":{"e":"✉️"},"exclamation-circle":{"e":"⚠️"},"exclamation-circle-fill":{"e":"❗"},"exclamation-triangle":{"e":"⚠️"},"eyedropper":{"e":"🧪"},"file-earmark-check":{"e":"📄"},"file-earmark-pdf":{"e":"📄"},"file-earmark-ruled":{"e":"📄"},"file-earmark-text":{"e":"📄"},"fire":{"e":"🔥"},"flag":{"e":"🚩"},"folder":{"e":"📁"},"folder2-open":{"e":"📂"},"funnel":{"e":"🔽"},"gear":{"e":"⚙️"},"gear-wide-connected":{"e":"⚙️"},"geo-alt":{"e":"📍"},"globe":{"e":"🌍"},"graph-up":{"e":"📈"},"hammer":{"e":"🔨"},"hand-thumbs-up":{"e":"👍"},"hdd":{"e":"💽"},"heart-pulse":{"e":"💓"},"hourglass-split":{"e":"⏳"},"house":{"e":"🏠"},"image":{"e":"🖼️"},"journal-text":{"e":"📓"},"key":{"e":"🔑"},"lightbulb":{"e":"💡"},"lightning-charge":{"e":"⚡"},"link-45deg":{"e":"🔗"},"list-check":{"e":"📝"},"lock":{"e":"🔒"},"map":{"e":"🗺️"},"mortarboard":{"e":"🎓"},"paperclip":{"e":"📎"},"patch-check":{"e":"✅"},"pencil":{"e":"✏️"},"pencil-fill":{"e":"✏️"},"pencil-square":{"e":"📝"},"people":{"e":"👥"},"person":{"e":"👤"},"person-badge":{"e":"🪪"},"person-check":{"e":"👤"},"person-plus":{"e":"👤"},"person-workspace":{"e":"🧑‍💻"},"phone":{"e":"📱"},"pie-chart":{"e":"📊"},"plug":{"e":"🔌"},"plus-circle":{"e":"➕"},"plus-lg":{"e":"➕"},"printer":{"e":"🖨️"},"qr-code":{"e":"📱"},"radioactive":{"e":"☢️"},"recycle":{"e":"♻️"},"rocket-takeoff":{"e":"🚀"},"search":{"e":"🔍"},"shield-check":{"e":"🛡️"},"shield-exclamation":{"e":"🛡️"},"shield-lock":{"e":"🛡️"},"shop":{"e":"🏪"},"speedometer2":{"e":"⏱️"},"star":{"e":"⭐"},"star-fill":{"e":"⭐"},"tag":{"e":"🏷️"},"tags":{"e":"🏷️"},"telephone":{"e":"📞"},"thermometer-half":{"e":"🌡️"},"three-dots-vertical":{"e":"⋮"},"tools":{"e":"🛠️"},"train-front":{"e":"🚆"},"trash":{"e":"🗑️"},"tree":{"e":"🌳"},"trophy":{"e":"🏆"},"truck":{"e":"🚚"},"truck-flatbed":{"e":"🚚"},"unlock":{"e":"🔓"},"upc-scan":{"e":"🔢"},"upload":{"e":"📤"},"virus":{"e":"🦠"},"water":{"e":"💧"},"wifi":{"e":"📶"},"wrench":{"e":"🔧"},"wrench-adjustable":{"e":"🔧"},"x":{"e":"✖️"},"x-lg":{"e":"✖️"}};
  var api = window.ThemeIcons = { style: "bi" };
  var STRIP = /(^|\s)bi(-[\w-]+)?(?=\s|$)/g;
  /** The style for one icon: the nearest data-icon-style on it or an ancestor (the <html> element included), else the theme style. */
  function current(el) {
    var holder = el && el.closest ? el.closest("[data-icon-style]") : null;
    return (holder && holder.getAttribute("data-icon-style")) || api.style;
  }
  function fill(el) {
    var name = el.getAttribute("data-icon");
    var st = current(el);
    var key = st + ":" + name;
    if (el.__ti === key) return;
    el.className = el.className.replace(STRIP, "$1").replace(/\s+/g, " ").trim();
    el.textContent = "";
    if (st === "bi") el.className += " bi bi-" + name;
    else el.textContent = (REG[name] && REG[name].e) || "\u2022";
    el.__ti = key;
  }
  api.register = function (more) { for (var k in more) REG[k] = more[k]; };
  api.render = function (root) {
    root = root || document;
    // the native method, not root.matches: a custom element is free to have a member of that name, and an icon must still be found on it
    if (root.nodeType === 1 && Element.prototype.matches.call(root, "[data-icon]")) fill(root);
    var all = root.querySelectorAll ? root.querySelectorAll("[data-icon]") : [];
    for (var i = 0; i < all.length; i++) fill(all[i]);
  };
  /** Markup for an icon in the current style, for scripts that build HTML. cls adds classes, size sets the font size in px. */
  api.html = function (name, cls, size, style) {
    var el = document.createElement("i");
    el.className = "ti" + (cls ? " " + cls : "");
    el.setAttribute("data-icon", name);
    if (size) el.style.fontSize = size + "px";
    if (style) el.setAttribute("data-icon-style", style);
    fill(el);
    return el.outerHTML;
  };
  /** Whether an icon can be drawn in a style: "bi" always, "emoji" only when the icon has an emoji. */
  api.has = function (name, style) {
    var r = REG[name];
    return style === "emoji" ? !!(r && r.e) : true;
  };
  /** The emoji for an icon, or an empty string. */
  api.glyph = function (name) { return (REG[name] && REG[name].e) || ""; };
  api.setStyle = function (s) { api.style = s; api.render(document); };
  var css = document.createElement("style");
  css.id = "theme-icons-css";
  css.textContent = ".ti{display:inline-block;line-height:1;vertical-align:-.125em;font-style:normal}";
  document.head.appendChild(css);
  function start() {
    api.render(document);
    // Icons added later (a script building markup, a modal opening) are drawn too.
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) for (var j = 0; j < records[i].addedNodes.length; j++) { var n = records[i].addedNodes[j]; if (n.nodeType === 1) api.render(n); }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState !== "loading") start(); else document.addEventListener("DOMContentLoaded", start);
})();
