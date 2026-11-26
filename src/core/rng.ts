export type Rng = () => number;

/** Les mêmes éléments, dans un ordre tiré au sort (mélange de Fisher-Yates). L'original n'est pas modifié. */
export function shuffled<T>(items: readonly T[], random: Rng = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Générateur pseudo-aléatoire déterministe (mulberry32). La commune est
 * construite avec une graine fixe : elle est identique d'une partie à l'autre.
 */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
