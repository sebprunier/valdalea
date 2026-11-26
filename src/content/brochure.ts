import { DICRIM } from './dicrim';

/**
 * « Si la sirène retentit » : la brochure d'information des riverains de l'usine
 * Engrais du Val, que le joueur prend à la mairie dans le chapitre de l'accident
 * industriel. Comme le DICRIM, c'est un document fictif, et chaque page le dit.
 *
 * Elle ne contient rien de plus que ce que le jeu dit déjà. Ce qui décrit l'usine
 * et son périmètre vient du DICRIM de la commune (de la fiction) ; le phénomène,
 * le signal d'alerte et la conduite à tenir reprennent les pages officielles
 * citées. Aucune donnée technique n'est inventée : ni produits, ni quantités, ni
 * distances d'effet, ni numéros à appeler.
 */

const RISK = DICRIM.risks.find((risk) => risk.id === 'industriel')!;

export const BROCHURE = {
  title: 'Si la sirène retentit',
  subtitle: "Brochure d'information des riverains",
  site: 'Usine Engrais du Val, zone industrielle des Vannes',
  editor: 'Éditée par Engrais du Val, en lien avec la préfecture',
  edition: 'Édition 2026 — document à conserver',
  why: {
    title: 'Pourquoi cette brochure ?',
    paragraphs: [
      RISK.local[0],
      "Un accident industriel peut exposer la population et l'environnement à des effets thermiques, toxiques ou de surpression. Il peut s'agir d'un incendie, d'une explosion, d'une fuite de liquide polluant ou d'une dispersion atmosphérique de gaz toxique.",
      "Les personnes qui vivent dans une zone à risques industriels majeurs demandent à leur mairie les brochures d'information éditées par l'industriel en lien avec la préfecture : elles informent sur les signaux d'alerte et indiquent la conduite à tenir. C'est le rôle de ce document.",
    ],
    sources: ['georisques-risque-industriel', 'georisques-industriel'],
  },
  where: {
    title: 'Êtes-vous concerné ?',
    paragraphs: [
      // La phrase du DICRIM, où « son plan » devient « le plan de l'usine » : la brochure parle d'elle-même.
      "Le périmètre du plan particulier d'intervention (PPI) de l'usine, arrêté par le préfet, couvre la zone industrielle, la cité des Vannes et le sud du hameau des Brandes.",
      'Si vous habitez, travaillez ou passez dans ce périmètre, cette brochure est pour vous.',
    ],
    /** Ce que montre la carte, pour qui ne la voit pas. */
    mapSummary: RISK.mapSummary,
  },
  signal: {
    title: 'Comment serez-vous alerté ?',
    paragraphs: [
      "Par le signal national d'alerte : une sirène qui retentit trois fois pendant 1 minute et 41 secondes. Apprenez dès maintenant à le reconnaître.",
      "La fin de l'alerte est donnée par un autre signal sonore, de 30 secondes.",
      "Si vous vous trouvez dans la zone de danger, vous pouvez aussi recevoir sur votre téléphone portable une notification FR-Alert, accompagnée d'un signal sonore spécifique, même si le téléphone est en mode silencieux.",
    ],
    /** Le schéma du signal, pour qui ne le voit pas. */
    figure: "Schéma. Le signal d'alerte : la sirène retentit trois fois, pendant 1 minute et 41 secondes chaque fois. Le signal de fin d'alerte : la sirène retentit une fois, pendant 30 secondes.",
    sources: ['georisques-industriel', 'fr-alert'],
  },
  conduct: {
    title: 'Que faire ?',
    /** La conduite à tenir, moment par moment : la même que dans le DICRIM. */
    groups: RISK.reflexes,
    sources: ['georisques-industriel'],
  },
  more: {
    title: 'Pour en savoir plus',
    text: "Le DICRIM de Val-d'Aléa, à la mairie, décrit tous les risques de la commune. Les pages officielles ci-dessous donnent le détail des consignes.",
    links: ['georisques-industriel', 'georisques-risque-industriel', 'georisques-kit'],
  },
};

/** Toutes les sources citées par la brochure, pour les tests de cohérence. */
export function brochureSources(): string[] {
  return [...BROCHURE.why.sources, ...BROCHURE.signal.sources, ...BROCHURE.conduct.sources, ...BROCHURE.more.links];
}
