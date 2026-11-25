import type { ActionDef, BadgeDef, Bulletin, ChapterView, Question, Situation, SkyId, StakeDef, StoryCard, VigilanceLevel } from './model';

/**
 * Chapitre « L'automne » : le risque inondation.
 *
 * Les gestes et consignes reprennent les pages officielles citées dans `sources`,
 * au premier rang desquelles « Que faire en cas d'inondation ? » (Géorisques).
 * Les personnages, les dates et le déroulé de la crue sont de la fiction.
 */

// ------------------------------------------------------------------ Actions

export const ACTIONS: ActionDef[] = [
  {
    id: 'mairie-accueil',
    place: 'mairie',
    phase: 'accueil',
    minutes: 0,
    endsPhase: true,
    title: 'Vous présenter au maire',
    why: "Le maire est responsable de la sécurité sur sa commune : il veille à l'information sur les risques et à l'organisation des secours en cas de crise.",
    who: 'Vous. Le maire vous attend pour votre première mission de réserviste.',
    done: "« Bienvenue dans la réserve ! L'automne arrive, et avec lui les grosses pluies : la Follette sort de son lit à peu près tous les dix ans. Commencez par lire notre DICRIM, puis faites le tour des lieux exposés : chez vous, chez votre voisine Jeanne, à l'école, au camping, au gymnase. Vous avez jusqu'à 18 heures ; votre carnet de mission vous dira ce qu'il reste à faire. »",
    sources: ['georisques-acteurs'],
  },
  {
    id: 'mairie-dicrim',
    lexicon: ['dicrim'],
    place: 'mairie',
    phase: 'preparation',
    minutes: 20,
    title: 'Consulter le DICRIM',
    why: "Le document d'information communal sur les risques majeurs présente les risques de la commune, les mesures prises pour s'en protéger et les consignes de sécurité. Se renseigner en mairie est la première des mesures de prévention.",
    who: 'Le maire rédige le DICRIM et doit le faire connaître. À chacun de le lire.',
    done: "Vous savez maintenant où l'eau peut monter : la zone inondable s'affiche sur la carte. Le DICRIM reste disponible dans votre téléphone.",
    sources: ['georisques-inondation', 'georisques-dicrim'],
  },
  {
    id: 'maison-kit',
    lexicon: ['kit'],
    place: 'domicile',
    phase: 'preparation',
    minutes: 30,
    questions: ['kit-contenu', 'kit-eau', 'kit-rangement'],
    title: "Préparer votre kit d'urgence 72 h",
    why: "Coupures d'électricité, de gaz et d'eau, routes impraticables : les premières 72 heures d'une catastrophe sont souvent les plus éprouvantes. Un sac préparé à l'avance permet de rester chez soi en attendant les secours, ou de partir sans rien oublier d'essentiel.",
    who: 'Chaque foyer. Le citoyen est le premier acteur de sa sécurité.',
    done: "Le sac est prêt, à portée de main en haut de l'escalier. Pensez à le vérifier une fois par an.",
    sources: ['georisques-kit', 'ecologie-kit', 'georisques-acteurs'],
  },
  {
    id: 'maison-protections',
    lexicon: ['batardeau'],
    place: 'domicile',
    phase: 'preparation',
    minutes: 40,
    title: 'Préparer les protections de la maison',
    why: "Batardeaux, sacs de sable, cales pour surélever les meubles : ces protections se prévoient à l'avance. Le jour où l'eau monte, il est trop tard pour s'équiper ; il ne reste qu'à les installer.",
    who: "L'occupant du logement.",
    done: 'Les batardeaux sont vérifiés et rangés près de la porte, avec les sacs de sable et de quoi surélever les meubles.',
    sources: ['georisques-inondation'],
  },
  {
    id: 'maison-refuge',
    lexicon: ['zone-refuge'],
    place: 'domicile',
    phase: 'preparation',
    minutes: 30,
    title: "Aménager une zone refuge à l'étage",
    why: "Quand l'eau monte, on se réfugie en hauteur. La zone refuge doit avoir une ouverture qui permette d'être évacué.",
    who: "L'occupant du logement.",
    done: "La chambre du haut est dégagée et sa fenêtre s'ouvre en grand : chacun à la maison sait où monter.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'maison-diagnostic',
    lexicon: ['diagnostic'],
    place: 'domicile',
    phase: 'preparation',
    minutes: 10,
    title: 'Demander un diagnostic de vulnérabilité',
    why: "Le diagnostic repère les points faibles de la maison face à l'inondation et les travaux utiles. Ces travaux peuvent, sous conditions, être subventionnés par le fonds Barnier.",
    who: 'Le propriétaire. La mairie peut vous orienter.',
    done: 'Le rendez-vous est pris. Le diagnostic ne changera rien cet automne, mais il préparera les suivants.',
    sources: ['georisques-inondation', 'georisques-barnier'],
  },
  {
    id: 'jeanne-refuge',
    lexicon: ['zone-refuge'],
    place: 'jeanne',
    phase: 'preparation',
    minutes: 20,
    title: "Convenir d'un refuge avec Jeanne",
    why: "Jeanne a 84 ans et vit seule dans une maison de plain-pied : elle n'a pas d'étage où se réfugier. Dans ce cas, il faut identifier à l'avance un lieu proche où se mettre à l'abri.",
    who: 'Chacun peut se soucier des personnes vulnérables et isolées de son voisinage.',
    done: "C'est entendu : si l'eau menace, Jeanne viendra chez vous, à l'étage. Elle a préparé un sac avec ses médicaments.",
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'pont-repere',
    lexicon: ['repere-de-crue'],
    figure: 'repere',
    place: 'pont',
    phase: 'preparation',
    minutes: 10,
    title: 'Lire le repère de crue',
    why: "Un repère de crue indique le niveau maximal atteint par une grande inondation passée. Il entretient la mémoire du risque : là où l'eau est montée, elle peut remonter.",
    who: 'Le maire inventorie les repères de crue de sa commune ; la commune les entretient et les protège.',
    done: "Sur la culée du pont, une plaque émaillée : « Crue du 12 octobre 1958 ». Le trait est bien au-dessus du quai. Ce jour-là, tout le Bas-Bourg était sous l'eau. Vous savez maintenant jusqu'où elle peut monter chez vous.",
    sources: ['reperes-de-crues', 'georisques-information-preventive'],
  },
  {
    id: 'ecole-plan',
    lexicon: ['ppms'],
    place: 'ecole',
    phase: 'preparation',
    minutes: 15,
    title: "Demander comment l'école se met en sûreté",
    why: "Les établissements scolaires se préparent à un événement majeur avec un plan particulier de mise en sûreté (PPMS). En cas d'alerte, les enfants y sont pris en charge.",
    who: "La directrice et son équipe. Les parents, eux, ne viennent pas chercher leurs enfants : ils y sont en sécurité.",
    done: "La directrice vous montre le plan : en cas d'inondation, les classes montent à l'étage et y restent jusqu'à la fin de l'alerte. « Surtout, dites bien aux parents de ne pas venir. »",
    sources: ['georisques-acteurs', 'georisques-inondation'],
  },
  {
    id: 'camping-consignes',
    place: 'camping',
    phase: 'preparation',
    minutes: 30,
    title: 'Vérifier les consignes du camping',
    why: "Dans un camping situé en zone de risque majeur, les occupants doivent être informés du danger, pouvoir être alertés et savoir comment évacuer.",
    who: "L'exploitant applique ces prescriptions d'information, d'alerte et d'évacuation ; le maire doit s'assurer qu'elles sont respectées.",
    done: "Avec le gérant, vous refaites le tour : consignes affichées à l'accueil et aux sanitaires, itinéraire d'évacuation fléché jusqu'à l'avenue. Tout est en ordre.",
    sources: ['georisques-information-preventive'],
  },
  {
    id: 'gymnase-preparation',
    lexicon: ['pcs'],
    place: 'gymnase',
    phase: 'preparation',
    minutes: 40,
    title: "Préparer le centre d'hébergement",
    why: "En cas d'évacuation, la commune ouvre un lieu d'hébergement hors d'eau. Mieux il est préparé, plus vite les habitants évacués sont à l'abri.",
    who: "La commune, dans le cadre de son plan communal de sauvegarde. La réserve communale prête main-forte.",
    done: 'Lits de camp, couvertures, eau : avec deux agents municipaux, vous vérifiez le stock et le plan d’installation.',
    sources: ['georisques-inondation', 'georisques-dicrim'],
  },
  {
    id: 'maison-nuit',
    place: 'domicile',
    phase: 'preparation',
    minutes: 0,
    endsPhase: true,
    narrative: true,
    title: 'Terminer la journée',
    why: "La journée s'arrête quand vous le décidez, ou à la tombée de la nuit. Ce qui n'a pas été préparé aujourd'hui manquera si l'eau monte.",
    who: 'Vous.',
    done: 'Vous rentrez. Dehors, le ciel se couvre.',
    sources: [],
  },

  // ---------------------------------------------------------------- Vigilance
  {
    id: 'maison-installer',
    lexicon: ['batardeau'],
    place: 'domicile',
    phase: 'vigilance',
    minutes: 25,
    requires: 'maison-protections',
    title: 'Installer les batardeaux et surélever les meubles',
    why: "Quand l'inondation est annoncée, c'est le moment d'installer les protections préparées, sans se mettre en danger et avant que l'eau n'arrive.",
    who: "L'occupant du logement.",
    done: 'Batardeaux en place devant les portes, meubles sur cales.',
    locked: "Vous n'avez ni batardeaux ni sacs de sable : ces protections se prévoient à l'avance.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'maison-polluants',
    place: 'domicile',
    phase: 'vigilance',
    minutes: 10,
    title: 'Placer en hauteur les produits polluants',
    why: "Peinture, désherbant, bidon d'essence : emportés par l'eau, ces produits souillent la maison et tout le voisinage.",
    who: "L'occupant du logement.",
    done: "Les bidons de l'abri de jardin sont rangés sur l'étagère du haut.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'maison-reseaux',
    place: 'domicile',
    phase: 'vigilance',
    minutes: 5,
    title: "Couper le gaz, l'électricité et le chauffage",
    why: "On coupe les réseaux avant l'arrivée de l'eau. À faire seulement si c'est possible, et sans se mettre en danger.",
    who: "L'occupant du logement.",
    done: 'Disjoncteur abaissé, robinet de gaz fermé, chaudière arrêtée.',
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'jeanne-accueil',
    place: 'jeanne',
    phase: 'vigilance',
    minutes: 20,
    eased: { by: 'jeanne-refuge', minutes: 10 },
    title: 'Accueillir Jeanne chez vous',
    why: 'Jeanne ne peut pas se réfugier en hauteur chez elle. Se soucier des personnes vulnérables et isolées fait partie des bons réflexes.',
    who: 'Vous, son voisin le plus proche.',
    done: "Jeanne est installée à l'étage chez vous, son sac et ses médicaments avec elle.",
    sources: ['ecologie-reflexes', 'georisques-inondation'],
  },
  {
    id: 'gymnase-ouverture',
    place: 'gymnase',
    phase: 'vigilance',
    minutes: 30,
    eased: { by: 'gymnase-preparation', minutes: 15 },
    title: "Ouvrir le centre d'hébergement",
    why: "Le maire a ordonné l'évacuation du camping. Les campeurs arrivent : il faut les accueillir à l'abri, sur les hauteurs.",
    who: 'La commune ; la réserve communale prête main-forte.',
    done: "Le gymnase est ouvert, les premiers campeurs s'installent.",
    sources: ['georisques-inondation', 'georisques-dicrim'],
  },
  {
    id: 'maison-abri',
    place: 'domicile',
    phase: 'vigilance',
    minutes: 0,
    endsPhase: true,
    title: "Monter vous mettre à l'abri",
    why: "Quand l'eau monte, on se réfugie dans un bâtiment, en hauteur ou à l'étage, avec le kit d'urgence, et on y reste.",
    who: 'Vous.',
    done: "Vous montez à l'étage et vous n'en bougez plus.",
    sources: ['georisques-inondation'],
  },
];

