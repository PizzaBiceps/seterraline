import { PARTY_VERSION, type PartySnapshot } from './types';
import type { MatchConfig } from '../game/engine';
const base = (import.meta.env.VITE_PARTY_API_URL || (import.meta.env.DEV ? 'http://127.0.0.1:8787' : 'https://seterraline-party.seterraline.workers.dev')).replace(/\/$/, '');
export const partyAvailable = !!base;
export class PartyClient {
 snapshot?: PartySnapshot;
 token = '';
 private pending: Promise<unknown> = Promise.resolve();
 request(path: string, body?: unknown): Promise<{ snapshot: PartySnapshot; token?: string }> {
  const result = this.pending.then(() => this.performRequest(path, body));
  this.pending = result.catch(() => undefined);
  return result;
 }
 private async performRequest(path: string, body?: unknown): Promise<{ snapshot: PartySnapshot; token?: string }> {
  if (!base) throw new Error('Online rooms are not configured yet.');
  const response = await fetch(`${base}/api/rooms${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000) });
  const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Could not connect to the room.');
  this.snapshot = data.snapshot;
  if (data.token) { this.token = data.token; try { sessionStorage.setItem(`party:${data.snapshot.code}`, this.token); } catch { /* Rejoin within this tab still works. */ } }
  return data;
 }
 async enter(name: string, config: MatchConfig, code?: string): Promise<void> { await this.request(code ? `/${code}/join` : '', { name, config, version: PARTY_VERSION }); }
 async refresh(): Promise<void> { if (this.snapshot) await this.request(`/${this.snapshot.code}`); }
 async action(body: unknown): Promise<void> { await this.request(`/${this.snapshot!.code}/action`, body); }
 async restore(code: string): Promise<boolean> {
  try { this.token = sessionStorage.getItem(`party:${code}`) || ''; } catch { return false; }
  if (!this.token) return false;
  try { await this.request(`/${code}`); return true; } catch { this.token = ''; return false; }
 }
 clear(): void { try { if (this.snapshot) sessionStorage.removeItem(`party:${this.snapshot.code}`); } catch { /* optional */ } this.snapshot = undefined; this.token = ''; }
}
