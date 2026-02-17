"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type BarPoint = {
  dealer: string;
  orders: number;
};

type AdminDealerOrdersBarChartProps = {
  data: BarPoint[];
};

export function AdminDealerOrdersBarChart({ data }: AdminDealerOrdersBarChartProps) {
  return (
    <div className="h-[280px] rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-[#fbfcfe] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e9edf4" />
          <XAxis
            dataKey="dealer"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            interval={0}
            angle={-12}
            textAnchor="end"
            height={44}
          />
          <YAxis tickLine={false} axisLine={false} tick={{ fill: "#94a3b8", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(241,245,249,0.6)" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 26px rgba(15,23,42,0.12)",
              backgroundColor: "white",
            }}
            formatter={(value: unknown) => [Number(value ?? 0).toLocaleString(), "Orders"]}
          />
          <Bar dataKey="orders" fill="#4e95f2" radius={[8, 8, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
