import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { geoNaturalEarth1, geoPath, geoStream, geoContains } from 'd3-geo';
import type { Atlas } from './renderer';
import assert from 'node:assert/strict';
import { needsPickingHelp, resolveCountries, segmentDistance } from './picking';
test('nearby microstates are selectable without silently stealing a neighboring country', () => {
 const hits = [{id:'France',exact:true,small:false,distance:0},{id:'Monaco',exact:false,small:true,distance:7}];
 assert.deepEqual(resolveCountries(hits,12),['Monaco','France']);
 assert.deepEqual(resolveCountries(hits,5),['France']);
});
test('touch tolerance and overlapping islands produce fair candidates', () => {
 const hits = [{id:'A',exact:false,small:true,distance:14},{id:'B',exact:false,small:true,distance:5}];
 assert.deepEqual(resolveCountries(hits,10),['B']);
 assert.deepEqual(resolveCountries(hits,20),['B','A']);
 assert.deepEqual(resolveCountries([],20),[]);
 assert.equal(segmentDistance(5,4,0,0,10,0),4);
 assert.equal(segmentDistance(-3,0,0,0,10,0),3);
});
test('long narrow countries get assistance based on width, with zoom and touch taken into account', () => {
 const bounds = [0, 0, 6, 60];
 assert.equal(needsPickingHelp(bounds, 2, 12), true);
 assert.equal(needsPickingHelp([0, 0, 60, 6], 2, 12), true);
 assert.equal(needsPickingHelp(bounds, 4, 12), false);
 assert.equal(needsPickingHelp(bounds, 4, 20), true);
 assert.equal(needsPickingHelp([0, 0, 60, 60], 2, 12), false);
 const nearBorder = [{ id: 'Benin', exact: true, small: false, distance: 0 },
  { id: 'Togo', exact: false, small: needsPickingHelp(bounds, 2, 12), distance: 8 }];
 assert.deepEqual(resolveCountries(nearBorder, 12), ['Togo', 'Benin']);
 assert.deepEqual(resolveCountries(nearBorder.map(h => h.id === 'Togo' ? { ...h, distance: 19 } : h), 12), ['Benin']);
 assert.deepEqual(resolveCountries(nearBorder.map(h => h.id === 'Togo' ? { ...h, small: needsPickingHelp(bounds, 4, 12) } : h), 12), ['Benin']);
});

test('real Togo geometry offers a picker for a nearby Benin click, but not a clear inland Ghana click', () => {
 const atlas: Atlas = JSON.parse(readFileSync(new URL('../../public/data/countries.json', import.meta.url), 'utf8'));
 const togo = atlas.features.find(f => f.properties.name === 'Togo')!;
 const benin = atlas.features.find(f => f.properties.name === 'Benin')!;
 const ghana = atlas.features.find(f => f.properties.name === 'Ghana')!;
 const projection = geoNaturalEarth1().translate([0, 0]).scale(178);
 const bounds = geoPath(projection).bounds(togo).flat();
 const scale = Math.min(611 / 1040, 747 / 550) * 3.375;
 assert.ok(Math.max(bounds[2] - bounds[0], bounds[3] - bounds[1]) * scale >= 18, 'old size check missed Togo');
 assert.equal(needsPickingHelp(bounds, scale, 12), true);
 assert.equal(needsPickingHelp(bounds, scale * 5, 12), false);
 const segments: number[][] = [];
 let ring: number[][] = [];
 geoStream(togo, projection.stream({ point(x,y) { ring.push([x,y]); }, lineStart() { ring = []; },
  lineEnd() { for (let i=0;i<ring.length;i++) segments.push([...ring[i],...ring[(i+1)%ring.length]]); },
  polygonStart() {}, polygonEnd() {}, sphere() {} }));
 const distance = (point: [number,number]) => {
  const [x,y] = projection(point)!;
  return Math.min(...segments.map(s => segmentDistance(x,y,s[0],s[1],s[2],s[3]))) * scale;
 };
 assert.equal(geoContains(benin, [2,8]), true);
 const nearbyDistance = distance([2,8]);
 assert.ok(nearbyDistance < 12);
 assert.deepEqual(resolveCountries([
  { id: 'Benin', small: false, exact: true, distance: 0 },
  { id: 'Togo', small: needsPickingHelp(bounds,scale,12), exact: false, distance: nearbyDistance },
 ],12), ['Togo','Benin']);
 assert.equal(geoContains(ghana, [-2,8]), true);
 assert.ok(distance([-2,8]) > 12);
 assert.deepEqual(resolveCountries([
  { id: 'Ghana', small: false, exact: true, distance: 0 },
  { id: 'Togo', small: true, exact: false, distance: distance([-2,8]) },
 ],12), ['Ghana']);
});

test('ambiguous taps inspect geography without submitting an answer; max zoom remains selectable', async () => {
 const { resolveMapTap }=await import('./picking');
 assert.deepEqual(resolveMapTap(['GHA','TGO','CIV'],'GHA',1),{kind:'inspect'});
 assert.deepEqual(resolveMapTap(['TGO','GHA'],'GHA',15),{kind:'inspect'});
 assert.deepEqual(resolveMapTap(['TGO','GHA'],'GHA',16),{kind:'pick',id:'GHA'});
 assert.deepEqual(resolveMapTap(['TGO'],null,4),{kind:'pick',id:'TGO'});
 assert.deepEqual(resolveMapTap([],null,1),{kind:'none'});
 assert.deepEqual(resolveMapTap(['MCO','FRA'],null,16),{kind:'pick',id:'MCO'});
});
