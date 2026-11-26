import pkg from '../../package.json';

/**
 * Qui a fait le jeu, sous quelles licences, et où le trouver. Affiché dans le
 * téléphone, application « À propos ».
 */
export const CREDITS = {
  name: "Val-d'Aléa",
  version: pkg.version,
  author: 'Sébastien Prunier',
  site: 'https://www.valdalea.fr',
  repository: 'https://github.com/sebprunier/valdalea',
  issues: 'https://github.com/sebprunier/valdalea/issues',
  licences: {
    code: { name: 'MIT', url: 'https://github.com/sebprunier/valdalea/blob/main/LICENSE' },
    contents: { name: 'Creative Commons Attribution - Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0)', url: 'https://creativecommons.org/licenses/by-sa/4.0/deed.fr' },
  },
  /** La voix de la radio : une voix de synthèse, enregistrée à l'avance (voir `scripts/generer-radio.py`). */
  voice: {
    engine: { name: 'Piper', url: 'https://github.com/OHF-voice/piper1-gpl' },
    name: 'fr_FR-siwis-medium',
    dataset: {
      name: 'The SIWIS French Speech Synthesis Database',
      authors: "J. Yamagishi, P.-E. Honnet, P. Garner et A. Lazaridis, université d'Édimbourg, 2017",
      url: 'https://doi.org/10.7488/ds/1705',
      licence: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/deed.fr' },
    },
  },
} as const;
