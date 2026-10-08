"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, ShieldCheck, Volume2, VolumeX, AlertCircle, ShoppingCart, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { useAudioFeedback } from "@/hooks/use-audio-feedback";
import { B2cCourseStrategy } from "@/components/checkout-strategies/b2c-course-strategy";
import { B2bPackageStrategy } from "@/components/checkout-strategies/b2b-package-strategy";
import { B2bThematiqueStrategy } from "@/components/checkout-strategies/b2b-thematique-strategy";
import { AuctionPaymentStrategy } from "@/components/checkout-strategies/auction-payment-strategy";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/hooks/use-licence-quote";

/** Formate un montant serveur (décimal en chaîne) sans jamais le recalculer. */
function formatAmount(amount: string | number, currency: string): string {
  const value = Number(amount);
  if (!Number.isFinite(value)) return String(amount);
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
  } catch {
    return `${amount} ${currency}`;
  }
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  // Lien d'inscription de l'auteur (ADR-0012, D14) : transmis tel quel à l'agrégateur pour une formation ; le
  // backend métier décide seul du canal (75 %) après avoir vérifié que le lien est actif et appartient à l'auteur.
  const rawRef = searchParams.get("ref");
  const authorRef = rawRef && /^[A-Za-z0-9]{6,16}$/.test(rawRef) ? rawRef : null;

  const { isMuted, toggleMute, initAudio, playSuccess, playError } = useAudioFeedback();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [transaction, setTransaction] = useState<any>(null);
  // Dernier devis serveur connu pour les offres vendues à la licence (B2B).
  const [b2bQuote, setB2bQuote] = useState<Quote | null>(null);

  const isLicenceOffer = context?.pricing?.unit === "licence";

  // Code promo (ADR-0012, D6 bis) : aperçu calculé par le serveur ; le montant payé est recalculé à la réservation.
  type AppliedCoupon = { code: string; label: string | null; currency: string; listAmount: string; discountAmount: string; finalAmount: string };
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const couponsEnabled = type === "B2C_COURSE";

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code || couponBusy) return;
    setCouponBusy(true);
    setCouponError(null);
    try {
      const aggUrl = process.env.NEXT_PUBLIC_AGGREGATOR_URL || "http://localhost:3000";
      const res = await fetch(`${aggUrl}/api/checkout/coupon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, code }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || "Code impossible à vérifier.");
      const quote = json?.data;
      if (!quote?.valid) throw new Error(quote?.message || "Ce code ne s'applique pas.");
      setCoupon(quote);
      setCouponInput("");
      playSuccess();
    } catch (err: any) {
      setCoupon(null);
      setCouponError(err.message);
      playError();
    } finally {
      setCouponBusy(false);
    }
  };

  useEffect(() => {
    if (!type || !id) {
      setError("Les paramètres de la commande sont manquants (type ou id).");
      setLoading(false);
      return;
    }

    const fetchContext = async () => {
      try {
        setLoading(true);
        const aggUrl = process.env.NEXT_PUBLIC_AGGREGATOR_URL || "http://localhost:3000";
        const res = await fetch(`${aggUrl}/api/checkout/context?type=${type}&id=${id}`);
        
        if (!res.ok) {
          // La raison exacte vient du serveur (ex. formation en préparation) : on la montre telle quelle.
          const body = await res.json().catch(() => null);
          throw new Error(body?.message || "Impossible de récupérer les détails de la commande. L'article n'existe pas ou a expiré.");
        }

        const json = await res.json();
        if (json.success && json.data) {
          setContext(json.data);
        } else {
          throw new Error("Données reçues invalides.");
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Une erreur inattendue s'est produite lors de la connexion à l'agrégateur.");
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, [type, id]);

  const handleFormSuccess = async (formData: any) => {
    try {
      const aggUrl = process.env.NEXT_PUBLIC_AGGREGATOR_URL || "http://localhost:3000";
      const res = await fetch(`${aggUrl}/api/checkout/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ type, data: {
          itemId: id,
          ...formData,
          ...(type === "B2C_COURSE" && authorRef ? { ref: authorRef } : {}),
          ...(couponsEnabled && coupon ? { couponCode: coupon.code } : {}),
        } })
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // Raison exacte du serveur (code expiré entre-temps, compte introuvable…).
        if (coupon && res.status === 409) setCoupon(null);
        throw new Error(json?.message || "Erreur lors de l'initialisation du paiement.");
      }

      if (json?.success && json.data?.status === "COMPLETED" && json.data.redirectUrl) {
        // Inscription offerte (code à 100 %) : aucun paiement.
        playSuccess();
        window.location.assign(json.data.redirectUrl);
        return;
      }
      if (json?.success) {
        setTransaction(json.data);
        playSuccess();
        toast.success("Informations enregistrées.", {
          description: "Redirection vers le portail de paiement sécurisé..."
        });
        setStep(3);
      } else {
        throw new Error(json.message || "Erreur de traitement.");
      }
    } catch (err: any) {
      playError();
      toast.error("Erreur", { description: err.message });
    }
  };

  const renderStrategy = () => {
    if (type === "B2B_THEMATIQUE") {
      return <B2bThematiqueStrategy type="B2B_THEMATIQUE" itemId={id!} onQuoteChange={setB2bQuote} playClick={() => {}} onSuccess={handleFormSuccess} />;
    }
    if (type === "B2B_PACKAGE") {
      return <B2bPackageStrategy type="B2B_PACKAGE" itemId={id!} onQuoteChange={setB2bQuote} playClick={() => {}} onSuccess={handleFormSuccess} />;
    }
    if (type === "AUCTION_PAYMENT") {
      return <AuctionPaymentStrategy playClick={() => {}} onSuccess={handleFormSuccess} />;
    }
    return <B2cCourseStrategy playClick={() => {}} onSuccess={handleFormSuccess} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md border border-gray-100">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Inscription indisponible</h2>
          <p className="text-gray-500 font-medium mb-6">{error}</p>
          <Button onClick={() => window.location.reload()} variant="outline" className="w-full">
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50/50 p-4">
         <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md border border-gray-100">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingCart className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Panier vide</h2>
          <p className="text-gray-500 font-medium">Aucune information n'est disponible pour cette session.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans" onPointerDown={initAudio}>
      {/* Header Premium */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image 
              src="/logo.png" 
              alt="Studies Learning Logo" 
              fill 
              className="object-contain"
              priority
            />
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:inline-block bg-clip-text text-transparent bg-gradient-to-r from-indigo-900 to-indigo-600">
            Studies Learning
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMute}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title={isMuted ? "Activer le son" : "Désactiver le son"}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <div className="hidden sm:flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-full font-medium border border-green-100">
            <ShieldCheck className="w-4 h-4" />
            Paiement sécurisé
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col-reverse lg:flex-row gap-8 lg:gap-16">
        
        {/* Colonne Principale : Formulaire Adaptatif */}
        <div className="flex-1">
          {/* Stepper Dynamique */}
          <div className="flex items-center gap-3 mb-10 overflow-x-auto pb-2">
            <div className={`flex items-center gap-2 whitespace-nowrap ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>1</div>
              <span className="font-medium text-sm">Identification</span>
            </div>
            <div className="h-px w-8 sm:w-12 bg-gray-200 shrink-0" />
            <div className={`flex items-center gap-2 whitespace-nowrap ${step >= 3 ? "text-indigo-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>2</div>
              <span className="font-medium text-sm">Règlement sécurisé</span>
            </div>
          </div>

          <div className="relative">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="form-strategy"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStrategy()}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="payment-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold">Règlement via {transaction?.provider || "PSP"}</h2>
                  <div className="p-8 border-2 border-dashed border-gray-200 rounded-3xl bg-white shadow-sm flex flex-col items-center justify-center min-h-[300px]">
                    <ShieldCheck className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500 text-center font-medium max-w-sm mb-4">
                      Saga de paiement initiée : <br/>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded mt-2 inline-block text-gray-700">{transaction?.transactionId}</span>
                    </p>
                    <p className="text-sm text-gray-400 text-center px-4">
                      L'intégration CinetPay / Stripe s'affichera ici en toute sécurité. En production, un SDK sera monté.
                    </p>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button variant="ghost" onClick={() => setStep(1)} className="text-gray-500">
                      Modifier mes infos
                    </Button>
                    <Button
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                      size="lg"
                      disabled={!transaction?.redirectUrl}
                      onClick={() => {
                        if (transaction?.redirectUrl) {
                          window.location.assign(transaction.redirectUrl);
                        }
                      }}
                    >
                      Procéder au paiement (
                      {transaction?.quote?.total
                        ? formatAmount(transaction.quote.total, transaction.quote.currency)
                        : formatAmount(coupon?.finalAmount ?? context.price, context.currency)}
                      )
                    </Button>
                  </div>
                  {!transaction?.redirectUrl && (
                    <p className="text-sm text-gray-500 text-center">
                      Le paiement en ligne n&apos;est pas encore disponible pour cette commande.
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Colonne Latérale : Résumé */}
        <div className="w-full lg:w-[380px] shrink-0">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/60 lg:sticky lg:top-24 mb-8 lg:mb-0">
            <h3 className="font-semibold text-lg mb-6 text-gray-900">Résumé</h3>
            
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
              <div className="pr-4">
                <p className="font-medium text-gray-900 leading-tight">{context.title}</p>
                {isLicenceOffer && b2bQuote && (
                  <p className="text-sm text-gray-500 mt-1">
                    {b2bQuote.seats} licence{b2bQuote.seats > 1 ? "s" : ""} × {formatAmount(b2bQuote.unitPrice, b2bQuote.currency)}
                  </p>
                )}
              </div>
              <span className="font-bold text-xl whitespace-nowrap">
                {isLicenceOffer && b2bQuote
                  ? `${formatAmount(b2bQuote.unitPrice, b2bQuote.currency)} / licence`
                  : formatAmount(coupon?.listAmount ?? context.price, context.currency)}
              </span>
            </div>

            {context.features && context.features.length > 0 && (
              <div className="space-y-4 mb-8">
                {context.features.map((feat: string, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                    <CheckCircle2 className="w-5 h-5 text-indigo-500 shrink-0" />
                    <span className="leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            )}

            {isLicenceOffer && b2bQuote && (b2bQuote.discountLabel !== null || Number(b2bQuote.discountRate) > 0) && (
              <div className="flex justify-between items-center text-sm text-green-600 mb-4">
                <span>
                  Remise{b2bQuote.discountLabel ? ` (${b2bQuote.discountLabel})` : ""}
                </span>
                <span>-{Math.round(Number(b2bQuote.discountRate) * 100)}%</span>
              </div>
            )}

            {couponsEnabled && step === 1 && (
              <div className="mb-6">
                {coupon ? (
                  <div className="flex items-center justify-between rounded-2xl bg-indigo-50 px-4 py-3 text-sm">
                    <span className="flex items-center gap-2 font-semibold text-indigo-700">
                      <Ticket className="w-4 h-4" aria-hidden />
                      {coupon.code}{coupon.label ? ` · ${coupon.label}` : ""}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="font-semibold text-green-700">−{formatAmount(coupon.discountAmount, coupon.currency)}</span>
                      <button type="button" onClick={() => setCoupon(null)} aria-label="Retirer le code" className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-700">
                        <X className="w-4 h-4" aria-hidden />
                      </button>
                    </span>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); void applyCoupon(); }}>
                    <label htmlFor="coupon" className="text-sm font-medium text-gray-700">Vous avez un code ?</label>
                    <div className="mt-2 flex gap-2">
                      <input
                        id="coupon"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(null); }}
                        maxLength={24}
                        autoComplete="off"
                        placeholder="Ex. RENTREE-2026"
                        aria-invalid={!!couponError}
                        className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm uppercase tracking-wide outline-none focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                      />
                      <Button type="submit" variant="outline" disabled={!couponInput.trim() || couponBusy}>
                        {couponBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
                      </Button>
                    </div>
                    {couponError && <p role="alert" className="mt-2 text-sm text-rose-600">{couponError}</p>}
                  </form>
                )}
              </div>
            )}

            <div className="flex justify-between items-center pt-6 border-t border-gray-100 font-bold text-xl">
              <span>Total à payer</span>
              <span>
                {isLicenceOffer && b2bQuote
                  ? formatAmount(b2bQuote.total, b2bQuote.currency)
                  : formatAmount(coupon?.finalAmount ?? context.price, context.currency)}
              </span>
            </div>
            <p className="text-xs text-gray-400 text-right mt-2 font-medium">TVA incluse si applicable</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
