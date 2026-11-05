import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODES } from './modes.ts';
import { createMatch, type Country } from './engine.ts';

test('flag-to-map uses the map and never reveals the country in its prompt', () => {
 const countries: Country[] = [
  { id: '616', name: 'Poland', iso: 'pl', region: 'Europe', independent: true },
  { id: '191', name: 'Croatia', iso: 'hr', region: 'Europe', independent: true },
 ];
 assert.equal(MODES['flag-map'].surface, 'map');
 assert.equal(MODES['flag-map'].prompt(countries[0]), MODES['flag-map'].prompt(countries[1]));
 for (const country of countries) assert.ok(!MODES['flag-map'].prompt(country).includes(country.name));
 const config = { region: 'Europe' as const, rounds: 0, seed: 12 };
 assert.deepEqual(createMatch({ ...config, mode: 'flag-map' }, countries).deck,
  createMatch({ ...config, mode: 'countries' }, countries).deck);
});
