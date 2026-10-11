import type { AppliedCoupon, CheckoutContext, MethodAvailability, ProcessResult, PurchaseStatus, PurchaseType, Quote } from "./types";

/** Appels du checkout, toujours vers le relais serveur du purchase-engine (jamais directement vers l'agrégateur). */
export class CheckoutError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/checkout/${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  } catch {
    throw new CheckoutError("Connexion interrompue. Vérifiez votre réseau puis réessayez.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.success === false) throw new CheckoutError(body?.message || "Une erreur est survenue. Réessayez.", res.status);
  return body?.data as T;
}

export const checkoutApi = {
  context: (type: PurchaseType, id: string) => call<CheckoutContext>(`context?type=${type}&id=${encodeURIComponent(id)}`),
  quote: (type: PurchaseType, id: string, seats: number, signal?: AbortSignal) => call<Quote>(`quote?type=${type}&id=${encodeURIComponent(id)}&seats=${seats}`, { signal }),
  methods: (currency: string, country: string, amount: number) => call<{ methods: MethodAvailability[] }>(`methods?currency=${currency}&country=${country}&amount=${Math.max(1, Math.round(amount))}`),
  coupon: (type: PurchaseType, id: string, code: string) => call<AppliedCoupon & { valid: boolean; message?: string }>("coupon", { method: "POST", body: JSON.stringify({ type, id, code }) }),
  process: (type: PurchaseType, data: Record<string, unknown>) => call<ProcessResult>("process", { method: "POST", body: JSON.stringify({ type, data }) }),
  status: (ref: string) => call<PurchaseStatus>(`status?ref=${encodeURIComponent(ref)}`),
};

/**
 * Clé d'idempotence de la session de checkout : stable pour une même offre dans l'onglet (rechargement, retour
 * arrière), renouvelée quand l'offre ou le montant change. Une clé = un seul paiement côté agrégateur.
 */
export function sessionKey(scope: string): string {
  const storageKey = `sl-checkout:${scope}`;
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
  } catch { /* stockage indisponible : clé éphémère */ }
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const key = `chk_${Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")}`;
  try { sessionStorage.setItem(storageKey, key); } catch { /* sans conséquence */ }
  return key;
}

export function forgetSessionKey(scope: string) {
  try { sessionStorage.removeItem(`sl-checkout:${scope}`); } catch { /* sans conséquence */ }
}

/** Fin d'un essai de paiement (retour du prestataire) : le prochain essai doit créer un nouveau paiement. */
export function forgetAllSessionKeys() {
  try {
    for (const k of Object.keys(sessionStorage)) if (k.startsWith("sl-checkout:")) sessionStorage.removeItem(k);
  } catch { /* sans conséquence */ }
}
