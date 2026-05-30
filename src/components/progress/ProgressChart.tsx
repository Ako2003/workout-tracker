"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";

interface DataPoint {
  date: string;
  maxWeight: number;
  volume: number;
  totalSets: number;
}

interface ProgressChartProps {
  data: DataPoint[];
  metric: "maxWeight" | "volume";
}

export function ProgressChart({ data, metric }: ProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[250px] flex items-center justify-center text-foreground-muted">
        No data to display
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatValue = (value: number) => {
    if (metric === "volume") {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);
    }
    return value.toFixed(1);
  };

  const chartColor = metric === "maxWeight" ? "#10b981" : "#3b82f6";

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#27272a"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          stroke="#71717a"
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickFormatter={formatDate}
          axisLine={{ stroke: "#27272a" }}
          tickLine={false}
        />
        <YAxis
          stroke="#71717a"
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickFormatter={formatValue}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #27272a",
            borderRadius: "8px",
            padding: "8px 12px",
          }}
          labelStyle={{ color: "#a1a1aa", marginBottom: "4px" }}
          itemStyle={{ color: "#fafafa" }}
          formatter={(value) => {
            const numValue = typeof value === "number" ? value : 0;
            return [
              `${formatValue(numValue)} ${metric === "maxWeight" ? "kg" : "kg vol"}`,
              metric === "maxWeight" ? "Max Weight" : "Volume",
            ];
          }}
          labelFormatter={(label) => formatDate(String(label))}
        />
        <Area
          type="monotone"
          dataKey={metric}
          stroke={chartColor}
          strokeWidth={2}
          fill={`url(#gradient-${metric})`}
          dot={{ fill: chartColor, strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: chartColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
