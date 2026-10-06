/* ════════════════════════════════════════════════════════════════════
   GEAnérosité — FICHIER DE CONFIGURATION
   Une journée de collecte de vêtements à l'IUT d'Amiens.
   ════════════════════════════════════════════════════════════════════

   👉 C'est LE SEUL fichier à modifier pour mettre le site à jour.

   Les 4 règles d'or (sinon le site casse) :
     1. Les textes restent entre guillemets droits : "comme ça".
        Besoin de guillemets DANS un texte ? Utilise les français : « comme ça ».
     2. Chaque ligne se termine par une virgule, comme dans les exemples.
     3. Les nombres s'écrivent SANS guillemets ni espaces : 300 (pas "300 kg").
        Les décimales s'écrivent avec un point : 12.5
     4. Tout ce qui suit // est un commentaire : le site l'ignore.

   🚫 RÈGLE DU PROJET : NE RIEN INVENTER.
   Tant qu'une info n'est pas confirmée, laisse "" (vide) : le site affiche
   automatiquement « à confirmer » ou « bientôt disponible ».
   ════════════════════════════════════════════════════════════════════ */

const CONFIG = {

  /* 🚧 MODE BROUILLON
     true  = ce qu'il reste à compléter est entouré de pointillés bleus
             (pratique pour travailler, mais visible par tout le monde).
     false = site propre. */
  modeBrouillon: false,


  /* ══════════════════════════════════════════════════════════════════
     PARTIE 1 — LES COMPTEURS (à mettre à jour, surtout le jour J)
     ══════════════════════════════════════════════════════════════════ */

  compteurs: {
    kg: 0,             // kg de vêtements déjà collectés  ← LE chiffre à mettre à jour
    objectifKg: 300,   // l'objectif de la journée, en kg (voir le repère plus bas)
    miseAJour: "",     // ex : "12h30" ou "lundi 9 novembre à 18h" (vide = ligne masquée)
  },

  /* 📏 REPÈRE POUR L'OBJECTIF
     1 kg ≈ 4 vêtements (un jean ≈ 700 g, un tee-shirt ≈ 150 g, un pull ≈ 400 g).
     Un sac de courses bien rempli ≈ 5 kg.
       150 kg → prudent (30 sacs)
       300 kg → ambitieux mais atteignable sur une journée entière (60 sacs)
       500 kg → très ambitieux, il faut que tout l'IUT joue le jeu
     Le site calcule tout seul le pourcentage et le nombre de vêtements estimé. */
  kgParVetement: 0.25,   // poids moyen d'un vêtement, en kg (sert à l'estimation)


  /* ══════════════════════════════════════════════════════════════════
     PARTIE 2 — LES LIENS
     ⚠️ Ne mets QUE de vrais liens (avec https://).
     Lien vide = bouton grisé, avec « bientôt disponible ».
     ══════════════════════════════════════════════════════════════════ */

  liens: {
    instagram: "https://www.instagram.com/geanerosite/",
    facebook: "https://www.facebook.com/share/1Cj2vrPbHd/?mibextid=wwXIfr",
    email: "geanerosite@gmail.com",   // ✉️ adresse de contact (sans « mailto: »)
  },


  /* ══════════════════════════════════════════════════════════════════
     PARTIE 3 — LA JOURNÉE DE COLLECTE
     ══════════════════════════════════════════════════════════════════ */

  dates: {
    // Premier et dernier jour de la collecte.
    // Pour une collecte d'une seule journée, mets la même date dans les deux.
    jourDebut: "2026-11-12",   // jeudi 12 novembre
    jourFin: "2026-11-13",     // vendredi 13 novembre

    // Horaires réels, utilisés pour le compte à rebours et l'agenda.
    ouverture: "08:00",
    fermeture: "18:00",

    // Ce qui est ÉCRIT sur le site à la place des horaires.
    // Vide = le site écrit « de 8h à 18h » à partir des horaires ci-dessus.
    horairesTexte: "toute la journée",

    dateConfirmee: true,       // false = le site précise « dates provisoires »
  },

  // 🧪 POUR TESTER : "" (automatique), "avant", "direct" ou "apres"
  // Astuce : ajoute ?etat=direct à la fin de l'adresse du site.
  forcerEtat: "",

  collecte: {
    lieu: "IUT d'Amiens",   // établissement
    salle: "Salle 101, salle de coworking",      // affiché en gros
    precisionLieu: "1er étage du bâtiment GEA / TC",   // affiché juste en dessous
    quiPeutVenir: "Étudiants, enseignants et personnels de l'IUT",
    accepte: [
      "Vêtements propres et en bon état",
      "Manteaux, pulls et vêtements chauds",
      "Jeans, pantalons, robes, tee-shirts",
      "Vêtements pour enfants et pour bébés",
      "Chaussures par paire, attachées ensemble",
      "Linge de maison : draps, serviettes, couvertures",
    ],
    aEviter: [
      "Vêtements troués, tachés ou déchirés",
      "Linge humide ou non lavé",
      "Sous-vêtements usagés",
    ],
    conseils: [
      "Si vous en avez beaucoup, un sac fermé sera plus simple à peser et à porter. Sinon, venez comme vous êtes.",
      "Pas besoin de plier : nous trions sur place avec l'association.",
      "Vous pouvez venir à plusieurs, ou déposer pour un ami absent.",
    ],
  },


  /* ══════════════════════════════════════════════════════════════════
     PARTIE 4 — LE QUIZ D'AVIS (affiché à côté de la FAQ)
     Les réponses partent par e-mail à l'adresse « destinataire ».
     ══════════════════════════════════════════════════════════════════ */

  quiz: {
    actif: true,                              // false = le quiz disparaît du site
    destinataire: "geanerosite@gmail.com",    // où arrivent les réponses

    /* Deux façons d'envoyer :
       "formsubmit" → envoi direct depuis le site, sans rien installer.
                      ⚠️ À la PREMIÈRE réponse, FormSubmit envoie un e-mail
                      d'activation à l'adresse ci-dessus : il faut cliquer une
                      fois sur son lien, et ensuite tout arrive automatiquement.
       "mail"       → ouvre la messagerie du visiteur avec les réponses déjà
                      écrites ; il n'a plus qu'à appuyer sur Envoyer.
       En cas de souci d'envoi, le site propose toujours la solution « mail ». */
    service: "formsubmit",

    /* Les questions. Trois types possibles :
         "choix"   → une seule réponse parmi les options
         "echelle" → une note de min à max
         "texte"   → réponse libre     "email" → adresse (facultative)
       Ajoute « facultatif: true » pour ne pas rendre la question obligatoire. */
    questions: [
      { id: "profil", type: "choix", texte: "Vous êtes…",
        options: ["Étudiant à l'IUT", "Enseignant ou personnel", "Autre"] },
      { id: "avant", type: "choix", texte: "Avant de prendre connaissance de ce projet, saviez-vous quoi faire des vêtements que vous ne mettez plus ?",
        options: ["Oui, je sais où les donner", "Vaguement", "Non, ils restent dans le placard"] },
      { id: "venir", type: "choix", texte: "Après avoir lu la page, pensez-vous passer déposer des vêtements les 12 ou 13 novembre ?",
        options: ["Oui, c'est noté", "Peut-être, si je passe par là", "Non"] },
      { id: "important", type: "choix", texte: "Qu'est-ce qui compte le plus pour vous là-dedans ?",
        options: ["Que les vêtements restent à Amiens", "Que ça ne prenne que deux minutes", "Que ce soit une association qui reçoive", "Que ce soit monté par des étudiants"] },
      { id: "frein", type: "choix", texte: "Qu'est-ce qui risquerait de vous empêcher de venir ?",
        options: ["Les horaires", "Je n'ai rien à donner", "Je vais oublier", "Rien, je viendrai"] },
      { id: "utile", type: "echelle", texte: "Sur 5, ce projet vous paraît…",
        min: 1, max: 5, legendeMin: "pas très utile", legendeMax: "vraiment utile" },
      { id: "remarque", type: "texte", texte: "Une idée, une remarque, un truc qui manque ?", facultatif: true },
      { id: "contact", type: "email", texte: "Votre e-mail, si vous voulez qu'on vous réponde", facultatif: true },
    ],
  },


  /* ══════════════════════════════════════════════════════════════════
     PARTIE 5 — L'ASSOCIATION, L'ÉQUIPE, LA TRANSPARENCE
     ══════════════════════════════════════════════════════════════════ */

  association: {
    nom: "A.V.A. – Amiens",
    nomComplet: "Accompagnement Vers l'Autonomie",
    logo: "img/logo-ava.png",   // logotype extrait du visuel de l'association
    // page ou site de l'association (facultatif)
    site: "https://www.facebook.com/share/1DtpLjAhYA/?mibextid=wwXIfr",
    // Téléphone de l'association. Laisse "" pour ne rien afficher.
    telephone: "",
    presentation: [
      "A.V.A. – Amiens, pour Accompagnement Vers l'Autonomie, est un espace de vie sociale. L'association accueille les habitants et les accompagne dans leur quotidien : cours de français, accompagnement scolaire, aide administrative, point relais CAF et conseiller numérique France Services.",
      "Elle propose aussi des ateliers toute l'année : cuisine, couture, tricot et crochet, coiffure et bien-être, activités créatives, sport et marche, et des temps consacrés à la parentalité.",
      "Les vêtements que nous collectons lui sont remis pour être donnés gratuitement aux familles qu'elle accompagne.",
    ],
  },

  // 👥 L'ÉQUIPE. role : facultatif (la ligne est masquée si c'est vide).
  // photo : facultatif aussi ; laissé vide, le site affiche juste les noms.
  equipe: [
    // Dans le même ordre que sur la photo de groupe (de gauche à droite)
    { nom: "Abdoulaye Deme",   role: "", photo: "" },
    { nom: "Julien Pires",     role: "", photo: "" },
    { nom: "Volkan Akbulut",   role: "", photo: "" },
    { nom: "Noha Bayonga",     role: "", photo: "" },
  ],

  logoProjet: "img/logo-geanerosite.png",   // notre logo, en pied de page
  logoIUT: "img/logo-iut.png",   // vide = le nom est écrit à la place

  mentionsLegales: {
    responsable: "Julien Pires",   // prénom + nom d'une personne de l'équipe (obligatoire)
    hebergeur: "GitHub Pages, service de GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis",
  },
};
