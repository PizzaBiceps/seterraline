/** Pure, serializable rules. A future authoritative server can run this module unchanged. */
export type Mode = 'countries' | 'flags' | 'flag-map';
export type Region = 'World' | 'Europe' | 'Asia' | 'Africa' | 'Americas' | 'Oceania';
export interface Country { id: string; name: string; iso: string; region: string; independent: boolean }
export interface MatchConfig { mode: Mode; region: Region; rounds: number; seed: number }
export interface Answer { countryId: string; correct: boolean; targetId: string; points: number; elapsedMs: number; hinted: boolean; skipped: boolean; failed: boolean }
export interface MatchState { config: MatchConfig; deck: string[]; index: number; attempts: number; hinted: boolean; answers: Answer[]; status: 'playing' | 'finished'; revision: number }
export type GameCommand = { type: 'guess'; countryId: string; elapsedMs: number } | { type: 'hint' } | { type: 'skip'; elapsedMs: number };
export interface Player { id: string; displayName: string }
export interface MatchEnvelope { matchId: string; playerId: string; sequence: number; command: GameCommand }
/** Transport seam for future challenge / party-room implementations. */
export interface MatchTransport { send(message: MatchEnvelope): Promise<void>; subscribe(listener: (state: MatchState) => void): () => void; close(): void }
export function random(seed: number): () => number { let a = seed | 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function shuffled<T>(items: readonly T[], seed: number): T[] { const result = [...items], rng = random(seed); for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function eligible(countries: Country[], region: Region): Country[] { return countries.filter(c => c.independent && c.iso && (region === 'World' || c.region === region)); }
export function createMatch(config: MatchConfig, pool: Country[]): MatchState {
  const available = eligible(pool, config.region);
  if (!available.length) throw new Error('No countries available in this region.');
  const deck = shuffled(available.map(c => c.id), config.seed).slice(0, config.rounds || available.length);
  return { config, deck, index: 0, attempts: 0, hinted: false, answers: [], status: 'playing', revision: 0 };
}
export function reduceMatch(state: MatchState, command: GameCommand): MatchState {
  if (state.status !== 'playing') return state;
  if (command.type === 'hint') return state.hinted ? state : { ...state, hinted: true, revision: state.revision + 1 };
  const targetId = state.deck[state.index];
  const correct = command.type === 'guess' && command.countryId === targetId;
  const failed = command.type === 'guess' && !correct && state.attempts >= 2;
  if (command.type === 'guess' && !correct && !failed) return { ...state, attempts: Math.min(3, state.attempts + 1), revision: state.revision + 1 };
  const points = correct ? Math.max(25, 100 - state.attempts * 25 - (state.hinted ? 50 : 0)) : 0;
  const answer: Answer = { countryId: command.type === 'guess' ? command.countryId : '', correct: correct, targetId, points, elapsedMs: Math.max(0, command.elapsedMs), hinted: state.hinted, skipped: command.type === 'skip', failed };
  const index = state.index + 1;
  return { ...state, index, answers: [...state.answers, answer], attempts: 0, hinted: false, status: index >= state.deck.length ? 'finished' : 'playing', revision: state.revision + 1 };
}
export const score = (state: MatchState): number => state.answers.reduce((sum, a) => sum + a.points, 0);
export const accuracy = (state: MatchState): number => state.answers.length ? Math.round(score(state) / (state.answers.length * 100) * 100) : 100;
export function flagOptions(target: Country, pool: Country[], seed: number): Country[] { return shuffled([target, ...shuffled(pool.filter(c => c.id !== target.id), seed).slice(0, 3)], seed + 1); }

/** Unassisted countries completed in a row; attempts in the current country do not break it. */
export function currentStreak(state: MatchState): number {
  if (state.hinted) return 0;
  let streak = 0;
  for (let i = state.answers.length - 1; i >= 0; i--) {
    const answer = state.answers[i];
    if (!answer.correct || answer.hinted) break;
    streak++;
  }
  return streak;
}