// ---------------------------------------------------- Questions du kit 72 h

export const QUESTIONS: Question[] = [
  {
    id: 'kit-contenu',
    prompt: 'Que mettez-vous dans le sac ?',
    multiple: true,
    choices: [
      { id: 'radio', label: 'Une radio à piles, avec des piles de rechange', correct: true, outcome: 'Pour suivre les consignes des autorités, même sans courant.' },
      { id: 'surgeles', label: 'Des plats surgelés', correct: false, outcome: "Sans électricité, ils sont perdus. Il faut de la nourriture non périssable, qui ne demande pas de cuisson." },
      { id: 'eau', label: "De l'eau potable en bouteilles", correct: true },
      { id: 'lampe', label: 'Une lampe de poche', correct: true, outcome: 'Avec des piles de rechange, ou à dynamo.' },
      { id: 'bouilloire', label: 'La bouilloire électrique', correct: false, outcome: 'Inutile pendant une coupure de courant.' },
      { id: 'medicaments', label: 'Vos médicaments et une trousse de premiers secours', correct: true },
      { id: 'papiers', label: 'Les photocopies de vos papiers, dans une pochette étanche', correct: true },
      { id: 'box', label: 'La box internet', correct: false, outcome: 'Sans courant ni réseau, elle ne sert à rien. Prenez plutôt le chargeur du téléphone.' },
      { id: 'argent', label: "De l'argent liquide", correct: true, outcome: 'Les distributeurs peuvent ne pas fonctionner.' },
      { id: 'conserves', label: 'Des conserves et un ouvre-boîte', correct: true },
    ],
    lesson: "La liste officielle compte une quinzaine d'objets : radio à piles, lampe de poche, eau, nourriture non périssable, médicaments, trousse de premiers secours, vêtements chauds, couverture de survie, argent liquide, photocopies des papiers, double des clés, chargeur de téléphone, lunettes de secours, outils de base, jeux pour occuper le temps.",
    sources: ['georisques-kit'],
  },
  {
    id: 'kit-eau',
    prompt: "Combien d'eau potable prévoyez-vous par personne ?",
    choices: [
      { id: 'un-litre-et-demi', label: '1,5 litre', correct: false },
      { id: 'trois-litres', label: '3 litres', correct: false },
      { id: 'six-litres', label: '6 litres', correct: true },
    ],
    lesson: 'Il faut 6 litres par personne, en bouteilles.',
    sources: ['georisques-kit'],
  },
  {
    id: 'kit-rangement',
    prompt: 'Où rangez-vous le sac ?',
    choices: [
      { id: 'cave', label: 'À la cave, avec les provisions', correct: false },
      { id: 'accessible', label: "Dans un endroit facile d'accès, hors de portée de l'eau", correct: true },
      { id: 'grenier', label: 'Tout au fond du grenier, derrière les cartons', correct: false },
    ],
    lesson: "Le kit doit pouvoir être récupéré le plus vite possible, tout en étant hors de portée de l'eau : jamais dans une cave ni en sous-sol.",
    sources: ['ecologie-kit'],
  },
];

