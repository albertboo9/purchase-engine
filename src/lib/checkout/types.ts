/** Types du checkout (ADR-0020) : un seul tunnel pour toutes les natures d'achat de Studies Learning. */
export type PurchaseType = "B2C_COURSE" | "B2B_PACKAGE" | "B2B_THEMATIQUE" | "ADMISSION_OFFER" | "ADMISSION_FEE" | "AUCTION_PAYMENT";
export type PaymentMethod = "mobile_money" | "card";

export const PURCHASE_TYPES: PurchaseType[] = ["B2C_COURSE", "B2B_PACKAGE", "B2B_THEMATIQUE", "ADMISSION_OFFER", "ADMISSION_FEE", "AUCTION_PAYMENT"];
export const isPurchaseType = (v: string | null): v is PurchaseType => !!v && (PURCHASE_TYPES as string[]).includes(v);

export interface CheckoutContext {
  type: PurchaseType;
  itemId: number;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  price: number;
  listPrice?: number | null;
  promotion?: { percent: number } | null;
  currency: string;
  thumbnailUrl?: string | null;
  imageUrl?: string | null;
  features?: string[];
  beneficiary?: { email: string; name?: string | null } | null;
  pricing?: { unit: "licence"; basePrice: string | number; volumeDiscounts: boolean } | null;
  totalDuration?: string | number | null;
  auctionDetails?: { auctionId: number; itemTitle: string; deadline?: string | null } | null;
}

export interface Quote {
  seats: number;
  currency: string;
  basePrice: string;
  unitPrice: string;
  discountRate: string;
  discountLabel: string | null;
  total: string;
  breakpoint: { id: number; minSeats: number; maxSeats: number | null } | null;
}

export interface AppliedCoupon { code: string; label: string | null; currency: string; listAmount: string; discountAmount: string; finalAmount: string }
export interface MethodAvailability { method: PaymentMethod; available: boolean; fallback: boolean }

export interface ProcessResult {
  status?: "PENDING" | "COMPLETED";
  redirectUrl?: string | null;
  orderReference?: string;
  widgetParams?: Record<string, unknown> | null;
  duplicate?: boolean;
}

export interface PurchaseStatus {
  reference: string;
  state: "pending" | "confirmed" | "delivered" | "failed";
  kind: "enrollment" | "licences" | "admission";
  /** Motif d'échec rédigé pour l'acheteur (jamais la réponse brute du prestataire). */
  reason: { category: string; title: string; advice: string } | null;
  title: string | null;
  amount: number;
  currency: string;
  paidAt: string | null;
}
