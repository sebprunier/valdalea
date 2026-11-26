/**
 * Bruit lisse, déterministe, entre -1 et 1 : il donne un tracé irrégulier à ce
 * qui serait sinon trop géométrique (le front d'un feu, le bord d'un nuage).
 * Le même point donne toujours la même valeur : rien n'est tiré au sort.
 */
export function ripple(x: number, y: number): number {
  const lattice = (i: number, j: number): number => {
    const n = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = lattice(x0, y0) * (1 - sx) + lattice(x0 + 1, y0) * sx;
  const bottom = lattice(x0, y0 + 1) * (1 - sx) + lattice(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}
