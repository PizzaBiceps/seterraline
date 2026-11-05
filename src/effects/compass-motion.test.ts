import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compassArrivalAngle, COMPASS_ARRIVAL_MS } from '../ui/compass-motion.ts';
test('favicon turn matches the header keyframes and settles at the original orientation', () => {
 assert.equal(COMPASS_ARRIVAL_MS,2400);
 for (const [progress,angle] of [[0,0],[.5,270],[.75,345],[.88,366],[1,360],[-1,0],[2,360]]) {
  assert.equal(compassArrivalAngle(progress),angle);
 }
 assert.equal(compassArrivalAngle(.02),0);
 assert.equal(compassArrivalAngle(.1),33.75);
 for(let i=0;i<=100;i++) assert.ok(compassArrivalAngle(i/100)>=0 && compassArrivalAngle(i/100)<=366);
});
