import { DurableObject } from 'cloudflare:workers';
import atlas from '../public/data/countries.json';
import { act, checkConfig, checkVersion, join, snapshot, expireRound, ROUND_DURATION_MS, type Room } from './room';
interface Env { ROOMS: DurableObjectNamespace<PartyRoom>; ALLOWED_ORIGINS: string }
const pool = atlas.features.map(f => ({ id: String(f.id), ...f.properties }));
const json = (data: unknown, status = 200) => Response.json(data, { status });
export default {
 async fetch(request: Request, env: Env): Promise<Response> {
  const origin = request.headers.get('Origin') || '';
  const allowed = env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
  if (!allowed.includes(origin)) return json({ error: 'Origin not allowed.' }, 403);
  const headers = { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Vary': 'Origin' };
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  let response: Response;
  try {
   const url = new URL(request.url);
   if (url.pathname === '/api/rooms' && request.method === 'POST') {
    const code = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    response = await env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(new Request(`https://room/${code}/create`, request));
   } else {
    const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9]{16})(?:\/(join|action))?$/);
    if (!match) response = json({ error: 'Room not found.' }, 404);
    else response = await env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(new Request(`https://room/${match[1]}/${match[2] || 'state'}`, request));
   }
  } catch { response = json({ error: 'Server unavailable. Please try again.' }, 503); }
  const result = new Response(response.body, response); for (const [key,value] of Object.entries(headers)) result.headers.set(key,value);
  result.headers.set('Cache-Control', 'no-store'); return result;
 }
};
export class PartyRoom extends DurableObject<Env> {
 async fetch(request: Request): Promise<Response> {
  // Serialize the whole read/modify/write transaction, including across awaits.
  return this.ctx.blockConcurrencyWhile(async () => {
   try {
    const now = Date.now(), url = new URL(request.url), action = url.pathname.split('/')[2];
    let room = await this.ctx.storage.get<Room>('room');
    if (request.method === 'POST' && Number(request.headers.get('Content-Length')) > 4096) return json({ error: 'Request too large.' }, 413);
    const raw = request.method === 'POST' ? await request.text() : '';
    if (raw.length > 4096) return json({ error: 'Request too large.' }, 413);
    const body = raw ? JSON.parse(raw) : {};
    if (action === 'create' && request.method === 'POST' && !room) {
     checkVersion(body.version);
     room = { code: url.pathname.split('/')[1], config: checkConfig(body.config), phase: 'lobby', hostId: '', players: [], startedAt: 0, game: 0, expiresAt: now + 86400000 };
     const player = join(room, body.name, now, body.avatar); await this.ctx.storage.put('room', room); await this.ctx.storage.setAlarm(room.expiresAt);
     return json({ token: player.token, snapshot: snapshot(room, player, now) });
    }
    if (!room || room.expiresAt <= now) return json({ error: 'This invite has expired. Create a new room.' }, 404);
    if (action === 'join' && request.method === 'POST') {
     checkVersion(body.version); const player = join(room, body.name, now, body.avatar); await this.ctx.storage.put('room', room);
     return json({ token: player.token, snapshot: snapshot(room, player, now) });
    }
    if (expireRound(room, now)) await this.ctx.storage.put('room', room);
    const player = room.players.find(p => `Bearer ${p.token}` === request.headers.get('Authorization'));
    if (!player) return json({ error: 'Join the room to continue.' }, 401);
    const previousSeen = player.lastSeenAt || 0;
    player.lastSeenAt = now;
    if (action === 'action' && request.method === 'POST') { act(room, player, body, pool, now); await this.ctx.storage.put('room', room);
     if (body.type === 'start' && room.phase === 'playing') await this.ctx.storage.setAlarm(Math.min(room.expiresAt, room.startedAt + ROUND_DURATION_MS));
    }
    else if (action !== 'state' || request.method !== 'GET') return json({ error: 'Invalid request.' }, 405);
    else if (now - previousSeen >= 15000) await this.ctx.storage.put('room', room);
    return json({ snapshot: snapshot(room, player, now) });
   } catch (error) { return json({ error: error instanceof Error ? error.message : 'Invalid request.' }, 400); }
  });
 }
 async alarm(): Promise<void> {
  await this.ctx.blockConcurrencyWhile(async () => {
   const room = await this.ctx.storage.get<Room>('room');
   if (!room || room.expiresAt <= Date.now()) { await this.ctx.storage.deleteAll(); return; }
   if (expireRound(room, Date.now())) await this.ctx.storage.put('room', room);
   await this.ctx.storage.setAlarm(room.phase === 'playing' ? Math.min(room.expiresAt, room.startedAt + ROUND_DURATION_MS) : room.expiresAt);
  });
 }
}