// ------------------------------------------------------- Situations de crise

export const SITUATIONS: Situation[] = [
  {
    id: 'berges',
    floodLevel: 0.75,
    context: "9 h 40. Il pleut à verse depuis l'aube. Par la fenêtre, vous voyez des voisins partir vers le pont : « Viens voir, la Follette est impressionnante ! »",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'rester', label: 'Je reste chez moi', correct: true, outcome: 'Vous restez à distance. Dix minutes plus tard, le pont est fermé à la circulation.' },
      { id: 'voir', label: "J'y vais cinq minutes, juste pour voir", correct: false, outcome: "Sous le pont, l'eau charrie des troncs à quelques centimètres du tablier. Un agent municipal vous fait reculer : le pont est fermé." },
    ],
    lesson: "Quand une inondation est annoncée et que l'eau monte, on s'éloigne des cours d'eau, des berges et des ponts.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'enfants',
    floodLevel: 1.0,
    context: "10 h 15. Votre téléphone sonne d'une sonnerie que vous n'aviez jamais entendue : c'est une alerte FR-Alert. La Follette déborde, le maire déclenche le plan communal de sauvegarde. Vos deux enfants sont à l'école du Quai, à trois minutes d'ici.",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'a-pied', label: 'Je cours les chercher', correct: false, outcome: "Sur le quai, l'eau vous arrive aux genoux et le courant est fort. Deux pompiers doivent vous ramener chez vous. Vos enfants, eux, étaient déjà à l'étage de l'école avec leur maîtresse." },
      { id: 'ecole', label: "Je les laisse à l'école", correct: true, outcome: "C'est difficile, mais c'est le bon choix. À l'école, les classes sont montées à l'étage." },
      { id: 'en-voiture', label: 'Je prends la voiture, ce sera plus sûr', correct: false, outcome: "Le moteur cale au bout de vingt mètres, de l'eau jusqu'aux portières. Les pompiers vous sortent de là. Vos enfants, eux, étaient déjà à l'étage de l'école." },
    ],
    lesson: "On ne va pas chercher ses enfants à la crèche ou à l'école : ils y sont en sécurité.",
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'voiture',
    floodLevel: 1.15,
    context: "10 h 30. Votre voiture est garée sur le quai. L'eau commence à l'entourer.",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'laisser', label: 'Je la laisse où elle est', correct: true, outcome: "Vous la regardez de la fenêtre, le cœur serré. Une voiture se remplace." },
      { id: 'deplacer', label: "Je vais la déplacer tant qu'il est temps", correct: false, outcome: "La voiture démarre, avance de quelques mètres, puis se met à flotter et dérive contre un mur. Vous en sortez par la fenêtre, trempé et choqué." },
    ],
    lesson: "Pendant toute la durée de l'inondation, on ne prend pas sa voiture : 30 cm d'eau suffisent à l'emporter.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'cave',
    floodLevel: 1.3,
    context: "10 h 45. De l'eau suinte sous la porte de la cave. Vos albums photo sont en bas, sur une étagère.",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'descendre', label: 'Je descends vite les remonter', correct: false, outcome: "En bas, vous avez de l'eau aux mollets, et elle monte à vue d'œil. La porte résiste quand vous voulez ressortir. Vous remontez de justesse, sans les albums." },
      { id: 'rester', label: 'Je ne descends pas', correct: true, outcome: 'Vous fermez la porte de la cave et vous montez.' },
    ],
    lesson: 'On ne descend pas dans les sous-sols ni dans les parkings souterrains.',
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'telephone',
    floodLevel: 1.45,
    context: "11 h. Vous êtes à l'étage. Vous n'avez pas de nouvelles de votre sœur, qui habite de l'autre côté du bourg.",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'sms', label: 'Je lui envoie un SMS', correct: true, outcome: 'Sa réponse arrive dix minutes plus tard : « Tout va bien, on est au sec. »' },
      { id: 'appeler', label: "Je l'appelle, et je rappelle jusqu'à ce qu'elle décroche", correct: false, outcome: 'Le réseau est saturé : vos appels ne passent pas, et ils encombrent les lignes.' },
    ],
    lesson: 'On évite de téléphoner afin de laisser les réseaux disponibles pour les secours. Pour prendre des nouvelles, on privilégie les SMS.',
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'evacuer',
    floodLevel: 1.6,
    context: "11 h 30. L'eau a envahi la rue : près d'un mètre devant votre porte. Un voisin s'en va à pied, de l'eau jusqu'à la taille : « Venez, on va au gymnase ! »",
    prompt: 'Que faites-vous ?',
    choices: [
      { id: 'partir', label: 'Je pars avec lui', correct: false, outcome: "Au bout de la rue, une plaque d'égout a sauté sous la pression. Votre voisin y laisse une chaussure, et vous faites demi-tour tous les deux, transis." },
      { id: 'rester', label: "Je reste à l'étage et j'écoute les consignes", correct: true, outcome: "À la radio, la mairie confirme : restez à l'abri, la décrue est attendue en fin de journée." },
    ],
    lesson: "On reste à l'abri et on n'évacue son domicile que sur ordre des autorités, en restant à l'écoute de leurs consignes.",
    sources: ['georisques-inondation', 'vigicrues-guide'],
  },
];

