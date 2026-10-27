"use client";

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

function Ring({
  value,
  goal,
  label,
  unit,
  colorClass,
}: {
  value: number;
  goal: number | null;
  label: string;
  unit: string;
  colorClass: string;
}) {
  const hasGoal = goal != null && goal > 0;
  const pct = hasGoal ? Math.min(1, value / goal!) : 0;
  const r = 28;
  const circ = 2 * Math.PI * r;

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
              className={colorClass}
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
    </div>
  );
}

export function MacroRings({ totals, goals }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      <Ring
        value={totals.calories}
        goal={goals.kcalGoal}
        label="kcal"
        unit=""
        colorClass="stroke-orange-500"
      />
      <Ring
        value={totals.protein}
        goal={goals.proteinGoal}
        label="Protein"
        unit="g"
        colorClass="stroke-accent"
      />
      <Ring
        value={totals.carbs}
        goal={goals.carbsGoal}
        label="Carbs"
        unit="g"
        colorClass="stroke-sky-500"
      />
      <Ring
        value={totals.fat}
        goal={goals.fatGoal}
        label="Fat"
        unit="g"
        colorClass="stroke-yellow-500"
      />
    </div>
  );
}
