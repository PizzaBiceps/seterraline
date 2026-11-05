export interface TouchPoint { x: number; y: number }
export interface MapView { center: number[]; zoom: number; width: number; height: number; baseScale: number }
interface Pinch { distance: number; zoom: number; worldX: number; worldY: number }

/** Two fingers navigate only. Lifting either finger can never submit an answer. */
export class TouchNavigation {
 readonly points = new Map<number, TouchPoint>();
 blocked = false;
 private pinch: Pinch | null = null;
 down(id: number, point: TouchPoint, view: MapView): 'single' | 'pinch' | 'blocked' {
  this.points.set(id, point);
  if (this.points.size >= 2) { this.blocked = true; this.rebase(view); return 'pinch'; }
  return this.blocked ? 'blocked' : 'single';
 }
 move(id: number, point: TouchPoint, view: MapView): { center: number[]; zoom: number } | null {
  if (!this.points.has(id)) return null;
  this.points.set(id, point);
  if (!this.pinch || this.points.size < 2) return null;
  const [a,b] = [...this.points.values()];
  const zoom = Math.max(1, Math.min(16, this.pinch.zoom * Math.hypot(b.x-a.x,b.y-a.y) / this.pinch.distance));
  const scale = view.baseScale * zoom;
  return { zoom, center: [this.pinch.worldX - ((a.x+b.x)/2-view.width/2)/scale,
   this.pinch.worldY - ((a.y+b.y)/2-view.height/2)/scale] };
 }
 up(id: number, view: MapView): boolean {
  const suppress = this.blocked;
  this.points.delete(id); this.pinch = null;
  if (this.points.size >= 2) this.rebase(view);
  if (!this.points.size) this.blocked = false;
  return suppress;
 }
 cancel(): void { this.points.clear(); this.pinch = null; this.blocked = false; }
 private rebase(view: MapView): void {
  const [a,b] = [...this.points.values()];
  const scale = view.baseScale * view.zoom;
  this.pinch = { distance: Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)), zoom: view.zoom,
   worldX: view.center[0]+((a.x+b.x)/2-view.width/2)/scale,
   worldY: view.center[1]+((a.y+b.y)/2-view.height/2)/scale };
 }
}
