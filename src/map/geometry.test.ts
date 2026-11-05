import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { geoNaturalEarth1, geoStream, geoPath } from 'd3-geo';
import { triangulateRings } from './geometry';
import type { Atlas } from './renderer';
function triangleArea(v: number[]): number { let area = 0; for (let i = 0; i < v.length; i += 6) area += Math.abs((v[i + 2] - v[i]) * (v[i + 5] - v[i + 1]) - (v[i + 4] - v[i]) * (v[i + 3] - v[i + 1])) / 2; return area; }
test('disconnected exterior rings never acquire a land bridge', () => {
 const v = triangulateRings([[0,0, 2,0, 2,2, 0,2], [10,0, 12,0, 12,2, 10,2]]);
 assert.equal(triangleArea(v), 8);
 for (let i = 0; i < v.length; i += 6) assert.ok(Math.max(v[i],v[i+2],v[i+4])-Math.min(v[i],v[i+2],v[i+4]) <= 2);
});
test('projected atlas triangulation preserves date-line polygons and enclave holes', () => {
 const atlas: Atlas = JSON.parse(readFileSync(new URL('../../public/data/countries.json', import.meta.url), 'utf8'));
 const projection = geoNaturalEarth1().translate([0,0]).scale(178);
 for (const name of ['Russia','Fiji','South Africa','France','United States']) {
  const feature = atlas.features.find(f => f.properties.name === name)!; let ring: number[] = [], rings: number[][] = [], vertices: number[] = [];
  geoStream(feature, projection.stream({ point(x,y){ring.push(x,y);}, lineStart(){ring=[];},lineEnd(){if(ring.length>=6) rings.push(ring);},polygonStart(){rings=[];},polygonEnd(){vertices = vertices.concat(triangulateRings(rings));},sphere(){} }));
  const expected = geoPath(projection).area(feature), actual = triangleArea(vertices);
  assert.ok(Math.abs(actual - expected) < Math.max(.01, expected * .0001), `${name}: ${actual} vs ${expected}`);
 }
});
