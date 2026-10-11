"use client";

/**
 * Pages de retour du paiement (ADR-0020, C4) : succès, annulation, échec.
 * Le prestataire renvoie l'acheteur ici ; la vérité vient de l'agrégateur (statut suivi en direct), jamais de
 * l'adresse de retour. Succès : chronologie honnête puis célébration à la confirmation. Échec : motif compris et
 * relance en un clic. Un écran, sans défilement.
 */
import { Suspense, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Building2, Clock3, GraduationCap, Loader2, Mail, RotateCcw, ShieldCheck, TriangleAlert, Undo2, BadgeCheck } from "lucide-react";
import { Aurora, Blason, CheckoutHeader } from "@/components/brand/Brand";
import { DrawnCheck } from "./primitives";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { usePurchaseStatus } from "@/hooks/use-purchase-status";
import { forgetAllSessionKeys } from "@/lib/checkout/api";
import { money } from "@/lib/checkout/money";
import { isPurchaseType, type PurchaseStatus, type PurchaseType } from "@/lib/checkout/types";

const FRONTEND = (process.env.NEXT_PUBLIC_SL_FRONTEND_URL || "http://localhost:3004").replace(/\/+$/, "");
const B2B = (process.env.NEXT_PUBLIC_B2B_DASHBOARD_URL || "http://localhost:3002").replace(/\/+$/, "");
const EASE = [0.16, 1, 0.3, 1] as const;

type Kind = "success" | "cancel" | "failed";
type Nature = PurchaseStatus["kind"];

const natureOf = (type: PurchaseType | null, status: PurchaseStatus | null): Nature =>
  status?.kind ?? (type === "B2B_PACKAGE" || type === "B2B_THEMATIQUE" ? "licences" : type === "ADMISSION_OFFER" || type === "ADMISSION_FEE" ? "admission" : "enrollment");

const WORDS: Record<Nature, { thing: string; pron: "la" | "le"; resume: string; deliver: string; cta: string; icon: typeof GraduationCap }> = {
  enrollment: { thing: "inscription", pron: "la", resume: "Reprendre mon inscription", deliver: "Ouverture de votre accès au campus", cta: "Commencer ma formation", icon: GraduationCap },
  licences: { thing: "achat de licences", pron: "le", resume: "Reprendre l’achat de licences", deliver: "Activation de vos licences", cta: "Ouvrir l’espace entreprise", icon: Building2 },
  admission: { thing: "paiement", pron: "le", resume: "Reprendre le paiement", deliver: "Mise à jour de votre dossier", cta: "Voir mon dossier", icon: BadgeCheck },
};

/** Confettis légers aux couleurs de la marque (aucune dépendance, rien si l'utilisateur réduit les animations). */
function Confetti() {
  const reduce = useReducedMotion();
  const bits = useMemo(() => Array.from({ length: 34 }, (_, i) => {
    const angle = (i / 34) * Math.PI * 2 + (i % 3) * 0.2;
    const dist = 120 + (i * 37) % 110;
    return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 40, r: (i * 47) % 360, c: ["#7C3AED", "#4F46E5", "#34D399", "#A78BFA", "#FFFFFF"][i % 5], w: 6 + (i % 3) * 2, d: (i % 6) * 0.02 };
  }), []);
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2">
      {bits.map((b, i) => (
        <motion.span key={i} className="absolute block rounded-[2px]" style={{ width: b.w, height: b.w * 0.45, background: b.c }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 160], opacity: [1, 1, 0], rotate: b.r + 360, scale: 1 }}
          transition={{ duration: 1.6, delay: 0.15 + b.d, ease: "easeOut", times: [0, 0.45, 1] }} />
      ))}
    </div>
  );
}

