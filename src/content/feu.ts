import { kitAction, KIT_QUESTIONS } from './kit';
import type { ActionDef, BadgeDef, Bulletin, ChapterContent, ChapterView, Question, Situation, StakeDef, StoryCard } from './model';

/**
 * Chapitre « Le feu des Brandes » : le risque de feu de forêt.
 *
 * Il se joue sur deux saisons. Au printemps, on prépare le hameau : faire
 * connaître l'obligation de débroussailler, aider Lucien, écarter les causes de
 * départ de feu. L'été, un feu arrive par le massif. Le maire fait évacuer le
 * hameau : on aide les habitants à partir, puis on va chercher Lucien. Mais le
 * feu va plus vite que prévu et coupe la seule issue : il ne reste qu'à s'abriter
 * dans la maison, comme le veut la consigne, le temps de six décisions. Le bilan
 * dit ce que le printemps a changé.
 *
 * Pourquoi cette fin : face au feu de forêt, la consigne officielle n'est pas de
 * fuir quand les flammes sont là, mais de s'abriter dans un bâtiment en dur, de
 * ne pas prendre sa voiture et de n'évacuer que sur ordre des autorités. Le
 * récit donne donc l'ordre d'évacuer, tôt, puis le rend impossible à suivre : le
 * joueur vit la consigne la plus contre-intuitive en sachant pourquoi il est là.
 *
 * Les gestes et consignes reprennent les pages citées dans `sources` : « Que
 * faire en cas de feu de forêt ? », « Feu de forêt ou de végétation » et
 * « Obligations légales de débroussaillement » (Géorisques), « Prévention des
 * feux de forêt en France » (ministère chargé de la Transition écologique). Les
 * personnages et le déroulé sont de la fiction.
 */

/**
 * Avancée du feu sur la carte, de 0 à 1 (voir `world/fire`) : loin dans le massif
 * pendant l'après-midi, il atteint la clairière de Lucien pendant la crise.
 */
export const FIRE = {
  /** Du premier message de la mairie à la fin de l'après-midi. */
  vigilance: [0.08, 0.38] as const,
  /** Quand l'alerte sonne : le feu a franchi la crête, des braises ont allumé un second foyer. */
  onset: 0.44,
  /** Le feu est fixé : il ne reste que la surface brûlée. */
  out: 1.5,
};