// -------------------------------------------------------------------- Bilan

const count = (view: ChapterView, ids: string[]): number => ids.filter((id) => view.did(id)).length;

export const STAKES: StakeDef[] = [
  {
    id: 'foyer',
    title: 'Votre foyer',
    assess: (view) => count(view, ['maison-kit', 'maison-refuge']) as 0 | 1 | 2,
    outcomes: [
      "Vous êtes monté à l'étage les mains vides, dans une pièce encombrée dont la fenêtre s'ouvrait mal. Sans eau, sans lampe ni radio, vous avez attendu sans savoir ce qui se passait dehors.",
      "Vous étiez à l'abri, mais pas tout à fait prêt : il vous manquait soit le kit d'urgence, soit une vraie pièce refuge. Les heures d'attente ont été longues.",
      "Dans la pièce refuge, vous aviez de l'eau, une lampe et la radio à piles. Vous avez suivi les consignes de la mairie heure par heure, en sécurité.",
    ],
    lesson: "Avant : préparer son kit d'urgence 72 heures et aménager une zone refuge à l'étage. Quand l'eau monte : se réfugier en hauteur, avec le kit.",
    sources: ['georisques-inondation', 'georisques-kit'],
  },
  {
    id: 'maison',
    title: 'Votre maison',
    assess: (view) => {
      const points = (view.did('maison-installer') ? 2 : 0) + count(view, ['maison-polluants', 'maison-reseaux']);
      return points >= 3 ? 2 : points >= 1 ? 1 : 0;
    },
    outcomes: [
      "L'eau boueuse a traversé tout le rez-de-chaussée. Meubles, électroménager, installation électrique : presque tout est à refaire, et l'odeur d'essence venue de l'abri de jardin s'est incrustée partout.",
      "L'eau est entrée, mais vous avez limité la casse. Il reste des semaines de nettoyage et de séchage.",
      "Les batardeaux ont retenu l'essentiel de l'eau, les meubles étaient sur cales et les réseaux coupés. Un peu de boue dans l'entrée : en une semaine, la maison était de nouveau habitable.",
    ],
    lesson: "Les protections se prévoient à l'avance et s'installent quand l'inondation est annoncée, sans se mettre en danger. On place en hauteur les produits polluants et on coupe, si possible, le gaz, l'électricité et le chauffage.",
    sources: ['georisques-inondation'],
  },
  {
    id: 'jeanne',
    title: 'Jeanne, votre voisine',
    assess: (view) => (view.did('jeanne-accueil') ? 2 : view.did('jeanne-refuge') ? 1 : 0),
    outcomes: [
      "Personne n'a pensé à Jeanne. Réfugiée sur sa table de cuisine, elle a attendu deux heures que les pompiers viennent la chercher en barque. Elle est sauve, mais très éprouvée.",
      "Jeanne savait qu'elle pouvait venir chez vous, mais personne n'est allé la chercher à temps. Les pompiers l'ont évacuée par la fenêtre. Plus de peur que de mal.",
      "Jeanne a passé la crue à l'étage chez vous, au sec, avec ses médicaments. Elle a même gagné la partie de cartes.",
    ],
    lesson: "Sans étage, il faut identifier à l'avance un lieu proche où se réfugier. Et pendant l'épisode, on se soucie des personnes vulnérables et isolées.",
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'enfants',
    title: 'Vos enfants',
    assess: (view) => (view.right('enfants') ? 2 : 0),
    outcomes: [
      "En partant les chercher, c'est vous qui vous êtes mis en danger, et des pompiers ont dû vous secourir. Vos enfants, eux, n'ont jamais quitté l'étage de l'école.",
      '',
      "Vos enfants ont passé la matinée à l'étage de l'école avec leurs enseignants, comme le prévoit le plan de mise en sûreté. Vous les avez retrouvés le soir, une fois l'alerte levée.",
    ],
    lesson: "On ne va pas chercher ses enfants à la crèche ou à l'école : ils y sont en sécurité.",
    sources: ['georisques-inondation', 'georisques-acteurs'],
  },
  {
    id: 'campeurs',
    title: 'Les campeurs',
    assess: (view) => count(view, ['camping-consignes', 'gymnase-ouverture']) as 0 | 1 | 2,
    outcomes: [
      "L'évacuation du camping s'est faite dans la confusion : personne ne savait par où partir. Au gymnase, rien n'était prêt, et les familles ont attendu des heures dans le hall.",
      "Les campeurs ont été évacués à temps, mais tout ne s'est pas passé comme prévu : soit le départ a été désordonné, soit l'accueil au gymnase n'était pas prêt.",
      "Les campeurs connaissaient l'itinéraire et sont partis dans le calme dès l'ordre du maire. Au gymnase, lits et couvertures les attendaient.",
    ],
    lesson: "Dans un camping en zone de risque, les occupants doivent être informés, alertés et savoir comment évacuer. Et la mairie indique à l'avance les lieux d'hébergement prévus en cas d'évacuation.",
    sources: ['georisques-information-preventive', 'georisques-inondation'],
  },
  {
    id: 'reflexes',
    title: 'Vos réflexes pendant la crue',
    assess: (view) => {
      const right = ['berges', 'voiture', 'cave', 'telephone', 'evacuer'].filter((id) => view.right(id)).length;
      return right === 5 ? 2 : right >= 3 ? 1 : 0;
    },
    outcomes: [
      "Pendant la crue, vous avez pris plusieurs risques inutiles. Cette fois tout finit bien, mais chacun de ces gestes aurait pu mal tourner.",
      "Vous avez eu la plupart des bons réflexes. Revoyez ceux qui vous ont échappé : le jour venu, il n'y aura pas de seconde chance.",
      "Vous avez eu les bons réflexes du début à la fin : à l'abri, loin de l'eau, à l'écoute des consignes.",
    ],
    lesson: "S'éloigner des cours d'eau, ne pas prendre sa voiture, ne pas descendre au sous-sol, éviter de téléphoner, rester à l'abri et n'évacuer que sur ordre des autorités.",
    sources: ['georisques-inondation', 'ecologie-reflexes'],
  },
  {
    id: 'connaissance',
    title: 'Votre connaissance du risque',
    assess: (view) => {
      const others = count(view, ['pont-repere', 'ecole-plan', 'maison-diagnostic']);
      if (view.did('mairie-dicrim') && others >= 1) return 2;
      return view.did('mairie-dicrim') || others >= 1 ? 1 : 0;
    },
    outcomes: [
      "Vous avez agi sans vraiment connaître le risque : ni le DICRIM, ni l'histoire des crues de la Follette.",
      "Vous vous êtes en partie informé. Le DICRIM, le repère de crue du pont, le plan de l'école : chaque source complète les autres.",
      "Vous saviez où l'eau pouvait monter, comment vous seriez alerté et où vous réfugier. C'est le point de départ de tout le reste.",
    ],
    lesson: "Se renseigner auprès de sa mairie sur le type d'inondation possible et sur les mesures de protection prévues, à commencer par le DICRIM.",
    sources: ['georisques-inondation', 'georisques-dicrim'],
  },
];

