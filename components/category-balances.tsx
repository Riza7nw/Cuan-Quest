import Link from "next/link";
import { formatMoney } from "@/lib/currency";
import type { Category } from "@/lib/types";

export function CategoryBalances({ categories }: { categories: Category[] }) {
  if (categories.length === 0) {
    return (
      <section className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Belum ada kantong.{" "}
        <Link href="/categories" className="font-medium underline underline-offset-4">
          Buat kantong
        </Link>{" "}
        untuk mulai menabung.
      </section>
    );
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold">Kantong</h3>
      <ul className="divide-y rounded-xl border">
        {categories.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <span className="font-medium">
              {c.icon ? `${c.icon} ` : ""}
              {c.name}
            </span>
            <span className="tabular-nums">
              {formatMoney(Number(c.current_balance), c.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