export const ACTIONS: ActionDef[] = [
  {
    id: 'brandes-old',
    lexicon: ['old'],
    place: 'brandes',
    phase: 'preparation',
    minutes: 30,
    questions: ['old-ou', 'old-profondeur', 'old-qui'],
    title: "Expliquer l'obligation de débroussailler",
    why: "Le débroussaillement autour des habitations est la meilleure des protections : 90 % des maisons détruites lors des feux de forêt se situent sur des terrains pas ou mal débroussaillés. Encore faut-il savoir qui est concerné, et jusqu'où.",
    who: "Chaque propriétaire, autour de sa construction. La commune rappelle l'obligation ; la réserve communale aide à la faire connaître.",
    done: "Vous avez fait le tour du hameau avec la carte du DICRIM : quatre maisons sont dans la bande des 200 mètres. Leurs propriétaires savent maintenant ce qu'ils ont à faire, et jusqu'où.",
    sources: ['georisques-old'],
  },
  {
    id: 'lucien-debroussailler',
    place: 'lucien',
    phase: 'preparation',
    minutes: 60,
    questions: ['debroussailler'],
    figure: 'debroussaillement',
    title: 'Aider Lucien à débroussailler',
    why: "Débroussailler, c'est réduire la quantité de végétaux et créer des discontinuités dans la végétation qui reste : moins il y a de matière combustible, moins le feu est intense. Ce n'est ni une coupe rase, ni un défrichement.",
    who: 'Lucien, dont la maison est dans une clairière, au milieu des arbres. À 82 ans, il a besoin de bras : vous lui prêtez les vôtres.',
    done: "Le terrain de Lucien est méconnaissable, et pourtant il reste des arbres. Entre la forêt et la maison, le feu n'a plus de chemin tout tracé.",
    sources: ['georisques-old', 'georisques-feu'],
  },
  {
    id: 'brandes-departs',
    place: 'brandes',
    phase: 'preparation',
    minutes: 20,
    questions: ['departs-de-feu'],
    title: 'Rappeler les gestes qui évitent les départs de feu',
    why: "En France, neuf feux sur dix sont d'origine humaine : un mégot mal éteint ou un barbecue mal géré peuvent suffire à dévaster des hectares de végétation en quelques minutes.",
    who: 'Chacun, chez soi comme en promenade.',
    done: "Le barbecue de ce soir se fera sur la terrasse, loin de la haie, et la disqueuse attendra d'être sortie sur la dalle du garage.",
    sources: ['georisques-feu', 'georisques-risque-feu'],
  },
  {
    id: 'brandes-acces',
    place: 'brandes',
    phase: 'preparation',
    minutes: 20,
    title: 'Vérifier le chemin des Brandes',
    why: "Le débroussaillement concerne aussi les voies privées, sur une profondeur qui peut aller jusqu'à 10 mètres de part et d'autre : il facilite l'intervention des secours. Le chemin des Brandes est le seul accès au hameau.",
    who: 'Les propriétaires pour leurs voies privées, la commune pour ses chemins.',
    done: "Vous remontez le chemin avec un agent municipal : deux branches basses à couper, un talus à faucher. C'est noté pour la semaine prochaine.",
    sources: ['georisques-old'],
  },
  {
    id: 'camping-barbecue',
    place: 'camping',
    phase: 'preparation',
    minutes: 20,
    title: "Vérifier l'aire de barbecue du camping",
    why: "Les barbecues s'organisent loin de la végétation, et les mégots se jettent dans un cendrier : attention aux cendres encore incandescentes.",
    who: 'Le gérant du camping, pour ses installations ; chaque campeur, pour ses gestes.',
    done: "Le barbecue du camping était posé au pied de la haie, à quelques mètres du champ voisin. Le gérant l'installe sur la dalle, près de l'allée, à l'écart de toute végétation ; il ajoute un point d'eau, des cendriers et une affiche à l'accueil.",
    sources: ['georisques-feu'],
  },
  // Le kit se prépare ici si c'est le premier chapitre joué ; sinon, il se vérifie (d'où l'identifiant, gardé pour les parties en cours).
  kitAction({
    id: 'maison-kit-verifier',
    sources: ['georisques-kit', 'ecologie-kit', 'georisques-feu'],
    risk: "Face au feu de forêt, sa radio à piles permet de suivre l'évolution de la situation et les consignes des autorités.",
  }),
  {
    id: 'maison-soir',
    place: 'domicile',
    phase: 'preparation',
    minutes: 0,
    endsPhase: true,
    narrative: true,
    title: 'Terminer la journée',
    why: "La journée s'arrête quand vous le décidez, ou à 14 heures. Ce qui n'a pas été préparé avant l'été manquera si le feu arrive.",
    who: 'Vous.',
    done: 'Vous rentrez, les bras griffés et les chaussures pleines de brindilles.',
    sources: [],
  },

  // ------------------------------------------------------ L'été : le feu approche
  {
    id: 'maison-kit-emporter',
    lexicon: ['kit'],
    place: 'domicile',
    phase: 'vigilance',
    minutes: 5,
    title: "Emporter votre kit d'urgence",
    why: "Le kit d'urgence 72 heures se garde à portée de main, prêt à être emporté. Il contient une radio à piles, avec des piles de rechange, pour suivre les consignes des autorités.",
    who: 'Vous.',
    done: 'Le sac est sur votre dos. Direction les Brandes.',
    sources: ['georisques-kit', 'georisques-feu'],
  },
  {
    id: 'brandes-tour',
    place: 'brandes',
    phase: 'vigilance',
    minutes: 20,
    questions: ['feu-approche'],
    title: 'Faire le tour des maisons du hameau',
    why: "Le maire fait évacuer le hameau. Avant de partir, quelques gestes se font tout de suite : éloigner les combustibles, rentrer le mobilier de jardin et le tuyau d'arrosage, laisser son portail ouvert pour faciliter l'accès des pompiers.",
    who: 'Chaque habitant, chez lui. La réserve communale passe de maison en maison.',
    done: 'Les bouteilles de gaz sont loin des murs, les salons de jardin rentrés, les portails grands ouverts. Une à une, les familles descendent vers le gymnase : le hameau se vide dans le calme.',
    sources: ['georisques-feu'],
  },
  {
    id: 'lucien-abords',
    place: 'lucien',
    phase: 'vigilance',
    minutes: 20,
    // Si le terrain a été débroussaillé au printemps, le tas de bois et la bouteille de gaz sont déjà loin de la maison.
    eased: { by: 'lucien-debroussailler', minutes: 10 },
    title: 'Dégager les abords de la maison de Lucien',
    why: "Avant de quitter la maison : en cas de départ de feu, on éloigne les combustibles, comme les bouteilles de gaz, et l'on rentre le mobilier de jardin et le tuyau d'arrosage.",
    who: 'Lucien, avec votre aide.',
    done: "La bouteille de gaz est au bout de la clairière, loin des murs ; les chaises de jardin et le tuyau d'arrosage sont dans l'entrée.",
    sources: ['georisques-feu'],
  },
  {
    id: 'lucien-fermer',
    place: 'lucien',
    phase: 'vigilance',
    minutes: 15,
    title: 'Fermer la maison de Lucien',
    why: "Avant de quitter la maison : en cas de départ de feu, on ferme et on arrose volets, portes et fenêtres, et l'on occulte les aérations.",
    who: 'Lucien, avec votre aide.',
    done: 'Les volets sont fermés et arrosés, les grilles d’aération bouchées. Dans la maison, il fait sombre, et encore frais.',
    sources: ['georisques-feu'],
  },
  {
    id: 'lucien-partir',
    place: 'lucien',
    phase: 'vigilance',
    minutes: 0,
    endsPhase: true,
    narrative: true,
    title: 'Partir avec Lucien',
    why: "Le maire a ordonné l'évacuation du hameau : vous emmenez Lucien au gymnase. Une fois partis, ce qui n'a pas été fait autour de la maison ne le sera plus.",
    who: 'Vous.',
    done: 'Lucien ferme sa porte, son sac à la main. Vous descendez le sentier.',
    sources: [],
  },
];

