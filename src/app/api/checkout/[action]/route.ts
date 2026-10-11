import { NextResponse, type NextRequest } from "next/server";

/**
 * Relais serveur du checkout (ADR-0020, D4)
 * =========================================
 * Le navigateur ne parle qu'au purchase-engine : l'adresse de l'agrégateur reste côté serveur, chaque appel a un délai
 * maximal, les lectures d'offre et de moyens de paiement passent par un cache court (pics d'affluence), et la création
 * de paiement exige une clé d'idempotence (une session de checkout = un seul paiement).
 */
const AGGREGATOR = (process.env.AGGREGATOR_URL || process.env.NEXT_PUBLIC_AGGREGATOR_URL || "http://localhost:3000").replace(/\/$/, "");
const GET_ACTIONS = new Set(["context", "quote", "methods", "status"]);
const POST_ACTIONS = new Set(["coupon", "process"]);
const CACHE_TTL: Record<string, number> = { context: 15_000, methods: 30_000 };
const cache = new Map<string, { at: number; status: number; body: unknown }>();

const unavailable = () => NextResponse.json({ success: false, message: "Le service de paiement est momentanément indisponible. Réessayez dans un instant." }, { status: 503 });

async function forward(url: string, init: RequestInit, req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for") ?? "";
  const res = await fetch(url, {
    ...init,
    headers: { Accept: "application/json", ...(init.headers ?? {}), ...(forwardedFor ? { "X-Forwarded-For": forwardedFor } : {}) },
    signal: AbortSignal.timeout(init.method === "POST" ? 30_000 : 12_000),
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({ success: false, message: "Réponse illisible du service de paiement." }));
  return { status: res.status, body };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!GET_ACTIONS.has(action)) return NextResponse.json({ success: false, message: "Action inconnue." }, { status: 404 });
  const url = `${AGGREGATOR}/api/checkout/${action}${req.nextUrl.search}`;
  const ttl = CACHE_TTL[action];
  const hit = ttl ? cache.get(url) : undefined;
  if (hit && Date.now() - hit.at < ttl) return NextResponse.json(hit.body, { status: hit.status, headers: { "X-Cache": "hit" } });
  try {
    const { status, body } = await forward(url, { method: "GET" }, req);
    if (ttl && status < 500) {
      cache.set(url, { at: Date.now(), status, body });
      if (cache.size > 2000) cache.delete(cache.keys().next().value as string);
    }
    return NextResponse.json(body, { status });
  } catch {
    return unavailable();
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (!POST_ACTIONS.has(action)) return NextResponse.json({ success: false, message: "Action inconnue." }, { status: 404 });
  const payload = await req.json().catch(() => null);
  if (!payload || typeof payload !== "object") return NextResponse.json({ success: false, message: "Demande invalide." }, { status: 400 });
  if (action === "process") {
    const key = (payload as { data?: { idempotencyKey?: unknown } }).data?.idempotencyKey;
    if (typeof key !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(key)) {
      return NextResponse.json({ success: false, message: "Session de paiement invalide : rechargez la page." }, { status: 400 });
    }
  }
  try {
    const { status, body } = await forward(`${AGGREGATOR}/api/checkout/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }, req);
    return NextResponse.json(body, { status });
  } catch {
    return unavailable();
  }
}
