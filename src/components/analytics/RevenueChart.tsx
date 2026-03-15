"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface RevenueChartProps {
  data: Array<{
    date: string;
    revenue: number;
    refunds?: number;
    netRevenue?: number;
  }>;
  showRefunds?: boolean;
}

export function RevenueChart({ data, showRefunds = false }: RevenueChartProps) {
  const formatDate = (dateStr: unknown) => {
    if (typeof dateStr !== "string") return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatCurrency = (value: unknown) => {
    if (typeof value !== "number") return "";
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-xs"
          />
          <YAxis tickFormatter={formatCurrency} className="text-xs" />
          <Tooltip
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => formatDate(label)}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
          />
          {showRefunds && (
            <>
              <Line
                type="monotone"
                dataKey="refunds"
                name="Refunds"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="netRevenue"
                name="Net Revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
