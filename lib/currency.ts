// Cross-rate conversion mirroring the SQL convert_amount(). All rates are
// expressed relative to a single pivot currency (EUR). To convert a -> b:
//   amount * rate(pivot->b) / rate(pivot->a)
// Returns 0 if a needed rate is missing (never produces NaN in totals).
export function crossConvert(
  amount: number,
  from: string,
  to: string,
  ratesFromPivot: Record<string, number>
): number {
  if (from === to) return amount;
  const rFrom = ratesFromPivot[from];
  const rTo = ratesFromPivot[to];
  if (!rFrom || !rTo) return 0;
  return (amount * rTo) / rFrom;
}

// Currencies conventionally shown without minor units.
const ZERO_DECIMAL = new Set(["IDR", "JPY"]);

export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency,
      maximumFractionDigits: ZERO_DECIMAL.has(currency) ? 0 : 2,
    }).format(amount);
  } catch {
    // Unknown currency code — fall back to a plain formatted number.
    return `${currency} ${amount.toLocaleString("id-ID")}`;
  }
}

// Human "kurs per ..." label for an exchange-rate snapshot timestamp. Pin the
// zone to Asia/Jakarta so server-rendered output is stable and unambiguous (WIB).
export function formatAsOf(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
}
