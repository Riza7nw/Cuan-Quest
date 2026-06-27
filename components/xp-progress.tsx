import { progressToNext } from "@/lib/leveling";
import { formatMoney } from "@/lib/currency";
import { Progress } from "@/components/ui/progress";
import type { Level } from "@/lib/types";

export function XpProgress({
  xp,
  levels,
  baseCurrency,
}: {
  xp: number;
  levels: Level[];
  baseCurrency: string;
}) {
  const { next, pct, remaining } = progressToNext(xp, levels);
  return (
    <div className="space-y-1.5">
      <Progress value={pct} />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{formatMoney(xp, baseCurrency)}</span>
        {next ? (
          <span>
            {formatMoney(remaining, baseCurrency)} lagi → {next.title}
          </span>
        ) : (
          <span>Level maksimal 🎉</span>
        )}
      </div>
    </div>
  );
}
