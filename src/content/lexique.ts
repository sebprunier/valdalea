/**
 * Lexique : les mots de la prévention, expliqués simplement. Chaque définition
 * reprend une source officielle. Les gestes du jeu y renvoient, pour que personne
 * ne reste devant un mot qu'il ne connaît pas.
 */

export interface LexiconEntry {
  id: string;
  term: string;
  definition: string;
  /** Identifiant d'une illustration (voir `ui/figures`). */
  figure?: 'batardeau' | 'zone-refuge';
  sources: string[];
}

export const LEXICON: LexiconEntry[] = [
  {
    id: 'batardeau',
    term: 'Batardeau',
    definition:
      "Barrière anti-inondation amovible : un panneau étanche que l'on fixe devant une porte ou une porte-fenêtre quand l'eau menace. Comme les sacs de sable, c'est un dispositif de protection qui se prévoit à l'avance et s'installe quand l'inondation est annoncée.",
    figure: 'batardeau',
    sources: ['georisques-inondation', 'georisques-barnier'],
  },
  {
    id: 'zone-refuge',
    term: 'Zone refuge',
    definition:
      "Pièce située à l'étage, où se mettre à l'abri quand l'eau monte. Elle doit avoir une ouverture qui permette d'être évacué. Sans étage, il faut repérer à l'avance un lieu proche où se réfugier.",
    figure: 'zone-refuge',
    sources: ['georisques-inondation'],
  },
  {
    id: 'kit',
    term: "Kit d'urgence 72 heures",
    definition:
      "Sac préparé à l'avance, qui contient de quoi vivre trois jours en autonomie. Il sert à rester chez soi en attendant les secours, ou à partir sans rien oublier d'essentiel.",
    sources: ['georisques-kit'],
  },
  {
    id: 'dicrim',
    term: 'DICRIM',
    definition:
      "Document d'information communal sur les risques majeurs. Obligatoire dans toute commune exposée à au moins un risque majeur, il présente les risques de la commune, les mesures prises pour s'en protéger et les consignes de sécurité. Le maire le fait connaître par tout moyen approprié.",
    sources: ['georisques-dicrim'],
  },
  {
    id: 'pcs',
    term: 'Plan communal de sauvegarde (PCS)',
    definition: "Plan que le maire élabore pour préparer l'organisation des secours et la mise en sécurité des habitants en cas de crise.",
    sources: ['georisques-acteurs', 'georisques-dicrim'],
  },
  {
    id: 'repere-de-crue',
    term: 'Repère de crue',
    definition:
      "Marque qui indique le niveau maximal atteint par une grande inondation en un point donné : plaque, macaron scellé, trait gravé dans la pierre. On en trouve surtout sur les quais, les piles de pont et les bâtiments anciens proches de la rivière.",
    sources: ['reperes-de-crues'],
  },
  {
    id: 'diagnostic',
    term: 'Diagnostic de vulnérabilité',
    definition: "Examen d'une maison située en zone inondable, qui identifie les travaux à faire pour mettre ses occupants en sécurité et réduire les dégâts.",
    sources: ['georisques-inondation', 'georisques-barnier'],
  },
  {
    id: 'ppms',
    term: 'Plan particulier de mise en sûreté (PPMS)',
    definition: 'Plan par lequel un établissement scolaire se prépare à faire face à un événement majeur.',
    sources: ['georisques-acteurs'],
  },
  {
    id: 'pims',
    term: 'Plan individuel de mise en sûreté (PIMS)',
    definition: "Document simple à remplir chez soi pour se préparer aux risques majeurs, en trois étapes : je m'informe, je me prépare, j'agis.",
    sources: ['georisques-pims'],
  },
  {
    id: 'vigilance',
    term: 'Vigilance',
    definition:
      "Information qui signale un danger pour les prochaines 24 heures : Météo-France pour les phénomènes météorologiques, Vigicrues pour les crues. Quatre couleurs en donnent le niveau : vert, jaune, orange, rouge.",
    sources: ['georisques-vigilance', 'vigicrues-guide'],
  },
  {
    id: 'fr-alert',
    term: 'FR-Alert',
    definition:
      "Dispositif d'alerte des populations : toute personne qui se trouve dans une zone de danger reçoit une notification sur son téléphone portable, accompagnée d'un signal sonore même en mode silencieux. Il ne demande ni inscription ni application.",
    sources: ['fr-alert', 'ecologie-reflexes'],
  },
  {
    id: 'old',
    term: 'Obligations légales de débroussaillement (OLD)',
    definition:
      "Obligation, pour le propriétaire d'une construction située dans un massif forestier classé à risque d'incendie ou à moins de 200 mètres, de débroussailler sur au moins 50 mètres autour d'elle.",
    sources: ['georisques-old'],
  },
  {
    id: 'seveso',
    term: 'Site Seveso',
    definition:
      'Établissement qui stocke, utilise ou produit des substances dangereuses au-delà de certaines quantités. Selon ces quantités, il est classé « seuil haut » ou « seuil bas ».',
    sources: ['georisques-risque-industriel'],
  },
];

export function findEntry(id: string): LexiconEntry | undefined {
  return LEXICON.find((entry) => entry.id === id);
}
