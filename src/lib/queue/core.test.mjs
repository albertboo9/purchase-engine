// Salle d'attente (ADR-0021, C5) : règle d'admission. Exécution : npm test (runner intégré de Node).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, enter, poll, release, touch } from './core.ts';

const cfg = { capacity: 2, ratePerSec: 1, passTtlSec: 600 };
let n = 0;
const id = () => `p${++n}`;

test("sous le seuil, place immédiate : la salle reste invisible", () => {
  const s = emptyState(0);
  assert.equal(enter(s, cfg, 0, id()).status, 'admitted');
  assert.equal(enter(s, cfg, 0, id()).status, 'admitted');
});

test("au-delà, tickets dans l'ordre d'arrivée avec position et attente estimée", () => {
  const s = emptyState(0);
  enter(s, cfg, 0, id()); enter(s, cfg, 0, id());
  const a = enter(s, cfg, 0, id());
  const b = enter(s, cfg, 0, id());
  assert.deepEqual([a.status, a.ticket, a.position], ['waiting', 1, 1]);
  assert.deepEqual([b.status, b.ticket, b.position, b.etaSec], ['waiting', 2, 2, 2]);
});

test("premier arrivé, premier servi : une place libérée va au ticket 1, pas au 2", () => {
  const s = emptyState(0);
  const first = enter(s, cfg, 0, id()); enter(s, cfg, 0, id());
  const t1 = enter(s, cfg, 0, id()); const t2 = enter(s, cfg, 0, id());
  release(s, first.passId);
  assert.equal(poll(s, cfg, 5000, t2.ticket, id()).status, 'waiting');
  assert.equal(poll(s, cfg, 5000, t1.ticket, id()).status, 'admitted');
});

test("débit maîtrisé : jamais plus d'admissions que le débit, même si beaucoup de places se libèrent", () => {
  const big = { capacity: 100, ratePerSec: 2, passTtlSec: 600 };
  const s = emptyState(0);
  const passes = Array.from({ length: 100 }, () => enter(s, big, 0, id()));
  const tickets = Array.from({ length: 10 }, () => enter(s, big, 0, id()));
  passes.slice(0, 50).forEach((p) => release(s, p.passId));
  // 1 seconde plus tard : 2 admissions au plus.
  const admitted = tickets.map((t) => poll(s, big, 1000, t.ticket, id())).filter((a) => a.status === 'admitted');
  assert.equal(admitted.length, 2);
});

test("un ticket admis n'obtient qu'une place, même interrogé deux fois", () => {
  const s = emptyState(0);
  const p1 = enter(s, cfg, 0, id()); enter(s, cfg, 0, id());
  const t = enter(s, cfg, 0, id());
  release(s, p1.passId);
  const a = poll(s, cfg, 2000, t.ticket, id());
  const b = poll(s, cfg, 2500, t.ticket, id());
  assert.equal(a.status, 'admitted');
  assert.equal(b.passId, a.passId);
  assert.equal(s.active.size, 2);
});

test("une place inactive expire et revient à la file ; l'activité la prolonge", () => {
  const s = emptyState(0);
  const p = enter(s, cfg, 0, id());
  assert.equal(touch(s, cfg, 500_000, p.passId), true);   // activité : prolongée jusqu'à 1 100 000
  assert.equal(touch(s, cfg, 1_000_000, p.passId), true);
  assert.equal(touch(s, cfg, 1_700_000, p.passId), false); // 10 min sans activité : rendue
});