export const QUESTIONS: Question[] = [
  ...KIT_QUESTIONS,
  {
    id: 'old-ou',
    prompt: 'Quelles constructions sont concernées par l’obligation de débroussailler ?',
    choices: [
      { id: 'foret', label: 'Seulement celles qui sont dans la forêt', correct: false, outcome: 'La lisière est tout aussi exposée : le feu ne s’arrête pas au dernier arbre.' },
      { id: 'bande', label: 'Celles qui sont dans un massif classé à risque, ou à moins de 200 mètres', correct: true },
      { id: 'toutes', label: 'Toutes les maisons de la commune', correct: false, outcome: 'L’obligation ne vise que les abords des massifs classés à risque d’incendie.' },
    ],
    lesson: 'Sont concernées toutes les constructions situées à l’intérieur et à moins de 200 mètres des massifs forestiers, landes, maquis ou garrigues classés à risque d’incendie.',
    sources: ['georisques-old'],
  },
  {
    id: 'old-profondeur',
    prompt: 'Sur quelle profondeur faut-il débroussailler autour d’une maison ?',
    choices: [
      { id: '50', label: 'Au moins 50 mètres', correct: true },
      { id: '10', label: '10 mètres suffisent', correct: false, outcome: 'Dix mètres, c’est la profondeur maximale le long des voies privées, pas autour des maisons.' },
      { id: '200', label: '200 mètres', correct: false, outcome: '200 mètres, c’est la distance au massif en deçà de laquelle l’obligation s’applique.' },
    ],
    lesson: 'Le débroussaillement doit être effectué sur une profondeur de 50 mètres autour des constructions. Cette distance peut être étendue à 100 mètres par décision du maire ou du préfet.',
    sources: ['georisques-old'],
  },
  {
    id: 'old-qui',
    prompt: 'Qui est responsable du débroussaillement autour d’une maison ?',
    choices: [
      { id: 'commune', label: 'La commune', correct: false, outcome: 'La commune peut faire exécuter les travaux d’office, mais elle les facture alors au propriétaire.' },
      { id: 'voisin', label: 'Le voisin, quand la zone déborde sur son terrain', correct: false, outcome: 'La zone des 50 mètres peut déborder chez le voisin : c’est alors à vous de l’en informer, et de faire les travaux chez lui s’il les accepte.' },
      { id: 'proprietaire', label: 'Le propriétaire de la maison', correct: true },
    ],
    lesson: 'Le propriétaire de la construction est responsable du débroussaillement autour de celle-ci. Un locataire peut s’en charger si son contrat le prévoit ; cela n’exonère pas le propriétaire de sa responsabilité.',
    sources: ['georisques-old'],
  },
  {
    id: 'debroussailler',
    context: 'La maison de Lucien est dans une clairière : la forêt commence au bout du jardin. Rien n’a été fait depuis trois ans.',
    prompt: 'Que faites-vous ? Cochez tout ce qui convient, ou désignez-le sur le dessin.',
    multiple: true,
    choices: [
      { id: 'herbes', label: 'Couper les herbes hautes', correct: true },
      { id: 'buissons', label: 'Couper les buissons et les arbustes au pied de la maison', correct: true },
      { id: 'espacer', label: 'Mettre à distance les arbres qui se touchent', correct: true },
      { id: 'combustibles', label: 'Éloigner de la maison le tas de bois et la bouteille de gaz', correct: true },
      { id: 'raser', label: 'Abattre tous les arbres du terrain', correct: false, outcome: 'Débroussailler n’est ni une coupe rase, ni un défrichement : un arbre isolé des autres et de la maison peut rester.' },
      { id: 'bruler', label: 'Brûler sur place les branches coupées', correct: false, outcome: 'Les brûlages de déchets sont une cause fréquente de départs de feu. Les déchets verts se broient, se compostent ou se portent à la déchetterie.' },
    ],
    lesson:
      'Débroussailler, c’est couper la végétation herbacée, les buissons et les arbustes, et mettre à distance les arbres pour qu’ils ne se touchent pas, puis éloigner tout combustible des abords de l’habitation. Ce n’est ni une coupe rase, ni un défrichement.',
    sources: ['georisques-old', 'georisques-risque-feu'],
  },
  {
    id: 'departs-de-feu',
    context: 'Un voisin de Lucien prépare un barbecue pour ce soir ; un autre sort sa disqueuse pour couper une clôture.',
    prompt: 'Que leur rappelez-vous ? Cochez tout ce qui convient.',
    multiple: true,
    choices: [
      { id: 'barbecue', label: 'Installer le barbecue loin de la végétation', correct: true },
      { id: 'etincelles', label: 'Faire les travaux qui produisent des étincelles loin de la pelouse et des herbes sèches', correct: true },
      { id: 'megots', label: 'Jeter les mégots dans un cendrier, et se méfier des cendres encore chaudes', correct: true },
      { id: 'arroser', label: 'Arroser la pelouse suffit : le feu ne prend pas sur l’herbe verte', correct: false, outcome: 'Une étincelle ou une braise porte plus loin que la pelouse arrosée : c’est la distance à la végétation qui protège.' },
      { id: 'cendres', label: 'Vider les cendres du barbecue au fond du jardin, sous les arbres', correct: false, outcome: 'Des cendres encore incandescentes au pied des arbres : c’est un départ de feu tout prêt.' },
    ],
    lesson:
      'Pour éviter les départs de feu : débroussailler autour de chez soi avant l’été, organiser les barbecues loin de la végétation, réaliser les travaux sources d’étincelles loin de la pelouse et des herbes sèches, jeter ses mégots dans un cendrier et faire attention aux cendres incandescentes.',
    sources: ['georisques-feu'],
  },
  {
    id: 'feu-approche',
    context: 'Au hameau, on charge les voitures en regardant la fumée. Nadia a déroulé son tuyau d’arrosage au milieu du jardin ; son voisin ferme son portail à clé avant de partir.',
    prompt: 'Que demandez-vous aux habitants ? Cochez tout ce qui convient.',
    multiple: true,
    choices: [
      { id: 'gaz', label: 'Éloigner des maisons les bouteilles de gaz et les autres combustibles', correct: true },
      { id: 'mobilier', label: "Rentrer le mobilier de jardin et le tuyau d'arrosage", correct: true },
      { id: 'portail', label: 'Laisser les portails ouverts', correct: true },
      { id: 'ecoute', label: "Rester à l'écoute des consignes des autorités", correct: true },
      { id: 'cle', label: 'Fermer les portails à clé, pour protéger les maisons', correct: false, outcome: 'Un portail fermé, ce sont des minutes perdues pour les pompiers : on le laisse ouvert pour faciliter leur accès.' },
      { id: 'tuyau', label: "Laisser les tuyaux d'arrosage déroulés dans les jardins, prêts à servir", correct: false, outcome: "Le tuyau d'arrosage se rentre, comme le mobilier de jardin." },
    ],
    lesson:
      "En cas de départ de feu : éloigner les combustibles (bouteilles de gaz, etc.), rentrer le mobilier de jardin et le tuyau d'arrosage, laisser son portail ouvert pour faciliter l'accès des pompiers, et rester à l'écoute des consignes des autorités.",
    sources: ['georisques-feu'],
  },
];

