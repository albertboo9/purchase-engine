"use client";

import { useEffect, useState } from "react";

/**
 * Devis serveur pour une offre vendue à la licence.
 * Tous les montants sont des décimaux en chaîne (ex. "23750.00"),
 * calculés UNIQUEMENT par l'agrégateur : le client ne calcule rien.
 */
export type Quote = {
  seats: number;
  currency: string;                         // ex. "XOF"
  basePrice: string;
  unitPrice: string;
  discountRate: string;                     // ex. "0.0500"
  discountLabel: string | null;             // ex. "5-9 sièges"
  total: string;                            // ex. "166250.00"
  breakpoint: { id: number; minSeats: number; maxSeats: number | null } | null;
};

export interface UseLicenceQuoteResult {
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}

const AGGREGATOR_URL = process.env.NEXT_PUBLIC_AGGREGATOR_URL || "http://localhost:3000";
const DEBOUNCE_MS = 300;

interface QuoteResult {
  key: string;
  quote: Quote | null;
  error: string | null;
}

/**
 * Récupère le devis serveur `/api/checkout/quote` pour `seats` licences.
 * - Anti-rebond de 300 ms et annulation de la requête précédente (AbortController).
 * - N'appelle pas l'API si `seats` n'est pas un entier >= 1 (erreur locale).
 * - Pendant le chargement, le dernier devis connu de l'offre reste exposé
 *   (avec `loading: true`) pour ne pas faire sauter la mise en page.
 */
export function useLicenceQuote(type: string, id: string, seats: number): UseLicenceQuoteResult {
  const isValidSeats = Number.isInteger(seats) && seats >= 1;
  const requestKey = `${type}|${id}|${seats}`;
  const offerKey = `${type}|${id}`;

  const [result, setResult] = useState<QuoteResult | null>(null);
  const [lastQuote, setLastQuote] = useState<{ offerKey: string; quote: Quote } | null>(null);

  useEffect(() => {
    if (!isValidSeats) return;

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${AGGREGATOR_URL}/api/checkout/quote?type=${encodeURIComponent(type)}&id=${encodeURIComponent(id)}&seats=${seats}`,
          { signal: controller.signal }
        );
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success || !json?.data) {
          setResult({ key: requestKey, quote: null, error: json?.message || "Impossible de calculer le prix." });
          return;
        }

        const quote = json.data as Quote;
        setResult({ key: requestKey, quote, error: null });
        setLastQuote({ offerKey, quote });
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResult({ key: requestKey, quote: null, error: "Impossible de calculer le prix." });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, id, seats, isValidSeats, requestKey, offerKey]);

  // Saisie invalide (0, vide, non entier) : erreur locale, aucun appel API.
  if (!isValidSeats) {
    return { quote: null, loading: false, error: "Indiquez au moins 1 licence." };
  }

  const current = result?.key === requestKey ? result : null;
  const loading = current === null;

  return {
    quote: current ? current.quote : lastQuote?.offerKey === offerKey ? lastQuote.quote : null,
    loading,
    error: current?.error ?? null,
  };
}

