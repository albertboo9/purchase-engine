/**
 * Salle d'attente virtuelle (ADR-0021, C5) — règle d'admission, fonctions pures.
 * =============================================================================
 * Équité : premier arrivé, premier servi (tickets numérotés). Protection : au plus `capacity` paiements en cours à la
 * fois, et au plus `ratePerSec` admissions par seconde (pas de ruée quand des places se libèrent). Sous le seuil, la
 * salle est invisible : le pass est délivré immédiatement. Le même algorithme tourne en mémoire (une instance) et en
 * Lua dans Redis (plusieurs instances).
 */
export interface QueueConfig {
  capacity: number;
  ratePerSec: number;
  passTtlSec: number;
}

export interface QueueState {
  seq: number;          // dernier ticket délivré
  admitted: number;     // dernier ticket admis
  lastAdvance: number;  // ms de la dernière avancée
  active: Map<string, number>; // pass → échéance (ms)
  converted: Map<number, string>; // ticket admis → pass délivré (un seul pass par ticket)
}

export type Admission =
  | { status: 'admitted'; passId: string; expiresAt: number }
  | { status: 'waiting'; ticket: number; position: number; etaSec: number };

export const emptyState = (now: number): QueueState => ({ seq: 0, admitted: 0, lastAdvance: now, active: new Map(), converted: new Map() });

function purge(s: QueueState, now: number) {
  for (const [id, exp] of s.active) if (exp <= now) s.active.delete(id);
}

/** Fait avancer la file selon le débit écoulé, sans dépasser les places libres ni le dernier ticket. */
function advance(s: QueueState, cfg: QueueConfig, now: number) {
  const free = cfg.capacity - s.active.size;
  if (free <= 0 || s.admitted >= s.seq) { s.lastAdvance = now; return; }
  const elapsed = Math.max(0, now - s.lastAdvance) / 1000;
  const budget = Math.min(free, Math.max(0, Math.floor(elapsed * cfg.ratePerSec)), Math.ceil(cfg.ratePerSec * 2));
  if (budget > 0) {
    s.admitted = Math.min(s.seq, s.admitted + budget);
    s.lastAdvance = now;
  }
}

function grant(s: QueueState, cfg: QueueConfig, now: number, passId: string): Admission {
  const expiresAt = now + cfg.passTtlSec * 1000;
  s.active.set(passId, expiresAt);
  return { status: 'admitted', passId, expiresAt };
}

const waiting = (s: QueueState, cfg: QueueConfig, ticket: number): Admission => {
  const position = Math.max(1, ticket - s.admitted);
  return { status: 'waiting', ticket, position, etaSec: Math.ceil(position / Math.max(0.1, cfg.ratePerSec)) };
};

/** Arrivée : pass immédiat si personne n'attend et qu'une place est libre, sinon un ticket. */
export function enter(s: QueueState, cfg: QueueConfig, now: number, candidatePassId: string): Admission {
  purge(s, now);
  advance(s, cfg, now);
  if (s.admitted >= s.seq && s.active.size < cfg.capacity) return grant(s, cfg, now, candidatePassId);
  s.seq += 1;
  return waiting(s, cfg, s.seq);
}

/** Point d'étape d'un ticket : admis (un seul pass par ticket, rejouable) ou position actualisée. */
export function poll(s: QueueState, cfg: QueueConfig, now: number, ticket: number, candidatePassId: string): Admission {
  purge(s, now);
  advance(s, cfg, now);
  if (ticket > s.seq || ticket < 1) return enter(s, cfg, now, candidatePassId);
  if (ticket <= s.admitted) {
    const existing = s.converted.get(ticket);
    if (existing && s.active.has(existing)) return { status: 'admitted', passId: existing, expiresAt: s.active.get(existing)! };
    if (s.active.size >= cfg.capacity) return waiting(s, cfg, ticket);
    const a = grant(s, cfg, now, candidatePassId);
    s.converted.set(ticket, candidatePassId);
    // Mémoire bornée : on ne garde que les conversions récentes (ordre d'insertion).
    if (s.converted.size > 5000) for (const k of [...s.converted.keys()].slice(0, 1000)) s.converted.delete(k);
    return a;
  }
  return waiting(s, cfg, ticket);
}

/** Activité sur un pass : prolonge sa durée ; false s'il n'existe plus (expiré, libéré). */
export function touch(s: QueueState, cfg: QueueConfig, now: number, passId: string): boolean {
  purge(s, now);
  if (!s.active.has(passId)) return false;
  s.active.set(passId, now + cfg.passTtlSec * 1000);
  return true;
}

export function release(s: QueueState, passId: string) {
  s.active.delete(passId);
}
