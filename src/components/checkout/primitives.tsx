"use client";

/**
 * Briques du checkout (ADR-0020, C1) : montant animé, section numérotée, champ accessible, choix segmenté, bouton de
 * paiement. Micro-animations au service de la compréhension : ce qui change attire l'œil, rien ne bouge pour rien.
 */
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { forwardRef, useEffect, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { money } from "@/lib/checkout/money";

/** Montant qui « roule » jusqu'à sa nouvelle valeur (le serveur reste la seule source du montant). */
export function AnimatedAmount({ value, currency, className = "" }: { value: number; currency: string; className?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => money(Math.round(v * 100) / 100, currency));
  useEffect(() => {
    if (reduce) { mv.set(value); return; }
    const controls = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, mv, reduce]);
  return (
    <span className={`tabular-nums ${className}`}>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only" aria-live="polite">{money(value, currency)}</span>
    </span>
  );
}

/** Coche qui se dessine (étape complétée, code appliqué, paiement confirmé). */
export function DrawnCheck({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <motion.path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} />
    </svg>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; hint?: string };
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field({ label, error, hint, className = "", ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="label">{label}</label>
      <motion.div animate={error ? { x: [0, -6, 5, -3, 2, 0] } : { x: 0 }} transition={{ duration: 0.42 }}>
        <input ref={ref} id={id} className="field" aria-invalid={error ? true : undefined} aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined} {...rest} />
      </motion.div>
      <AnimatePresence initial={false} mode="wait">
        {error ? (
          <motion.p key="e" id={`${id}-err`} role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-1.5 text-[12.5px] font-medium text-rose-600 dark:text-rose-400">{error}</motion.p>
        ) : hint ? (
          <motion.p key="h" id={`${id}-hint`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5 text-[12.5px] text-muted">{hint}</motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
});

/** Choix à deux ou trois options : la pastille de sélection glisse vers l'option choisie. */
export function Segmented<T extends string>({ value, options, onChange, name }: { value: T; options: Array<{ value: T; label: string; icon?: ReactNode; sub?: string }>; onChange: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} onClick={() => onChange(o.value)}
            className={`relative overflow-hidden rounded-2xl border px-4 py-3.5 text-left transition-colors ${active ? "border-violet-500/60" : "border-[var(--line)] hover:border-violet-300 dark:hover:border-violet-500/40"}`}>
            {active && <motion.span layoutId={`seg-${name}`} className="absolute inset-0 bg-violet-50 dark:bg-violet-500/12" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
            <span className="relative flex items-center gap-2.5">
              {o.icon && <span className={`grid h-9 w-9 place-items-center rounded-xl ${active ? "bg-violet-600 text-white" : "bg-[var(--field)] text-[var(--ink-soft)]"} transition-colors`}>{o.icon}</span>}
              <span>
                <span className="block text-[14.5px] font-semibold">{o.label}</span>
                {o.sub && <span className="block text-[12px] text-muted">{o.sub}</span>}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

const BUSY_STEPS = ["Vérification de votre achat", "Connexion au prestataire de paiement", "Redirection sécurisée"];

/** Étapes affichées pendant la préparation : composant monté à chaque envoi, il repart de la première étape. */
function BusyLabel() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, BUSY_STEPS.length - 1)), 1400);
    return () => clearInterval(t);
  }, []);
  return (
    <AnimatePresence mode="wait">
      <motion.span key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>{BUSY_STEPS[step]}…</motion.span>
    </AnimatePresence>
  );
}

/** Bouton de paiement : montant visible, reflet au survol, enfoncement au clic, étapes pendant la préparation. */
export function PayButton({ label, busy, disabled, onClick }: { label: string; busy: boolean; disabled?: boolean; onClick?: () => void }) {
  const reduce = useReducedMotion();
  return (
    <motion.button
      type="submit"
      onClick={onClick}
      disabled={disabled || busy}
      whileTap={reduce || disabled || busy ? undefined : { scale: 0.98 }}
      className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-violet-700 px-6 py-4 text-[15.5px] font-semibold text-white shadow-[0_18px_40px_-16px_rgba(124,58,237,0.9)] transition-[filter,opacity] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!busy && !disabled && <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/25 opacity-0 transition-opacity group-hover:animate-shimmer group-hover:opacity-100" />}
      <AnimatePresence mode="wait" initial={false}>
        {busy ? (
          <motion.span key="busy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2.5" aria-live="polite">
            <Loader2 size={18} className="animate-spin" />
            <BusyLabel />
          </motion.span>
        ) : (
          <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex items-center gap-2.5">
            <Lock size={17} className="opacity-90" />
            <span>{label}</span>
            <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Pill({ children, tone = "violet" }: { children: ReactNode; tone?: "violet" | "mint" | "coral" }) {
  const tones = {
    violet: "bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-200",
    mint: "bg-mint-100 text-mint-700 dark:bg-mint-500/15 dark:text-mint-400",
    coral: "bg-coral-100 text-coral-700 dark:bg-coral-500/15 dark:text-coral-400",
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export { Check };
