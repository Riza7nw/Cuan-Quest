import { crossConvert, formatMoney } from "@/lib/currency";
import { XpProgress } from "@/components/xp-progress";
import type { Level } from "@/lib/types";
import type { RatesMap } from "@/lib/rates";

type Props = {
  level: number;
  title: string;
  totalDisplay: number;
  displayCurrency: string;
  xp: number;
  baseCurrency: string;
  levels: Level[];
  rates: RatesMap;
};

export function LevelCard({
  level,
  title,
  totalDisplay,
  displayCurrency,
  xp,
  baseCurrency,
  levels,
  rates,
}: Props) {
  // xp == peak_total (base currency). Show it as an all-time-high "record" line
  // only when the current total has dipped below it (i.e. after a withdrawal) —
  // makes the monotonic "your level holds" mechanic visible.
  const peakDisplay = crossConvert(xp, baseCurrency, displayCurrency, rates);
  const showPeak = peakDisplay > totalDisplay + 1;

  return (
    <section className="rounded-2xl border bg-gradient-to-br from-primary/15 via-background to-background p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Level {level}
          </p>
          <h2 className="text-2xl font-bold leading-tight">{title}</h2>
        </div>
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-2xl font-black text-primary">
          {level}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-xs text-muted-foreground">Total tabungan</p>
        <p className="text-3xl font-bold tabular-nums">
          {formatMoney(totalDisplay, displayCurrency)}
        </p>
        {showPeak && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rekor tertinggi {formatMoney(peakDisplay, displayCurrency)} 🏆
          </p>
        )}
      </div>

      <div className="mt-4">
        <XpProgress
          xp={xp}
          levels={levels}
          baseCurrency={baseCurrency}
          displayCurrency={displayCurrency}
          rates={rates}
        />
      </div>
    </section>
  );
}
