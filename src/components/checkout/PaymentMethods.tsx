"use client";

/**
 * Choix du moyen de paiement (ADR-0020, D1-D2) : le client choisit chez nous, présélection selon son pays ; seuls les
 * moyens réellement routables pour la devise et le pays sont proposés (règles de priorité de l'agrégateur).
 */
import { AnimatePresence, motion } from "framer-motion";
import { CreditCard, Globe2, Loader2, Smartphone } from "lucide-react";
import { COUNTRIES, countryInfo } from "@/lib/checkout/countries";
import type { MethodAvailability, PaymentMethod } from "@/lib/checkout/types";

const META: Record<PaymentMethod, { label: string; icon: typeof Smartphone }> = {
  mobile_money: { label: "Mobile Money", icon: Smartphone },
  card: { label: "Carte bancaire", icon: CreditCard },
};

export function PaymentMethods({ country, onCountry, methods, loading, value, onChange, hints }: {
  country: string; onCountry: (c: string) => void; methods: MethodAvailability[] | null; loading: boolean;
  value: PaymentMethod | null; onChange: (m: PaymentMethod) => void; hints: Record<PaymentMethod, string>;
}) {
  const info = countryInfo(country);
  const list: PaymentMethod[] = info && info.operators.length ? ["mobile_money", "card"] : ["card", "mobile_money"];
  const none = !!methods && methods.every((m) => !m.available);
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--field)] px-4 py-1.5">
        <Globe2 size={17} className="shrink-0 text-violet-600 dark:text-violet-300" />
        <span className="sr-only">Pays de paiement</span>
        <select value={country} onChange={(e) => onCountry(e.target.value)} className="w-full bg-transparent py-1 text-[14.5px] font-medium outline-none" aria-label="Pays de paiement">
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </label>

      <div role="radiogroup" aria-label="Moyen de paiement" className="grid gap-2.5 sm:grid-cols-2">
        {list.map((m) => {
          const availability = methods?.find((x) => x.method === m);
          const available = availability ? availability.available : false;
          const active = value === m && available;
          const Icon = META[m].icon;
          return (
            <motion.button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${META[m].label}${available ? "" : " (indisponible)"}`}
              aria-disabled={!available}
              disabled={!available || loading}
              onClick={() => onChange(m)}
              whileHover={available ? { y: -2 } : undefined}
              whileTap={available ? { scale: 0.985 } : undefined}
              className={`relative overflow-hidden rounded-[20px] border px-3.5 py-3 text-left transition-colors ${active ? "border-violet-500 bg-violet-50/70 dark:bg-violet-500/10" : "border-[var(--line)] bg-[var(--field)]"} ${available ? "cursor-pointer" : "cursor-not-allowed opacity-55"}`}
            >
              {active && <motion.span layoutId="method-ring" className="pointer-events-none absolute inset-0 rounded-[20px] ring-2 ring-violet-500" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
              <span className="flex items-center gap-3">
                <motion.span animate={active ? { rotate: [0, -8, 6, 0] } : { rotate: 0 }} transition={{ duration: 0.45 }} className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition-colors ${active ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_10px_24px_-12px_rgba(124,58,237,0.9)]" : "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200"}`}>
                  <Icon size={19} />
                </motion.span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14.5px] font-semibold">{META[m].label}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {loading ? "Vérification…" : available ? (m === "mobile_money" && info?.operators.length ? info.operators.join(" · ") : m === "card" ? "Visa · Mastercard" : "Opérateurs de votre pays") : `Indisponible pour ${info?.name ?? "ce pays"}`}
                  </span>
                </span>
                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-colors ${active ? "border-violet-600 bg-violet-600" : "border-[var(--line)]"}`}>
                  {active && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="h-2 w-2 rounded-full bg-white" />}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.p key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[13px] text-muted"><Loader2 size={14} className="animate-spin" />Recherche des moyens disponibles…</motion.p>
        ) : none ? (
          <motion.p key="n" role="alert" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-coral-400/30 bg-coral-50 px-4 py-3 text-[13px] text-coral-700 dark:bg-coral-500/10 dark:text-coral-400">
            Aucun moyen de paiement n’est encore ouvert pour {info?.name ?? "ce pays"} dans cette devise. Choisissez un autre pays de paiement, ou écrivez-nous : nous l’ouvrons rapidement.
          </motion.p>
        ) : value ? (
          <motion.p key={value} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-[13px] leading-relaxed text-soft">{hints[value]}</motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
