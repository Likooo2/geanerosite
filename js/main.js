/* ════════════════════════════════════════════════════════════════════
   GEAnérosité — script principal
   Pas besoin de toucher à ce fichier : tout se règle dans js/config.js.

   Astuces pour tester l'affichage sans rien modifier :
     index.html?etat=avant    → avant la collecte
     index.html?etat=direct   → pendant la collecte
     index.html?etat=apres    → après la collecte
     index.html?maintenant=2026-11-18T10:30  → simule une date et une heure
   ════════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const $ = (sel, racine = document) => racine.querySelector(sel);
  const $$ = (sel, racine = document) => Array.from(racine.querySelectorAll(sel));
  const html = document.documentElement;
  const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  initMenu();
  initModales();
  initBandeaux();

  if (typeof CONFIG === "undefined" || !CONFIG) {
    const erreur = $("#erreur-config");
    if (erreur) erreur.hidden = false;
    console.error("GEAnérosité : js/config.js est introuvable ou contient une erreur (virgule ou guillemet oublié ?).");
    return;
  }

  const C = CONFIG;
  const L = C.liens || {};
  const K = C.compteurs || {};
  const TZ = "Europe/Paris";
  const params = new URLSearchParams(window.location.search);
  const brouillon = !!C.modeBrouillon;


  /* ───────────────────── Petits outils ───────────────────── */

  function esc(valeur) {
    return String(valeur ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function lire(chemin) {
    return chemin.split(".").reduce((objet, cle) => (objet == null ? undefined : objet[cle]), C);
  }
  function nombre(v) {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  const texte = (v) => String(v ?? "").trim();

  const formatNombre = new Intl.NumberFormat("fr-FR");
  const formatDecimal = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  const formatEuros0 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const formatEuros2 = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sansEspaceFine = (s) => s.replace(/[\u202F\u2009]/g, "\u00A0");
  function euros(v) {
    const n = Math.round((Number(v) || 0) * 100) / 100;
    return sansEspaceFine(Number.isInteger(n) ? formatEuros0.format(n) : formatEuros2.format(n));
  }
  const entier = (v) => sansEspaceFine(formatNombre.format(Math.round(Number(v) || 0)));
  const poids = (v) => sansEspaceFine(formatDecimal.format(Math.max(0, Number(v) || 0))) + "\u00A0kg";

  function aConfirmer(mot) {
    return `<span class="a-confirmer"${brouillon ? " data-exemple" : ""}>${esc(mot || "à confirmer")}</span>`;
  }

  /* ───── Les dates de la journée ───── */
  const dates = C.dates || {};
  function lireDate(v) {
    if (!v) return null;
    let s = texte(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) s += "T12:00:00";
    else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) s += ":00";
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(s)) s += "+01:00";
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  const estUneDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(texte(v));
  const jour1 = estUneDate(dates.jourDebut) ? texte(dates.jourDebut) : (estUneDate(dates.jourCollecte) ? texte(dates.jourCollecte) : "");
  const jour2 = estUneDate(dates.jourFin) ? texte(dates.jourFin) : jour1;
  const heureOuverture = /^\d{1,2}:\d{2}$/.test(texte(dates.ouverture)) ? texte(dates.ouverture).padStart(5, "0") : "08:00";
  const heureFermeture = /^\d{1,2}:\d{2}$/.test(texte(dates.fermeture)) ? texte(dates.fermeture).padStart(5, "0") : "18:00";
  // Ouverture du premier jour et fermeture du dernier
  const debut = jour1 ? lireDate(jour1 + "T" + heureOuverture) : null;
  const fin = jour2 ? lireDate(jour2 + "T" + heureFermeture) : null;
  const jours = jour1 ? [jour1].concat(jour2 && jour2 !== jour1 ? [jour2] : []) : [];
  const dateConfirmee = !!dates.dateConfirmee;

  let decalage = 0;
  const simulation = lireDate(params.get("maintenant"));
  if (simulation) decalage = simulation.getTime() - Date.now();
  const maintenant = () => new Date(Date.now() + decalage);

  const fJour = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TZ });
  const fJourCourt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: TZ });
  const fHeure = new Intl.DateTimeFormat("fr-FR", { hour: "numeric", minute: "2-digit", hourCycle: "h23", timeZone: TZ });
  const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  function heure(d, avecMinutes) {
    const parts = fHeure.formatToParts(d);
    const h = Number((parts.find((p) => p.type === "hour") || {}).value);
    const m = (parts.find((p) => p.type === "minute") || {}).value || "00";
    return m === "00" && !avecMinutes ? `${h}h` : `${h}h${m}`;
  }
  function formaterDate(d, format) {
    switch (format) {
      case "Jour": return majuscule(fJour.format(d));
      case "jourCourt": return fJourCourt.format(d);
      case "heure": return heure(d, false);
      default: return fJour.format(d);
    }
  }
  function heureTexte(hhmm) {
    const [hh, mm] = hhmm.split(":");
    return mm === "00" ? `${Number(hh)}h` : `${Number(hh)}h${mm}`;
  }

  /* Les jours, écrits comme on les dirait :
     un seul  → « jeudi 12 novembre »
     deux     → « jeudi 12 et vendredi 13 novembre »
     plus     → « du jeudi 12 au samedi 14 novembre » */
  function joursTexte(avecMajuscule) {
    if (!jours.length) return "";
    const dates2 = jours.map((j) => lireDate(j + "T12:00")).filter(Boolean);
    let t;
    if (dates2.length === 1) t = fJourCourt.format(dates2[0]);
    else if (dates2.length === 2) {
      const premier = fJourCourt.format(dates2[0]).replace(/\s+\S+$/, "");   // sans le mois
      t = `${premier} et ${fJourCourt.format(dates2[1])}`;
    } else t = `du ${fJourCourt.format(dates2[0])} au ${fJourCourt.format(dates2[dates2.length - 1])}`;
    return avecMajuscule ? majuscule(t) : t;
  }
  const horairesTexte = () => texte(dates.horairesTexte) || `de ${heureTexte(heureOuverture)} à ${heureTexte(heureFermeture)}`;
  const plusieursJours = () => jours.length > 1;

  /* Créneau d'ouverture d'un jour donné (par son numéro dans « jours ») */
  function creneau(i) {
    if (!jours[i]) return null;
    return { ouvre: lireDate(jours[i] + "T" + heureOuverture), ferme: lireDate(jours[i] + "T" + heureFermeture) };
  }
  /* Sommes-nous dans un créneau maintenant ? Sinon, quand rouvre-t-on ? */
  function creneauActuel() {
    const t = maintenant().getTime();
    for (let i = 0; i < jours.length; i++) {
      const c = creneau(i);
      if (!c) continue;
      if (t < c.ouvre.getTime()) return { etat: "ferme", prochain: c };
      if (t < c.ferme.getTime()) return { etat: "ouvert", courant: c };
    }
    return { etat: "termine" };
  }
  const ouvertureTexte = () => (debut ? heure(debut) : heureTexte(heureOuverture));
  const fermetureTexte = () => (fin ? heure(fin) : heureTexte(heureFermeture));

  function etatForce() {
    const v = texte(params.get("etat") || C.forcerEtat).toLowerCase().replace("è", "e");
    return ["avant", "direct", "apres"].includes(v) ? v : "";
  }
  function etatActuel() {
    const force = etatForce();
    if (force) return force;
    if (!debut) return "avant";
    const t = maintenant();
    if (t < debut) return "avant";
    if (fin && t < fin) return "direct";
    return "apres";
  }

  function typographie(racine) {
    if (!racine) return;
    const marcheur = document.createTreeWalker(racine, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement && !n.parentElement.closest("script, style, code") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
    });
    const noeuds = [];
    while (marcheur.nextNode()) noeuds.push(marcheur.currentNode);
    noeuds.forEach((n) => {
      const avant = n.nodeValue;
      const apres = avant
        .replace(/ ([!?;»])/g, "\u00A0$1")
        .replace(/« /g, "«\u00A0")
        .replace(/ :/g, "\u00A0:")
        .replace(/(\d) (€|%|kg\b)/g, "$1\u00A0$2");
      if (apres !== avant) n.nodeValue = apres;
    });
  }

  function quandVisible(el, action, seuil) {
    if (!el) return;
    if (!("IntersectionObserver" in window)) { action(el); return; }
    const io = new IntersectionObserver((entrees) => {
      if (entrees.some((e) => e.isIntersecting)) { io.disconnect(); action(el); }
    }, { threshold: seuil || 0.25 });
    io.observe(el);
  }

  function secoursImages(racine, selecteurParent, remplacement) {
    $$("img", racine).forEach((img) => {
      img.addEventListener("error", () => {
        const parent = img.closest(selecteurParent);
        console.warn("GEAnérosité : image introuvable → " + img.getAttribute("src"));
        if (parent) parent.innerHTML = remplacement;
      }, { once: true });
    });
  }


  /* ───────────────────── Les liens (jamais de faux lien) ───────────────────── */

  const NOMS_LIENS = {
    instagram: "Instagram", facebook: "Facebook",
    email: "l'adresse e-mail", facebook: "Facebook",
  };
  function urlValide(cle) {
    const v = texte(L[cle]);
    if (!v) return "";
    if (cle === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? v : "";
    return /^https:\/\/[^\s]+\.[^\s]+$/.test(v) ? v : "";
  }
  function appliquerLiens(racine = document) {
    $$("[data-lien]", racine).forEach((a) => {
      const cle = a.dataset.lien;
      const url = urlValide(cle);
      if (url) {
        a.href = cle === "email" ? "mailto:" + url : url;
        if (cle !== "email") { a.target = "_blank"; a.rel = "noopener"; }
        if (a.hasAttribute("data-afficher")) a.textContent = url;
        a.classList.remove("est-inactif");
        a.removeAttribute("aria-disabled");
        a.removeAttribute("data-exemple");
        a.removeAttribute("title");
      } else {
        a.removeAttribute("href");
        a.removeAttribute("target");
        a.classList.add("est-inactif");
        a.setAttribute("aria-disabled", "true");
        a.setAttribute("title", "Lien bientôt disponible");
        if (brouillon) a.setAttribute("data-exemple", "");
        if (a.hasAttribute("data-afficher")) a.textContent = "adresse bientôt disponible";
      }
    });
    $$("[data-destination]", racine).forEach((p) => {
      const cle = p.dataset.destination;
      const url = urlValide(cle);
      if (url) {
        let hote = "";
        try { hote = cle === "email" ? "" : new URL(url).hostname.replace(/^www\./, ""); } catch (err) { hote = ""; }
        p.innerHTML = cle === "email"
          ? `Ouvre votre messagerie : <strong>${esc(url)}</strong>`
          : (/(^|\.)helloasso\.com$/.test(hote)
            ? "🔒 Paiement sécurisé sur <strong>HelloAsso</strong>, au profit de l'association"
            : `Ouvre <strong>${esc(hote)}</strong> dans un nouvel onglet`);
        p.classList.remove("destination-manquante");
        p.removeAttribute("data-exemple");
      } else {
        p.innerHTML = brouillon
          ? `⚠️ Lien à ajouter dans <code>js/config.js</code> → <code>liens.${esc(cle)}</code>`
          : `Lien bientôt disponible pour ${esc(NOMS_LIENS[cle] || "cette action")}.`;
        p.classList.add("destination-manquante");
        if (brouillon) p.setAttribute("data-exemple", "");
      }
    });
  }

  function appliquerTextes() {
    $$("[data-bind]").forEach((el) => {
      const v = lire(el.dataset.bind);
      if (v !== undefined && v !== null && v !== "") el.textContent = v;
    });
    const parDate = { jourCollecte: debut, finCollecte: fin };
    $$("[data-date]").forEach((el) => {
      const d = parDate[el.dataset.date];
      if (d) el.textContent = formaterDate(d, el.dataset.format || "jourCourt");
    });
    $$(".quand-ouverture").forEach((el) => { el.textContent = ouvertureTexte(); });
    $$(".quand-fermeture").forEach((el) => { el.textContent = fermetureTexte(); });
    $$(".quand-horaires").forEach((el) => { el.textContent = horairesTexte(); });
    const quand = debut
      ? `${joursTexte(true)}, ${horairesTexte()}`
      : `${majuscule(horairesTexte())}`;
    $("#hero-quand").textContent = quand;
    $("#hero-objectif").textContent = poids(objectifKg);
  }


  /* ───────────────────── Les kilos : compteur et carton ───────────────────── */

  const kg = Math.max(0, nombre(K.kg) || 0);
  const objectifKg = Math.max(1, nombre(K.objectifKg) || 300);
  const pourcent = (kg / objectifKg) * 100;
  const pourcentTexte = Math.floor(pourcent) + "\u00A0%";
  const kgParVetement = Math.max(0.05, nombre(C.kgParVetement) || 0.25);

  const SEGMENTS = {
    a: "8,5 12,1 38,1 42,5 38,9 12,9",
    b: "45,8 49,12 49,38 45,42 41,38 41,12",
    c: "45,48 49,52 49,78 45,82 41,78 41,52",
    d: "8,85 12,81 38,81 42,85 38,89 12,89",
    e: "5,48 9,52 9,78 5,82 1,78 1,52",
    f: "5,8 9,12 9,38 5,42 1,38 1,12",
    g: "8,45 12,41 38,41 42,45 38,49 12,49",
  };
  const ALLUMES = { 0: "abcdef", 1: "bc", 2: "abdeg", 3: "abcdg", 4: "bcfg", 5: "acdfg", 6: "acdefg", 7: "abc", 8: "abcdefg", 9: "abcdfg", "-": "g", " ": "" };
  const NS = "http://www.w3.org/2000/svg";

  function creerChiffre() {
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 50 90");
    svg.setAttribute("class", "seg7");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    Object.keys(SEGMENTS).forEach((nom) => {
      const p = document.createElementNS(NS, "polygon");
      p.setAttribute("points", SEGMENTS[nom]);
      p.setAttribute("data-s", nom);
      svg.appendChild(p);
    });
    return svg;
  }
  function afficherChiffre(svg, c) {
    if (svg.getAttribute("data-v") === c) return;
    svg.setAttribute("data-v", c);
    const allumes = ALLUMES[c] || "";
    svg.querySelectorAll("polygon").forEach((p) => p.classList.toggle("on", allumes.includes(p.getAttribute("data-s"))));
  }
  function construireEcran(groupes) {
    const zone = $("#lcd-chiffres");
    zone.textContent = "";
    groupes.forEach((g, i) => {
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "lcd-sep";
        sep.setAttribute("aria-hidden", "true");
        zone.appendChild(sep);
      }
      const bloc = document.createElement("div");
      bloc.className = "lcd-groupe";
      const nums = document.createElement("div");
      nums.className = "lcd-nums";
      for (let k = 0; k < (g.nb || 2); k++) nums.appendChild(creerChiffre());
      bloc.appendChild(nums);
      if (g.label) {
        const label = document.createElement("span");
        label.className = "lcd-label";
        label.setAttribute("aria-hidden", "true");
        label.textContent = g.label;
        bloc.appendChild(label);
      }
      zone.appendChild(bloc);
    });
  }
  function majEcran(valeurs) {
    $$("#lcd-chiffres .lcd-groupe").forEach((bloc, i) => {
      const svgs = $$(".seg7", bloc);
      const t = String(valeurs[i] ?? "").padStart(svgs.length, " ").slice(-svgs.length);
      svgs.forEach((svg, k) => afficherChiffre(svg, t[k]));
    });
  }
  const deux = (n) => String(n).padStart(2, "0");
  function ledNombre(el, valeur) {
    const t = String(Math.max(0, Math.round(Number(valeur) || 0)));
    el.textContent = "";
    for (const c of t) {
      const svg = creerChiffre();
      el.appendChild(svg);
      afficherChiffre(svg, c);
    }
  }

  function rendreLedKilos() {
    const n = 20;
    let pleins = Math.round((Math.min(100, pourcent) / 100) * n);
    if (kg > 0) pleins = Math.max(1, pleins);
    $("#led-barre").innerHTML = Array.from({ length: n }, (_, i) => `<span class="led${i < pleins ? " allumee" : ""}"></span>`).join("");
    $("#panneau-pourcent").textContent = pourcentTexte;
    $("#panneau-kg").textContent = poids(kg);
    $("#panneau-objectif").textContent = poids(objectifKg);
  }

  let etatCourant = null;
  const titreOriginal = document.title;

  function rendreEtat(e) {
    html.dataset.etat = e;
    const titre = $("#panneau-titre");
    const message = $("#panneau-message");
    const zone = $("#lcd-chiffres");
    const agenda = $("#panneau-agenda");

    if (e === "avant") {
      titre.textContent = "La collecte ouvre dans";
      construireEcran([{ label: "jours" }, { label: "heures" }, { label: "min" }, { label: "sec" }]);
      majEcran(["--", "--", "--", "--"]);
      if (debut) {
        message.innerHTML = `<p class="panneau-date">${esc(joursTexte(true))}, ${esc(horairesTexte())}${dateConfirmee ? "" : " " + aConfirmer("dates provisoires")}</p>`;
        zone.setAttribute("aria-label", `Compte à rebours jusqu'à l'ouverture de la collecte, ${joursTexte(false)} à ${ouvertureTexte()}`);
        if (agenda) agenda.hidden = false;
      } else {
        message.innerHTML = `<span class="sticker sticker-jaune"${brouillon ? " data-exemple" : ""}>Dates à confirmer</span><p class="panneau-date">Les dates de la collecte seront annoncées ici.</p>`;
        zone.removeAttribute("aria-label");
        if (agenda) agenda.hidden = true;
      }
    } else if (e === "direct") {
      const creneauEnCours = creneauActuel();
      titre.innerHTML = creneauEnCours.etat === "ouvert"
        ? '<span class="point-direct" aria-hidden="true"></span>Collecte en cours'
        : "On rouvre dans";
      titre.dataset.creneau = creneauEnCours.etat;
      construireEcran([{ label: "h", nb: 1 }, { label: "min" }, { label: "sec" }]);
      const info = creneauActuel();
      if (info.etat === "ferme" && info.prochain) {
        message.innerHTML = `<p class="panneau-date">C'est fermé pour ce soir&nbsp;: on rouvre ${esc(formaterDate(info.prochain.ouvre, "jourCourt"))} à ${esc(ouvertureTexte())}.</p>`;
      } else {
        message.innerHTML = `<p class="panneau-date">avant la fermeture, à ${esc(fermetureTexte())}. On vous attend&nbsp;!</p>`;
      }
      zone.setAttribute("aria-label", "La collecte est en cours");
      if (agenda) agenda.hidden = true;
    } else {
      titre.textContent = "Merci !";
      construireEcran([]);
      message.innerHTML = `<p class="panneau-date">${kg > 0
        ? `👕 <strong>${esc(poids(kg))}</strong> de vêtements collectés`
        : "La collecte est terminée. Merci à toutes et à tous !"}</p>`;
      zone.removeAttribute("aria-label");
      if (agenda) agenda.hidden = true;
    }
    document.title = e === "direct" ? "🔴 COLLECTE EN COURS : " + titreOriginal : titreOriginal;
    typographie($(".panneau"));
  }

  function tic() {
    const e = etatActuel();
    if (e !== etatCourant) { etatCourant = e; rendreEtat(e); }
    const t = maintenant().getTime();
    if (e === "avant" && debut) {
      let s = Math.max(0, Math.floor((debut.getTime() - t) / 1000));
      const j = Math.floor(s / 86400); s -= j * 86400;
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      majEcran([deux(Math.min(j, 99)), deux(h), deux(m), deux(s)]);
    } else if (e === "direct" && fin) {
      const info = creneauActuel();
      const cible = info.etat === "ouvert" ? info.courant.ferme : (info.prochain ? info.prochain.ouvre : fin);
      let s = Math.max(0, Math.floor((cible.getTime() - t) / 1000));
      const h = Math.floor(s / 3600); s -= h * 3600;
      const m = Math.floor(s / 60); s -= m * 60;
      majEcran([String(Math.min(h, 9)), deux(m), deux(s)]);
      const titre = $("#panneau-titre");
      if (titre && titre.dataset.creneau !== info.etat) rendreEtat("direct");
    }
  }

  function initAgenda() {
    if (!debut || !fin) return;
    const asso = texte(lire("association.nom")) || "l'association";
    const titre = "GEAnérosité : collecte de vêtements à l'IUT";
    const lieu = [texte((C.collecte || {}).lieu), texte((C.collecte || {}).salle)].filter(Boolean).join(", ");
    const details = `Apportez les vêtements que vous ne mettez plus : tout est remis à ${asso}.`;
    const ics = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const premier = creneau(0) || { ouvre: debut, ferme: fin };
    const google = new URLSearchParams({
      action: "TEMPLATE", text: titre,
      details: details + (plusieursJours() ? " Collecte aussi " + formaterDate(creneau(1).ouvre, "jourCourt") + "." : ""),
      location: lieu || "IUT d'Amiens",
      dates: `${ics(premier.ouvre)}/${ics(premier.ferme)}`,
    });
    $("#agenda-google").href = "https://calendar.google.com/calendar/render?" + google.toString();
    const echap = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
    const evenements = jours.map((j, i) => {
      const c = creneau(i);
      if (!c || !c.ouvre || !c.ferme) return [];
      return [
        "BEGIN:VEVENT", "UID:geanerosite-" + ics(c.ouvre) + "@geanerosite",
        "DTSTAMP:" + ics(new Date()), "DTSTART:" + ics(c.ouvre), "DTEND:" + ics(c.ferme),
        "SUMMARY:" + echap(titre), "DESCRIPTION:" + echap(details), "LOCATION:" + echap(lieu || "IUT d'Amiens"),
        "BEGIN:VALARM", "TRIGGER:-PT2H", "ACTION:DISPLAY", "DESCRIPTION:" + echap("Pense à apporter ton sac de vêtements !"), "END:VALARM",
        "END:VEVENT",
      ];
    }).reduce((t, x) => t.concat(x), []);
    const fichier = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//GEAnerosite//FR", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    ].concat(evenements, ["END:VCALENDAR"]).join("\r\n");
    try {
      $("#agenda-ics").href = URL.createObjectURL(new Blob([fichier], { type: "text/calendar;charset=utf-8" }));
    } catch (err) {
      $("#agenda-ics").hidden = true;
    }
  }


  /* ───────────────────── L'objectif : le carton qui se remplit ───────────────────── */

  function rendreObjectif() {
    $("#jauge-kg").textContent = poids(kg);
    $("#jauge-objectif").textContent = poids(objectifKg);
    $("#titre-kg").textContent = poids(objectifKg);
    $("#jauge-pourcent").textContent = pourcentTexte;

    const compteur = $("#compteur");
    compteur.setAttribute("aria-valuemax", String(Math.max(objectifKg, kg)));
    compteur.setAttribute("aria-valuenow", String(kg));
    compteur.setAttribute("aria-valuetext", `${poids(kg)} collectés sur ${poids(objectifKg)}, soit ${pourcentTexte} de l'objectif`);

    $("#carton-graduations").innerHTML = [0.25, 0.5, 0.75, 1]
      .map((g) => `<li class="${g === 1 ? "graduation-haut" : ""}" style="--g:${g}">${esc(poids(Math.round(objectifKg * g)))}</li>`).join("");

    const avancee = Math.max(0, Math.min(1, kg / objectifKg));
    const remplissage = $("#carton-remplissage");
    const placer = () => remplissage.style.setProperty("--p", avancee.toFixed(4));
    if (mouvementReduit) placer();
    else quandVisible($(".carton-interieur"), () => requestAnimationFrame(placer), 0.25);

    $("#maj-compteurs").hidden = !texte(K.miseAJour);
  }

  /* ───────────────────── Infos pratiques et vêtements ───────────────────── */

  function rendreInfos() {
    const col = C.collecte || {};
    const lieu = texte(col.lieu) || "IUT d'Amiens";
    const salle = texte(col.salle);
    const infos = [
      { emoji: "📍", label: "Où", large: true, valeur: salle
        ? `${esc(salle)}<span class="fiche-lieu">${esc([texte(col.precisionLieu), lieu].filter(Boolean).join(" · "))}</span>`
        : `${esc(lieu)} — salle ${aConfirmer("à confirmer")}` },
      { emoji: "📅", label: "Quand", valeur: debut ? joursTexte(true) + (dateConfirmee ? "" : " " + aConfirmer("dates provisoires")) : aConfirmer("dates à confirmer") },
      { emoji: "🕗", label: "Horaires", valeur: majuscule(horairesTexte()) + (texte(dates.horairesTexte) ? "" : ", en continu") },
      { emoji: "🙋", label: "Pour qui", valeur: esc(texte(col.quiPeutVenir || col.public) || "Ouvert à tous") },
      { emoji: "💶", label: "Combien", valeur: "Gratuit, sans inscription" },
    ];
    $("#infos-collecte").innerHTML = infos.map((i2) => `<li class="fiche-info${i2.large ? " fiche-info-large" : ""}">
        <span class="fiche-label"><span aria-hidden="true">${i2.emoji}</span> ${esc(i2.label)}</span>
        <span class="fiche-valeur">${i2.valeur}</span>
      </li>`).join("");
    $("#liste-conseils").innerHTML = (col.conseils || []).map((x) => `<li>${esc(x)}</li>`).join("");
    $("#liste-accepte").innerHTML = (col.accepte || []).map((x) => `<li>${esc(x)}</li>`).join("");
    $("#liste-eviter").innerHTML = (col.aEviter || []).map((x) => `<li>${esc(x)}</li>`).join("");

    const reseaux = [];
    if (urlValide("instagram")) reseaux.push('<a data-lien="instagram">Instagram</a>');
    if (urlValide("facebook")) reseaux.push('<a data-lien="facebook">Facebook</a>');
    const bloc = $("#bloc-reseaux");
    const suivre = reseaux.length === 2 ? reseaux[0] + " et " + reseaux[1] : reseaux[0];
    const ecrire = urlValide("email") ? ` Une question ? <a data-lien="email" data-afficher>écrivez-nous</a>.` : "";
    bloc.innerHTML = (reseaux.length
      ? `Partagez le lien de ce site, et suivez le projet sur ${suivre}.`
      : "Partagez simplement le lien de ce site : c'est le plus efficace.") + ecrire;
    appliquerLiens(bloc);
  }


  /* ───────────────────── Association et équipe ───────────────────── */

  function rendreQui() {
    const a = C.association || {};
    const nom = texte(a.nom) || "l'association";
    const logo = $("#asso-logo");
    const secours = `<span class="asso-logo-texte"${brouillon ? " data-exemple" : ""}>${esc(nom)}</span>`;
    logo.innerHTML = texte(a.logo) ? `<img src="${esc(a.logo)}" alt="Logo de ${esc(nom)}" loading="lazy" decoding="async">` : secours;
    secoursImages(logo, ".asso-logo", secours);
    if (texte(a.nomComplet)) { $("#asso-sigle").textContent = a.nomComplet; $("#asso-sigle").hidden = false; }
    $("#asso-presentation").innerHTML = (a.presentation || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const tel = texte(a.telephone);
    if (tel) {
      const liens = tel.split(/[\/·,]+/).map((t) => t.trim()).filter(Boolean)
        .map((t) => `<a href="tel:${esc(t.replace(/[^0-9+]/g, ""))}">${esc(t)}</a>`).join(" · ");
      $("#asso-contact").innerHTML = `Contacter l'association : ${liens}`;
      $("#asso-contact").hidden = false;
    }
    const site = /^https:\/\/\S+\.\S+$/.test(texte(a.site)) ? texte(a.site) : "";
    if (site) {
      let hote = "";
      try { hote = new URL(site).hostname.replace(/^www\./, ""); } catch (e) { hote = ""; }
      const libelle = /facebook\.com$/.test(hote) ? "Voir la page Facebook de l'association"
        : /instagram\.com$/.test(hote) ? "Voir l'Instagram de l'association"
        : "Voir le site de l'association";
      const lien = $("#asso-site");
      lien.href = site;
      lien.textContent = libelle;
      $("#asso-site-ligne").hidden = false;
    }

    const rotations = [-2, 1.5, -1.2, 2];
    const silhouette = '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><circle cx="50" cy="38" r="18" fill="#16161b" opacity=".25"/><path d="M14 96 C 18 66, 34 58, 50 58 C 66 58, 82 66, 86 96 Z" fill="#16161b" opacity=".25"/></svg>';
    $("#equipe").innerHTML = (C.equipe || []).map((m, i) => {
      const nomMembre = texte(m.nom || m.prenom);
      const photo = texte(m.photo);
      return `<li class="polaroid${photo ? "" : " polaroid-sans-photo"}" style="--rot:${rotations[i % rotations.length]}deg">
          ${photo ? `<div class="polaroid-photo"><img src="${esc(photo)}" alt="Photo de ${esc(nomMembre || "l'équipe")}" loading="lazy" decoding="async"></div>` : ""}
          <p class="polaroid-nom">${nomMembre ? esc(nomMembre) : aConfirmer("prénom à ajouter")}</p>
          ${texte(m.role) ? `<p class="polaroid-role">${esc(m.role)}</p>` : ""}
        </li>`;
    }).join("");
    secoursImages($("#equipe"), ".polaroid-photo", silhouette);
    if (!(C.equipe || []).some((m) => texte(m.photo))) $("#equipe").classList.add("equipe-noms");

    logoPied($("#logo-projet"), C.logoProjet, "Logo GEAnérosité", "GEAnérosité");
    logoPied($("#logo-iut"), C.logoIUT, "Logo de l'IUT d'Amiens", "IUT d'Amiens");
    logoPied($("#logo-asso"), a.logo, "Logo de " + nom, nom);
    const resp = texte((C.mentionsLegales || {}).responsable);
    $("#mentions-responsable").innerHTML = resp ? esc(resp) : `Nom ${aConfirmer("à compléter")}`;
  }
  function logoPied(el, src, alt, nom) {
    if (!el) return;
    const secours = `<span class="pied-logo-texte"${brouillon ? " data-exemple" : ""}>${esc(nom)}</span>`;
    el.innerHTML = texte(src) ? `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async">` : secours;
    secoursImages(el, ".pied-logo", secours);
  }


  /* ───────────────────── Le titre de l'affiche remplit la largeur ─────────────────────
     Mesuré en JavaScript : chaque ligne est agrandie jusqu'à toucher les bords,
     sans jamais dépasser. Plus fiable que les unités CSS de conteneur, qui ne
     fonctionnent pas sur les navigateurs un peu anciens. */

  function ajusterTitre() {
    const cadre = $(".titre-cadre");
    if (!cadre) return;
    const largeur = cadre.clientWidth;
    if (!largeur) return;
    const maxi = [3, 6, 7.6];        // taille maximale de chaque ligne, en rem
    const base = 16;                 // 1rem en pixels, pour la mesure
    $$(".hero-titre span").forEach((ligne, i) => {
      ligne.style.fontSize = base + "px";
      const plage = document.createRange();
      plage.selectNodeContents(ligne);
      const naturelle = plage.getBoundingClientRect().width;
      if (!naturelle) { ligne.style.fontSize = ""; return; }
      const voulue = (largeur / naturelle) * base * 0.985;
      const plafond = (maxi[i] || 5) * base;
      ligne.style.fontSize = Math.min(voulue, plafond).toFixed(2) + "px";
    });
  }

  function initTitre() {
    ajusterTitre();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajusterTitre).catch(() => {});
    let attente = null;
    window.addEventListener("resize", () => {
      clearTimeout(attente);
      attente = setTimeout(ajusterTitre, 120);
    });
  }


  /* ───────────────────── Le quiz d'avis ─────────────────────
     Les questions viennent de js/config.js (partie 4).
     Envoi : FormSubmit si « service » vaut "formsubmit", sinon la messagerie
     du visiteur. En cas d'échec, le site propose toujours la messagerie. */

  const Q = C.quiz || {};
  const MOTIF_MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function questionsQuiz() {
    return (Array.isArray(Q.questions) ? Q.questions : []).filter((q) => texte(q.texte));
  }
  function idQuestion(q, i) {
    return "quiz-" + (texte(q.id) || "q" + (i + 1)).replace(/[^a-zA-Z0-9_-]/g, "");
  }
  function destinataireQuiz() {
    const d = texte(Q.destinataire) || texte(L.email);
    return MOTIF_MAIL.test(d) ? d : "";
  }

  function champQuiz(q, i) {
    const id = idQuestion(q, i);
    const type = texte(q.type) || "choix";
    const facultatif = !!q.facultatif;
    const libelle = `<span class="quiz-numero" aria-hidden="true">${i + 1}</span>${esc(q.texte)}` +
      (facultatif ? ' <span class="quiz-facultatif">facultatif</span>' : "");

    if (type === "choix" || type === "echelle") {
      let options = [];
      let classe = "";
      let legendes = "";
      if (type === "echelle") {
        const min = nombre(q.min) !== null ? Math.round(Number(q.min)) : 1;
        const max = nombre(q.max) !== null ? Math.round(Number(q.max)) : 5;
        for (let v = min; v <= Math.max(min, max); v++) options.push(String(v));
        classe = " quiz-echelle";
        legendes = `<p class="quiz-legendes"><span>${esc(q.legendeMin || "")}</span><span>${esc(q.legendeMax || "")}</span></p>`;
      } else {
        options = (Array.isArray(q.options) ? q.options : []).map(texte).filter(Boolean);
      }
      const choix = options.map((o) => `<label class="quiz-option">
              <input type="radio" name="${esc(id)}" value="${esc(o)}">
              <span>${esc(o)}</span>
            </label>`).join("");
      return `<li class="quiz-question">
          <fieldset>
            <legend class="quiz-libelle">${libelle}</legend>
            <div class="quiz-options${classe}" id="${esc(id)}">${choix}</div>
            ${legendes}
          </fieldset>
        </li>`;
    }
    if (type === "email") {
      return `<li class="quiz-question">
          <label class="quiz-libelle" for="${esc(id)}">${libelle}</label>
          <input class="quiz-champ" type="email" id="${esc(id)}" name="${esc(id)}" autocomplete="email" inputmode="email" placeholder="prenom@exemple.fr">
        </li>`;
    }
    return `<li class="quiz-question">
        <label class="quiz-libelle" for="${esc(id)}">${libelle}</label>
        <textarea class="quiz-champ" id="${esc(id)}" name="${esc(id)}" rows="3" placeholder="Dites-nous tout, même si ça pique un peu."></textarea>
      </li>`;
  }

  function lireQuiz() {
    const valeurs = [];
    const problemes = [];
    questionsQuiz().forEach((q, i) => {
      const id = idQuestion(q, i);
      const type = texte(q.type) || "choix";
      let valeur = "";
      if (type === "choix" || type === "echelle") {
        const coche = document.querySelector(`input[name="${id}"]:checked`);
        valeur = coche ? coche.value : "";
      } else {
        const champ = document.getElementById(id);
        valeur = champ ? texte(champ.value) : "";
      }
      if (!valeur && !q.facultatif) problemes.push({ id, texte: "Il manque la réponse à « " + texte(q.texte) + " »." });
      else if (type === "email" && valeur && !MOTIF_MAIL.test(valeur)) problemes.push({ id, texte: "L'adresse e-mail ne semble pas valide." });
      valeurs.push({ question: texte(q.texte), reponse: valeur });
    });
    return { valeurs, problemes };
  }

  function recapQuiz(valeurs) {
    const lignes = valeurs.filter((v) => v.reponse).map((v) => v.question + "\n→ " + v.reponse);
    return "Avis sur le projet GEAnérosité\n\n" + lignes.join("\n\n");
  }
  function lienMailQuiz(recap) {
    const dest = destinataireQuiz();
    if (!dest) return "";
    return "mailto:" + dest + "?subject=" + encodeURIComponent("Avis sur GEAnérosité") + "&body=" + encodeURIComponent(recap);
  }

  function merciQuiz(recap, message) {
    const form = $("#quiz-form");
    const merci = $("#quiz-merci");
    if (!form || !merci) return;
    form.hidden = true;
    merci.hidden = false;
    merci.innerHTML = `<p class="quiz-merci-tampon">Envoyé</p>
      <p class="quiz-merci-titre">Merci beaucoup !</p>
      <p>${message}</p>
      <details><summary>Revoir mes réponses</summary><p class="quiz-recap">${esc(recap)}</p></details>`;
    merci.setAttribute("tabindex", "-1");
    merci.focus({ preventScroll: true });
  }

  function rendreQuiz() {
    const bloc = $(".quiz");
    if (!bloc) return;
    const questions = questionsQuiz();
    if (Q.actif === false || !questions.length) { bloc.hidden = true; return; }
    bloc.hidden = false;
    $("#quiz-questions").innerHTML = questions.map(champQuiz).join("");

    const dest = destinataireQuiz();
    const mention = $("#quiz-mention");
    mention.innerHTML = dest
      ? `Vos réponses nous arrivent par e-mail, à <strong>${esc(dest)}</strong>. Rien n'est enregistré sur ce site, et votre adresse n'est demandée que si vous voulez une réponse.`
      : `L'adresse de réception n'est pas encore renseignée : le quiz ouvrira votre messagerie avec les réponses déjà écrites.`;

    const form = $("#quiz-form");
    const erreur = $("#quiz-erreur");
    const etat = $("#quiz-etat");
    const bouton = $("#quiz-envoyer");

    // on efface le message d'erreur dès que le visiteur corrige
    form.addEventListener("change", () => { erreur.hidden = true; });

    form.addEventListener("submit", (ev) => {
      ev.preventDefault();
      const { valeurs, problemes } = lireQuiz();
      if (problemes.length) {
        erreur.textContent = problemes[0].texte;
        erreur.hidden = false;
        const cible = document.getElementById(problemes[0].id);
        const focusable = cible && (cible.matches("input, textarea") ? cible : $("input, textarea", cible));
        if (focusable) focusable.focus();
        else if (cible) cible.scrollIntoView({ block: "center" });
        return;
      }
      const recap = recapQuiz(valeurs);
      const lien = lienMailQuiz(recap);
      const parMessagerie = texte(Q.service).toLowerCase() !== "formsubmit" || !dest;

      if (parMessagerie) {
        if (lien) window.location.href = lien;
        merciQuiz(recap, lien
          ? "Votre messagerie s'est ouverte avec les réponses : il ne reste plus qu'à appuyer sur <strong>Envoyer</strong>."
          : "Copiez vos réponses ci-dessous et envoyez-les nous, l'adresse arrive bientôt sur le site.");
        return;
      }

      const champs = { _subject: "Quiz GEAnérosité — nouvelle réponse", _template: "table", _captcha: "false" };
      valeurs.forEach((v, k) => { champs[(k + 1) + ". " + v.question] = v.reponse || "—"; });

      bouton.disabled = true;
      etat.textContent = "Envoi en cours…";
      erreur.hidden = true;

      fetch("https://formsubmit.co/ajax/" + encodeURIComponent(dest), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(champs),
      })
        .then((r) => r.json().catch(() => ({ success: r.ok ? "true" : "false" })))
        .then((data) => {
          const ok = String(data && data.success) === "true";
          const msg = texte(data && data.message);
          if (ok) {
            merciQuiz(recap, "Vos réponses viennent d'arriver dans notre boîte. Ça nous aide vraiment.");
            return;
          }
          if (/activ/i.test(msg)) {
            // Le service attend encore la confirmation de notre adresse : côté
            // visiteur, rien à signaler, ses réponses sont bien parties.
            console.info("GEAnérosité : FormSubmit attend la confirmation de l'adresse (voir le mode d'emploi).");
            merciQuiz(recap, "Vos réponses viennent d'arriver dans notre boîte. Ça nous aide vraiment.");
            return;
          }
          throw new Error(msg || "envoi refusé");
        })
        .catch((err) => {
          console.warn("GEAnérosité : envoi du quiz impossible.", err);
          etat.textContent = "";
          bouton.disabled = false;
          erreur.innerHTML = lien
            ? `L'envoi automatique n'a pas fonctionné. <a href="${esc(lien)}">Envoyer avec ma messagerie</a> (les réponses sont déjà écrites).`
            : "L'envoi n'a pas fonctionné. Réessayez dans un instant.";
          erreur.hidden = false;
        });
    });
  }


  /* ───────────────────── Interface : menu, fenêtres, bandeaux ───────────────────── */

  function initMenu() {
    const burger = $(".burger");
    const nav = $("#nav");
    if (!burger || !nav) return;
    const ecranLarge = window.matchMedia("(min-width: 72rem)");
    const estOuvert = () => burger.getAttribute("aria-expanded") === "true";
    const ouvrir = () => {
      burger.setAttribute("aria-expanded", "true");
      burger.setAttribute("aria-label", "Fermer le menu");
      nav.classList.add("ouvert");
      document.body.classList.add("menu-ouvert");
      requestAnimationFrame(() => { const premier = $("a", nav); if (premier) premier.focus(); });
    };
    const fermer = (rendreLeFocus) => {
      if (!estOuvert()) return;
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-label", "Ouvrir le menu");
      nav.classList.remove("ouvert");
      document.body.classList.remove("menu-ouvert");
      if (rendreLeFocus) burger.focus();
    };
    burger.addEventListener("click", () => (estOuvert() ? fermer(false) : ouvrir()));
    $$(".entete a").forEach((a) => a.addEventListener("click", () => fermer(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") fermer(true); });
    if (ecranLarge.addEventListener) ecranLarge.addEventListener("change", () => { if (ecranLarge.matches) fermer(false); });

    const liens = $$("a[href^='#']", nav);
    const sections = $$("main > section[id]");
    if (!("IntersectionObserver" in window) || !sections.length) return;
    const io = new IntersectionObserver((entrees) => {
      entrees.forEach((en) => {
        if (!en.isIntersecting) return;
        liens.forEach((a) => {
          const actif = a.getAttribute("href") === "#" + en.target.id;
          a.classList.toggle("actif", actif);
          if (actif) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => io.observe(s));
  }

  function initModales() {
    $$("[data-ouvre]").forEach((bouton) => bouton.addEventListener("click", () => {
      const d = document.getElementById(bouton.dataset.ouvre);
      if (!d) return;
      if (typeof d.showModal === "function") { d.showModal(); document.body.classList.add("modale-ouverte"); }
      else d.setAttribute("open", "");
    }));
    $$("dialog.modale").forEach((d) => {
      const fermer = () => (typeof d.close === "function" ? d.close() : d.removeAttribute("open"));
      d.addEventListener("close", () => document.body.classList.remove("modale-ouverte"));
      d.addEventListener("click", (e) => { if (e.target === d) fermer(); });
      $$(".modale-fermer", d).forEach((b) => b.addEventListener("click", fermer));
    });
  }

  function initBandeaux() {
    const bandeau = $("#bandeau-brouillon");
    const croix = bandeau && $(".bandeau-fermer", bandeau);
    if (croix) croix.addEventListener("click", () => { bandeau.hidden = true; });
  }


  /* ───────────────────── C'est parti ───────────────────── */

  function lancer(nom, fn) {
    try { fn(); } catch (err) { console.error(`GEAnérosité : problème dans « ${nom} ». Vérifie cette partie de js/config.js.`, err); }
  }

  if (brouillon) {
    html.classList.add("brouillon");
    $("#bandeau-brouillon").hidden = false;
    console.info("GEAnérosité (mode brouillon) : pour tester, ajoute ?etat=direct ou ?etat=apres à l'adresse.");
  }

  lancer("textes", appliquerTextes);
  lancer("liens", () => appliquerLiens(document));
  lancer("tableau d'affichage", rendreLedKilos);
  lancer("objectif et carton", rendreObjectif);
  lancer("infos pratiques", rendreInfos);
  lancer("association et équipe", rendreQui);
  lancer("agenda", initAgenda);
  lancer("compte à rebours", () => { tic(); setInterval(tic, 1000); });
  lancer("typographie", () => typographie(document.body));
  lancer("titre de l'affiche", initTitre);
  lancer("quiz d'avis", rendreQuiz);
})();
