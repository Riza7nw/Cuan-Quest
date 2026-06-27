import { formatMoney } from "@/lib/currency";
import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";

type Row = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  categoryName: string;
  occurred_at: string;
  note: string | null;
};

const LABEL: Record<string, string> = {
  deposit: "Setor",
  withdraw: "Tarik",
  transfer: "Pindah",
};
const SIGN: Record<string, string> = {
  deposit: "+",
  withdraw: "−",
  transfer: "→",
};

export function RecentEntries({ rows }: { rows: Row[] }) {
  if (rows.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Aktivitas terbaru</h3>
      <ul className="divide-y rounded-xl border">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="truncate">
                <span className="font-medium">{LABEL[r.type] ?? r.type}</span>
                {" · "}
                {r.categoryName}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(r.occurred_at), {
                  addSuffix: true,
                  locale: id,
                })}
              </p>
            </div>
            <span className="shrink-0 tabular-nums">
              {SIGN[r.type] ?? ""}
              {formatMoney(r.amount, r.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
