/** Rayon du joueur pour les collisions, en unités monde. */
export const PLAYER_RADIUS = 9;

/** Vitesses de déplacement, en unités monde par seconde. */
export const WALK_SPEED = 170;
export const RUN_SPEED = 280;

/** Distance à laquelle un lieu devient accessible. */
export const INTERACT_RADIUS = 58;

/**
 * Conversion d'affichage des distances : une unité monde vaut un mètre. La commune
 * fait donc 4,2 km sur 3 ; les bâtiments, eux, sont grossis comme sur un plan schématique.
 * À 100 m par minute de jeu, le joueur marche à 6 km/h.
 */
export const UNITS_PER_METER = 1;

/**
 * Niveaux de zoom de la carte, en facteur de la vue normale. Peu nombreux et
 * bornés : assez pour prendre du recul, pas assez pour perdre le personnage.
 */
export const ZOOM_LEVELS = [0.6, 0.8, 1, 1.3] as const;
export const DEFAULT_ZOOM = 2;