/** Médaillon d'état : coche menthe qui se dessine, horloge qui respire, ou alerte corail qui tressaille. */
function Medallion({ tone }: { tone: "success" | "waiting" | "warning" | "neutral" }) {
  const styles = {
    success: "bg-mint-500 text-white shadow-[0_18px_50px_-18px_rgba(16,185,129,0.9)]",
    waiting: "bg-[var(--card-solid)] text-violet-600 dark:text-violet-300",
    warning: "bg-coral-100 text-coral-600 dark:bg-coral-500/15 dark:text-coral-400",
    neutral: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200",
  }[tone];
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      {tone === "waiting" && (
        <>
          <motion.span className="absolute inset-0 rounded-full border-2 border-violet-500/30" animate={{ scale: [1, 1.35], opacity: [0.7, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }} />
          <motion.span className="absolute inset-1 rounded-full border-[3px] border-transparent border-t-violet-500" animate={{ rotate: 360 }} transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }} />
        </>
      )}
      <motion.span key={tone} initial={{ scale: 0.6, opacity: 0 }} animate={tone === "warning" ? { scale: 1, opacity: 1, rotate: [0, -8, 6, -3, 0] } : { scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }} className={`relative grid h-20 w-20 place-items-center rounded-full ${styles}`}>
        {tone === "success" ? <DrawnCheck size={38} /> : tone === "waiting" ? <Blason size={44} /> : tone === "warning" ? <TriangleAlert size={34} /> : <Undo2 size={32} />}
      </motion.span>
    </div>
  );
}

