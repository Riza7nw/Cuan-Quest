"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatMoney } from "@/lib/currency";

type Slice = { name: string; value: number };

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
  "#84cc16",
];

export function Composition({
  data,
  currency,
}: {
  data: Slice[];
  currency: string;
}) {
  if (data.length === 0) return null;
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
          >
            {data.map((s, i) => (
              <Cell key={s.name} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatMoney(Number(value), currency)} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
