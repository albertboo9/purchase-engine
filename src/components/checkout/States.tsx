"use client";

/** États du checkout (ADR-0020, D3) : chargement, offre indisponible, redirection vers le paiement sécurisé. */
import { motion } from "framer-motion";
import { ArrowLeft, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { Blason } from "../brand/Brand";

export function CheckoutSkeleton() {
  const block = "animate-pulse rounded-2xl bg-violet-200/30 dark:bg-white/5";
  return (
    <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 gap-5 px-4 pb-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]" aria-busy="true" aria-label="Chargement de votre achat">
      <div className="flex min-h-0 flex-col gap-4">
        <div className={`${block} h-16 lg:h-24`} />
        <div className={`${block} h-9`} />
        <div className={`${block} flex-1`} />
        <div className={`${block} h-14 rounded-full`} />
      </div>
      <div className={`${block} hidden h-full lg:block`} />
    </div>
  );
}

export function Unavailable({ message, returnUrl, onRetry }: { message: string; returnUrl?: string | null; onRetry?: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="card mx-auto mt-6 max-w-lg p-8 text-center">
      <motion.span initial={{ rotate: -8, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }} className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-coral-100 text-coral-600 dark:bg-coral-500/15 dark:text-coral-400">
        <TriangleAlert size={26} />
      </motion.span>
      <h1 className="mt-5 font-display text-[24px] font-semibold">Ce paiement n’est pas disponible</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-soft">{message}</p>
      <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
        {returnUrl && <a href={returnUrl} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-3 text-[14px] font-semibold text-white"><ArrowLeft size={16} />Revenir à Studies Learning</a>}
        {onRetry && <button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line)] px-6 py-3 text-[14px] font-semibold"><RefreshCw size={15} />Réessayer</button>}
      </div>
    </motion.div>
  );
}

/** Voile de redirection : rassure pendant l'ouverture de la page sécurisée du prestataire. */
export function RedirectVeil({ method }: { method: "mobile_money" | "card" | null }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 grid place-items-center bg-[var(--surface)]/85 backdrop-blur-xl" role="status" aria-live="assertive">
      <div className="flex flex-col items-center px-6 text-center">
        <div className="relative">
          <motion.span className="absolute inset-0 rounded-full bg-violet-500/25" animate={{ scale: [1, 1.7], opacity: [0.6, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }} />
          <motion.span animate={{ y: [0, -6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }} className="relative grid h-24 w-24 place-items-center rounded-full bg-[var(--card-solid)] shadow-xl">
            <Blason size={58} />
          </motion.span>
        </div>
        <h2 className="mt-7 font-display text-[22px] font-semibold">Ouverture du paiement sécurisé</h2>
        <p className="mt-2 max-w-sm text-[14px] text-soft">
          {method === "mobile_money" ? "Gardez votre téléphone à portée de main : vous validerez le paiement auprès de votre opérateur." : "Vous allez saisir votre carte sur la page chiffrée de notre prestataire."}
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-[12.5px] font-semibold text-mint-700 dark:text-mint-400"><ShieldCheck size={15} />Ne fermez pas cette page</p>
      </div>
    </motion.div>
  );
}