// ---------------------------------------------------------------- La crise

/**
 * Six décisions, à l'abri chez Lucien, pendant que le feu traverse le massif.
 * Chaque bonne réponse est une consigne de la page « Que faire en cas de feu de
 * forêt ? » ; les conséquences racontées sont de la fiction.
 */
export const SITUATIONS: Situation[] = [
  {
    id: 'feu-alerte',
    hazard: 0.5,
    context:
      'Par la fenêtre de Lucien, vous voyez une autre fumée monter tout près, à trois cents mètres de la clairière, bien en avant du grand feu : le vent a porté des braises, et des flammes courent déjà dans les fougères.',
    prompt: 'Que faites-vous ?',
    choices: [
      {
        id: 'appeler',
        label: "J'appelle le 18 ou le 112, et je dis où se trouve ce nouveau feu",
        correct: true,
        outcome: "« Un second foyer, forêt des Brandes, à trois cents mètres au nord-est de la maison de la clairière. » L'opérateur vous fait répéter le lieu. « On envoie un groupe. Mettez-vous à l'abri. »",
      },
      {
        id: 'eteindre',
        label: "Je cours l'éteindre avec le tuyau d'arrosage",
        correct: false,
        outcome: "Le tuyau s'arrête au bout du jardin, et le feu a déjà gagné cinquante mètres. Vous rebroussez chemin à bout de souffle, et vous appelez enfin les secours : dix minutes de perdues.",
      },
      {
        id: 'attendre',
        label: "Je n'appelle pas : les pompiers sont déjà dans le massif, ils l'ont sûrement vu",
        correct: false,
        outcome: "Personne ne l'avait signalé : les pompiers luttaient deux kilomètres plus haut. Quand un voisin appelle enfin, le second foyer a rejoint le premier.",
      },
    ],
    lesson:
      "En cas de départ de feu, on donne l'alerte en appelant le 112, le 18 ou le 114 (pour les personnes malentendantes). Des matériaux incandescents transportés par le vent peuvent allumer de nouveaux départs en avant du front de flammes, parfois à plus d'un kilomètre.",
    sources: ['georisques-feu', 'ecologie-feux-foret'],
  },
  {
    id: 'feu-abri',
    hazard: 0.62,
    context: 'Le feu grossit, et la fumée épaissit sur la clairière. Lucien attrape les clés de sa vieille voiture : « Coupé ou pas, on tente le chemin ! On est au bourg dans cinq minutes ! »',
    prompt: 'Que décidez-vous ?',
    choices: [
      {
        id: 'maison',
        label: 'Nous restons dans la maison : la consigne est de s’abriter, et elle est en dur',
        correct: true,
        outcome: 'Lucien repose les clés en grommelant. Vous vous installez dans la pièce du fond, la radio sur la table.',
      },
      {
        id: 'voiture',
        label: 'Nous partons en voiture par le chemin des Brandes',
        correct: false,
        outcome: 'Au premier virage, la fumée est si épaisse que vous ne voyez plus le chemin. Vous faites demi-tour au pas, la gorge en feu, et vous regagnez la maison de justesse.',
      },
      {
        id: 'pied',
        label: 'Nous partons à pied par le sentier',
        correct: false,
        outcome: 'Dans la fumée, Lucien ne tient pas cent mètres. Vous le ramenez en le soutenant, et vous refermez la porte sur vous deux.',
      },
    ],
    lesson:
      "Quand le feu est là, on s'abrite dans un bâtiment en dur : on ne prend pas sa voiture, et l'on n'évacue son domicile que sur ordre des autorités. Il n'est plus temps de le devancer : en moins de dix minutes, un front de flammes peut parcourir un kilomètre.",
    sources: ['georisques-feu', 'ecologie-feux-foret'],
  },
  {
    id: 'feu-aerations',
    hazard: 0.74,
    context: "Vous êtes à l'intérieur. La chaleur monte ; une odeur âcre passe par la grille d'aération de la cuisine et sous la porte d'entrée.",
    prompt: 'Que faites-vous ?',
    choices: [
      {
        id: 'occulter',
        label: "J'occulte les aérations, et je vérifie que tout est fermé",
        correct: true,
        outcome: "Vous bouchez la grille de la cuisine et le bas de la porte. L'odeur ne grandit plus.",
      },
      {
        id: 'ouvrir',
        label: "J'ouvre une fenêtre, pour faire sortir la fumée",
        correct: false,
        outcome: "La fumée s'engouffre dans la pièce, et des braises avec elle : l'une d'elles roussit le rideau. Vous refermez tout, en toussant.",
      },
      {
        id: 'regarder',
        label: "J'entrouvre un volet, pour surveiller l'avancée du feu",
        correct: false,
        outcome: "Une bouffée brûlante vous fait reculer : la vitre, que le volet ne protège plus, se fend sous la chaleur. Vous le refermez aussitôt.",
      },
    ],
    lesson: "En cas de départ de feu, on ferme et on arrose volets, portes et fenêtres, et l'on occulte les aérations.",
    sources: ['georisques-feu'],
  },
  {
    id: 'feu-fumee',
    hazard: 0.85,
    context: 'Le feu est à la lisière de la clairière. Malgré tout, un peu de fumée entre : Lucien tousse, les yeux vous piquent.',
    prompt: 'Que faites-vous ?',
    choices: [
      {
        id: 'linge',
        label: 'Nous nous couvrons le nez et la bouche avec un linge humide',
        correct: true,
        outcome: 'Deux torchons passés sous le robinet. Lucien respire mieux, et vous aussi.',
      },
      {
        id: 'sortir',
        label: 'Nous sortons respirer dehors, du côté opposé au feu',
        correct: false,
        outcome: "Dehors, l'air est brûlant, et la fumée bien plus épaisse que dans la maison. Vous rentrez aussitôt, les poumons en feu.",
      },
      {
        id: 'patienter',
        label: "Nous attendons que ça passe : ce n'est que de la fumée",
        correct: false,
        outcome: 'Les quintes de toux se rapprochent. Lucien, pâle, doit s’asseoir. Vous finissez par mouiller deux torchons, bien tard.',
      },
    ],
    lesson: 'En cas de feu, on se couvre le nez et la bouche avec un linge humide.',
    sources: ['georisques-feu'],
  },
  {
    id: 'feu-voiture',
    hazard: 0.93,
    context:
      'Par une fente du volet, vous apercevez une voiture arrêtée au bout du sentier, à soixante mètres, dans la fumée : c’est Nadia, la voisine. Elle baisse sa vitre et crie : « Je ne vois plus rien ! Je cours jusque chez vous ? »',
    prompt: 'Que lui répondez-vous ?',
    choices: [
      {
        id: 'rester',
        label: '« Ne sortez pas de la voiture ! Allez vous garer dans le pré fauché, en bas du chemin ! »',
        correct: true,
        outcome: 'Nadia remonte sa vitre et recule au pas jusqu’au pré, où rien ne peut brûler. Le feu passe au large ; les pompiers la retrouvent indemne.',
      },
      {
        id: 'courir',
        label: '« Oui, courez, je vous ouvre ! »',
        correct: false,
        outcome: 'Elle fait vingt mètres dans la fumée, tombe, se relève. Vous devez sortir la chercher. Vous rentrez tous les deux brûlés aux mains et au visage.',
      },
      {
        id: 'foncer',
        label: '« Faites demi-tour, et foncez jusqu’au bourg ! »',
        correct: false,
        outcome: 'Sans rien y voir, elle manque le virage et s’immobilise dans le fossé, au milieu des herbes sèches. Les pompiers la dégagent de justesse.',
      },
    ],
    lesson: 'En cas de feu, si l’on se trouve dans son véhicule, on n’en sort pas, et l’on va se garer dans une zone dégagée.',
    sources: ['georisques-feu'],
  },
  {
    id: 'feu-evacuer',
    hazard: 1,
    context: 'Le front est passé. Dehors, tout est noir et fume encore ; des souches brûlent. Lucien veut sortir voir ce qu’il reste de son jardin, puis descendre au bourg.',
    prompt: 'Que décidez-vous ?',
    choices: [
      {
        id: 'rester',
        label: "Nous restons à l'abri, à l'écoute des consignes",
        correct: true,
        outcome: 'Vingt minutes plus tard, un camion de pompiers remonte le sentier. « Vous pouvez sortir. On vous emmène au gymnase. »',
      },
      {
        id: 'sortir',
        label: 'Nous sortons : le feu est passé',
        correct: false,
        outcome: 'À dix pas de la porte, une souche se rallume et un arbre calciné s’abat en travers du jardin. Vous rentrez en hâte.',
      },
      {
        id: 'partir',
        label: 'Nous prenons la voiture pour rejoindre le bourg',
        correct: false,
        outcome: 'Au bas du sentier, le chemin est barré par les tuyaux et les camions : vous gênez la manœuvre, et un pompier vous renvoie à la maison.',
      },
    ],
    lesson: "En attendant les secours : rester à l'écoute des consignes des autorités, rester à l'abri et n'évacuer son domicile que sur ordre des autorités, ne pas prendre sa voiture.",
    sources: ['georisques-feu'],
  },
];

