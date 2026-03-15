"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface ServiceBreakdownProps {
  data: Array<{
    name: string;
    value: number;
    count?: number;
  }>;
  valueLabel?: string;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export function ServiceBreakdown({
  data,
  valueLabel = "Revenue",
}: ServiceBreakdownProps) {
  const formatCurrency = (value: unknown) => {
    if (typeof value !== "number") return "";
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
            }
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => [formatCurrency(value), valueLabel]}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
