"use client";

/**
 * Tunnel en étapes (ADR-0020, D3) : tout tient dans l'écran, une décision par étape.
 * Indicateur d'étapes, panneau qui glisse dans le sens de la progression, boutons Retour / Continuer, récapitulatif
 * en tiroir sur mobile. Les animations restent courtes (≈ 300 ms) : le tunnel doit paraître instantané.
 */
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowLeft, ArrowRight, ChevronUp, Loader2, PencilLine, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { AnimatedAmount, DrawnCheck } from "./primitives";

export interface StepDef { id: string; label: string }

const EASE = [0.16, 1, 0.3, 1] as const;

/** Indicateur : pastilles numérotées reliées par un trait qui se remplit ; une étape franchie se rouvre d'un clic. */
export function Stepper({ steps, current, onJump }: { steps: StepDef[]; current: number; onJump: (i: number) => void }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Étapes du paiement">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2 last:flex-none">
            <button
              type="button"
              onClick={() => done && onJump(i)}
              disabled={!done}
              aria-current={active ? "step" : undefined}
              className={`group flex shrink-0 items-center gap-2 rounded-full ${done ? "cursor-pointer" : "cursor-default"}`}
            >
              <span className="relative grid h-8 w-8 place-items-center">
                {active && <motion.span layoutId="step-halo" className="absolute inset-0 rounded-full bg-violet-500/20" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <motion.span
                  animate={{ scale: active ? 1 : 0.86 }}
                  className={`relative grid h-7 w-7 place-items-center rounded-full text-[12.5px] font-bold transition-colors duration-300 ${done ? "bg-mint-500 text-white group-hover:bg-mint-600" : active ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_8px_20px_-8px_rgba(124,58,237,0.9)]" : "bg-[var(--field)] text-muted ring-1 ring-[var(--line)]"}`}
                >
                  {done ? <DrawnCheck size={14} /> : i + 1}
                </motion.span>
              </span>
              <span className={`hidden text-[13px] font-semibold transition-colors sm:inline ${active ? "text-[var(--ink)]" : done ? "text-soft group-hover:text-violet-600" : "text-muted"}`}>{s.label}</span>
            </button>
            {i < steps.length - 1 && (
              <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden>
                <motion.span className="absolute inset-0 origin-left rounded-full bg-gradient-to-r from-mint-500 to-violet-500" initial={false} animate={{ scaleX: done ? 1 : 0 }} transition={{ duration: 0.45, ease: EASE }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** Panneau d'étape : entre par la droite quand on avance, par la gauche quand on revient. */
export function StepPanel({ stepKey, dir, children }: { stepKey: string; dir: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const d = reduce ? 0 : dir;
  return (
    <AnimatePresence mode="wait" initial={false} custom={d}>
      <motion.div
        key={stepKey}
        custom={d}
        variants={{
          enter: (k: number) => ({ opacity: 0, x: k * 44, filter: "blur(4px)" }),
          center: { opacity: 1, x: 0, filter: "blur(0px)" },
          exit: (k: number) => ({ opacity: 0, x: k * -44, filter: "blur(4px)" }),
        }}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.28, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export function StepHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 sm:mb-5">
      <h2 className="font-display text-[20px] font-semibold leading-tight sm:text-[22px]">{title}</h2>
      {hint && <p className="mt-1 text-[13px] leading-snug text-muted">{hint}</p>}
    </div>
  );
}

/** Bouton « Continuer » : flèche qui avance au survol, raccourci clavier rappelé sur ordinateur. */
export function NextButton({ label = "Continuer", disabled }: { label?: string; disabled?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="submit"
      disabled={disabled}
      whileTap={reduce || disabled ? undefined : { scale: 0.98 }}
      className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-[var(--ink)] px-6 py-4 text-[15px] font-semibold text-[var(--surface)] shadow-[0_16px_34px_-18px_rgba(46,16,101,0.8)] transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span>{label}</span>
      <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
      <kbd className="absolute right-5 hidden rounded-md border border-current/20 px-1.5 py-0.5 font-sans text-[10.5px] font-medium opacity-50 lg:inline">Entrée</kbd>
    </motion.button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.92 }} aria-label="Étape précédente"
      initial={{ opacity: 0, width: 0, marginRight: -12 }} animate={{ opacity: 1, width: 56, marginRight: 0 }} exit={{ opacity: 0, width: 0, marginRight: -12 }} transition={{ duration: 0.25, ease: EASE }}
      className="grid h-[56px] shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink-soft)] transition-colors hover:border-violet-300 hover:text-violet-600">
      <ArrowLeft size={19} />
    </motion.button>
  );
}

/** Rappel compact d'une étape franchie, avec retour direct pour la modifier. */
export function Recap({ icon, title, detail, onEdit }: { icon: ReactNode; title: string; detail?: string; onEdit?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }} className="mb-4 flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--field)] px-3.5 py-2.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[13px] font-bold text-white">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold">{title}</span>
        {detail && <span className="block truncate text-[12px] text-muted">{detail}</span>}
      </span>
      {onEdit && (
        <button type="button" onClick={onEdit} className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold text-violet-700 transition hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-500/15">
          <PencilLine size={13} />Modifier
        </button>
      )}
    </motion.div>
  );
}

/** Récapitulatif mobile : bandeau compact (offre + total animé) qui ouvre un tiroir glissable. */
export function SummaryBar({ eyebrow, title, total, currency, onOpen }: { eyebrow: string; title: string; total: number | null; currency: string; onOpen: () => void }) {
  return (
    <button type="button" onClick={onOpen} aria-haspopup="dialog" className="card flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">{eyebrow}</span>
        <span className="block truncate text-[14px] font-semibold">{title}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        {total === null ? <Loader2 size={16} className="animate-spin text-muted" aria-label="Calcul du total" /> : <AnimatedAmount value={total} currency={currency} className="font-display text-[17px] font-semibold" />}
        <ChevronUp size={16} className="text-muted" />
      </span>
    </button>
  );
}

export function SummarySheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  const onDragEnd = (_: unknown, info: PanInfo) => { if (info.offset.y > 90 || info.velocity.y > 500) onClose(); };
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 lg:hidden" initial="hidden" animate="shown" exit="hidden">
          <motion.button type="button" aria-label="Fermer le récapitulatif" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, shown: { opacity: 1 } }} />
          <motion.div role="dialog" aria-modal="true" aria-label="Récapitulatif de l’achat"
            variants={{ hidden: { y: "100%" }, shown: { y: 0 } }} transition={{ type: "spring", stiffness: 380, damping: 38 }}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }} onDragEnd={onDragEnd}
            className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[28px] bg-[var(--surface)] px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-center bg-[var(--surface)] pb-2 pt-1">
              <span className="h-1.5 w-11 rounded-full bg-[var(--line)]" />
              <button type="button" onClick={onClose} aria-label="Fermer" className="absolute right-2 top-0 grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-[var(--field)]"><X size={16} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