/** Chronologie : chaque étape passe d'attente à faite, avec une coche qui se dessine. */
function Timeline({ steps }: { steps: Array<{ label: string; state: "done" | "active" | "todo" }> }) {
  return (
    <ol className="mx-auto mt-6 w-full max-w-sm space-y-3 text-left">
      {steps.map((s, i) => (
        <motion.li key={s.label} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.1, duration: 0.4, ease: EASE }} className="flex items-center gap-3">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors duration-500 ${s.state === "done" ? "bg-mint-500 text-white" : s.state === "active" ? "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200" : "bg-[var(--field)] text-muted ring-1 ring-[var(--line)]"}`}>
            {s.state === "done" ? <DrawnCheck size={14} /> : s.state === "active" ? <Loader2 size={14} className="animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
          </span>
          <span className={`text-[14px] ${s.state === "todo" ? "text-muted" : "font-medium"}`}>{s.label}</span>
        </motion.li>
      ))}
    </ol>
  );
}

function Receipt({ status }: { status: PurchaseStatus }) {
  const date = status.paidAt ? new Date(status.paidAt).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : null;
  return (
    <motion.dl initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.45, ease: EASE }} className="mx-auto mt-6 grid w-full max-w-sm grid-cols-2 gap-x-4 gap-y-2 rounded-2xl bg-[var(--field)] px-4 py-3 text-left text-[13px]">
      {status.title && <><dt className="text-muted">Pour</dt><dd className="truncate text-right font-semibold">{status.title}</dd></>}
      <dt className="text-muted">Montant</dt><dd className="text-right font-semibold tabular-nums">{money(status.amount, status.currency)}</dd>
      {date && <><dt className="text-muted">Le</dt><dd className="text-right">{date}</dd></>}
      <dt className="text-muted">Référence</dt><dd className="truncate text-right font-mono text-[12px]">{status.reference}</dd>
    </motion.dl>
  );
}

function Content({ kind }: { kind: Kind }) {
  const sound = useAudioFeedback();
  const params = useSearchParams();
  const rawType = params.get("type");
  const type = isPurchaseType(rawType) ? rawType : null;
  const rawId = params.get("id");
  const id = rawId && /^\d{1,10}$/.test(rawId) ? rawId : null;
  const rawRef = params.get("order_ref") ?? params.get("ref");
  const ref = rawRef && /^[A-Z]{2,7}-[A-Z0-9-]{6,40}$/.test(rawRef) ? rawRef : null;
  const offered = ref?.startsWith("COUPON-") ?? false;

  // Un retour du prestataire clôt l'essai : le prochain clic sur « Reprendre » crée un nouveau paiement.
  useEffect(() => { forgetAllSessionKeys(); }, []);

  // Succès : suivi jusqu'à l'état final. Échec : une lecture suffit (motif, ou confirmation arrivée malgré tout).
  const { status, slow, gaveUp } = usePurchaseStatus(offered ? null : ref, kind !== "cancel");
  const state = offered ? "delivered" : status?.state ?? (kind === "success" ? "pending" : "failed");
  const nature = natureOf(type, status);
  const w = WORDS[nature];

  const celebrate = kind !== "cancel" && (state === "confirmed" || state === "delivered");
  const failed = kind === "failed" || (kind === "success" && state === "failed");
  const played = useRef(false);
  useEffect(() => {
    if (played.current) return;
    if (celebrate) { played.current = true; sound.celebrate(); }
    else if (failed && status) { played.current = true; sound.error(); }
  }, [celebrate, failed, status, sound]);

  const destination = nature === "licences" ? B2B
    : nature === "admission" ? (id ? `${FRONTEND}/candidatures/${id}` : `${FRONTEND}/candidatures`)
    : type === "B2C_COURSE" && id ? `${FRONTEND}/student/formations/${id}` : `${FRONTEND}/student/formations`;
  const retry = type && id ? `/?type=${encodeURIComponent(type)}&id=${id}` : null;
  const back = nature === "licences" ? B2B : `${FRONTEND}/formations`;

  let view: { tone: "success" | "waiting" | "warning" | "neutral"; eyebrow: string; title: string; text: string };
  if (kind === "cancel") {
    view = { tone: "neutral", eyebrow: "Paiement annulé", title: "Aucun montant n’a été prélevé", text: `Votre ${w.thing} vous attend : reprenez-${w.pron} quand vous voulez, en quelques secondes.` };
  } else if (celebrate) {
    const title = offered ? "Votre inscription offerte est confirmée"
      : nature === "licences" ? "Vos licences sont prêtes à être distribuées"
      : nature === "admission" ? (type === "ADMISSION_FEE" ? "Frais de dossier réglés" : "Votre place est confirmée")
      : status?.title ? `Bienvenue dans « ${status.title} »` : "Bienvenue dans votre formation";
    const text = state === "delivered"
      ? nature === "licences" ? "Invitez vos collaborateurs depuis l’espace entreprise : chacun reçoit son accès par e-mail."
        : nature === "admission" ? (type === "ADMISSION_FEE" ? "Votre candidature part à l’établissement. Vous serez prévenu de chaque étape." : "Votre place dans le programme est garantie. Retrouvez la suite dans votre dossier.")
        : "Votre accès au campus est ouvert. Un reçu vient de partir dans votre boîte e-mail."
      : `Paiement confirmé. ${w.deliver} : encore quelques secondes.`;
    view = { tone: "success", eyebrow: "Paiement confirmé", title, text };
  } else if (failed) {
    const reason = status?.reason;
    view = { tone: "warning", eyebrow: "Paiement non abouti", title: reason?.title ?? "Le paiement n’a pas abouti", text: reason?.advice ?? "Réessayez dans un instant, ou choisissez un autre moyen de paiement." };
  } else {
    view = slow
      ? { tone: "waiting", eyebrow: "Confirmation en cours", title: "La confirmation prend un peu plus de temps", text: "Pas d’inquiétude : votre paiement est entre les mains du prestataire. Dès qu’il est confirmé, vous recevez un e-mail ; vous pouvez fermer cette page." }
      : { tone: "waiting", eyebrow: "Confirmation en cours", title: "Nous confirmons votre paiement", text: "Le prestataire nous transmet la confirmation. Gardez cette page ouverte : elle se met à jour toute seule." };
  }

  const steps: Array<{ label: string; state: "done" | "active" | "todo" }> = [
    { label: "Paiement transmis par le prestataire", state: "done" },
    { label: "Confirmation reçue par Studies Learning", state: state === "pending" ? "active" : "done" },
    { label: w.deliver, state: state === "delivered" ? "done" : state === "confirmed" ? "active" : "todo" },
  ];
  const ready = state === "delivered" || gaveUp || (state === "confirmed" && slow);
  const Icon = w.icon;

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      <Aurora />
      <CheckoutHeader soundOn={sound.enabled} onToggleSound={sound.toggle} returnUrl={FRONTEND} />
      <main className="grid min-h-0 flex-1 place-items-center overflow-y-auto px-4 pb-6 [scrollbar-width:none]">
        <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: EASE }} className="card relative w-full max-w-lg px-6 py-8 text-center sm:px-10" aria-live="polite">
          <div className="relative">
            <Medallion tone={view.tone} />
            <AnimatePresence>{celebrate && <Confetti key="confetti" />}</AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            {kind === "failed" && ref && !status ? (
              <motion.div key="reading" exit={{ opacity: 0 }} className="mx-auto mt-6 flex max-w-sm flex-col items-center gap-3" aria-label="Lecture du motif">
                <span className="h-3 w-28 animate-pulse rounded-full bg-[var(--field)]" />
                <span className="h-6 w-64 animate-pulse rounded-full bg-[var(--field)]" />
                <span className="h-4 w-72 animate-pulse rounded-full bg-[var(--field)]" />
              </motion.div>
            ) : (
            <motion.div key={`${view.tone}-${view.title}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35, ease: EASE }}>
              <p className={`mt-5 text-[12px] font-semibold uppercase tracking-[0.16em] ${view.tone === "success" ? "text-mint-600 dark:text-mint-400" : view.tone === "warning" ? "text-coral-600 dark:text-coral-400" : "text-violet-600 dark:text-violet-300"}`}>{view.eyebrow}</p>
              <h1 className="mx-auto mt-2 max-w-md font-display text-[25px] font-semibold leading-tight sm:text-[28px]">{view.title}</h1>
              <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-soft">{view.text}</p>
            </motion.div>
            )}
          </AnimatePresence>

          {/* En cours : la chronologie. Livré : le reçu (la chronologie, toute cochée, n'apprendrait plus rien). */}
          {kind === "success" && !failed && !offered && state !== "delivered" && <Timeline steps={steps} />}
          {state === "delivered" && status && <Receipt status={status} />}
          {failed && <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-mint-50 px-3.5 py-1.5 text-[12.5px] font-semibold text-mint-700 dark:bg-mint-500/10 dark:text-mint-400"><ShieldCheck size={14} />Aucun montant n’a été prélevé</p>}

          <div className="mx-auto mt-7 flex w-full max-w-sm flex-col gap-2.5">
            {celebrate || (kind === "success" && !failed) ? (
              <a href={ready ? destination : undefined} aria-disabled={!ready}
                className={`group inline-flex items-center justify-center gap-2.5 rounded-full px-6 py-4 text-[15px] font-semibold text-white transition ${ready ? "bg-gradient-to-r from-indigo-600 via-violet-600 to-violet-700 shadow-[0_18px_40px_-16px_rgba(124,58,237,0.9)] hover:brightness-110" : "pointer-events-none bg-violet-400/60"}`}>
                {ready ? <><Icon size={17} />{w.cta}<ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></> : <><Loader2 size={17} className="animate-spin" />{w.deliver}…</>}
              </a>
            ) : retry ? (
              <a href={retry} className="group inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-violet-700 px-6 py-4 text-[15px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(124,58,237,0.9)] transition hover:brightness-110">
                <RotateCcw size={17} className="transition-transform duration-500 group-hover:-rotate-180" />{failed ? "Réessayer le paiement" : w.resume}
              </a>
            ) : null}
            <a href={celebrate ? `${FRONTEND}/student/formations` : back} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-6 py-3 text-[14px] font-semibold text-[var(--ink-soft)] transition hover:border-violet-300 hover:text-violet-600">
              {celebrate ? "Revenir à Studies Learning" : nature === "licences" ? "Revenir à l’espace entreprise" : "Revenir au catalogue"}
            </a>
          </div>

          {kind === "success" && slow && !celebrate && !failed && <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] text-muted"><Mail size={14} />Confirmation envoyée par e-mail dès réception</p>}
          {ref && !celebrate && <p className="mt-4 flex items-center justify-center gap-1.5 text-[11.5px] text-muted"><Clock3 size={12} />Référence {ref}</p>}
        </motion.section>
      </main>
    </div>
  );
}

export function ReturnPage({ kind }: { kind: Kind }) {
  return (
    <Suspense fallback={<div className="grid h-dvh place-items-center"><Loader2 className="h-8 w-8 animate-spin text-violet-600" /></div>}>
      <Content kind={kind} />
    </Suspense>
  );
}