export const BADGES: BadgeDef[] = [
  { id: 'informe', title: 'Bien informé', description: 'Consulter le DICRIM de la commune.', earned: (v) => v.did('mairie-dicrim') },
  { id: 'kit', title: 'Kit prêt', description: "Préparer son kit d'urgence 72 h.", earned: (v) => v.did('maison-kit') },
  { id: 'memoire', title: 'Mémoire de crue', description: 'Retrouver le repère de crue de la commune.', earned: (v) => v.did('pont-repere') },
  {
    id: 'maison',
    title: 'Maison parée',
    description: 'Installer les protections, mettre les polluants en hauteur et couper les réseaux.',
    earned: (v) => v.did('maison-installer') && v.did('maison-polluants') && v.did('maison-reseaux'),
  },
  { id: 'solidaire', title: 'Solidaire', description: 'Mettre une voisine vulnérable à l’abri.', earned: (v) => v.did('jeanne-accueil') },
  {
    id: 'reserviste',
    title: 'Réserviste engagé',
    description: "Préparer puis ouvrir le centre d'hébergement, et vérifier les consignes du camping.",
    earned: (v) => v.did('camping-consignes') && v.did('gymnase-preparation') && v.did('gymnase-ouverture'),
  },
  {
    id: 'reflexes',
    title: 'Bons réflexes',
    description: 'Faire le bon choix dans toutes les situations de la crue.',
    earned: (v) => SITUATIONS.every((situation) => v.right(situation.id)),
  },
];

