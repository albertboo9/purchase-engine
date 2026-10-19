"use client";

import { useEffect, useState } from "react";
import { checkoutApi } from "@/lib/checkout/api";
import type { PurchaseStatus } from "@/lib/checkout/types";

/**
 * Suivi d'un achat après le retour du prestataire (ADR-0020, C4).
 * Le paiement n'est acquis qu'à la confirmation serveur (notification vérifiée) : on interroge l'agrégateur avec un
 * rythme qui ralentit (2 s → 10 s), en pause quand l'onglet est caché, et on s'arrête sur un état final.
 * `slow` signale une confirmation plus longue que d'habitude (le texte change, le suivi continue).
 */
const FINAL = new Set(["delivered", "failed"]);
const delayFor = (n: number) => (n < 10 ? 2000 : n < 25 ? 4000 : 10000);
const MAX_POLLS = 80; // ≈ 10 min

export function usePurchaseStatus(ref: string | null, enabled: boolean) {
  const [status, setStatus] = useState<PurchaseStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polls, setPolls] = useState(0);

  useEffect(() => {
    if (!ref || !enabled) return;
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let n = 0;
    const tick = async () => {
      if (!alive) return;
      // Première lecture immédiate ; ensuite, pause tant que l'onglet est caché.
      if (n > 0 && document.hidden) { timer = setTimeout(tick, 1500); return; }
      try {
        const s = await checkoutApi.status(ref);
        if (!alive) return;
        setStatus(s);
        setError(null);
        if (FINAL.has(s.state)) return;
      } catch (e) {
        if (!alive) return;
        setError((e as Error).message);
      }
      n += 1;
      setPolls(n);
      if (n < MAX_POLLS) timer = setTimeout(tick, delayFor(n));
    };
    tick();
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [ref, enabled]);

  return { status, error, slow: polls >= 20, gaveUp: polls >= MAX_POLLS };
}
