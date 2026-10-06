"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Loader2, Minus, Plus } from "lucide-react";
import { useLicenceQuote, type Quote } from "@/hooks/use-licence-quote";
import { cn } from "@/lib/utils";

/** État complet du sélecteur, remonté au parent à chaque changement. */
export interface LicencePickerState {
  seats: number;
  quote: Quote | null;
  loading: boolean;
  error: string | null;
}

interface Props {
  type: "B2B_PACKAGE" | "B2B_THEMATIQUE";
  itemId: string;
  onChange?: (state: LicencePickerState) => void;
}

/** Formate un montant (décimal en chaîne) sans jamais le recalculer. */
function formatCurrency(amount: string, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return amount;
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function LicenceQuantityPicker({ type, itemId, onChange }: Props) {
  const [rawSeats, setRawSeats] = useState("1");
  const parsed = Number.parseInt(rawSeats, 10);
  const seats = Number.isInteger(parsed) ? parsed : 0;
  const { quote, loading, error } = useLicenceQuote(type, itemId, seats);
  const reduceMotion = useReducedMotion();

  // Remonte l'état complet (licences + devis) au parent sans créer de boucle de rendu.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current?.({ seats, quote, loading, error });
  }, [seats, quote, loading, error]);

  const validSeats = seats >= 1 ? seats : 1;
  const decrement = () => setRawSeats(String(Math.max(1, validSeats - 1)));
  const increment = () => setRawSeats(String(validSeats + 1));

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setRawSeats(e.target.value.replace(/[^\d]/g, "").slice(0, 5));
  };

  const discountPct = quote ? Math.round(Number(quote.discountRate) * 100) : 0;
  const hasDiscount = !!quote && (quote.discountLabel !== null || discountPct > 0);

  return (
    <div className="w-full rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <label htmlFor="licence-quantity" className="block text-sm font-medium text-gray-700">
        Nombre de licences (collaborateurs)
      </label>

      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Retirer une licence"
          onClick={decrement}
          disabled={validSeats <= 1}
          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <input
          id="licence-quantity"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          min={1}
          value={rawSeats}
          onChange={handleInput}
          className="w-20 text-center px-2 py-2.5 rounded-xl border border-gray-200 bg-white outline-none transition-all duration-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 hover:border-gray-300"
        />
        <button
          type="button"
          aria-label="Ajouter une licence"
          onClick={increment}
          className="h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Devis serveur : hauteur minimale pour ne pas faire sauter la mise en page */}
      <div className="min-h-[76px] text-sm" aria-live="polite">
        {error ? (
          <p className="text-red-500 font-medium">{error}</p>
        ) : quote ? (
          <div className={cn("space-y-1 transition-opacity duration-150", loading && "opacity-60")}>
            <div className="flex justify-between text-gray-600">
              <span>Prix unitaire</span>
              <span>{formatCurrency(quote.unitPrice, quote.currency)} / licence</span>
            </div>
            {hasDiscount && (
              <div className="flex justify-between text-green-600">
                <span>Remise{quote.discountLabel ? ` (${quote.discountLabel})` : ""}</span>
                <span>-{discountPct}%</span>
              </div>
            )}
            <div className="flex justify-between items-center font-semibold text-gray-900 pt-1">
              <span>Total</span>
              <span className="inline-flex items-center gap-2">
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />}
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={quote.total}
                    initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="inline-block"
                  >
                    {formatCurrency(quote.total, quote.currency)}
                  </motion.span>
                </AnimatePresence>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Calcul du prix…</span>
          </div>
        )}
      </div>
    </div>
  );
}
