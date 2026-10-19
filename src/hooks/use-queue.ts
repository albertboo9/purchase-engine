"use client";

import { useEffect, useState } from "react";

/**
 * Place dans la salle d'attente (ADR-0021, C5). Sous le seuil de charge : « admis » dès la première réponse, rien
 * ne s'affiche. Au-delà : ticket, position et attente estimée, actualisées toutes les 3 à 6 s (aléa pour étaler les
 * requêtes), en pause quand l'onglet est caché. `requeue()` est appelé si le serveur réclame une place (428).
 */
export type QueueView =
  | { state: "checking" }
  | { state: "admitted" }
  | { state: "waiting"; ticket: number; position: number; etaSec: number; firstPosition: number };

export const QUEUE_EVENT = "sl:queue-required";

export function useQueue() {
  const [view, setView] = useState<QueueView>({ state: "checking" });
  const [round, setRound] = useState(0);

  // Un tour de file : arrivée, puis points d'étape espacés jusqu'à l'admission.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let first: number | null = null;
    const apply = (d: { status: string; ticket?: number; position?: number; etaSec?: number }): number | null => {
      if (d.status === "admitted" || !d.ticket) { setView({ state: "admitted" }); return null; }
      first ??= d.position ?? 1;
      setView({ state: "waiting", ticket: d.ticket, position: d.position ?? 1, etaSec: d.etaSec ?? 0, firstPosition: first });
      return d.ticket;
    };
    const later = (ticket: number) => {
      timer = setTimeout(async () => {
        if (!alive) return;
        if (document.hidden) { later(ticket); return; }
        try {
          const body = await (await fetch(`/api/queue?ticket=${ticket}`, { cache: "no-store" })).json();
          if (!alive) return;
          const next = apply(body?.data ?? { status: "admitted" });
          if (next) later(next);
        } catch { if (alive) later(ticket); }
      }, 3000 + Math.random() * 3000);
    };
    fetch("/api/queue", { method: "POST", cache: "no-store" })
      .then((r) => r.json())
      .then((body) => { if (!alive) return; const t = apply(body?.data ?? { status: "admitted" }); if (t) later(t); })
      .catch(() => { if (alive) setView({ state: "admitted" }); }); // file injoignable : on n'empêche jamais le paiement
    return () => { alive = false; if (timer) clearTimeout(timer); };
  }, [round]);

  // Le serveur réclame une place (428) : nouveau tour de file.
  useEffect(() => {
    const requeue = () => { setView({ state: "checking" }); setRound((r) => r + 1); };
    window.addEventListener(QUEUE_EVENT, requeue);
    return () => window.removeEventListener(QUEUE_EVENT, requeue);
  }, []);

  return view;
}
