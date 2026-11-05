export interface NearbyCountry { id: string; distance: number; small: boolean; exact: boolean }
/** Screen-space width matters: a long country can still be only a few pixels wide. */
export function needsPickingHelp(bounds: readonly number[], scale: number, radius: number): boolean {
  return Math.min(bounds[2] - bounds[0], bounds[3] - bounds[1]) * scale < radius * 1.5;
}
/** No target-country bias: nearby small/narrow countries preserve the exact hit as a choice. */
export function resolveCountries(hits: NearbyCountry[], radius: number): string[] {
  const small = hits.filter(h => h.small && h.distance <= radius).sort((a,b) => a.distance - b.distance);
  const exact = hits.find(h => h.exact);
  if (!small.length) return exact ? [exact.id] : [];
  const choices = small.slice(0, 5).map(h => h.id);
  if (exact && !choices.includes(exact.id)) choices.push(exact.id);
  return choices;
}
export function segmentDistance(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
  const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

/** Crowded taps enlarge geography, never disclose names or consult the quiz target. */
export function resolveMapTap(ids: readonly string[], exact: string | null, zoom: number):
  { kind: 'inspect' } | { kind: 'pick'; id: string } | { kind: 'none' } {
  if (!ids.length) return { kind: 'none' };
  if (ids.length > 1 && zoom < 16) return { kind: 'inspect' };
  return { kind: 'pick', id: exact && ids.includes(exact) ? exact : ids[0] };
}
