import { pointInPolygon, type Vec } from '../core/geometry';
import type { Elevation } from './elevation';
import { RISK_IDS, type Commune, type HazardZone, type RiskId } from './model';

/** Zones d'un risque, de la moins à la plus exposée : c'est l'ordre dans lequel on les dessine. */
export function zonesOf(commune: Commune, risk: RiskId): HazardZone[] {
  return commune.hazards.filter((zone) => zone.risk === risk).sort((a, b) => (a.level === b.level ? 0 : a.level === 'moyen' ? -1 : 1));
}

/** Le point est-il dans une zone cartographiée du risque ? */
export function isExposed(commune: Commune, elevation: Elevation, risk: RiskId, p: Vec): boolean {
  if (risk === 'inondation') return elevation.isFlooded(p, commune.relief.referenceFlood);
  return commune.hazards.some((zone) => zone.risk === risk && pointInPolygon(p, zone.poly));
}

/** Risques auxquels un point est exposé, d'après les cartes. */
export function exposuresAt(commune: Commune, elevation: Elevation, p: Vec): RiskId[] {
  return RISK_IDS.filter((risk) => isExposed(commune, elevation, risk, p));
}
