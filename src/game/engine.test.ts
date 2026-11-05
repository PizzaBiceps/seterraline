import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, reduceMatch, currentStreak, score, shuffled, flagOptions, type Country } from './engine.ts';
const pool: Country[] = Array.from({ length: 12 }, (_, i) => ({ id: String(i), name: `Country ${i}`, iso: String(i), region: i < 6 ? 'Europe' : 'Asia', independent: true }));
const config = { mode: 'countries' as const, region: 'Europe' as const, rounds: 4, seed: 42 };
test('seeded decks are replayable, unique, and restricted to region', () => {
 const a = createMatch(config, pool), b = createMatch(config, pool);
 assert.deepEqual(a.deck, b.deck); assert.equal(new Set(a.deck).size, 4); assert.ok(a.deck.every(id => Number(id) < 6)); assert.notDeepEqual(shuffled(pool, 1), shuffled(pool, 2));
});
test('wrong answers stay on target, hints reduce points, and inputs do not mutate', () => {
 const state = createMatch(config, pool); const wrong = reduceMatch(state, { type: 'guess', countryId: 'invalid', elapsedMs: 1 });
 assert.equal(wrong.index, 0); assert.equal(wrong.attempts, 1); assert.equal(state.attempts, 0);
 const hinted = reduceMatch(wrong, { type: 'hint' }); const next = reduceMatch(hinted, { type: 'guess', countryId: state.deck[0], elapsedMs: 20 });
 assert.equal(score(next), 25); assert.equal(next.index, 1); assert.equal(next.hinted, false);
});
test('skip records zero points and completion ignores late commands', () => {
 let state = createMatch({ ...config, rounds: 1 }, pool); state = reduceMatch(state, { type: 'skip', elapsedMs: 10 });
 assert.equal(state.status, 'finished'); assert.equal(score(state), 0); assert.equal(state.answers[0].skipped, true); assert.equal(reduceMatch(state, { type: 'hint' }), state);
});
test('all-country rounds and deterministic flag choices include target once', () => {
 const state = createMatch({ ...config, rounds: 0 }, pool); assert.equal(state.deck.length, 6);
 const options = flagOptions(pool[0], pool, 8); assert.equal(options.length, 4); assert.equal(options.filter(c => c.id === '0').length, 1); assert.deepEqual(options, flagOptions(pool[0], pool, 8));
});
test('third miss automatically advances for zero points in every mode', () => {
 for (const mode of ['countries', 'flags', 'flag-map'] as const) {
  let state = createMatch({ ...config, mode, rounds: 2 }, pool);
  const target = state.deck[0];
  for (let i=0;i<2;i++) {
   state = reduceMatch(state, { type: 'guess', countryId: 'wrong', elapsedMs: i });
   assert.equal(state.index,0);
  }
  state = reduceMatch(state, { type: 'guess', countryId: 'wrong', elapsedMs: 100 });
  assert.equal(state.index,1); assert.equal(state.attempts,0); assert.equal(score(state),0);
  assert.equal(state.answers[0].targetId,target); assert.equal(state.answers[0].failed,true);
  assert.equal(state.answers[0].correct,false); assert.equal(state.answers[0].skipped,false);
  state = reduceMatch(state, { type: 'guess', countryId: state.deck[1], elapsedMs: 50 });
  assert.equal(state.status,'finished'); assert.equal(score(state),100);
  assert.equal(reduceMatch(state,{type:'guess',countryId:target,elapsedMs:200}),state);
 }
});
test('two misses still allow a scored answer; a third miss on the last country finishes the round', () => {
 let state = createMatch({...config,rounds:1},pool);
 for(let i=0;i<2;i++) state=reduceMatch(state,{type:'guess',countryId:'wrong',elapsedMs:i});
 const correct=reduceMatch(state,{type:'guess',countryId:state.deck[0],elapsedMs:10});
 assert.equal(score(correct),50); assert.equal(correct.attempts,0);
 const failed=reduceMatch(state,{type:'guess',countryId:'wrong',elapsedMs:10});
 assert.equal(failed.status,'finished'); assert.equal(failed.answers.length,1);
 assert.equal(failed.answers[0].points,0); assert.equal(failed.answers[0].failed,true);
});

test('streak survives two misses, extends on recovery, and ends on the third miss in every mode', () => {
 for (const mode of ['countries','flag-map','flags'] as const) {
  let state=createMatch({...config,mode},pool);
  const guess=(countryId:string)=>{state=reduceMatch(state,{type:'guess',countryId,elapsedMs:2000});};
  guess(state.deck[0]); assert.equal(currentStreak(state),1);
  guess('invalid'); assert.equal(currentStreak(state),1);
  guess(state.deck[1]); assert.equal(currentStreak(state),2); assert.equal(state.answers.at(-1)?.points,75);
  guess('invalid'); guess('invalid'); assert.equal(currentStreak(state),2);
  guess(state.deck[2]); assert.equal(currentStreak(state),3); assert.equal(state.answers.at(-1)?.points,50);
  guess('invalid'); assert.equal(currentStreak(state),3);
  guess('invalid'); assert.equal(currentStreak(state),3);
  guess('invalid'); assert.equal(currentStreak(state),0);
  assert.equal(state.status,'finished');
 }
});
test('hints and skips still break a streak; a new match starts at zero', () => {
 let state=createMatch(config,pool);
 assert.equal(currentStreak(state),0);
 state=reduceMatch(state,{type:'guess',countryId:state.deck[0],elapsedMs:1000});
 const hinted=reduceMatch(state,{type:'hint'});
 assert.equal(currentStreak(hinted),0);
 assert.equal(currentStreak(reduceMatch(hinted,{type:'guess',countryId:hinted.deck[1],elapsedMs:1000})),0);
 assert.equal(currentStreak(reduceMatch(state,{type:'skip',elapsedMs:1000})),0);
});