// ---------------------------------------------------------------- Bulletins

export const BULLETIN_JAUNE: Bulletin = {
  id: 'jaune',
  from: 'Vigilance crues',
  title: 'La Follette en vigilance jaune',
  paragraphs: [
    "Samedi, 18 h. De fortes pluies sont attendues à partir de dimanche soir. Le tronçon de la Follette passe en vigilance jaune : risque de crue ou de montée rapide des eaux, sans dommages significatifs mais nécessitant une vigilance particulière.",
    'La journée est finie. Ce que vous avez préparé aujourd’hui servira peut-être plus vite que prévu.',
  ],
  advice: ['Je me tiens informé auprès des autorités.', "J'évite de pratiquer des activités nautiques.", "Je ne m'engage pas sur une route immergée, même partiellement."],
  sources: ['vigicrues-guide'],
};

export const BULLETIN_ORANGE: Bulletin = {
  id: 'orange',
  from: 'Vigilance crues',
  title: 'La Follette en vigilance orange',
  paragraphs: [
    "Lundi, 7 h 30. Il a plu toute la nuit. Le tronçon de la Follette passe en vigilance orange : risque de crue génératrice de débordements importants, susceptibles d'avoir un impact significatif sur la vie collective et la sécurité des biens et des personnes.",
    "Message de la mairie : par précaution, le maire fait évacuer le camping des Berges. La réserve communale est mobilisée pour ouvrir le centre d'hébergement au gymnase des Hauts.",
    "Il vous reste peu de temps avant la montée des eaux. Faites ce qui peut encore l'être, puis rentrez vous mettre à l'abri.",
  ],
  advice: [
    'Je me tiens informé auprès des autorités.',
    "Je m'éloigne des cours d'eau et des ponts, je rejoins un point haut ou je m'abrite à l'étage.",
    "Je ne m'engage pas sur une route immergée, même partiellement.",
    "J'évite de me déplacer et je me tiens informé sur les conditions météorologiques.",
    'Je surveille la montée des eaux.',
    'Je ne descends pas dans les sous-sols.',
    "Je mets mes biens hors d'eau et je localise mon kit d'urgence.",
  ],
  sources: ['vigicrues-guide'],
};

