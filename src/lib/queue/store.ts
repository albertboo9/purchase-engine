import Redis from 'ioredis';
import { emptyState, enter, poll, release, touch, type Admission, type QueueConfig, type QueueState } from './core';

/**
 * Stockage de la salle d'attente (ADR-0021, C5) : Redis quand `REDIS_URL` est défini (plusieurs instances, un seul
 * état partagé, opérations atomiques en Lua), mémoire sinon (une instance). Même règle des deux côtés (core.ts).
 */
export interface QueueStore {
  enter(now: number, passId: string): Promise<Admission>;
  poll(now: number, ticket: number, passId: string): Promise<Admission>;
  touch(now: number, passId: string): Promise<boolean>;
  release(passId: string): Promise<void>;
}

export class MemoryQueueStore implements QueueStore {
  private s: QueueState = emptyState(Date.now());
  private cfg: QueueConfig;
  constructor(cfg: QueueConfig) { this.cfg = cfg; }
  async enter(now: number, passId: string) { return enter(this.s, this.cfg, now, passId); }
  async poll(now: number, ticket: number, passId: string) { return poll(this.s, this.cfg, now, ticket, passId); }
  async touch(now: number, passId: string) { return touch(this.s, this.cfg, now, passId); }
  async release(passId: string) { release(this.s, passId); }
}

/** Même règle que core.ts, exécutée d'un bloc dans Redis (aucune course entre instances). */
const LUA = `
local meta, active, conv = KEYS[1], KEYS[2], KEYS[3]
local op = ARGV[1]
local now = tonumber(ARGV[2])
local cap = tonumber(ARGV[3])
local rate = tonumber(ARGV[4])
local ttl = tonumber(ARGV[5])
local pass = ARGV[6]
redis.call('ZREMRANGEBYSCORE', active, '-inf', now)
local seq = tonumber(redis.call('HGET', meta, 'seq') or '0')
local adm = tonumber(redis.call('HGET', meta, 'admitted') or '0')
local last = tonumber(redis.call('HGET', meta, 'last') or tostring(now))
local free = cap - redis.call('ZCARD', active)
if free > 0 and adm < seq then
  local budget = math.min(free, math.floor((now - last) / 1000 * rate), math.ceil(rate * 2))
  if budget > 0 then adm = math.min(seq, adm + budget); last = now end
else
  last = now
end
redis.call('HSET', meta, 'admitted', adm, 'last', last)
redis.call('EXPIRE', meta, 86400)
local function grant()
  redis.call('ZADD', active, now + ttl, pass)
  redis.call('EXPIRE', active, 86400)
  return {1, pass, now + ttl}
end
local function enter()
  if adm >= seq and redis.call('ZCARD', active) < cap then return grant() end
  seq = redis.call('HINCRBY', meta, 'seq', 1)
  return {0, seq, adm}
end
if op == 'enter' then return enter() end
if op == 'poll' then
  local ticket = tonumber(ARGV[7])
  if ticket < 1 or ticket > seq then return enter() end
  if ticket <= adm then
    local existing = redis.call('HGET', conv, tostring(ticket))
    if existing then
      local score = redis.call('ZSCORE', active, existing)
      if score then return {1, existing, tonumber(score)} end
    end
    if redis.call('ZCARD', active) >= cap then return {0, ticket, adm} end
    redis.call('HSET', conv, tostring(ticket), pass)
    redis.call('EXPIRE', conv, 3600)
    return grant()
  end
  return {0, ticket, adm}
end
if op == 'touch' then
  if redis.call('ZSCORE', active, pass) then redis.call('ZADD', active, 'XX', now + ttl, pass); return {1} end
  return {0}
end
if op == 'release' then redis.call('ZREM', active, pass); return {1} end
return {0}
`;

export class RedisQueueStore implements QueueStore {
  private redis: Redis;
  private keys: [string, string, string];
  private cfg: QueueConfig;
  constructor(url: string, cfg: QueueConfig, scope = 'checkout') {
    this.cfg = cfg;
    // File de démarrage autorisée (la première requête attend la connexion), délais courts : un Redis absent échoue
    // vite et la salle laisse passer plutôt que de bloquer les paiements.
    this.redis = new Redis(url, { maxRetriesPerRequest: 1, connectTimeout: 2000, commandTimeout: 1500 });
    this.redis.defineCommand('slQueue', { numberOfKeys: 3, lua: LUA });
    this.keys = [`sl:queue:${scope}:meta`, `sl:queue:${scope}:active`, `sl:queue:${scope}:conv`];
  }
  private async run(op: string, now: number, passId: string, ticket = 0): Promise<[number, string | number, number]> {
    const r = await (this.redis as unknown as { slQueue: (...a: (string | number)[]) => Promise<[number, string | number, number]> })
      .slQueue(...this.keys, op, now, this.cfg.capacity, this.cfg.ratePerSec, this.cfg.passTtlSec * 1000, passId, ticket);
    return r;
  }
  private toAdmission([ok, a, b]: [number, string | number, number]): Admission {
    if (ok === 1) return { status: 'admitted', passId: String(a), expiresAt: Number(b) };
    const ticket = Number(a);
    const position = Math.max(1, ticket - Number(b));
    return { status: 'waiting', ticket, position, etaSec: Math.ceil(position / Math.max(0.1, this.cfg.ratePerSec)) };
  }
  async enter(now: number, passId: string) { return this.toAdmission(await this.run('enter', now, passId)); }
  async poll(now: number, ticket: number, passId: string) { return this.toAdmission(await this.run('poll', now, passId, ticket)); }
  async touch(now: number, passId: string) { return (await this.run('touch', now, passId))[0] === 1; }
  async release(passId: string) { await this.run('release', Date.now(), passId); }
}
