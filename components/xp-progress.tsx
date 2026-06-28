import { progressToNext } from "@/lib/leveling";
import { crossConvert, formatMoney } from "@/lib/currency";
import { Progress } from "@/components/ui/progress";
import type { Level } from "@/lib/types";
import type { RatesMap } from "@/lib/rates";

export function XpProgress({
  xp,
  levels,
  baseCurrency,
  displayCurrency,
  rates,
}: {
  xp: number;
  levels: Level[];
  baseCurrency: string;
  displayCurrency: string;
  rates: RatesMap;
}) {
  const { next, pct, remaining } = progressToNext(xp, levels);
  // remaining is in base_currency (level math); show it in the display currency
  // so it's consistent with the total above the bar.
  const remainingDisplay = crossConvert(
    remaining,
    baseCurrency,
    displayCurrency,
    rates
  );
  const pctRounded = Math.round(pct);

  return (
    <div className="space-y-2">
      <Progress
        value={pct}
        aria-label="Progres menuju level berikutnya"
        aria-valuetext={
          next ? `${pctRounded}% menuju ${next.title}` : "Level maksimal"
        }
      />
      {next ? (
        <p className="flex items-baseline gap-1.5 text-sm font-medium">
          <span aria-hidden="true">🎯</span>
          <span>
            {formatMoney(remainingDisplay, displayCurrency)} lagi menuju{" "}
            <span className="text-primary">
              {next.badge_icon ? `${next.badge_icon} ` : ""}
              {next.title}
            </span>{" "}
            <span className="font-normal text-muted-foreground">
              · Lv {next.level}
            </span>
          </span>
        </p>
      ) : (
        <p className="text-sm font-medium">Level maksimal 🎉 — kamu di puncak!</p>
      )}
    </div>
  );
}
