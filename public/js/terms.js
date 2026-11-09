// The terms of use and privacy statement, in English and Dutch. The text in force lives in Firestore (settings/terms, js/terms-store.js),
// written by the admins in Settings > Terms; every save is a new version, and everyone must accept the version in force before they get
// any data (firestore.rules acceptedTerms). Until the first save it is the text below: version 1, the one accepted when the terms began.
// This module is pure (no Firebase): the shape of the terms, rendering them, and the editor's plain-text format for the sections.
export const DEFAULT_VERSION = 1;
export const DEFAULT_DATE = "2026-11-09";

/** The built-in text (version 1). Sections are [heading, text] pairs here; stored ones are { h, b } maps (Firestore has no nested lists). */
export const TERMS = {
  en: {
    title: "Terms of use and privacy",
    intro: "Splitskebab is a free app for students who live or eat together. Please read what it does with your information. In short: your email stays private, nothing is sold, and you decide what others see.",
    sections: [
      ["Who runs Splitskebab", "Splitskebab is a private, non-commercial project run by Nino Otten (the administrator). It has no ads, and your information is never sold or shared with anyone outside the app."],
      ["Your account", "You sign in with your Google account. Be respectful to the people you plan meals and chat with. The administrator may block an account that misuses the app."],
      ["What everyone with an account can see", "Your name and profile photo (from Google, or the ones you choose on your profile), so people can find you and add you to a house."],
      ["What only the people you are connected to can see", "Your allergies, your payment link and your friends. Connected means: people in your houses and groups, people at the meals you can see, and your friends."],
      ["Your email address", "Other users never see your email address, unless you switch on \"Show my email\" on your profile; then only the people you are connected to see it. By accepting these terms you allow the administrator to see your email address in the app's user management, to recognise you and to contact you about your account. Google also stores it for signing in (the administrator can see it there too), and it is used for nothing else."],
      ["Allergies are health information", "Filling in your allergies is optional. If you do, you explicitly agree that the people you eat with can see them. Splitskebab marks recipes that contain your allergens to help, but it can make mistakes: always check the ingredients and the packaging yourself. The administrator is not liable for allergic reactions."],
      ["Money", "Splitskebab only works out who owes whom and shows payment links. Paying happens outside the app (your bank, Tikkie, bunq, PayPal). Check an amount before you pay it. The administrator is not responsible for payments between users."],
      ["Messages and notifications", "Messages are stored so the people in a chat can read them; the administrator does not read your chats, only the feedback you send to the admins. For notifications your device's push address and language are stored, until you switch them off or sign out."],
      ["Where your information is kept", "In Google Firebase, in data centres in the European Union, protected by security rules that only let the right people read each part."],
      ["Your rights", "You can see, correct and delete your information: most of it on your profile, the rest by asking. To delete your account and everything in it, send feedback (Messages > Feedback): it is done within 30 days."],
      ["No guarantees", "Splitskebab is provided as it is. It may contain mistakes or be unavailable at times, and it may change or stop."],
      ["Changes", "If these terms change, you are asked to accept them again before you continue."],
      ["Contact", "Questions or complaints: send feedback in the app (Messages > Feedback)."],
    ],
    accept: "I have read and accept the terms of use and privacy statement, including that the administrator can see my email address",
    showEmail: "Show my email address to the people I am connected to (housemates, people at my meals, friends)",
    showEmailHelp: "You can change this at any time on your profile.",
    version: "Version {version}, {date}",
  },
  nl: {
    title: "Gebruiksvoorwaarden en privacy",
    intro: "Splitskebab is een gratis app voor studenten die samen wonen of eten. Lees even wat de app met je gegevens doet. Kort gezegd: je e-mailadres blijft privé, er wordt niets verkocht en jij bepaalt wat anderen zien.",
    sections: [
      ["Wie Splitskebab beheert", "Splitskebab is een privéproject zonder winstoogmerk van Nino Otten (de beheerder). Er zijn geen advertenties en je gegevens worden nooit verkocht of gedeeld met iemand buiten de app."],
      ["Je account", "Je logt in met je Google-account. Wees respectvol tegen de mensen met wie je maaltijden plant en chat. De beheerder kan een account blokkeren dat de app misbruikt."],
      ["Wat iedereen met een account kan zien", "Je naam en profielfoto (van Google, of die je zelf kiest op je profiel), zodat mensen je kunnen vinden en aan een huis kunnen toevoegen."],
      ["Wat alleen de mensen met wie je verbonden bent kunnen zien", "Je allergieën, je betaallink en je vrienden. Verbonden betekent: mensen in je huizen en groepen, mensen bij de maaltijden die je kunt zien, en je vrienden."],
      ["Je e-mailadres", "Andere gebruikers zien je e-mailadres nooit, tenzij je op je profiel \"Mijn e-mailadres tonen\" aanzet; dan zien alleen de mensen met wie je verbonden bent het. Door deze voorwaarden te accepteren geef je de beheerder toestemming je e-mailadres te zien in het gebruikersbeheer van de app, om je te herkennen en je over je account te benaderen. Google bewaart het ook om in te loggen (ook daar kan de beheerder het zien), en het wordt nergens anders voor gebruikt."],
      ["Allergieën zijn gezondheidsgegevens", "Je allergieën invullen is niet verplicht. Doe je het wel, dan geef je uitdrukkelijk toestemming dat de mensen met wie je eet ze zien. Splitskebab markeert recepten met jouw allergenen als hulp, maar kan zich vergissen: controleer altijd zelf de ingrediënten en de verpakking. De beheerder is niet aansprakelijk voor allergische reacties."],
      ["Geld", "Splitskebab rekent alleen uit wie wie wat schuldig is en toont betaallinks. Betalen gebeurt buiten de app (je bank, Tikkie, bunq, PayPal). Controleer een bedrag voordat je het betaalt. De beheerder is niet verantwoordelijk voor betalingen tussen gebruikers."],
      ["Berichten en meldingen", "Berichten worden bewaard zodat de mensen in een chat ze kunnen lezen; de beheerder leest je chats niet, alleen de feedback die je naar de beheerders stuurt. Voor meldingen worden het pushadres van je apparaat en je taal bewaard, tot je ze uitzet of uitlogt."],
      ["Waar je gegevens staan", "In Google Firebase, in datacentra in de Europese Unie, beveiligd met regels die alleen de juiste mensen elk deel laten lezen."],
      ["Je rechten", "Je kunt je gegevens inzien, verbeteren en laten verwijderen: het meeste op je profiel, de rest door het te vragen. Om je account en alles erin te laten verwijderen stuur je feedback (Berichten > Feedback): dat gebeurt binnen 30 dagen."],
      ["Geen garanties", "Splitskebab wordt aangeboden zoals het is. De app kan fouten bevatten of soms niet beschikbaar zijn, en kan veranderen of stoppen."],
      ["Wijzigingen", "Als deze voorwaarden veranderen, word je gevraagd ze opnieuw te accepteren voordat je verder kunt."],
      ["Contact", "Vragen of klachten: stuur feedback in de app (Berichten > Feedback)."],
    ],
    accept: "Ik heb de gebruiksvoorwaarden en privacyverklaring gelezen en ga ermee akkoord, ook dat de beheerder mijn e-mailadres kan zien",
    showEmail: "Mijn e-mailadres tonen aan de mensen met wie ik verbonden ben (huisgenoten, mensen bij mijn maaltijden, vrienden)",
    showEmailHelp: "Je kunt dit altijd aanpassen op je profiel.",
    version: "Versie {version}, {date}",
  },
};

