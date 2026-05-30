"use client";

import { cn } from "@/lib/utils";

interface HeatmapData {
  date: string;
  count: number;
}

interface WorkoutHeatmapProps {
  data: HeatmapData[];
}

export function WorkoutHeatmap({ data }: WorkoutHeatmapProps) {
  // Group data by week
  const weeks: HeatmapData[][] = [];
  let currentWeek: HeatmapData[] = [];

  // Start from the first Sunday
  const firstDate = data.length > 0 ? new Date(data[0].date) : new Date();
  const startDay = firstDate.getDay();

  // Add empty days to align to week start (Sunday)
  for (let i = 0; i < startDay; i++) {
    currentWeek.push({ date: "", count: -1 }); // -1 indicates empty
  }

  for (const day of data) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Add remaining days
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({ date: "", count: -1 });
    }
    weeks.push(currentWeek);
  }

  // Only show last 26 weeks (half year) for compact display
  const displayWeeks = weeks.slice(-26);

  const getIntensityClass = (count: number) => {
    if (count === -1) return "bg-transparent";
    if (count === 0) return "bg-background-tertiary";
    if (count === 1) return "bg-accent/30";
    if (count === 2) return "bg-accent/60";
    return "bg-accent";
  };

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // Get month labels
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;

  displayWeeks.forEach((week, weekIndex) => {
    const firstValidDay = week.find((d) => d.count !== -1 && d.date);
    if (firstValidDay) {
      const date = new Date(firstValidDay.date);
      const month = date.getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ month: months[month], weekIndex });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="space-y-2">
      {/* Month labels */}
      <div className="flex text-xs text-foreground-muted pl-6">
        {monthLabels.map(({ month, weekIndex }, i) => (
          <span
            key={i}
            className="absolute"
            style={{ marginLeft: `${weekIndex * 12 + 24}px` }}
          >
            {month}
          </span>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 text-xs text-foreground-muted pr-1">
          <span className="h-2.5" />
          <span className="h-2.5 leading-none">M</span>
          <span className="h-2.5" />
          <span className="h-2.5 leading-none">W</span>
          <span className="h-2.5" />
          <span className="h-2.5 leading-none">F</span>
          <span className="h-2.5" />
        </div>

        {/* Grid */}
        <div className="flex gap-0.5 overflow-x-auto">
          {displayWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-0.5">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={cn(
                    "w-2.5 h-2.5 rounded-sm transition-colors",
                    getIntensityClass(day.count)
                  )}
                  title={
                    day.count >= 0
                      ? `${day.date}: ${day.count} workout${day.count !== 1 ? "s" : ""}`
                      : undefined
                  }
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 text-xs text-foreground-muted">
        <span>Less</span>
        <div className="w-2.5 h-2.5 rounded-sm bg-background-tertiary" />
        <div className="w-2.5 h-2.5 rounded-sm bg-accent/30" />
        <div className="w-2.5 h-2.5 rounded-sm bg-accent/60" />
        <div className="w-2.5 h-2.5 rounded-sm bg-accent" />
        <span>More</span>
      </div>
    </div>
  );
}
