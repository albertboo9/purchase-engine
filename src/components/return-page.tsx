"use client";

/**
 * Pages de retour du paiement (succès, annulation, échec) — le prestataire y renvoie l'acheteur.
 * Le paiement est confirmé côté serveur par la notification signée du prestataire : la page de succès annonce donc
 * une inscription « en cours de finalisation », sauf pour une inscription offerte (code à 100 %), déjà confirmée.
 */
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

const FRONTEND = (process.env.NEXT_PUBLIC_SL_FRONTEND_URL || "http://localhost:3004").replace(/\/+$/, "");

type Kind = "success" | "cancel" | "failed";

function Content({ kind }: { kind: Kind }) {
  const params = useSearchParams();
  const type = params.get("type");
  const rawId = params.get("id");
  const id = rawId && /^\d{1,10}$/.test(rawId) ? rawId : null;
  const ref = params.get("ref") ?? "";
  const offered = ref.startsWith("COUPON-");
  // Candidature (place admise, frais de dossier) : retour au dossier, ouvert dans l'espace du candidat.
  const admission = type === "ADMISSION_OFFER" || type === "ADMISSION_FEE";
  const course = admission && id ? `${FRONTEND}/candidatures/${id}` : type === "B2C_COURSE" && id ? `${FRONTEND}/student/formations/${id}` : `${FRONTEND}/student/formations`;
  const retry = type && id ? `/?type=${encodeURIComponent(type)}&id=${id}` : null;

  const copy = {
    success: {
      title: offered ? "Inscription confirmée" : "Paiement reçu",
      text: offered
        ? "Votre inscription offerte est enregistrée : votre formation vous attend."
        : type === "ADMISSION_FEE"
          ? "Merci ! Vos frais de dossier sont réglés : votre candidature part à l’établissement dans quelques instants."
          : type === "ADMISSION_OFFER"
            ? "Merci ! Votre place est en cours de confirmation : elle apparaît dans votre dossier dans quelques instants."
            : "Merci ! Votre inscription est en cours de finalisation : elle apparaît dans votre espace dans quelques instants. Un e-mail de confirmation vous est envoyé.",
    },
    cancel: { title: "Paiement annulé", text: "Aucun montant n’a été prélevé. Vous pouvez reprendre votre inscription quand vous le souhaitez." },
    failed: { title: "Le paiement n’a pas abouti", text: "Aucun montant n’a été prélevé. Vérifiez votre moyen de paiement ou essayez-en un autre." },
  }[kind];

  const ok = kind === "success";
  return (
    <div className="min-h-screen w-full flex flex-1 items-center justify-center bg-gray-50/50 p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-gray-100">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 ${ok ? "bg-indigo-50" : "bg-amber-50"}`}>
          {ok ? <CheckCircle2 className="w-8 h-8 text-indigo-600" aria-hidden /> : <AlertCircle className="w-8 h-8 text-amber-600" aria-hidden />}
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">{copy.title}</h1>
        <p className="text-gray-500 font-medium mb-6">{copy.text}</p>
        <div className="flex flex-col gap-3">
          {ok ? (
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg" onClick={() => window.location.assign(course)}>
              {admission ? "Retour à mon dossier" : "Accéder à ma formation"}
            </Button>
          ) : (
            retry && (
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700" size="lg" onClick={() => window.location.assign(retry)}>
                <span className="inline-flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" aria-hidden />Reprendre mon inscription</span>
              </Button>
            )
          )}
          <Button variant="outline" className="w-full" onClick={() => window.location.assign(`${FRONTEND}/student/formations`)}>
            <span className="inline-flex items-center justify-center gap-2"><ArrowLeft className="w-4 h-4" aria-hidden />Retour au catalogue</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export function ReturnPage({ kind }: { kind: Kind }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}>
      <Content kind={kind} />
    </Suspense>
  );
}
