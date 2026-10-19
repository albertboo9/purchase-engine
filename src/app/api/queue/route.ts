import { NextResponse, type NextRequest } from "next/server";
import { newPassId, PASS_COOKIE, queueConfig, queueEnabled, readPass, signPass, store } from "@/lib/queue";
import type { Admission } from "@/lib/queue/core";

/**
 * Salle d'attente (ADR-0021, C5)
 *   POST /api/queue            arrivée : place immédiate (cookie de pass) ou ticket numéroté
 *   GET  /api/queue?ticket=N   point d'étape : admis (cookie posé) ou position et attente estimée
 * Sous le seuil de charge, la réponse est toujours « admis » : la salle reste invisible.
 */
export const dynamic = "force-dynamic";

function reply(a: Admission) {
  if (a.status === "admitted") {
    const res = NextResponse.json({ success: true, data: { status: "admitted" } });
    res.cookies.set(PASS_COOKIE, signPass(a.passId), {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 6 * 3600,
    });
    return res;
  }
  return NextResponse.json({ success: true, data: { status: "waiting", ticket: a.ticket, position: a.position, etaSec: a.etaSec, ratePerSec: queueConfig.ratePerSec } }, { headers: { "Cache-Control": "no-store" } });
}

const unavailable = () => NextResponse.json({ success: true, data: { status: "admitted", degraded: true } });

export async function POST(req: NextRequest) {
  if (!queueEnabled()) return NextResponse.json({ success: true, data: { status: "admitted" } });
  try {
    // Déjà une place valable (rechargement, retour arrière) : on la garde.
    const current = readPass(req.cookies.get(PASS_COOKIE)?.value);
    if (current && (await store().touch(Date.now(), current))) return NextResponse.json({ success: true, data: { status: "admitted" } });
    return reply(await store().enter(Date.now(), newPassId()));
  } catch {
    // File indisponible : on ne bloque pas les paiements (la file protège, elle ne doit jamais empêcher).
    return unavailable();
  }
}

export async function GET(req: NextRequest) {
  if (!queueEnabled()) return NextResponse.json({ success: true, data: { status: "admitted" } });
  const ticket = Number(req.nextUrl.searchParams.get("ticket"));
  if (!Number.isInteger(ticket) || ticket < 1) return NextResponse.json({ success: false, message: "Ticket invalide." }, { status: 400 });
  try {
    return reply(await store().poll(Date.now(), ticket, newPassId()));
  } catch {
    return unavailable();
  }
}