export const BULLETIN_ROUGE: Bulletin = {
  id: 'rouge',
  from: 'FR-Alert',
  title: 'Alerte : crue soudaine de la Follette',
  paragraphs: [
    "Lundi, 9 h 30. Votre téléphone émet un signal sonore que vous ne lui connaissiez pas, alors qu'il était en mode silencieux : vous êtes dans une zone de danger. La Follette passe en vigilance rouge : risque de crue majeure, menace directe et généralisée de la sécurité des personnes et des biens.",
    'Vous êtes chez vous. Les prochaines heures vont se jouer sur quelques décisions.',
  ],
  advice: [
    'Je reste chez moi et je me tiens informé auprès des autorités.',
    "Je n'utilise pas ma voiture.",
    "Je ne vais pas chercher mes enfants à l'école.",
    "Je m'éloigne des cours d'eau, des points bas et des ponts et je rejoins le point le plus haut possible.",
    'Je me réfugie en étage, en dernier recours sur le toit, je ne descends pas dans les sous-sols.',
    "J'évacue uniquement sur ordre des autorités en emportant mon kit d'urgence.",
  ],
  sources: ['vigicrues-guide', 'fr-alert'],
};

/** Hauteurs de crue, en mètres au-dessus du niveau normal de la Follette. */
export const FLOOD = {
  /** Pointe de la crue jouée dans ce chapitre. La crue de référence, plus haute, est une donnée du relief. */
  peak: 1.6,
  /** Niveau au début de la vigilance orange. */
  rising: 0.45,
  /** Niveau en fin de journée, quand la décrue est amorcée. */
  receding: 0.5,
};

export const OBJECTIVES = {
  accueil: 'Présentez-vous à la mairie.',
  preparation: 'Accomplissez tous les gestes de prévention avant la tombée de la nuit.',
  vigilance: "L'eau monte : installez ce qui a été préparé, puis rentrez vous mettre à l'abri.",
  crise: 'La Follette déborde : faites les bons choix.',
  bilan: 'La crue est passée. Le bilan et vos badges sont dans votre téléphone.',
} as const;

// ------------------------------------------------------- Situation et récit