export const LANGS = ["en", "nl"];
export const TEXT_FIELDS = ["title", "intro", "accept", "showEmail", "showEmailHelp"];
export const LIMITS = { title: 200, intro: 4000, accept: 1000, showEmail: 1000, showEmailHelp: 1000, heading: 200, body: 6000, sections: 40 };

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** One language of stored terms, checked: every field text of a sane size, sections as { h, b }; a field that is missing or empty
 *  takes the built-in text, so a broken save can never leave the accept box without words. */
export function cleanTermsText(raw, lang) {
  const fallback = TERMS[lang] || TERMS.en;
  const out = {};
  for (const k of TEXT_FIELDS) out[k] = str(raw?.[k], LIMITS[k]) || fallback[k];
  const sections = Array.isArray(raw?.sections) ? raw.sections : null;
  out.sections = sections
    ? sections.slice(0, LIMITS.sections).map((x) => ({ h: str(x?.h, LIMITS.heading), b: str(x?.b, LIMITS.body) })).filter((x) => x.h || x.b)
    : fallback.sections.map(([h, b]) => ({ h, b }));
  if (!out.sections.length) out.sections = fallback.sections.map(([h, b]) => ({ h, b }));
  return out;
}

/** The terms in force: { version, updatedAt (ms or null), en, nl } from the stored document, or the built-in version 1 without one. */
export function termsFrom(doc) {
  const version = Number.isInteger(doc?.version) && doc.version >= 1 ? doc.version : DEFAULT_VERSION;
  return {
    version,
    updatedAt: doc ? doc.updatedAt ?? null : Date.parse(`${DEFAULT_DATE}T00:00:00Z`),
    en: cleanTermsText(doc?.en, "en"),
    nl: cleanTermsText(doc?.nl, "nl"),
  };
}

/** The sections as editor text: "## Heading" on its own line, the text under it, a blank line between sections. */
export const sectionsToText = (sections) => sections.map((x) => `## ${x.h}\n${x.b}`).join("\n\n");

/** Editor text back to sections: a line starting with "## " starts a new section; the lines under it are its text. */
export function textToSections(text) {
  const out = [];
  for (const line of String(text || "").replace(/\r\n?/g, "\n").split("\n")) {
    if (/^##\s/.test(line)) out.push({ h: line.replace(/^##\s+/, "").trim(), b: "" });
    else if (out.length) out[out.length - 1].b += (out[out.length - 1].b ? "\n" : "") + line;
    else if (line.trim()) out.push({ h: "", b: line });
  }
  return out.map((x) => ({ h: x.h.slice(0, LIMITS.heading), b: x.b.trim().slice(0, LIMITS.body) })).filter((x) => x.h || x.b).slice(0, LIMITS.sections);
}

/** The terms as HTML in a language: a heading per section, line breaks kept. Every text goes through esc (passed in: this stays pure). */
export function termsHtml(terms, lang, esc, formatDate = (ms) => new Date(ms).toISOString().slice(0, 10)) {
  const text = terms[lang] || terms.en;
  const version = TERMS[lang]?.version || TERMS.en.version;
  const when = terms.updatedAt ? `, ${formatDate(terms.updatedAt)}` : "";
  return `<p class="text-pre-line">${esc(text.intro)}</p>${text.sections.map((x) => `${x.h ? `<h2 class="h6 mt-3 mb-1">${esc(x.h)}</h2>` : ""}<p class="mb-2 text-pre-line">${esc(x.b)}</p>`).join("")}
    <p class="small text-body-secondary mt-3 mb-0">${esc(version.replace("{version}", terms.version).replace(", {date}", when))}</p>`;
}
