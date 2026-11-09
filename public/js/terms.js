// The terms of use and privacy statement, in English and Dutch: shown when someone creates an account (and to everyone once when the
// version goes up), and on terms.html to read at any time. Accepting writes TERMS_VERSION to users/{uid} (firestore.rules termsOk).
// Raise TERMS_VERSION whenever the text changes in substance: everyone is then asked to accept again before they can go on.
export const TERMS_VERSION = 1;
export const TERMS_DATE = "2026-11-09";

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

/** The terms as HTML in a language: a heading per section. Every text is escaped by esc (passed in, so this module stays pure). */
export function termsHtml(lang, esc) {
  const terms = TERMS[lang] || TERMS.en;
  return `<p>${esc(terms.intro)}</p>${terms.sections.map(([head, body]) => `<h2 class="h6 mt-3 mb-1">${esc(head)}</h2><p class="mb-2">${esc(body)}</p>`).join("")}
    <p class="small text-body-secondary mt-3 mb-0">${esc(terms.version.replace("{version}", TERMS_VERSION).replace("{date}", TERMS_DATE))}</p>`;
}
