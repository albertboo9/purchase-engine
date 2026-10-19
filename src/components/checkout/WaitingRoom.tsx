"use client";

/**
 * Salle d'attente (ADR-0021, C5) : position réelle, progression, attente estimée. On rassure (place gardée, passage
 * automatique) sans fausse urgence. Le blason tourne doucement ; tout s'arrête si l'utilisateur réduit les animations.
 */
import { motion, useReducedMotion } from "framer-motion";
import { ShieldCheck, Users } from "lucide-react";
import { Blason } from "../brand/Brand";

const wait = (sec: number) => (sec < 60 ? "moins d’une minute" : sec < 3600 ? `environ ${Math.ceil(sec / 60)} min` : `environ ${Math.round(sec / 3600)} h`);

export function WaitingRoom({ position, etaSec, firstPosition }: { position: number; etaSec: number; firstPosition: number }) {
  const reduce = useReducedMotion();
  const progress = firstPosition > 1 ? Math.min(1, Math.max(0.04, 1 - (position - 1) / firstPosition)) : 0.5;
  return (
    <div className="grid min-h-0 flex-1 place-items-center px-4 pb-6">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} className="card w-full max-w-md p-8 text-center" role="status" aria-live="polite">
        <div className="relative mx-auto grid h-28 w-28 place-items-center">
          {!reduce && [0, 1, 2].map((i) => (
            <motion.span key={i} className="absolute h-2.5 w-2.5 rounded-full bg-violet-500" style={{ top: "50%", left: "50%" }}
              animate={{ rotate: 360 }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear", delay: i * 0.35 }}>
              <span className="absolute -translate-y-[52px] rounded-full bg-violet-500" style={{ width: 10 - i * 2, height: 10 - i * 2, opacity: 1 - i * 0.25 }} />
            </motion.span>
          ))}
          <span className="grid h-20 w-20 place-items-center rounded-full bg-[var(--card-solid)] shadow-xl"><Blason size={46} /></span>
        </div>
        <p className="mt-6 text-[12px] font-semibold uppercase tracking-[0.16em] text-violet-600 dark:text-violet-300">Beaucoup de monde en ce moment</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold leading-tight">Votre place est gardée</h1>
        <p className="mx-auto mt-2 max-w-sm text-[14.5px] text-soft">Pour que chaque paiement se passe bien, nous accueillons les personnes dans leur ordre d’arrivée. Vous passerez automatiquement.</p>

        <div className="mx-auto mt-6 max-w-xs">
          <div className="flex items-end justify-between text-left">
            <span><span className="block text-[12px] text-muted">Votre position</span>
              <motion.span key={position} initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="block font-display text-[34px] font-semibold tabular-nums leading-none">{position}</motion.span></span>
            <span className="text-right"><span className="block text-[12px] text-muted">Attente estimée</span><span className="block text-[15px] font-semibold">{wait(etaSec)}</span></span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[var(--line)]">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
          </div>
        </div>

        <p className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint-700 dark:text-mint-400"><ShieldCheck size={15} />Ne fermez pas cette page : elle avance toute seule</p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-muted"><Users size={13} />Rien n’est perdu : vos choix vous attendent à votre tour.</p>
      </motion.section>
    </div>
  );
}
