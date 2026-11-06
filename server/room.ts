import { createMatch, reduceMatch, eligible, flagOptions, score, type Country, type MatchConfig, type MatchState } from '../src/game/engine';
import { MAX_PLAYERS, PARTY_VERSION, type PartySnapshot } from '../src/party/types';
export interface Member { id: string; token: string; name: string; state?: MatchState; questionAt: number; finishedAt: number }
export interface Room { code: string; config: MatchConfig; phase: 'lobby' | 'playing' | 'finished'; hostId: string; players: Member[]; startedAt: number; game: number; expiresAt: number }
export function checkConfig(value: unknown): MatchConfig {
 const c = value as MatchConfig | undefined;
 if (!c || !['countries','flags','flag-map'].includes(c.mode) || !['World','Europe','Africa','Asia','Americas','Oceania'].includes(c.region) || ![0,10,20].includes(c.rounds)) throw new Error('Invalid game settings.');
 return { mode: c.mode, region: c.region, rounds: c.rounds, seed: crypto.getRandomValues(new Uint32Array(1))[0] };
}
export function join(room: Room, name: unknown, now: number): Member {
 if (room.phase !== 'lobby') throw new Error('This game has already started. Ask the host for a rematch.');
 if (room.players.length >= MAX_PLAYERS) throw new Error('This room is full (8 players).');
 if (typeof name !== 'string' || !name.trim() || name.trim().length > 24) throw new Error('Use a nickname of 1–24 characters.');
 const member: Member = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: name.trim(), questionAt: now, finishedAt: 0 };
 room.players.push(member); if (!room.hostId) room.hostId = member.id; return member;
}
export function act(room: Room, player: Member, body: Record<string, unknown>, pool: Country[], now: number): void {
 if (body.type === 'start') {
  if (player.id !== room.hostId) throw new Error('Only the host can start.');
  if (room.phase === 'playing') throw new Error('Finish the current game first.');
  if (room.players.length < 2) throw new Error('Invite at least one friend to start.');
  room.config = checkConfig(room.config); room.startedAt = now; room.game++; room.phase = 'playing';
  for (const p of room.players) { p.state = createMatch(room.config, pool); p.questionAt = now; p.finishedAt = 0; }
  return;
 }
 if (body.type === 'leave') {
  room.players = room.players.filter(p => p.id !== player.id);
  if (room.hostId === player.id) room.hostId = room.players[0]?.id || '';
  if (room.phase === 'playing' && room.players.every(p => p.state?.status === 'finished')) room.phase = 'finished';
  return;
 }
 const state = player.state;
 if (body.type !== 'command' || room.phase !== 'playing' || !state || state.status !== 'playing' || body.game !== room.game || body.revision !== state.revision) throw new Error('Game changed. Your progress has been refreshed; try again.');
 const command = body.command as { type?: string; countryId?: string } | undefined;
 if (!command || !['guess','hint','skip'].includes(command.type || '')) throw new Error('Invalid command.');
 if (command.type === 'guess') {
  const options = room.config.mode === 'flags' ? flagOptions(pool.find(c => c.id === state.deck[state.index])!, eligible(pool, room.config.region), state.index) : eligible(pool, room.config.region);
  if (!options.some(c => c.id === command.countryId)) throw new Error('Invalid answer.');
 }
 const next = command.type === 'hint' ? reduceMatch(state, { type: 'hint' }) : reduceMatch(state, command.type === 'skip' ? { type: 'skip', elapsedMs: now - player.questionAt } : { type: 'guess', countryId: command.countryId!, elapsedMs: now - player.questionAt });
 if (next.index !== state.index) player.questionAt = now;
 player.state = next;
 if (next.status === 'finished') player.finishedAt = now;
 if (room.players.every(p => p.state?.status === 'finished')) room.phase = 'finished';
}
export function snapshot(room: Room, player: Member, now: number): PartySnapshot {
 const state = player.state;
 return { code: room.code, hostId: room.hostId, you: player.id, phase: room.phase, config: { ...room.config, seed: 0 }, game: room.game, startedAt: room.startedAt, serverTime: now,
  players: room.players.map(p => ({ id: p.id, name: p.name, points: p.state ? score(p.state) : 0, completed: p.state?.index || 0, finished: !!p.finishedAt, elapsedMs: room.startedAt ? (p.finishedAt || now) - room.startedAt : 0 })).sort((a,b) => b.points - a.points || Number(b.finished) - Number(a.finished) || (a.finished && b.finished ? a.elapsedMs - b.elapsedMs : b.completed - a.completed)),
  state: state ? { ...state, config: { ...state.config, seed: 0 }, deck: state.deck.map((id,i) => i <= state.index ? id : '') } : undefined };
}
export function checkVersion(version: unknown): void { if (version !== PARTY_VERSION) throw new Error('Please reload to update the game.'); }
