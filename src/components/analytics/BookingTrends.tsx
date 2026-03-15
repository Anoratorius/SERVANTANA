"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface BookingTrendsProps {
  data: Array<{
    date: string;
    bookings: number;
    completed?: number;
    cancelled?: number;
  }>;
  showBreakdown?: boolean;
}

export function BookingTrends({ data, showBreakdown = false }: BookingTrendsProps) {
  const formatDate = (dateStr: unknown) => {
    if (typeof dateStr !== "string") return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            className="text-xs"
          />
          <YAxis className="text-xs" />
          <Tooltip labelFormatter={(label) => formatDate(label)} />
          <Legend />
          {showBreakdown ? (
            <>
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#10b981"
                stackId="a"
              />
              <Bar
                dataKey="cancelled"
                name="Cancelled"
                fill="#ef4444"
                stackId="a"
              />
            </>
          ) : (
            <Bar dataKey="bookings" name="Bookings" fill="#3b82f6" />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
