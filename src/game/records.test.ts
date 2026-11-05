import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beats, recordKey, saveBest } from './records.ts';
const config = { mode: 'countries' as const, region: 'Europe' as const, rounds: 10, seed: 42 };
test('records rank score before speed and preserve the best on exact ties', () => {
 const values = new Map<string, string>();
 const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
 const first = { points: 900, elapsedMs: 50000 };
 assert.equal(saveBest(storage, config, first)?.isNew, true);
 assert.equal(saveBest(storage, config, { points: 899, elapsedMs: 1000 })?.isNew, false);
 assert.equal(saveBest(storage, config, { points: 900, elapsedMs: 49999 })?.isNew, true);
 assert.equal(saveBest(storage, config, { points: 1000, elapsedMs: 100000 })?.isNew, true);
 assert.equal(saveBest(storage, config, { points: 1000, elapsedMs: 100000 })?.isNew, false);
 assert.equal(beats(first, first), false);
 assert.equal(saveBest(storage, { ...config, seed: 99 }, first)?.isNew, false);
});
test('record categories separate mode, region, and round length', () => {
 assert.equal(new Set([
  recordKey(config), recordKey({ ...config, mode: 'flags' }),
  recordKey({ ...config, mode: 'flag-map' }), recordKey({ ...config, region: 'World' }),
  recordKey({ ...config, rounds: 20 }), recordKey({ ...config, rounds: 0 }),
 ]).size, 6);
});
test('unavailable storage and malformed records never prevent results', () => {
 const candidate = { points: 100, elapsedMs: 1000 };
 assert.equal(saveBest(undefined, config, candidate), null);
 assert.equal(saveBest({ getItem() { throw Error('blocked'); }, setItem() {} }, config, candidate), null);
 assert.equal(saveBest({ getItem() { return null; }, setItem() { throw Error('full'); } }, config, candidate), null);
 for (const value of ['{', 'null', '{"points":-1,"elapsedMs":1}', '{"points":50,"elapsedMs":-1}']) {
  assert.equal(saveBest({ getItem() { return value; }, setItem() {} }, config, candidate)?.isNew, true);
 }
});
