import type { MatchConfig } from './engine';
export interface PersonalBest { points: number; elapsedMs: number }
type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function recordKey(config: MatchConfig): string {
 return `seterraline:best:v1:${config.mode}:${config.region}:${config.rounds}`;
}
export function beats(candidate: PersonalBest, previous: PersonalBest): boolean {
 return candidate.points > previous.points || candidate.points === previous.points && candidate.elapsedMs < previous.elapsedMs;
}
/** Optional local storage must never prevent finishing a game. */
export function saveBest(storage: RecordStorage | undefined, config: MatchConfig, candidate: PersonalBest): { best: PersonalBest; isNew: boolean } | null {
 if (!storage) return null;
 try {
  let previous: PersonalBest | undefined;
  const stored = storage.getItem(recordKey(config));
  try {
   const parsed = JSON.parse(stored || 'null');
   if (parsed && Number.isInteger(parsed.points) && parsed.points >= 0 && Number.isFinite(parsed.elapsedMs) && parsed.elapsedMs >= 0) previous = parsed;
  } catch { /* Replace an invalid old record. */ }
  const isNew = !previous || beats(candidate, previous);
  const best = isNew ? candidate : previous!;
  if (isNew) storage.setItem(recordKey(config), JSON.stringify(best));
  return { best, isNew };
 } catch { return null; }
}
