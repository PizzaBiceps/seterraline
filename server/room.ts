import { defaultAvatar, validateAvatar } from '../src/game/avatar';
import { validateNickname } from '../src/game/nickname';
import { createMatch, reduceMatch, eligible, flagOptions, score, type Country, type MatchConfig, type MatchState } from '../src/game/engine';
import { MAX_PLAYERS, PARTY_VERSION, type PartySnapshot } from '../src/party/types';
export interface Member { id: string; token: string; name: string; state?: MatchState; questionAt: number; finishedAt: number; lastSeenAt?: number; lastActionAt?: number; stopped?: boolean; timedOut?: boolean; finishPlace?: number; lastGuessAt?: number; lastGuessCorrect?: boolean; dunceHat?: boolean; avatar?: number[] }
export interface Room { code: string; config: MatchConfig; phase: 'lobby' | 'playing' | 'finished'; hostId: string; players: Member[]; startedAt: number; game: number; expiresAt: number; winnerId?: string; loserId?: string; kickVotes?: Record<string, string[]> }
export const ROUND_DURATION_MS = 10 * 60 * 1000;
function endRound(room: Room, now: number, timedOut = false): void {
 for (const p of room.players) if (p.state?.status === 'playing') {
  p.state = { ...p.state, status: 'finished', revision: p.state.revision + 1 };
  p.stopped = true; p.timedOut = timedOut; p.finishedAt = now;
 }
 room.phase = 'finished'; assignAwards(room, now);
}
export function expireRound(room: Room, now: number): boolean {
 if (room.phase !== 'playing' || now < room.startedAt + ROUND_DURATION_MS) return false;
 endRound(room, room.startedAt + ROUND_DURATION_MS, true); return true;
}
export function checkConfig(value: unknown): MatchConfig {
 const c = value as MatchConfig | undefined;
 if (!c || !['countries','flags','flag-map'].includes(c.mode) || !['World','Europe','Africa','Asia','Americas','Oceania'].includes(c.region) || ![0,10,20].includes(c.rounds)) throw new Error('Invalid game settings.');
 return { mode: c.mode, region: c.region, rounds: c.rounds, seed: crypto.getRandomValues(new Uint32Array(1))[0] };
}
export function join(room: Room, name: unknown, now: number, avatar?: unknown): Member {
 if (room.phase !== 'lobby') throw new Error('This game has already started. Ask the host for a rematch.');
 if (room.players.length >= MAX_PLAYERS) throw new Error('This room is full (8 players).');
 const displayName = validateNickname(name);
 const avatarPixels = avatar === undefined ? undefined : validateAvatar(avatar);
 const member: Member = { id: crypto.randomUUID(), token: crypto.randomUUID(), name: displayName, questionAt: now, finishedAt: 0, lastSeenAt: now, lastActionAt: now };
 member.avatar = avatarPixels || defaultAvatar(member.id);
 room.players.push(member); if (!room.hostId) room.hostId = member.id; return member;
}
export function act(room: Room, player: Member, body: Record<string, unknown>, pool: Country[], now: number): void {
 expireRound(room, now);
 if (body.type === 'start') {
  if (player.id !== room.hostId) throw new Error('Only the host can start.');
  if (room.phase === 'playing') throw new Error('Finish the current game first.');
  if (room.players.length < 2) throw new Error('Invite at least one friend to start.');
  room.config = checkConfig(room.config); room.startedAt = now; room.game++; room.phase = 'playing'; room.winnerId = undefined; room.loserId = undefined; room.kickVotes = {};
  for (const p of room.players) { p.state = createMatch(room.config, pool); p.questionAt = now; p.finishedAt = 0; p.stopped = false; p.timedOut = false; p.finishPlace = undefined; p.dunceHat = undefined; p.lastGuessAt = undefined; p.lastActionAt = now; }
  return;
 }
 if (body.type === 'end') {
  if (player.id !== room.hostId) throw new Error('Only the host can end the round.');
  if (room.phase !== 'playing') throw new Error('This round has already ended.');
  endRound(room, now); return;
 }
 if (body.type === 'vote-kick') {
  const id = body.playerId;
  if (typeof id !== 'string' || id === player.id || !room.players.some(p=>p.id===id)) throw new Error('Choose another player.');
  room.kickVotes ||= {}; const votes = room.kickVotes[id] ||= [];
  if (!votes.includes(player.id)) votes.push(player.id);
  if (votes.length >= Math.floor((room.players.length - 1) / 2) + 1) removePlayer(room, id, now);
  return;
 }
 if (body.type === 'leave') {
  removePlayer(room, player.id, now);
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
 if (command.type === 'guess') { player.lastGuessAt = now; player.lastGuessCorrect = command.countryId === state.deck[state.index]; }
 player.state = next; player.lastActionAt = now;
 if (next.status === 'finished') { player.finishPlace = room.players.filter(p => p.finishedAt && !p.stopped).length + 1; player.finishedAt = now; }
 if (room.players.every(p => p.state?.status === 'finished')) { room.phase = 'finished'; assignAwards(room, now); }
}
export function snapshot(room: Room, player: Member, now: number): PartySnapshot {
 const state = player.state;
 return { code: room.code, hostId: room.hostId, you: player.id, phase: room.phase, config: { ...room.config, seed: 0 }, game: room.game, startedAt: room.startedAt, serverTime: now, winnerId: room.winnerId, loserId: room.loserId, deadlineAt: room.startedAt ? room.startedAt + ROUND_DURATION_MS : 0, total: state?.deck.length || 0,
  players: room.players.map(p => ({ id: p.id, name: p.name, points: p.state ? score(p.state) : 0, completed: p.state?.index || 0, finished: !!p.finishedAt && !p.stopped, stopped: !!p.stopped, timedOut: !!p.timedOut, finishPlace: p.finishPlace, lastGuessAt: p.lastGuessAt, lastGuessCorrect: p.lastGuessCorrect, dunceHat: p.dunceHat, avatar: p.avatar || defaultAvatar(p.id), kickVotes: room.kickVotes?.[p.id]?.length || 0, votedToKick: room.kickVotes?.[p.id]?.includes(player.id) || false, presence: now - (p.lastSeenAt ?? room.startedAt) > 45000 ? 'offline' as const : now - (p.lastActionAt ?? room.startedAt) > 60000 ? 'away' as const : 'active' as const, elapsedMs: room.startedAt ? (p.finishedAt || now) - room.startedAt : 0 })).sort((a,b) => b.points - a.points || Number(b.finished) - Number(a.finished) || (a.finished && b.finished ? a.elapsedMs - b.elapsedMs : b.completed - a.completed)),
  state: state ? { ...state, config: { ...state.config, seed: 0 }, deck: state.deck.map((id,i) => i <= state.index ? id : '') } : undefined };
}
export function rollDunce(value: number): boolean { return value >= 0 && value < .3; }
function assignAwards(room: Room, now: number): void {
 if (room.winnerId || !room.players.length) return;
 const order = snapshot(room, room.players[0], now).players;
 room.winnerId = order[0].id;
 if (order.length >= 2) {
  room.loserId = order[order.length-1].id;
  room.players.find(p=>p.id===room.loserId)!.dunceHat = rollDunce(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296);
 }
}
function removePlayer(room: Room, id: string, now: number): void {
 room.players = room.players.filter(p=>p.id!==id);
 if (room.hostId === id) room.hostId = room.players[0]?.id || '';
 if (room.kickVotes) { delete room.kickVotes[id]; for (const key of Object.keys(room.kickVotes)) room.kickVotes[key] = room.kickVotes[key].filter(v=>v!==id); }
 if (room.phase === 'playing' && room.players.every(p=>p.state?.status==='finished')) { room.phase = 'finished'; assignAwards(room, now); }
}
export function checkVersion(version: unknown): void { if (version !== PARTY_VERSION) throw new Error('Please reload to update the game.'); }
