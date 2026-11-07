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
test('presence distinguishes activity, away, offline and finished without guessing from score', () => {
 const {room,host,guest} = setup(); act(room,host,{type:'start'},pool,2000);
 host.lastSeenAt = 62000; guest.lastSeenAt = 62000;
 let view = snapshot(room,host,63000);
 assert.equal(view.players.find(p=>p.id===host.id)!.presence,'away');
 act(room,host,{type:'command',game:1,revision:0,command:{type:'skip'}},pool,63000);
 view = snapshot(room,host,64000);
 assert.equal(view.players.find(p=>p.id===host.id)!.presence,'active');
 assert.equal(view.players.find(p=>p.id===host.id)!.points,0);
 guest.lastSeenAt = 1000;
 assert.equal(snapshot(room,host,64000).players.find(p=>p.id===guest.id)!.presence,'offline');
 assert.equal(view.total,10);
});
test('host can end a stalled round, preserving points and distinguishing unfinished players', () => {
 const {room,host,guest} = setup(); act(room,host,{type:'start'},pool,2000);
 while(host.state!.status!=='finished') act(room,host,{type:'command',game:1,revision:host.state!.revision,command:{type:'guess',countryId:host.state!.deck[host.state!.index]}},pool,3000);
 assert.throws(()=>act(room,guest,{type:'end'},pool,4000),/host/);
 act(room,host,{type:'end'},pool,5000);
 assert.equal(room.phase,'finished');
 const view = snapshot(room,host,5000);
 assert.equal(view.players.find(p=>p.id===host.id)!.points,1000);
 assert.equal(view.players.find(p=>p.id===host.id)!.finished,true);
 assert.equal(view.players.find(p=>p.id===guest.id)!.stopped,true);
 assert.equal(view.players.find(p=>p.id===guest.id)!.finished,false);
 assert.equal(guest.state!.status,'finished');
 act(room,host,{type:'start'},pool,6000);
 assert.equal(guest.stopped,false); assert.equal(guest.state!.status,'playing');
});
test('one finisher does not end the party; ten minutes ends unfinished runs only', async () => {
 const { expireRound, ROUND_DURATION_MS } = await import('./room');
 const {room,host,guest} = setup(); act(room,host,{type:'start'},pool,2000);
 while(host.state!.status!=='finished') act(room,host,{type:'command',game:1,revision:host.state!.revision,command:{type:'guess',countryId:host.state!.deck[host.state!.index]}},pool,3000);
 assert.equal(room.phase,'playing'); assert.equal(guest.state!.status,'playing');
 act(room,guest,{type:'command',game:1,revision:0,command:{type:'guess',countryId:guest.state!.deck[0]}},pool,4000);
 assert.equal(expireRound(room,2000+ROUND_DURATION_MS-1),false);
 assert.equal(expireRound(room,2000+ROUND_DURATION_MS),true);
 assert.equal(room.phase,'finished'); assert.equal(guest.timedOut,true); assert.equal(host.timedOut,false);
 assert.equal(guest.finishedAt,2000+ROUND_DURATION_MS);
 assert.equal(snapshot(room,guest,999999).players.find(p=>p.id===guest.id)!.points,100);
 assert.equal(expireRound(room,999999),false);
 assert.throws(()=>act(room,guest,{type:'command',game:1,revision:guest.state!.revision,command:{type:'skip'}},pool,999999),/changed/);
 act(room,host,{type:'start'},pool,1000000); assert.equal(guest.timedOut,false);
});
test('first two completion medals follow server finish order, survive replay rejection, and reset', () => {
 const {room,host,guest} = setup(); const third = join(room,'Third',1000);
 act(room,host,{type:'start'},pool,2000);
 for (const [p,now] of [[guest,3000],[host,4000]] as const) {
  while(p.state!.status!=='finished') act(room,p,{type:'command',game:1,revision:p.state!.revision,command:{type:'skip'}},pool,now);
 }
 assert.equal(guest.finishPlace,1); assert.equal(host.finishPlace,2); assert.equal(third.finishPlace,undefined);
 assert.equal(room.phase,'playing');
 assert.throws(()=>act(room,guest,{type:'command',game:1,revision:guest.state!.revision,command:{type:'skip'}},pool,5000));
 assert.equal(guest.finishPlace,1);
 act(room,host,{type:'end'},pool,6000); assert.equal(third.finishPlace,undefined);
 act(room,host,{type:'start'},pool,7000); assert.equal(guest.finishPlace,undefined);
});
test('vote removal needs distinct majority votes, excludes self votes, and transfers the host',()=>{
 const {room,host,guest}=setup();const third=join(room,'Third',1000),fourth=join(room,'Fourth',1000);
 assert.throws(()=>act(room,host,{type:'vote-kick',playerId:host.id},pool,2000));
 act(room,guest,{type:'vote-kick',playerId:host.id},pool,2000);
 act(room,guest,{type:'vote-kick',playerId:host.id},pool,2001);assert.equal(room.players.length,4);
 act(room,third,{type:'vote-kick',playerId:host.id},pool,2002);assert.equal(room.players.length,3);assert.equal(room.hostId,guest.id);
 assert.ok(room.players.includes(fourth));assert.equal(JSON.stringify(snapshot(room,guest,2003)).includes(host.token),false);
});
test('last-place bonus is assigned once at finalization with an exact 30 percent threshold',async()=>{
 const {rollDunce}=await import('./room');assert.equal(rollDunce(0),true);assert.equal(rollDunce(.299999),true);assert.equal(rollDunce(.3),false);assert.equal(rollDunce(.99999),false);
 const {room,host,guest}=setup();act(room,host,{type:'start'},pool,2000);
 for(const [p,now] of [[host,3000],[guest,4000]] as const)while(p.state!.status!=='finished')act(room,p,{type:'command',game:1,revision:p.state!.revision,command:{type:'skip'}},pool,now);
 assert.equal(room.winnerId,host.id);assert.equal(room.loserId,guest.id);
 const result=guest.dunceHat;assert.equal(typeof result,'boolean');snapshot(room,guest,5000);assert.equal(guest.dunceHat,result);
 act(room,host,{type:'start'},pool,6000);assert.equal(guest.dunceHat,undefined);
});
test('lobby auto-starts after five minutes, with one shared clock for all joiners',async()=>{
 const {advanceLobby,LOBBY_WAIT_MS}=await import('./room');
 const {room,host}=setup();room.lobbyDeadlineAt=1000+LOBBY_WAIT_MS;
 assert.equal(advanceLobby(room,pool,room.lobbyDeadlineAt-1),false);
 const late=join(room,'Late',room.lobbyDeadlineAt-1);assert.equal(room.lobbyDeadlineAt,1000+LOBBY_WAIT_MS);
 assert.equal(advanceLobby(room,pool,room.lobbyDeadlineAt),true);assert.equal(room.phase,'playing');
 assert.equal(room.startedAt,room.lobbyDeadlineAt);assert.deepEqual(late.state!.deck,host.state!.deck);
 assert.equal(advanceLobby(room,pool,room.lobbyDeadlineAt+1),false);
});
test('eighth player starts immediately; a ninth cannot join',async()=>{
 const {advanceLobby}=await import('./room');const {room}=setup();room.lobbyDeadlineAt=301000;
 for(let i=0;i<5;i++)join(room,`Guest ${i}`,2000);
 assert.equal(advanceLobby(room,pool,2000),false);
 join(room,'Eighth',2001);assert.equal(advanceLobby(room,pool,2001),true);assert.equal(room.startedAt,2001);
 assert.throws(()=>join(room,'Ninth',2002),/full|started/);
});
test('a solo lobby closes at the deadline, and a party closes when reduced to one before starting',async()=>{
 const {advanceLobby}=await import('./room');const {room,host,guest}=setup();room.lobbyDeadlineAt=301000;
 act(room,guest,{type:'leave'},pool,2000);assert.equal(room.phase,'canceled');
 assert.throws(()=>act(room,host,{type:'start'},pool,2001),/closed/);
 const solo={...room,phase:'lobby' as const,players:[host],lobbyDeadlineAt:301000};
 assert.equal(advanceLobby(solo,pool,300999),false);assert.equal(advanceLobby(solo,pool,301000),true);assert.equal(solo.phase,'canceled');
});
