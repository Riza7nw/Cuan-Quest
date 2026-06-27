import { formatMoney } from "@/lib/currency";
import { XpProgress } from "@/components/xp-progress";
import type { Level } from "@/lib/types";

type Props = {
  level: number;
  title: string;
  totalDisplay: number;
  displayCurrency: string;
  xp: number;
  baseCurrency: string;
  levels: Level[];
};

export function LevelCard({
  level,
  title,
  totalDisplay,
  displayCurrency,
  xp,
  baseCurrency,
  levels,
}: Props) {
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
      </div>

      <div className="mt-4">
        <XpProgress xp={xp} levels={levels} baseCurrency={baseCurrency} />
      </div>
    </section>
  );
}
