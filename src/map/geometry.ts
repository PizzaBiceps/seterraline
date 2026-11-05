import earcut from 'earcut';
/** D3's projected polygons may contain multiple exterior rings after date-line clipping. */
export function signedArea(ring: number[]): number {
 let sum = 0;
 for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) sum += ring[j] * ring[i + 1] - ring[i] * ring[j + 1];
 return sum / 2;
}
function contains(ring: number[], x: number, y: number): boolean {
 let inside = false;
 for (let i = 0, j = ring.length - 2; i < ring.length; j = i, i += 2) {
  const xi = ring[i], yi = ring[i + 1], xj = ring[j], yj = ring[j + 1];
  if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
 }
 return inside;
}
export function triangulateRings(rings: number[][]): number[] {
 const exteriors = rings.filter(r => signedArea(r) > 1e-10).map(r => ({ ring: r, holes: [] as number[][], area: signedArea(r) }));
 for (const hole of rings.filter(r => signedArea(r) < -1e-10)) {
  const parent = exteriors.filter(p => contains(p.ring, hole[0], hole[1])).sort((a, b) => a.area - b.area)[0];
  if (parent) parent.holes.push(hole);
 }
 const vertices: number[] = [];
 for (const exterior of exteriors) {
  const all = [exterior.ring, ...exterior.holes], flat = all.flat(), holes: number[] = [];
  let count = exterior.ring.length / 2;
  for (const hole of exterior.holes) { holes.push(count); count += hole.length / 2; }
  for (const index of earcut(flat, holes, 2)) vertices.push(flat[index * 2], flat[index * 2 + 1]);
 }
 return vertices;
}
