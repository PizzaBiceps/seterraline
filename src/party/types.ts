import type { MatchConfig, MatchState } from '../game/engine';
export const PARTY_VERSION = 1;
export const MAX_PLAYERS = 8;
export interface Standing { id: string; name: string; points: number; completed: number; finished: boolean; elapsedMs: number; presence: 'active' | 'away' | 'offline'; stopped: boolean; timedOut: boolean; finishPlace?: number; lastGuessAt?: number; lastGuessCorrect?: boolean; dunceHat?: boolean; avatar: number[]; kickVotes: number; votedToKick: boolean }
export interface PartySnapshot {
  code: string; hostId: string; you: string; phase: 'lobby' | 'playing' | 'finished';
  config: MatchConfig; game: number; startedAt: number; serverTime: number; winnerId?: string; loserId?: string; deadlineAt: number; total: number;
  players: Standing[]; state?: MatchState;
}
