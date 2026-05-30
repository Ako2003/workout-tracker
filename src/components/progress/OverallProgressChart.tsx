"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DataPoint {
  date: string;
  volume: number;
  sets: number;
  sessions: number;
}

interface OverallProgressChartProps {
  data: DataPoint[];
  bucket: "day" | "week" | "month";
}

const ACCENT = "#10b981";
const BLUE = "#3b82f6";

export function OverallProgressChart({
  data,
  bucket,
}: OverallProgressChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[260px] flex items-center justify-center text-foreground-muted text-sm">
        No data yet for this range
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (bucket === "month") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatVolume = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toFixed(0);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
      >
        <defs>
          <linearGradient id="overall-volume" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={ACCENT} stopOpacity={0.7} />
            <stop offset="95%" stopColor={ACCENT} stopOpacity={0.1} />
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
          yAxisId="volume"
          stroke="#71717a"
          tick={{ fill: "#71717a", fontSize: 12 }}
          tickFormatter={formatVolume}
          axisLine={false}
          tickLine={false}
          width={50}
        />
        <YAxis
          yAxisId="sessions"
          orientation="right"
          stroke="#71717a"
          tick={{ fill: "#71717a", fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={30}
          allowDecimals={false}
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
          labelFormatter={(label) => formatDate(String(label))}
          formatter={(value, name) => {
            const num =
              typeof value === "number" ? value : Number(value ?? 0);
            if (name === "volume")
              return [`${formatVolume(num)} kg`, "Volume"];
            if (name === "sessions") return [String(num), "Sessions"];
            return [String(num), String(name)];
          }}
        />
        <Bar
          yAxisId="volume"
          dataKey="volume"
          fill="url(#overall-volume)"
          radius={[4, 4, 0, 0]}
        />
        <Line
          yAxisId="sessions"
          type="monotone"
          dataKey="sessions"
          stroke={BLUE}
          strokeWidth={2}
          dot={{ fill: BLUE, strokeWidth: 2, r: 3 }}
          activeDot={{ r: 5, fill: BLUE }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