// -------------------------------------------------------------------- Bilan

const count = (view: ChapterView, ids: string[]): number => ids.filter((id) => view.did(id)).length;

export const STAKES: StakeDef[] = [
  {
    id: 'maison-lucien',
    title: 'La maison de Lucien',
    // Le débroussaillement du printemps compte double : c'est lui qui prive le feu de son chemin.
    assess: (view) => {
      const points = (view.did('lucien-debroussailler') ? 2 : 0) + count(view, ['lucien-abords', 'lucien-fermer']);
      return points >= 3 ? 2 : points >= 1 ? 1 : 0;
    },
    outcomes: [
      "Les herbes hautes ont conduit le feu jusqu'au tas de bois, contre le mur, et des braises sont entrées par les aérations. La toiture a pris. Les pompiers vous ont sortis de là, Lucien et vous, juste à temps ; la maison est inhabitable.",
      "La maison a tenu, mais de peu : la façade est noircie, un volet a brûlé, l'appentis est parti en fumée. Il a manqué une partie de la préparation : le débroussaillement du printemps, ou les derniers gestes de l'été.",
      "Le feu a fait le tour de la clairière sans trouver de chemin jusqu'à la maison : plus d'herbes hautes, plus de bois contre le mur, des volets fermés et arrosés. À l'intérieur, vous étiez à l'abri.",
    ],
    lesson:
      "Le débroussaillement autour des habitations est la meilleure des protections : 90 % des maisons détruites lors des feux de forêt se situent sur des terrains pas ou mal débroussaillés. En cas de départ de feu, on éloigne les combustibles, on ferme et on arrose volets, portes et fenêtres, et l'on occulte les aérations.",
    sources: ['georisques-old', 'georisques-feu'],
  },
  {
    id: 'hameau',
    title: 'Le hameau des Brandes',
    assess: (view) => {
      const ready = count(view, ['brandes-old', 'brandes-acces', 'brandes-tour']);
      return ready === 3 ? 2 : ready >= 1 ? 1 : 0;
    },
    outcomes: [
      "Personne n'est passé de maison en maison : les habitants sont partis au dernier moment, dans la confusion. Autour des maisons les plus proches de la forêt, rien n'avait été débroussaillé : le feu est descendu de jardin en jardin, et deux maisons sont détruites. Sur le chemin encombré de branches, devant des portails fermés à clé, les camions ont perdu de longues minutes.",
      "Les habitants sont à l'abri au gymnase, mais le hameau a des dégâts : une haie, un abri de jardin, une façade. Tout n'était pas prêt — les terrains, le chemin ou le départ des habitants — et les pompiers ont dû parer au plus pressé.",
      'Le hameau a été évacué dans le calme, bien avant le feu. Les terrains étaient débroussaillés, le chemin dégagé, les portails ouverts : les pompiers se sont placés entre la forêt et les maisons, et le feu s’est arrêté au bord des jardins.',
    ],
    lesson:
      "Le débroussaillement autour des constructions et le long des voies d'accès protège les habitations et facilite l'intervention des secours. En cas de départ de feu, on laisse son portail ouvert pour faciliter l'accès des pompiers.",
    sources: ['georisques-old', 'georisques-feu'],
  },
  {
    id: 'departs',
    title: 'Les départs de feu',
    assess: (view) => count(view, ['brandes-departs', 'camping-barbecue']) as 0 | 1 | 2,
    outcomes: [
      "Pendant que les pompiers luttaient aux Brandes, deux autres feux sont partis dans la commune : au camping, d'un barbecue resté au pied de la haie ; au hameau, d'une disqueuse sortie dans l'herbe sèche. Il a fallu détourner deux camions.",
      "Un autre feu est parti dans la commune pendant l'incendie : au camping, d'un barbecue resté au pied de la haie, ou au hameau, d'une disqueuse sortie dans l'herbe sèche. Vite éteint, il a tout de même mobilisé un camion dont on avait besoin ailleurs.",
      "Ce jour-là, aucun autre feu n'est parti dans la commune : le barbecue du camping était sur sa dalle, loin de la haie, et personne au hameau n'a sorti sa disqueuse dans l'herbe sèche.",
    ],
    lesson:
      "En France, neuf feux sur dix sont d'origine humaine. Pour éviter les départs de feu : organiser les barbecues loin de la végétation, réaliser les travaux sources d'étincelles loin de la pelouse et des herbes sèches, jeter ses mégots dans un cendrier.",
    sources: ['georisques-feu', 'georisques-risque-feu'],
  },
  {
    id: 'kit-feu',
    title: "Votre kit d'urgence",
    assess: (view) => count(view, ['maison-kit-verifier', 'maison-kit-emporter']) as 0 | 1 | 2,
    outcomes: [
      "Votre kit d'urgence n'était pas prêt au printemps, et vous êtes parti sans lui. Quand le courant a sauté chez Lucien, vous n'aviez ni radio ni lampe : vous avez attendu dans le noir, sans rien savoir de ce qui se passait dehors.",
      "Il vous a manqué la moitié du nécessaire : soit le kit, prêt, était resté chez vous ; soit vous aviez emporté un sac qui ne l'était pas, et la radio n'avait pas de piles en état de marche.",
      "Quand le courant a sauté chez Lucien, vous avez sorti du sac la radio et ses piles neuves : vous avez suivi les consignes de la préfecture jusqu'à l'arrivée des pompiers.",
    ],
    lesson: "Le kit d'urgence 72 heures se prépare à l'avance, et sert pour tous les risques. Face au feu de forêt, une radio à piles permet de suivre l'évolution de la situation et les consignes des autorités.",
    sources: ['georisques-feu', 'georisques-kit'],
  },
  {
    id: 'reflexes-feu',
    title: 'Vos réflexes pendant le feu',
    assess: (view) => {
      const right = SITUATIONS.filter((situation) => view.right(situation.id)).length;
      return right === SITUATIONS.length ? 2 : right >= 4 ? 1 : 0;
    },
    outcomes: [
      'Pendant le feu, vous avez pris plusieurs risques inutiles. Cette fois, tout finit bien ; mais chacun de ces gestes aurait pu très mal tourner.',
      "Vous avez eu la plupart des bons réflexes. Revoyez ceux qui vous ont échappé : le jour venu, il n'y aura pas de seconde chance.",
      "Vous avez eu les bons réflexes du début à la fin : donner l'alerte, rester à l'abri, à l'écoute des consignes.",
    ],
    lesson:
      "Quand l'évacuation est ordonnée, on part tôt. Quand le feu est là, on ne fuit plus : on donne l'alerte (112, 18 ou 114), on s'abrite dans un bâtiment en dur, on occulte les aérations, on se couvre le nez et la bouche avec un linge humide, on ne sort pas de son véhicule, et l'on n'évacue que sur ordre des autorités.",
    sources: ['georisques-feu'],
  },
];

