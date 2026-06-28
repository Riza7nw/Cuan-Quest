import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/currency";

// Progress toward a pocket's optional savings target. Balance and target share
// the pocket's currency, so no conversion is needed.
export function TargetProgress({
  balance,
  target,
  currency,
}: {
  balance: number;
  target: number;
  currency: string;
}) {
  const pct = Math.min(100, Math.round((balance / target) * 100));
  const done = balance >= target;
  return (
    <div className="mt-1.5 space-y-1">
      <Progress
        value={pct}
        aria-label="Progres target kantong"
        aria-valuetext={`${pct}% dari target`}
      />
      <p className="text-xs text-muted-foreground">
        {done ? "🎯 Target tercapai! · " : `${pct}% · `}
        {formatMoney(balance, currency)} / {formatMoney(target, currency)}
      </p>
    </div>
  );
}