/** Ce que la barre d'état et la carte montrent à chaque phase : vigilance, temps qu'il fait, état de la rivière. */
export const SITUATION: Record<keyof typeof OBJECTIVES, { vigilance: VigilanceLevel; sky: SkyId; river: string }> = {
  accueil: { vigilance: 'verte', sky: 'sec', river: 'à son niveau habituel' },
  preparation: { vigilance: 'verte', sky: 'sec', river: 'à son niveau habituel' },
  vigilance: { vigilance: 'orange', sky: 'pluie', river: 'en forte hausse, au ras du quai' },
  crise: { vigilance: 'rouge', sky: 'forte-pluie', river: 'en crue : elle déborde dans le Bas-Bourg' },
  bilan: { vigilance: 'jaune', sky: 'eclaircie', river: 'en décrue' },
};

/** Pendant la dernière heure de la journée de préparation, le jour baisse : c'est le signe que le temps presse. */
export const DUSK = { minutesLeft: 60, sky: 'soir' as SkyId };

/**
 * Les quatre niveaux de la vigilance crues, tels que Vigicrues les définit.
 * Le joueur les retrouve en touchant l'indicateur de vigilance.
 */
export const VIGILANCE_SCALE: {
  intro: string;
  levels: Array<{ id: VigilanceLevel; name: string; meaning: string }>;
  sources: string[];
} = {
  intro:
    "Vigicrues attribue une couleur à chaque tronçon de cours d'eau surveillé, selon le niveau de vigilance adapté pour faire face au danger susceptible de se produire dans les 24 heures à venir.",
  levels: [
    { id: 'verte', name: 'Vert', meaning: 'Pas de vigilance particulière requise.' },
    {
      id: 'jaune',
      name: 'Jaune',
      meaning: "Risque de crue ou de montée rapide des eaux n'entraînant pas de dommages significatifs, mais nécessitant une vigilance particulière dans le cas d'activités saisonnières et/ou exposées.",
    },
    {
      id: 'orange',
      name: 'Orange',
      meaning: "Risque de crue génératrice de débordements importants susceptibles d'avoir un impact significatif sur la vie collective et la sécurité des biens et des personnes.",
    },
    { id: 'rouge', name: 'Rouge', meaning: 'Risque de crue majeure. Menace directe et généralisée de la sécurité des personnes et des biens.' },
  ],
  sources: ['vigicrues-guide'],
};

/**
 * Le récit entre les phases. Chaque moment précède une alerte ou un changement
 * de décor : le joueur voit le ciel se couvrir et la pluie tomber avant de lire
 * le bulletin qui l'annonce.
 */
export const STORY = {
  soir: {
    id: 'soir',
    when: 'Samedi, 18 h',
    title: 'La nuit tombe',
    paragraphs: ["La journée s'achève. Le ciel s'est couvert, et le vent se lève.", 'Votre téléphone vibre : un message de Vigicrues.'],
    late: "La nuit tombe avant que vous ayez pu tout faire : vous rentrez chez vous. Le ciel s'est couvert, et le vent se lève.",
    next: 'Lire le message',
    sky: 'soir',
    vigilance: 'verte',
  },
  nuit: {
    id: 'nuit',
    when: 'Dimanche soir',
    title: 'La pluie arrive',
    paragraphs: ['Le dimanche a été gris et lourd. À la tombée de la nuit, la pluie arrive, comme annoncé.', 'Elle tombe toute la nuit, sans faiblir. La Follette commence à gonfler.'],
    next: 'Continuer',
    sky: 'nuit-pluie',
    vigilance: 'jaune',
  },
  matin: {
    id: 'matin',
    when: 'Lundi, 7 h 30',
    title: "L'eau affleure le quai",
    paragraphs: ['Au réveil, il pleut toujours. De votre fenêtre, vous voyez la Follette, brune et rapide, au ras du quai.', 'Votre téléphone vibre de nouveau.'],
    next: 'Lire le message',
    sky: 'pluie',
    vigilance: 'jaune',
  },
  abri: {
    id: 'abri',
    when: 'Lundi, 9 h 30',
    title: 'La Follette déborde',
    paragraphs: ["Vous êtes à l'étage. Dehors, la pluie redouble : l'eau a franchi le quai et gagne la rue.", 'Votre téléphone se met à sonner.'],
    late: "L'eau monte trop vite pour continuer : vous rentrez vous mettre à l'abri, à l'étage. Dehors, la pluie redouble : l'eau a franchi le quai et gagne la rue.",
    next: "Lire l'alerte",
    sky: 'forte-pluie',
    vigilance: 'orange',
  },
  decrue: {
    id: 'decrue',
    when: 'Lundi, 17 h',
    title: 'La décrue',
    paragraphs: ["La pluie a cessé en début d'après-midi. Lentement, l'eau se retire du Bas-Bourg, en laissant la boue derrière elle.", "La mairie annonce la fin de l'alerte."],
    next: 'Voir le bilan',
    sky: 'eclaircie',
    vigilance: 'orange',
  },
} satisfies Record<string, StoryCard>;
