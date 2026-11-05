export const COMPASS_ARRIVAL_MS = 2400;
/** Same stepped turn and small overshoot as the header's CSS keyframes. */
export function compassArrivalAngle(progress: number): number {
 const keys = [[0,0],[.5,270],[.75,345],[.88,366],[1,360]];
 const p = Math.max(0, Math.min(1, progress));
 for (let i = 1; i < keys.length; i++) {
  if (p <= keys[i][0]) {
   const [start, from] = keys[i-1], [end, to] = keys[i];
   const step = Math.floor((p-start)/(end-start)*8 + 1e-8)/8;
   return from + (to-from)*step;
  }
 }
 return 360;
}