export const BADGES: BadgeDef[] = [
  { id: 'debroussailleur', title: 'Débroussailleur', description: "Aider Lucien à débroussailler son terrain avant l'été.", earned: (v) => v.did('lucien-debroussailler') },
  {
    id: 'hameau-pret',
    title: 'Hameau prêt',
    description: "Faire connaître l'obligation de débroussailler, vérifier le chemin, puis faire le tour des maisons quand le hameau est évacué.",
    earned: (v) => v.did('brandes-old') && v.did('brandes-acces') && v.did('brandes-tour'),
  },
  {
    id: 'zero-etincelle',
    title: 'Zéro étincelle',
    description: 'Écarter les causes de départ de feu, au hameau comme au camping.',
    earned: (v) => v.did('brandes-departs') && v.did('camping-barbecue'),
  },
  {
    id: 'maison-close',
    title: 'Maison close au feu',
    description: 'Dégager les abords de la maison de Lucien, puis la fermer avant de partir.',
    earned: (v) => v.did('lucien-abords') && v.did('lucien-fermer'),
  },
  {
    id: 'sang-froid',
    title: 'Sang-froid',
    description: 'Faire le bon choix dans toutes les situations du feu.',
    earned: (v) => SITUATIONS.every((situation) => v.right(situation.id)),
  },
];

