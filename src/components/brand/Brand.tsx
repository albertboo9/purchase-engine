"use client";

/** Marque Studies Learning dans le checkout : blason (violet en clair, blanc en sombre), en-tête, fond animé. */
import { motion, useReducedMotion } from "framer-motion";
import { Lock, Volume2, VolumeX } from "lucide-react";

export function Blason({ size = 40, className = "" }: { size?: number; className?: string }) {
  const h = Math.round(size * 0.772);
  return (
    <span className={`relative inline-flex shrink-0 ${className}`} style={{ width: size, height: h }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/blason.svg" alt="" width={size} height={h} className="block dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/blason-blanc.svg" alt="" width={size} height={h} className="hidden dark:block" />
    </span>
  );
}

export function CheckoutHeader({ soundOn, onToggleSound, returnUrl }: { soundOn: boolean; onToggleSound: () => void; returnUrl?: string | null }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:py-4">
      <a href={returnUrl || "https://studieslearning.com"} className="group inline-flex items-center gap-3 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500" aria-label="Studies Learning, retour">
        <Blason size={38} className="transition-transform duration-500 ease-[var(--ease-envol)] group-hover:-translate-y-0.5" />
        <span className="leading-tight">
          <span className="block font-display text-[19px] font-semibold tracking-tight text-[var(--color-blason)] dark:text-white">Studies Learning</span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-600 dark:text-violet-300">Paiement sécurisé</span>
        </span>
      </a>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Couper les sons" : "Activer les sons"}
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] backdrop-blur transition hover:text-violet-600 active:scale-95"
        >
          {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
        </button>
        <span className="hidden items-center gap-2 rounded-full border border-mint-500/25 bg-mint-50 px-3.5 py-2 text-[12.5px] font-semibold text-mint-700 sm:inline-flex dark:bg-mint-500/10 dark:text-mint-400">
          <Lock size={14} /> Connexion chiffrée
        </span>
      </div>
    </header>
  );
}

/** Fond vivant : deux halos violets qui dérivent lentement (immobiles si l'animation est réduite). */
export function Aurora() {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full bg-violet-500/20 blur-[120px] dark:bg-violet-600/25"
        animate={reduce ? undefined : { x: [0, 60, -20, 0], y: [0, 40, 80, 0] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-56 -right-40 h-[620px] w-[620px] rounded-full bg-indigo-400/20 blur-[140px] dark:bg-indigo-500/20"
        animate={reduce ? undefined : { x: [0, -50, 30, 0], y: [0, -60, -20, 0] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(124,58,237,0.07)_1px,transparent_0)] [background-size:28px_28px] dark:bg-[radial-gradient(circle_at_1px_1px,rgba(199,196,255,0.05)_1px,transparent_0)]" />
    </div>
  );
}
