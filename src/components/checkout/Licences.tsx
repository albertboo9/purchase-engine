"use client";

/**
 * Nombre de licences (achat de licences B2B) : stepper, raccourcis, palier tarifaire calculé par le serveur.
 * Le prix affiché vient du devis de l'agrégateur ; le montant payé est recalculé à la création du paiement.
 */
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, TrendingDown } from "lucide-react";
import { money } from "@/lib/checkout/money";
import type { Quote } from "@/lib/checkout/types";

const PRESETS = [5, 10, 25, 50, 100];

export function Licences({ seats, onSeats, quote, loading, error, currency }: {
  seats: number; onSeats: (n: number) => void; quote: Quote | null; loading: boolean; error: string | null; currency: string;
}) {
  const set = (n: number) => onSeats(Math.max(1, Math.min(5000, Math.round(n) || 1)));
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => set(seats - 1)} disabled={seats <= 1} aria-label="Une licence de moins" className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--field)] disabled:opacity-40"><Minus size={18} /></motion.button>
        <label className="relative flex-1">
          <span className="sr-only">Nombre de licences</span>
          <input type="number" inputMode="numeric" min={1} max={5000} value={seats} onChange={(e) => set(Number(e.target.value))} className="field text-center font-display text-[26px] font-semibold tabular-nums" />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[13px] text-muted">licence{seats > 1 ? "s" : ""}</span>
        </label>
        <motion.button type="button" whileTap={{ scale: 0.9 }} onClick={() => set(seats + 1)} aria-label="Une licence de plus" className="grid h-12 w-12 place-items-center rounded-2xl border border-[var(--line)] bg-[var(--field)]"><Plus size={18} /></motion.button>
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => set(p)} aria-pressed={seats === p} className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${seats === p ? "bg-violet-600 text-white" : "bg-[var(--field)] text-[var(--ink-soft)] ring-1 ring-[var(--line)] hover:ring-violet-300"}`}>{p}</button>
        ))}
      </div>
      <div className="min-h-[52px]" aria-live="polite">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.p key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="alert" className="text-[13px] font-medium text-rose-600 dark:text-rose-400">{error}</motion.p>
          ) : quote ? (
            <motion.div key={`${quote.seats}-${quote.unitPrice}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: loading ? 0.6 : 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[var(--field)] px-4 py-3 text-[13.5px]">
              <span className="text-soft">{money(quote.unitPrice, currency)} par licence</span>
              {Number(quote.discountRate) > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-semibold text-mint-600 dark:text-mint-400"><TrendingDown size={14} />−{Math.round(Number(quote.discountRate) * 100)} %{quote.discountLabel ? ` · palier ${quote.discountLabel}` : ""}</span>
              ) : (
                <span className="text-muted">Tarif dégressif dès quelques licences</span>
              )}
            </motion.div>
          ) : (
            <motion.p key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[13px] text-muted">Calcul du tarif…</motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
