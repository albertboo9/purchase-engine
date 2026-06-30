"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronRight, Loader2, ShieldCheck } from "lucide-react";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const id = searchParams.get("id");

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Dans un cas réel, appel vers l'API /api/checkout/context?type=...
    if (type && id) {
      setTimeout(() => {
        setContext({
          title: "Package Entreprise - 10 Licences",
          price: 499.0,
          currency: "EUR",
          features: [
            "Accès illimité pour 10 collaborateurs",
            "Dashboard de suivi B2B",
            "Support prioritaire",
          ],
        });
        setLoading(false);
      }, 1500);
    } else {
      setError("URL invalide. Type ou ID manquant.");
      setLoading(false);
    }
  }, [type, id]);

  const nextStep = () => setStep((s) => Math.min(s + 1, 3));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
          <p className="text-red-500 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header façon Stripe */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="font-bold text-xl tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md"></div>
          Studies Learning
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          Paiement sécurisé
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 flex flex-col md:flex-row gap-12">
        {/* Left Column: Form */}
        <div className="flex-1">
          {/* Stepper */}
          <div className="flex items-center gap-2 mb-8 text-sm font-medium">
            <span className={step >= 1 ? "text-blue-600" : "text-gray-400"}>1. Identification</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={step >= 2 ? "text-blue-600" : "text-gray-400"}>2. Options</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
            <span className={step >= 3 ? "text-blue-600" : "text-gray-400"}>3. Paiement</span>
          </div>

          <div className="relative overflow-hidden min-h-[400px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold">Vos informations</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Email professionnel</label>
                      <input type="email" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all" placeholder="marc@entreprise.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Prénom</label>
                        <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Marc" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Nom</label>
                        <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Dupont" />
                      </div>
                    </div>
                  </div>
                  <button onClick={nextStep} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-200">
                    Continuer
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold">Options d'entreprise</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Nom de l'entreprise</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Acme Corp" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Numéro de TVA (Optionnel)</label>
                      <input type="text" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="FR XX XXX XXX XXX" />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={prevStep} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                      Retour
                    </button>
                    <button onClick={nextStep} className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-200">
                      Passer au paiement
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <h2 className="text-2xl font-bold">Paiement</h2>
                  <div className="p-6 border border-gray-200 rounded-2xl bg-white shadow-sm flex items-center justify-center min-h-[200px]">
                    <p className="text-gray-500 text-sm text-center">
                      Le widget CinetPay / Stripe sera injecté ici.<br />
                      Une fois payé, la Saga {type} sera déclenchée.
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button onClick={prevStep} className="px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors">
                      Modifier infos
                    </button>
                    <button className="flex-1 py-4 bg-black hover:bg-gray-800 text-white rounded-xl font-medium transition-colors shadow-lg">
                      Payer {context?.price} {context?.currency}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Summary */}
        <div className="w-full md:w-96">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 sticky top-24">
            <h3 className="font-semibold text-lg mb-4">Résumé de la commande</h3>
            
            <div className="flex justify-between items-start mb-6 pb-6 border-b border-gray-100">
              <div>
                <p className="font-medium text-gray-900">{context?.title}</p>
                <p className="text-sm text-gray-500 mt-1">Accès instantané</p>
              </div>
              <span className="font-semibold text-lg">{context?.price} €</span>
            </div>

            <div className="space-y-3 mb-8">
              {context?.features.map((feat: string, i: number) => (
                <div key={i} className="flex items-start gap-3 text-sm text-gray-600">
                  <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-100 font-bold text-xl">
              <span>Total</span>
              <span>{context?.price} €</span>
            </div>
            <p className="text-xs text-gray-400 text-right mt-1">TVA incluse si applicable</p>
          </div>
        </div>
      </main>
    </div>
  );
}
