/**
 * Pays du checkout (ADR-0020, D1) : devise usuelle et opérateurs Mobile Money connus du client.
 * Le pays sert à présélectionner le moyen de paiement et à router vers le bon prestataire ; la devise payée reste
 * celle de l'offre (jamais de conversion imposée).
 */
export interface CountryInfo { code: string; name: string; currency: string; operators: string[] }

export const COUNTRIES: CountryInfo[] = [
  { code: "CM", name: "Cameroun", currency: "XAF", operators: ["MTN Mobile Money", "Orange Money"] },
  { code: "CI", name: "Côte d’Ivoire", currency: "XOF", operators: ["Orange Money", "MTN MoMo", "Wave", "Moov Money"] },
  { code: "SN", name: "Sénégal", currency: "XOF", operators: ["Orange Money", "Wave", "Free Money"] },
  { code: "BJ", name: "Bénin", currency: "XOF", operators: ["MTN MoMo", "Moov Money"] },
  { code: "TG", name: "Togo", currency: "XOF", operators: ["T-Money", "Flooz"] },
  { code: "BF", name: "Burkina Faso", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  { code: "ML", name: "Mali", currency: "XOF", operators: ["Orange Money", "Moov Money"] },
  { code: "NE", name: "Niger", currency: "XOF", operators: ["Airtel Money", "Moov Money"] },
  { code: "GA", name: "Gabon", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "CG", name: "Congo", currency: "XAF", operators: ["MTN MoMo", "Airtel Money"] },
  { code: "CD", name: "RD Congo", currency: "CDF", operators: ["M-Pesa", "Orange Money", "Airtel Money"] },
  { code: "GN", name: "Guinée", currency: "GNF", operators: ["Orange Money", "MTN MoMo"] },
  { code: "TD", name: "Tchad", currency: "XAF", operators: ["Airtel Money", "Moov Money"] },
  { code: "MG", name: "Madagascar", currency: "MGA", operators: ["MVola", "Orange Money", "Airtel Money"] },
  { code: "FR", name: "France", currency: "EUR", operators: [] },
  { code: "BE", name: "Belgique", currency: "EUR", operators: [] },
  { code: "CH", name: "Suisse", currency: "CHF", operators: [] },
  { code: "CA", name: "Canada", currency: "CAD", operators: [] },
  { code: "US", name: "États-Unis", currency: "USD", operators: [] },
];

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));
export const countryInfo = (code: string | null | undefined) => (code ? BY_CODE.get(code.toUpperCase()) ?? null : null);

/** Fuseau horaire → pays (aucune géolocalisation, aucune donnée envoyée). */
const TIMEZONES: Record<string, string> = {
  "Africa/Douala": "CM", "Africa/Abidjan": "CI", "Africa/Dakar": "SN", "Africa/Porto-Novo": "BJ", "Africa/Lome": "TG",
  "Africa/Ouagadougou": "BF", "Africa/Bamako": "ML", "Africa/Niamey": "NE", "Africa/Libreville": "GA", "Africa/Brazzaville": "CG",
  "Africa/Kinshasa": "CD", "Africa/Lubumbashi": "CD", "Africa/Conakry": "GN", "Africa/Ndjamena": "TD", "Indian/Antananarivo": "MG",
  "Europe/Paris": "FR", "Europe/Brussels": "BE", "Europe/Zurich": "CH", "America/Toronto": "CA", "America/Montreal": "CA", "America/New_York": "US",
};

/**
 * Pays présumé du client : fuseau horaire, sinon langue du navigateur, sinon un pays qui utilise la devise de l'offre.
 */
export function guessCountry(offerCurrency: string): string {
  if (typeof window !== "undefined") {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (TIMEZONES[tz]) return TIMEZONES[tz];
    } catch { /* fuseau indisponible */ }
    const region = (navigator.language || "").split("-")[1]?.toUpperCase();
    if (region && BY_CODE.has(region)) return region;
  }
  return COUNTRIES.find((c) => c.currency === offerCurrency)?.code ?? "CM";
}
