"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/lib/currency";

type Point = { date: string; total: number };

const compact = (v: number) =>
  new Intl.NumberFormat("id-ID", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });

export function TotalOverTime({
  data,
  currency,
}: {
  data: Point[];
  currency: string;
}) {
  if (data.length < 2) {
    return (
      <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
        Tambah beberapa setoran untuk melihat grafik.
      </p>
    );
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="totalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={(v) => compact(Number(v))}
            fontSize={11}
            width={44}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency)}
            labelFormatter={(l) => fmtDate(String(l))}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#totalFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
