import type { GameCommand, MatchConfig, MatchState, Player } from './engine';
/** Version the wire protocol independently from rendering and mode presentation. */
export const PROTOCOL_VERSION = 1 as const;
export type MultiplayerFormat = 'challenge' | 'party';
export interface Challenge {
  id: string;
  version: typeof PROTOCOL_VERSION;
  /** Seed, region, mode, and round count reproduce the same deck on every client. */
  config: MatchConfig;
  /** Identify the country-data release so participants use an identical pool. */
  datasetVersion: string;
  createdBy: Player;
}
export type ClientMessage =
  | { type: 'join'; roomCode: string; player: Player; protocolVersion: typeof PROTOCOL_VERSION }
  | { type: 'ready'; ready: boolean }
  | { type: 'answer'; matchId: string; sequence: number; expectedRevision: number; command: GameCommand }
  | { type: 'leave' };
export type ServerMessage =
  | { type: 'lobby'; players: (Player & { ready: boolean })[]; hostId: string; config: MatchConfig }
  | { type: 'snapshot'; matchId: string; state: MatchState; serverTime: number }
  | { type: 'standings'; players: (Player & { points: number; completed: number })[] }
  | { type: 'error'; code: 'invalid-command' | 'stale-revision' | 'room-full' | 'not-authorized'; message: string };
