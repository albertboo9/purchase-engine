/** Montants : affichés tels que calculés par le serveur, jamais recalculés côté navigateur. */
const ZERO_DECIMALS = new Set(["XOF", "XAF", "GNF", "RWF", "UGX", "KMF", "JPY", "BIF", "DJF", "MGA"]);

export function money(amount: number | string | null | undefined, currency: string): string {
  const v = Number(amount ?? 0);
  if (!Number.isFinite(v)) return `${amount} ${currency}`;
  try {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: ZERO_DECIMALS.has(currency) ? 0 : 2 }).format(v);
  } catch {
    return `${v.toLocaleString("fr-FR")} ${currency}`;
  }
}

export const isZeroDecimal = (currency: string) => ZERO_DECIMALS.has(currency);