// ---------------------------------------------------------------- Messages

export const MESSAGE_MAIRIE: Bulletin = {
  id: 'feu-mairie',
  kind: 'message',
  from: "Mairie de Val-d'Aléa",
  title: 'Évacuation du hameau des Brandes',
  paragraphs: [
    "Jeudi, 13 h. Un feu s'est déclaré en fin de matinée de l'autre côté du massif. Les pompiers sont sur place ; le vent de nord-est le pousse vers le hameau des Brandes. La Météo des forêts place aujourd'hui le département au niveau de danger le plus haut : très élevé.",
    "Par précaution, le maire fait évacuer le hameau des Brandes avant 15 heures : les habitants sont attendus au gymnase des Hauts. La réserve communale est mobilisée pour les aider à partir. Lucien, dans sa clairière, ne répond pas au téléphone : passez le prendre.",
    "Avant de partir, chacun prépare sa maison. Faites vite : le feu n'attendra pas.",
  ],
  advice: [
    "J'éloigne les combustibles (bouteilles de gaz, etc.).",
    "Je rentre le mobilier de jardin et le tuyau d'arrosage.",
    "Je ferme et j'arrose volets, portes et fenêtres, et j'occulte les aérations.",
    "Je laisse mon portail ouvert pour faciliter l'accès des pompiers.",
    "Je reste à l'écoute des consignes des autorités.",
  ],
  sources: ['georisques-feu', 'georisques-risque-feu'],
};

export const ALERTE_FEU: Bulletin = {
  id: 'feu-alerte',
  kind: 'alerte',
  from: 'FR-Alert',
  title: 'Alerte : feu de forêt aux Brandes',
  paragraphs: [
    "Jeudi, 15 h. Votre téléphone émet un signal sonore que vous ne lui connaissiez pas, alors qu'il était en mode silencieux : vous êtes dans une zone de danger. Le feu atteint le hameau des Brandes ; le chemin des Brandes est coupé.",
    "Il n'est plus temps de partir : la consigne est de s'abriter. Vous êtes chez Lucien ; les prochaines heures vont se jouer sur quelques décisions.",
  ],
  advice: [
    "Je m'abrite dans un bâtiment en dur.",
    "Je ferme volets, portes et fenêtres, et j'occulte les aérations.",
    'Je me couvre le nez et la bouche avec un linge humide.',
    "Je reste à l'écoute des consignes des autorités.",
    "J'évite de téléphoner, pour laisser les réseaux disponibles pour les secours.",
    "Je reste à l'abri : je n'évacue que sur ordre des autorités, et je ne prends pas ma voiture.",
  ],
  sources: ['georisques-feu', 'fr-alert'],
};

// ------------------------------------------------------------------- Récit

const OPENING: StoryCard = {
  id: 'debut',
  when: 'Un samedi de mai, 9 h',
  title: "Avant l'été",
  paragraphs: [
    "« L'été dernier, le feu est passé à trois kilomètres des Brandes », vous a dit le maire. « Les maisons qui brûlent sont presque toujours celles dont le terrain n'était pas débroussaillé. C'est maintenant que ça se joue, pas en août. »",
    "Votre mission : aider le hameau à se préparer. Aux Brandes d'abord, et chez Lucien, dans sa clairière au milieu des arbres ; puis au camping. Vous avez jusqu'à 14 heures ; le carnet de mission vous dira ce qu'il reste à faire.",
  ],
  next: 'Commencer',
  sky: 'sec',
  vigilance: 'verte',
};

/** Le récit de l'été. Chaque moment précède un message ou un changement de décor : le joueur voit le feu avant de lire l'alerte. */
export const STORY = {
  debut: OPENING,
  ete: {
    id: 'ete',
    when: "Un jeudi d'août, 13 h",
    title: 'Trois mois plus tard',
    paragraphs: [
      "Le printemps a passé, puis juillet. Depuis dix jours, il fait plus de 35 degrés ; l'herbe est jaune, et le vent de nord-est s'est levé ce matin.",
      "De votre fenêtre, vous apercevez une colonne de fumée, loin au-dessus de la forêt. Votre téléphone vibre : un message de la mairie.",
    ],
    late: "La matinée s'est achevée sans que vous ayez tout fait, puis le printemps a passé, et juillet. Depuis dix jours, il fait plus de 35 degrés ; l'herbe est jaune, et le vent de nord-est s'est levé ce matin.",
    next: 'Lire le message',
    sound: 'message',
    sky: 'canicule',
    vigilance: 'rouge',
  },
  abri: {
    id: 'abri',
    when: 'Jeudi, 15 h',
    title: 'Le chemin est coupé',
    paragraphs: [
      'Vous descendez le sentier avec Lucien. Le vent a forci : le feu a dévalé la crête bien plus vite que prévu, et la fumée noie déjà le chemin des Brandes, la seule issue. Au bout du sentier, un gendarme vous fait signe de remonter : on ne passe plus. Vous regagnez la maison.',
      'La porte à peine refermée, votre téléphone se met à sonner.',
    ],
    late: 'Il est trop tard pour partir. Le vent a forci : le feu a dévalé la crête bien plus vite que prévu, et la fumée noie déjà le chemin des Brandes, la seule issue. Vous courez jusque chez Lucien, et vous vous enfermez avec lui.',
    next: "Lire l'alerte",
    sound: 'alerte',
    sky: 'fumee',
    vigilance: 'rouge',
  },
  fixe: {
    id: 'fixe',
    when: 'Jeudi, 19 h',
    title: 'Le feu est fixé',
    paragraphs: [
      'En fin d’après-midi, le vent tombe. Les avions bombardiers d’eau se relaient au-dessus du massif ; à la tombée du jour, les pompiers annoncent que le feu est fixé : il ne progresse plus.',
      'Une centaine d’hectares de forêt ont brûlé. La mairie ouvre le gymnase pour la nuit.',
    ],
    next: 'Voir le bilan',
    sky: 'fumee',
    vigilance: 'rouge',
  },
} satisfies Record<string, StoryCard>;

