import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { eligible, type Country } from './engine';
const atlas = JSON.parse(readFileSync(new URL('../../public/data/countries.json', import.meta.url), 'utf8'));
const countries: Country[] = atlas.features.map((f: { id: string; properties: Omit<Country, 'id'> }) => ({ id: f.id, ...f.properties }));
test('atlas has unique stable identifiers, including merged Australia and disputed features', () => {
 assert.equal(new Set(countries.map(c => c.id)).size, countries.length);
 assert.ok(countries.every(c => typeof c.id === 'string' && c.id.length > 0));
 assert.equal(countries.filter(c => c.name === 'Australia').length, 1);
 assert.ok(eligible(countries, 'World').length > 180);
});
test('every eligible country has a bundled SVG flag and a supported region', () => {
 const regions = ['Europe', 'Asia', 'Africa', 'Americas', 'Oceania'];
 for (const country of eligible(countries, 'World')) {
  assert.ok(regions.includes(country.region), country.name);
  assert.ok(existsSync(new URL(`../../public/flags/${country.iso}.svg`, import.meta.url)), country.name);
  const pixelFlag = readFileSync(new URL(`../../public/pixel-flags/${country.iso}.svg`, import.meta.url), 'utf8');
  assert.match(pixelFlag, /viewBox="0 0 16 12"/, `${country.name} pixel flag`);
 }
});
