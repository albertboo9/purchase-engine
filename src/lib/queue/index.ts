import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import type { QueueConfig } from './core';
import { MemoryQueueStore, RedisQueueStore, type QueueStore } from './store';

/**
 * Salle d'attente du checkout (ADR-0021, C5) — configuration, pass signé, accès au stockage. Serveur uniquement.
 * Réglages : QUEUE_ENABLED (true), QUEUE_CAPACITY (paiements simultanés, 300), QUEUE_RATE (admissions par seconde,
 * 8), QUEUE_PASS_TTL (secondes d'inactivité avant de rendre la place, 600), QUEUE_SECRET (signature du pass,
 * obligatoire en production), REDIS_URL (plusieurs instances).
 */
export const PASS_COOKIE = 'sl_pass';

export const queueConfig: QueueConfig = {
  capacity: Math.max(1, Number(process.env.QUEUE_CAPACITY ?? 300)),
  ratePerSec: Math.max(0.1, Number(process.env.QUEUE_RATE ?? 8)),
  passTtlSec: Math.max(60, Number(process.env.QUEUE_PASS_TTL ?? 600)),
};

export const queueEnabled = () => process.env.QUEUE_ENABLED !== 'false';

const globalQueue = globalThis as unknown as { __slQueueStore?: QueueStore; __slQueueSecret?: string };

function secret(): string {
  if (process.env.QUEUE_SECRET) return process.env.QUEUE_SECRET;
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    // Plusieurs instances sans secret commun : un pass délivré par l'une serait refusé par l'autre.
    throw new Error('QUEUE_SECRET est obligatoire avec plusieurs instances (REDIS_URL).');
  }
  globalQueue.__slQueueSecret ??= randomBytes(32).toString('hex');
  return globalQueue.__slQueueSecret;
}

export function store(): QueueStore {
  globalQueue.__slQueueStore ??= process.env.REDIS_URL ? new RedisQueueStore(process.env.REDIS_URL, queueConfig) : new MemoryQueueStore(queueConfig);
  return globalQueue.__slQueueStore;
}

export const newPassId = () => randomBytes(12).toString('base64url');

const sign = (payload: string) => createHmac('sha256', secret()).update(payload).digest('base64url');

/** Pass = identifiant + signature : impossible à fabriquer, vérifiable par n'importe quelle instance. */
export const signPass = (passId: string) => `${passId}.${sign(passId)}`;

export function readPass(token: string | undefined): string | null {
  if (!token) return null;
  const [passId, sig] = token.split('.');
  if (!passId || !sig) return null;
  const expected = Buffer.from(sign(passId));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given) ? passId : null;
}

/** Le visiteur a-t-il une place valable ? (prolongée à chaque activité, comme une session). */
export async function hasValidPass(req: NextRequest): Promise<{ ok: boolean; passId: string | null }> {
  if (!queueEnabled()) return { ok: true, passId: null };
  const passId = readPass(req.cookies.get(PASS_COOKIE)?.value);
  if (!passId) return { ok: false, passId: null };
  try {
    return { ok: await store().touch(Date.now(), passId), passId };
  } catch {
    // Stockage indisponible : on laisse passer plutôt que de bloquer tous les paiements (la file est une protection).
    return { ok: true, passId };
  }
}