/** Le chapitre, tel que le jeu le joue : le printemps, puis l'été et son feu, que `ui/flow` met en scène. */
export const ETE: ChapterContent = {
  id: 'ete',
  actions: ACTIONS,
  questions: QUESTIONS,
  objectives: {
    preparation: "Aidez le hameau des Brandes à se préparer avant l'été.",
    vigilance: 'Le hameau des Brandes est évacué : aidez les habitants, puis partez avec Lucien.',
    crise: 'Le chemin est coupé : abritez-vous, et faites les bons choix.',
    bilan: 'Le feu est fixé. Le bilan et vos badges sont dans votre téléphone.',
  },
  // La Météo des forêts n'est publiée que de juin à septembre : au printemps, l'indicateur le dit.
  situation: {
    preparation: { level: 'verte', indicator: 'Feux de forêt : hors saison', sky: 'sec', river: 'à son niveau de printemps' },
    vigilance: { level: 'rouge', indicator: 'Danger de feu : très élevé', sky: 'canicule', river: 'très basse' },
    crise: { level: 'rouge', indicator: 'Danger de feu : très élevé', sky: 'fumee', river: 'très basse' },
    // Le feu est fixé, mais le temps n'a pas changé : le danger reste au plus haut.
    bilan: { level: 'rouge', indicator: 'Danger de feu : très élevé', sky: 'canicule', river: 'très basse' },
  },
  levels: { verte: 'Danger de feu : faible', jaune: 'Danger de feu : modéré', orange: 'Danger de feu : élevé', rouge: 'Danger de feu : très élevé' },
  forecast: {
    preparation: [
      { when: "Aujourd'hui", icon: 'soleil', text: 'Temps sec et doux.' },
      { when: 'Les semaines qui viennent', icon: 'soleil', text: 'Peu de pluie annoncée. La végétation commence à sécher.' },
      { when: 'Cet été', icon: 'soleil', text: 'Un été chaud est attendu.' },
    ],
    vigilance: [
      { when: 'Cet après-midi', icon: 'soleil', text: '37 °C. Vent de nord-est, en rafales.' },
      { when: 'Ce soir', icon: 'soleil', text: 'Le vent faiblit à la tombée du jour.' },
      { when: 'Vendredi', icon: 'soleil', text: 'Toujours très chaud et sec.' },
    ],
    crise: [
      { when: 'Cet après-midi', icon: 'nuage', text: 'Fumée. Vent de nord-est, en rafales.' },
      { when: 'Ce soir', icon: 'soleil', text: 'Le vent faiblit à la tombée du jour.' },
    ],
    bilan: [
      { when: 'Cette nuit', icon: 'nuage', text: 'Vent faible. Odeur de fumée.' },
      { when: 'Vendredi', icon: 'soleil', text: 'Très chaud. Aucune pluie annoncée.' },
    ],
  },
  timing: {
    // Une matinée de travail : de quoi tout faire, trajets compris, avec une heure de marge.
    preparation: { minutes: 300, day: 'Samedi', startsAt: 9 * 60 },
    // Une après-midi courte : le trajet jusqu'aux Brandes et quatre gestes, sans temps à perdre.
    vigilance: { minutes: 120, day: 'Jeudi', startsAt: 13 * 60 },
  },
  dusk: null,
  opening: STORY.debut,
  period: { preparation: 'la matinée', vigilance: "l'après-midi" },
  alerts: { preparation: 'Le temps presse : il vous reste {reste} avant 14 heures.', vigilance: 'Le feu approche : il vous reste {reste} pour partir avec Lucien.' },
  hazardApp: 'meteo',
  hazardInfo: {
    title: 'La Météo des forêts',
    text: "De juin à septembre, Météo-France publie chaque jour deux cartes du danger de feu de forêt et de végétation, pour le lendemain et le surlendemain. Le niveau de danger est précisé par département, sur une échelle à quatre niveaux : faible, modéré, élevé et très élevé, en vert, jaune, orange et rouge.",
    sources: ['georisques-risque-feu'],
  },
  crisis: {
    hazard: 'feu',
    name: 'Le feu',
    // L'après-midi commence chez soi ; le feu se vit chez Lucien, dans sa clairière.
    places: { vigilance: 'domicile', crise: 'lucien' },
    // On vise le seuil de la maison : au-dessus de la fenêtre du récit, on voit la clairière, et au nord la forêt d'où vient le feu.
    lookSouth: 0,
    vigilance: [{ tell: STORY.ete, hazard: FIRE.vigilance[0] }, { bulletin: MESSAGE_MAIRIE }],
    ready: 'Le hameau des Brandes est évacué. Vous êtes chez vous : rejoignez le hameau, puis allez chercher Lucien.',
    // Le ciel se couvre de fumée et le feu apparaît en lisière pendant que le joueur lit : il le voit avant que l'alerte ne sonne.
    onset: [{ tell: STORY.abri, hazard: FIRE.onset }, { bulletin: ALERTE_FEU }],
    situations: SITUATIONS,
    ending: STORY.fixe,
    levels: { vigilance: FIRE.vigilance, ending: FIRE.out, after: FIRE.out },
    firebreak: 'lucien-debroussailler',
    stakes: STAKES,
    badges: BADGES,
    bilan: {
      title: 'Bilan du feu',
      lead: 'À la tombée du jour, le feu est fixé. Voici ce qu’il a laissé derrière lui, et ce que votre printemps aux Brandes a changé.',
    },
  },
};
