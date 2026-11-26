import type { Bulletin } from './model';
import clips from './radio.clips.json';
import bulletins from './radio.json';

/**
 * La radio du kit d'urgence : « une radio à piles, avec des piles de rechange,
 * pour suivre les consignes des autorités ». Le joueur ne l'entend que si son
 * kit est prêt : c'est chez lui, le kit à portée de main, que la radio parle.
 *
 * Les bulletins sont dans `radio.json` : le même texte est affiché dans le jeu
 * (la transcription) et lu par une voix de synthèse, enregistrée une fois pour
 * toutes par `scripts/generer-radio.py` (`npm run radio`). Le jeu n'embarque
 * donc aucun moteur de synthèse : un bulletin est un petit fichier audio, chargé
 * au moment où l'on allume le poste. `radio.clips.json` dit de quel texte chaque
 * enregistrement a été tiré ; les tests refusent un texte modifié sans sa voix.
 *
 * La station est fictive. Les consignes qu'elle donne sont celles des messages
 * et des alertes du même chapitre, avec les mêmes sources : rien de plus.
 */
export const STATION = "Radio Val-d'Aléa";

const bulletin = (id: keyof typeof bulletins): Bulletin => ({ id, kind: 'radio', from: STATION, ...bulletins[id] });

export const RADIO_CRUE = bulletin('crue-radio');
export const RADIO_FEU = bulletin('feu-radio');
export const RADIO_BULLETINS: Bulletin[] = [RADIO_CRUE, RADIO_FEU];

/** Ce que la voix dit, tel que le script de génération le lui donne à lire : un paragraphe par ligne. */
export const spokenText = (bulletin: Bulletin): string => bulletin.paragraphs.join('\n');

/** Un enregistrement : la voix qui l'a lu, l'empreinte du texte lu, sa durée et son poids. */
export interface RadioClip {
  voice: string;
  text: string;
  seconds: number;
  bytes: number;
}

export const RADIO_CLIPS: Record<string, RadioClip> = clips;

/** Où se trouve l'enregistrement d'un bulletin. */
export const radioClip = (id: string): string => `radio/${id}.mp3`;
