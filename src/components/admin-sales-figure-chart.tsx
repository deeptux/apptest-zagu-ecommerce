"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Point = {
  label: string;
  salesA: number;
  salesB: number;
  salesC?: number;
};

type AdminSalesFigureChartProps = {
  data: Point[];
};

export function AdminSalesFigureChart({ data }: AdminSalesFigureChartProps) {
  return (
    <div className="mt-4 h-[340px] rounded-3xl border border-slate-100 bg-gradient-to-b from-white to-[#fbfcfe] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lineGradientA" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ebb446" />
              <stop offset="100%" stopColor="#f1cc7a" />
            </linearGradient>
            <linearGradient id="lineGradientB" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4e95f2" />
              <stop offset="100%" stopColor="#89b9f7" />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e9edf4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
          />
          <Tooltip
            cursor={{ stroke: "#d4dbe6", strokeDasharray: "4 4" }}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #e5e7eb",
              boxShadow: "0 10px 26px rgba(15,23,42,0.12)",
              backgroundColor: "white",
            }}
            formatter={(value: unknown, key: string | undefined) => [
              `PHP ${Number(value ?? 0).toLocaleString()}`,
              key === "salesA"
                ? "Total Order Cost"
                : key === "salesB"
                  ? "Approved Order Cost"
                  : "Rejected Order Cost",
            ]}
            labelFormatter={(label) => `Week: ${label}`}
          />
          <Line
            type="monotone"
            dataKey="salesA"
            stroke="url(#lineGradientA)"
            strokeWidth={4}
            dot={{ r: 4, fill: "#ebb446" }}
            activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2, fill: "#ebb446" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="salesB"
            stroke="url(#lineGradientB)"
            strokeWidth={4}
            dot={{ r: 4, fill: "#4e95f2" }}
            activeDot={{ r: 7, stroke: "#fff", strokeWidth: 2, fill: "#4e95f2" }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="salesC"
            stroke="#ef4444"
            strokeWidth={3}
            dot={{ r: 3, fill: "#ef4444" }}
            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: "#ef4444" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
