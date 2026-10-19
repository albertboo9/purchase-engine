import { money } from "./money";
import type { AppliedCoupon, CheckoutContext, PaymentMethod, PurchaseType, Quote } from "./types";

/**
 * Moteur de textes du checkout (ADR-0020, D2)
 * ===========================================
 * Titre, réassurance et appel à l'action selon la nature de l'achat, l'état (promotion, code, délai), le moyen de
 * paiement et la personne (pour soi ou en cadeau). Règles de Studies Learning : jamais « commande », jamais
 * « Acheter » dans un bouton, et aucune urgence sans donnée réelle derrière.
 */
export interface CopyInput {
  ctx: CheckoutContext;
  total: number;
  quote?: Quote | null;
  coupon?: AppliedCoupon | null;
  method?: PaymentMethod | null;
  forSelf?: boolean;
  operators?: string[];
  now?: Date;
}

export interface CheckoutCopy {
  eyebrow: string;
  title: string;
  lead: string;
  identityTitle: string;
  identityHint: string;
  cta: string;
  ctaBusy: string;
  reassurance: string[];
  methodHint: Record<PaymentMethod, string>;
  summaryTitle: string;
  badge: string | null;
  legal: string;
}

const EYEBROW: Record<PurchaseType, string> = {
  B2C_COURSE: "Inscription",
  B2B_PACKAGE: "Achat de licences",
  B2B_THEMATIQUE: "Achat de licences",
  ADMISSION_OFFER: "Offre d’admission",
  ADMISSION_FEE: "Frais de dossier",
  AUCTION_PAYMENT: "Enchère remportée",
};

const relativeDeadline = (iso: string | null | undefined, now: Date) => {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h >= 48 ? `${Math.floor(h / 24)} jours` : h >= 1 ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};

