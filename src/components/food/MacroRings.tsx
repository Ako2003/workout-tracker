"use client";

import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Totals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Goals {
  kcalGoal: number | null;
  proteinGoal: number | null;
  carbsGoal: number | null;
  fatGoal: number | null;
}

interface Props {
  totals: Totals;
  goals: Goals;
}

// For each macro we score "over" differently:
//   - kcal / carbs / fat: going over the goal is a flag
//   - protein: going over is fine (even desirable), going under is the flag
type OverPolicy = "over-is-flag" | "under-is-flag";

function statusTone(
  value: number,
  goal: number,
  policy: OverPolicy
): {
  state: "under" | "ok" | "over";
  tone: "muted" | "ok" | "warn";
} {
  const diff = value - goal;
  // Treat within 5% of goal as "on target".
  const tolerance = Math.max(goal * 0.05, policy === "over-is-flag" ? 20 : 2);
  if (Math.abs(diff) <= tolerance) return { state: "ok", tone: "ok" };
  if (diff > 0) {
    return {
      state: "over",
      tone: policy === "over-is-flag" ? "warn" : "ok",
    };
  }
  return {
    state: "under",
    tone: policy === "under-is-flag" ? "warn" : "muted",
  };
}

function Ring({
  value,
  goal,
  label,
  unit,
  baseColorClass,
  policy,
}: {
  value: number;
  goal: number | null;
  label: string;
  unit: string;
  baseColorClass: string;
  policy: OverPolicy;
}) {
  const hasGoal = goal != null && goal > 0;
  const pct = hasGoal ? Math.min(1, value / goal!) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;

  const status = hasGoal ? statusTone(value, goal!, policy) : null;
  const strokeClass =
    status?.tone === "warn"
      ? "stroke-orange-500"
      : status?.tone === "ok"
        ? "stroke-accent"
        : baseColorClass;
  const captionClass =
    status?.tone === "warn"
      ? "text-orange-500"
      : status?.tone === "ok"
        ? "text-accent"
        : "text-foreground-muted";

  const captionText = (() => {
    if (!status) return null;
    const diff = Math.round(value - goal!);
    if (status.state === "ok") return "on target";
    if (status.state === "over") return `+${diff}${unit} over`;
    return `${-diff}${unit} to go`;
  })();

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle
            cx="32"
            cy="32"
            r={r}
            strokeWidth="5"
            className="stroke-background-tertiary"
            fill="none"
          />
          {hasGoal && (
            <circle
              cx="32"
              cy="32"
              r={r}
              strokeWidth="5"
              className={strokeClass}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-mono font-bold leading-none">
            {Math.round(value)}
          </span>
          {hasGoal && (
            <span className="text-[10px] text-foreground-muted leading-none mt-0.5">
              /{goal}
            </span>
          )}
        </div>
      </div>
      <span className="text-xs text-foreground-muted">
        {label}
        {!hasGoal && unit && (
          <span className="ml-0.5 text-foreground-subtle">{unit}</span>
        )}
      </span>
      {hasGoal && captionText && (
        <span className={cn("text-[10px] font-mono leading-none", captionClass)}>
          {captionText}
        </span>
      )}
    </div>
  );
}

function OverallBanner({ totals, goals }: Props) {
  const g = goals.kcalGoal;
  if (!g || g <= 0) return null;

  const diff = Math.round(totals.calories - g);
  const tolerance = Math.max(g * 0.05, 50);

  let tone: "ok" | "warn" | "muted" = "muted";
  let icon: React.ReactNode = null;
  let text = "";
  if (Math.abs(diff) <= tolerance) {
    tone = "ok";
    icon = <Check className="w-4 h-4" />;
    text = "On track for today";
  } else if (diff > 0) {
    tone = "warn";
    icon = <AlertTriangle className="w-4 h-4" />;
    text = `${diff} kcal over your limit`;
  } else {
    tone = "muted";
    text = `${-diff} kcal left to hit your goal`;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border",
        tone === "ok" && "bg-accent/10 border-accent/30 text-accent",
        tone === "warn" && "bg-orange-500/10 border-orange-500/30 text-orange-500",
        tone === "muted" && "bg-background-tertiary/50 border-border text-foreground-muted"
      )}
    >
      {icon}
      <span className="flex-1">{text}</span>
    </div>
  );
}

export function MacroRings({ totals, goals }: Props) {
  const anyGoalSet =
    goals.kcalGoal || goals.proteinGoal || goals.carbsGoal || goals.fatGoal;

  return (
    <div className="space-y-3">
      {anyGoalSet && <OverallBanner totals={totals} goals={goals} />}
      <div className="grid grid-cols-4 gap-2">
        <Ring
          value={totals.calories}
          goal={goals.kcalGoal}
          label="kcal"
          unit=""
          baseColorClass="stroke-orange-500"
          policy="over-is-flag"
        />
        <Ring
          value={totals.protein}
          goal={goals.proteinGoal}
          label="Protein"
          unit="g"
          baseColorClass="stroke-accent"
          policy="under-is-flag"
        />
        <Ring
          value={totals.carbs}
          goal={goals.carbsGoal}
          label="Carbs"
          unit="g"
          baseColorClass="stroke-sky-500"
          policy="over-is-flag"
        />
        <Ring
          value={totals.fat}
          goal={goals.fatGoal}
          label="Fat"
          unit="g"
          baseColorClass="stroke-yellow-500"
          policy="over-is-flag"
        />
      </div>
    </div>
  );
}
