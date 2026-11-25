/**
 * Textes des fiches de lieux, indexés par identifiant de lieu.
 *
 * Ces textes plantent le décor : ils ne contiennent aucune consigne de sécurité.
 * Les contenus de prévention (gestes, consignes, obligations) seront rangés à part,
 * chacun accompagné de sa source officielle.
 */
export interface PlaceText {
  /** Présentation du lieu, affichée à l'ouverture de sa fiche. */
  description: string;
}

export const PLACE_TEXTS: Record<string, PlaceText> = {
  domicile: {
    description:
      "Votre maison, à deux pas du quai et du pont. Vous y vivez depuis trois ans, et vous venez de vous engager dans la réserve communale de sécurité civile.",
  },
  jeanne: {
    description:
      "La maison de Jeanne, votre voisine, 84 ans. Une petite maison de plain-pied, à deux portes de chez vous, au bord du quai.",
  },
  mairie: {
    description:
      "Le siège de la commune, installé sur les hauteurs. C'est ici que travaillent les élus et les agents, et que la réserve communale a son local.",
  },
  gymnase: {
    description:
      "Le gymnase municipal, à côté de la mairie. Un grand bâtiment de plain-pied, avec un vaste parking et un accès facile depuis toute la commune.",
  },
  ecole: {
    description:
      "L'école élémentaire de la commune, construite le long du quai. Une centaine d'élèves y sont accueillis chaque jour.",
  },
  pont: {
    description:
      "Le seul pont routier de la commune sur la Follette. Il relie le bourg à la rive sud, où se trouvent le camping et les terres agricoles.",
  },
  'vieux-bourg': {
    description:
      "Le cœur ancien de Val-d'Aléa. Ses maisons ont été bâties avec la pierre tirée de carrières souterraines, creusées juste sous le quartier et abandonnées depuis plus d'un siècle.",
  },
  argilieres: {
    description:
      "Un lotissement pavillonnaire des années 1980, sur le plateau. Son nom rappelle le sol argileux sur lequel il est construit, autrefois exploité par des tuileries.",
  },
  'sous-la-roche': {
    description:
      "Une rue de maisons adossées au pied de la falaise. Les jardins des habitations les plus proches touchent les éboulis.",
  },
  lucien: {
    description:
      "Une maison dans une clairière, au bout d'un sentier, à l'écart du hameau : la forêt l'entoure sur trois côtés. Lucien y vit depuis quarante ans.",
  },
  brandes: {
    description:
      "Quelques maisons isolées en lisière de la forêt des Brandes, reliées au bourg par un seul chemin.",
  },
  cite: {
    description:
      "L'ancienne cité ouvrière, bâtie pour loger le personnel de l'usine. Ses maisons toutes semblables sont les plus proches voisines du site industriel.",
  },
  usine: {
    description:
      "Un site de fabrication et de stockage d'engrais, classé Seveso seuil haut. L'accès est réservé au personnel : vous restez devant le portail.",
  },
  camping: {
    description:
      "Le camping municipal, installé sur la rive basse de la Follette. Il affiche complet tout l'été ; une passerelle le relie au quai.",
  },
};
