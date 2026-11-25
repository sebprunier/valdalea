import type { ActionDef, ChapterContent, Question, StoryCard } from './model';

/**
 * Chapitre « Le feu des Brandes » : le risque de feu de forêt.
 *
 * Il se joue sur deux saisons : au printemps, on prépare le hameau (c'est ce que
 * contient ce fichier) ; l'été, le feu arrive (à écrire). Les gestes et consignes
 * reprennent les pages de Géorisques citées dans `sources` : « Que faire en cas de
 * feu de forêt ? » et « Obligations légales de débroussaillement ». Les
 * personnages et le déroulé sont de la fiction.
 */

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
  {
    id: 'maison-kit-verifier',
    lexicon: ['kit'],
    place: 'domicile',
    phase: 'preparation',
    minutes: 15,
    title: "Vérifier votre kit d'urgence",
    why: "Le kit d'urgence 72 heures sert pour tous les risques. Face au feu de forêt, il compte une radio à piles, pour suivre l'évolution de la situation et les consignes des autorités. Son contenu se vérifie une fois par an.",
    who: 'Chaque foyer.',
    done: 'Les piles de la radio sont changées, les bouteilles d’eau renouvelées. Le sac retrouve sa place, à portée de main.',
    sources: ['georisques-feu', 'georisques-kit'],
  },
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
];

export const QUESTIONS: Question[] = [
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
];

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

const TO_BE_CONTINUED: StoryCard = {
  id: 'a-suivre',
  when: 'À suivre',
  title: "L'été arrive",
  paragraphs: [
    'Le printemps passe. Le hameau est prêt, ou presque.',
    "La suite de ce chapitre — l'été, la canicule, un départ de feu en lisière — est en cours d'écriture. Votre matinée aux Brandes y comptera.",
  ],
  next: 'Revenir au calendrier',
  sky: 'sec',
  vigilance: 'verte',
};

/** Le chapitre, tel que le jeu le joue : pour l'instant, sa préparation de printemps. */
export const ETE: ChapterContent = {
  id: 'ete',
  actions: ACTIONS,
  questions: QUESTIONS,
  objectives: {
    preparation: "Aidez le hameau des Brandes à se préparer avant l'été.",
    vigilance: 'Danger de feu très élevé : faites les derniers gestes.',
    crise: 'Un feu est parti en lisière : faites les bons choix.',
    bilan: 'Le feu est fixé. Le bilan et vos badges sont dans votre téléphone.',
  },
  // La Météo des forêts n'est publiée que de juin à septembre : au printemps, l'indicateur le dit.
  situation: {
    preparation: { level: 'verte', indicator: 'Feux de forêt : hors saison', sky: 'sec', river: 'à son niveau de printemps' },
    vigilance: { level: 'rouge', indicator: 'Danger de feu : très élevé', sky: 'sec', river: 'basse' },
    crise: { level: 'rouge', indicator: 'Danger de feu : très élevé', sky: 'sec', river: 'basse' },
    bilan: { level: 'orange', indicator: 'Danger de feu : élevé', sky: 'sec', river: 'basse' },
  },
  levels: { verte: 'Danger de feu : faible', jaune: 'Danger de feu : modéré', orange: 'Danger de feu : élevé', rouge: 'Danger de feu : très élevé' },
  forecast: {
    preparation: [
      { when: "Aujourd'hui", icon: 'soleil', text: 'Temps sec et doux.' },
      { when: 'Les semaines qui viennent', icon: 'soleil', text: 'Peu de pluie annoncée. La végétation commence à sécher.' },
      { when: 'Cet été', icon: 'soleil', text: 'Un été chaud est attendu.' },
    ],
  },
  timing: {
    // Une matinée de travail : de quoi tout faire, trajets compris, avec une heure de marge.
    preparation: { minutes: 300, day: 'Samedi', startsAt: 9 * 60 },
    vigilance: { minutes: 120, day: 'Jeudi', startsAt: 13 * 60 },
  },
  dusk: null,
  opening: OPENING,
  period: { preparation: 'la matinée', vigilance: "l'après-midi" },
  alerts: { preparation: 'Le temps presse : il vous reste {reste} avant 14 heures.', vigilance: 'Le feu approche : il vous reste {reste}.' },
  hazardApp: 'meteo',
  hazardInfo: {
    title: 'La Météo des forêts',
    text: "De juin à septembre, Météo-France publie chaque jour deux cartes du danger de feu de forêt et de végétation, pour le lendemain et le surlendemain. Le niveau de danger est précisé par département, sur une échelle à quatre niveaux : faible, modéré, élevé et très élevé, en vert, jaune, orange et rouge.",
    sources: ['georisques-risque-feu'],
  },
  complete: false,
  toBeContinued: TO_BE_CONTINUED,
};