export function checkoutCopy(input: CopyInput): CheckoutCopy {
  const { ctx, total, quote, coupon, method, forSelf = true, operators = [], now = new Date() } = input;
  const amount = money(total, ctx.currency);
  const seats = quote?.seats ?? 1;
  const ops = operators.slice(0, 3).join(", ");
  const methodHint: Record<PaymentMethod, string> = {
    mobile_money: ops ? `${ops}… Vous validerez le paiement sur votre téléphone, en quelques secondes.` : "Vous validerez le paiement sur votre téléphone, en quelques secondes.",
    card: "Visa, Mastercard. Saisie chiffrée chez notre prestataire certifié ; nous ne voyons jamais votre carte.",
  };
  const promoBadge = ctx.promotion?.percent ? `−${ctx.promotion.percent} % sur cette formation` : null;
  const common = {
    methodHint,
    summaryTitle: "Votre récapitulatif",
    reassurance: [
      "Paiement chiffré, confirmé directement par le prestataire",
      method === "mobile_money" ? "Aucun frais caché : le montant affiché est celui débité" : "Aucun frais caché : le montant affiché est celui prélevé",
      "Reçu envoyé par e-mail dès la confirmation",
    ],
  };

  switch (ctx.type) {
    case "B2C_COURSE":
      return {
        ...common,
        eyebrow: EYEBROW.B2C_COURSE,
        title: forSelf ? `Votre place dans « ${ctx.title} »` : `Offrir « ${ctx.title} »`,
        lead: forSelf
          ? "Accès immédiat au campus dès la confirmation du paiement : vous recevez vos accès par e-mail."
          : "La personne que vous invitez reçoit ses accès par e-mail dès la confirmation, avec votre message de bienvenue.",
        identityTitle: "Vos coordonnées",
        identityHint: "Elles servent à vous envoyer le reçu et vos accès au campus.",
        cta: forSelf ? `Confirmer mon inscription · ${amount}` : `Offrir cette formation · ${amount}`,
        ctaBusy: "Préparation du paiement sécurisé…",
        badge: coupon ? `Code ${coupon.code} appliqué` : promoBadge,
        legal: "En confirmant, vous acceptez les conditions générales de Studies Learning. Les inscriptions ne sont pas remboursables.",
      };
    case "B2B_PACKAGE":
    case "B2B_THEMATIQUE": {
      const what = ctx.type === "B2B_PACKAGE" ? "le package" : "la thématique";
      return {
        ...common,
        eyebrow: EYEBROW[ctx.type],
        title: seats > 1 ? `${seats} licences pour votre équipe` : `Une licence pour ${what} « ${ctx.title} »`,
        lead: `Chaque collaborateur reçoit son accès à ${what} « ${ctx.title} ». Vous gérez les licences depuis votre espace entreprise.`,
        identityTitle: "Votre entreprise",
        identityHint: "L’administrateur reçoit la facture et l’accès à l’espace entreprise pour distribuer les licences.",
        cta: `Valider l’achat de ${seats} licence${seats > 1 ? "s" : ""} · ${amount}`,
        ctaBusy: "Préparation du paiement sécurisé…",
        badge: quote?.discountLabel ? `Tarif dégressif : ${quote.discountLabel}` : null,
        legal: "Facture au nom de votre entreprise envoyée dès la confirmation. Les licences ne sont pas remboursables.",
      };
    }
    case "ADMISSION_OFFER":
      return {
        ...common,
        eyebrow: EYEBROW.ADMISSION_OFFER,
        title: "Confirmez votre place",
        lead: `Votre candidature à « ${ctx.title} » est acceptée. Le paiement confirme votre place et ouvre votre accès au programme.`,
        identityTitle: "Vos coordonnées",
        identityHint: "Votre place est nominative : elle reste attachée à votre candidature.",
        cta: `Confirmer ma place · ${amount}`,
        ctaBusy: "Préparation du paiement sécurisé…",
        badge: null,
        legal: "En confirmant, vous acceptez les conditions de l’établissement et de Studies Learning. Les inscriptions ne sont pas remboursables.",
      };
    case "ADMISSION_FEE":
      return {
        ...common,
        eyebrow: EYEBROW.ADMISSION_FEE,
        title: "Envoyez votre dossier à l’étude",
        lead: `L’établissement étudie votre candidature à « ${ctx.title} » dès la confirmation du paiement des frais de dossier.`,
        identityTitle: "Vos coordonnées",
        identityHint: "Le reçu des frais de dossier vous est envoyé par e-mail.",
        cta: `Payer les frais de dossier · ${amount}`,
        ctaBusy: "Préparation du paiement sécurisé…",
        badge: null,
        legal: "Les frais de dossier rémunèrent l’étude de votre candidature : ils ne sont pas remboursables, quelle que soit la décision.",
      };
    case "AUCTION_PAYMENT": {
      const left = relativeDeadline(ctx.auction?.expiresAt ?? ctx.deadline, now);
      const winner = (ctx.auction?.rank ?? 1) === 1;
      return {
        ...common,
        eyebrow: winner ? EYEBROW.AUCTION_PAYMENT : "Une place vous revient",
        title: winner ? `La place dans « ${ctx.title} » est à vous` : `Votre place dans « ${ctx.title} »`,
        lead: winner
          ? `Vous avez remporté l’enchère. Finalisez votre inscription${left ? ` dans les ${left} qui restent` : ""} pour ouvrir votre accès au campus.`
          : `Le gagnant n’a pas finalisé : la place vous revient au montant de votre dernière offre${left ? `, pendant encore ${left}` : ""}.`,
        identityTitle: "Votre inscription",
        identityHint: "La place est attribuée à la personne qui a remporté l’enchère.",
        cta: `Finaliser mon inscription · ${amount}`,
        ctaBusy: "Préparation du paiement sécurisé…",
        badge: left ? `À finaliser dans ${left}` : null,
        legal: "Sans finalisation dans le délai, la place est proposée à l’enchérisseur suivant. Les inscriptions ne sont pas remboursables.",
      };
    }
  }
}
