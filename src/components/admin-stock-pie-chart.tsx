"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

type Slice = {
  label: string;
  value: number;
};

type AdminStockPieChartProps = {
  data: Slice[];
};

const COLORS = ["#ebb446", "#4e95f2", "#ef6b5a"];

export function AdminStockPieChart({ data }: AdminStockPieChartProps) {
  const safeData = data.filter((item) => item.value > 0);

  return (
    <div className="h-[280px] rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-[#fbfcfe] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 26px rgba(15,23,42,0.12)",
              backgroundColor: "white",
            }}
            formatter={(value: unknown) => [Number(value ?? 0).toLocaleString(), "Products"]}
          />
          <Pie
            data={safeData}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={90}
            innerRadius={42}
            paddingAngle={2}
            label={({ label, value }) => `${label}: ${value}`}
            isAnimationActive={false}
          >
            {safeData.map((entry, index) => (
              <Cell key={`${entry.label}-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
