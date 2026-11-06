import test from 'node:test';
import assert from 'node:assert/strict';
import { act, checkConfig, checkVersion, join, snapshot, type Room } from './room';
import type { Country, Mode } from '../src/game/engine';
const pool: Country[] = Array.from({ length: 12 }, (_,i) => ({ id: String(i), name: `Country ${i}`, iso: `c${i}`, region: 'Europe', independent: true }));
function setup(mode: Mode = 'countries') {
 const room: Room = { code: '1234567890abcdef', config: checkConfig({ mode, region: 'Europe', rounds: 10 }), phase: 'lobby', hostId: '', players: [], startedAt: 0, game: 0, expiresAt: 999999 };
 const host = join(room, 'Host', 1000), guest = join(room, 'Guest', 1000);
 return { room, host, guest };
}
test('enforces eight seats and validates input and host controls', () => {
 const {room, host, guest} = setup();
 assert.throws(() => checkConfig({mode:'unknown'})); assert.throws(() => checkVersion(0));
 assert.throws(() => join(room, ' '.repeat(3), 1000));
 for (let i = 0; i < 6; i++) join(room, `Player ${i}`, 1000);
 assert.throws(() => join(room, 'Ninth', 1000), /full/);
 assert.throws(() => act(room, guest, {type:'start'}, pool, 2000), /host/);
 act(room, host, {type:'start'}, pool, 2000);
 assert.throws(() => join(room, 'Late', 3000), /started/);
});
for (const mode of ['countries','flags','flag-map'] as const) test(`${mode}: shared deck, authoritative scoring, private snapshots and replay protection`, () => {
 const {room,host,guest} = setup(mode);
 act(room,host,{type:'start'},pool,2000);
 assert.deepEqual(host.state!.deck,guest.state!.deck);
 const view = snapshot(room,host,2100);
 assert.equal(view.state!.deck.filter(Boolean).length,1);
 assert.equal(view.config.seed,0);
 assert.equal(JSON.stringify(view).includes(host.token),false);
 assert.equal(JSON.stringify(view).includes('questionAt'),false);
 act(room,host,{type:'command',game:room.game,revision:0,command:{type:'hint'}},pool,2500);
 const answer = {type:'command',game:room.game,revision:1,command:{type:'guess',countryId:host.state!.deck[0],elapsedMs:-999999,points:99999}};
 act(room,host,answer,pool,3000);
 assert.equal(host.state!.answers[0].points,50);
 assert.equal(host.state!.answers[0].elapsedMs,1000);
 assert.throws(() => act(room,host,answer,pool,3001), /changed/);
 assert.equal(guest.state!.index,0);
});
test('completion standings, rematches, and host departure', () => {
 const {room,host,guest} = setup(); act(room,host,{type:'start'},pool,2000);
 for (const [p,at] of [[host,3000],[guest,4000]] as const) {
  while (p.state!.status !== 'finished') act(room,p,{type:'command',game:room.game,revision:p.state!.revision,command:{type:'guess',countryId:p.state!.deck[p.state!.index]}},pool,at);
 }
 assert.equal(room.phase,'finished'); assert.equal(snapshot(room,guest,5000).players[0].id,host.id);
 act(room,host,{type:'start'},pool,6000); assert.equal(room.game,2); assert.equal(host.state!.index,0);
 assert.throws(() => act(room,host,{type:'command',game:1,revision:0,command:{type:'skip'}},pool,6100));
 act(room,host,{type:'leave'},pool,6200); assert.equal(room.hostId,guest.id);
});
