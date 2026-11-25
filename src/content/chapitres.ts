/**
 * Les chapitres du jeu : une année à Val-d'Aléa, un risque par saison.
 *
 * Après le prologue (la rencontre du maire, la lecture du DICRIM), le joueur
 * choisit ses chapitres dans l'ordre qu'il veut. Le calendrier en conseille un
 * pour commencer, sans l'imposer.
 */
export interface ChapterInfo {
  id: string;
  /** Saison où se joue le chapitre. */
  season: string;
  title: string;
  /** Risque majeur traité. */
  risk: string;
  /** Ce qui attend le joueur, en une ou deux phrases. */
  summary: string;
  /** Le chapitre peut être joué ; sinon il est annoncé, en préparation. */
  playable: boolean;
  /** Conseillé pour commencer. */
  suggested?: boolean;
}

export const CHAPTERS: ChapterInfo[] = [
  {
    id: 'automne',
    season: 'Automne',
    title: 'La crue de la Follette',
    risk: 'Inondation',
    summary: "Les grosses pluies arrivent. Une journée pour préparer votre maison, vos voisins et la commune, puis la rivière monte.",
    playable: true,
    suggested: true,
  },
  {
    id: 'ete',
    season: 'Printemps et été',
    title: 'Le feu des Brandes',
    risk: 'Feu de forêt',
    summary: "Débroussailler au printemps autour des maisons du hameau, à la lisière de la forêt ; l'été venu, un départ de feu.",
    playable: false,
  },
];

/** Risques décrits dans le DICRIM dont le chapitre viendra plus tard. */
export const LATER = ['Accident industriel', 'Retrait-gonflement des argiles', 'Cavités souterraines', 'Chutes de blocs'];

export function findChapter(id: string | null): ChapterInfo | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}
