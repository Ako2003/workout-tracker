"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Flame,
  Save,
  Scale,
  Settings,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import {
  ACTIVITY_LABEL,
  DIRECTION_LABEL,
  bmi as bmiCalc,
  bmiLabel,
  bmr as bmrCalc,
  dailyKcalTarget,
  direction as directionFn,
  macroTargets,
  tdee as tdeeCalc,
  type ActivityLevel,
  type Direction,
  type Sex,
} from "@/lib/nutrition";
import {
  BASE_DAILY_KCAL,
  MEAL_LABEL,
  MEAL_ORDER,
  WEEKLY_PLAN,
  type MealKey,
  type PlanItem,
} from "@/lib/meal-plan";
import { cn } from "@/lib/utils";

interface Profile {
  kcalGoal: number | null;
  proteinGoal: number | null;
  carbsGoal: number | null;
  fatGoal: number | null;
  bodyweightGoalKg: number | null;
  heightCm: number | null;
  age: number | null;
  sex: Sex | null;
  activityLevel: ActivityLevel | null;
}

interface BodyWeightEntry {
  weightKg: number;
  date: string;
}

interface Food {
  id: string;
  nameEn: string;
  nameRu: string | null;
  caloriesPer100g: number;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  servingSizeG: number | null;
  servingLabel: string | null;
  isRecipe: boolean;
}

interface ScaledPlanItem extends PlanItem {
  food: Food | null;
  grams: number;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

interface ScaledMeal {
  meal: MealKey;
  items: ScaledPlanItem[];
  kcal: number;
  proteinG: number;
}

interface ScaledDay {
  day: string;
  meals: ScaledMeal[];
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  isToday: boolean;
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string }[] = [
  { value: "SEDENTARY", label: ACTIVITY_LABEL.SEDENTARY },
  { value: "LIGHT", label: ACTIVITY_LABEL.LIGHT },
  { value: "MODERATE", label: ACTIVITY_LABEL.MODERATE },
  { value: "VERY_ACTIVE", label: ACTIVITY_LABEL.VERY_ACTIVE },
  { value: "EXTRA_ACTIVE", label: ACTIVITY_LABEL.EXTRA_ACTIVE },
];

function todayLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Day names in the WEEKLY_PLAN are Monday..Sunday. getDay() is 0=Sun..6=Sat;
// shift so Monday=0, Sunday=6.
function todayPlanIndex(): number {
  const js = new Date().getDay();
  return js === 0 ? 6 : js - 1;
}

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export default function PlanPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  // Local form state for the inputs block
  const [weightInput, setWeightInput] = useState("");
  const [targetWeightInput, setTargetWeightInput] = useState("");
  const [heightInput, setHeightInput] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [sex, setSex] = useState<Sex | "">("");
  const [activity, setActivity] = useState<ActivityLevel | "">("");
  const [saving, setSaving] = useState(false);
  const [loggingKey, setLoggingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [pRes, bRes, fRes] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/bodyweight?limit=1"),
          fetch("/api/foods"),
        ]);
        const p = await pRes.json();
        const b = await bRes.json();
        const f = await fRes.json();

        setProfile(p);
        setFoods(Array.isArray(f) ? f : []);
        setHeightInput(p.heightCm?.toString() ?? "");
        setAgeInput(p.age?.toString() ?? "");
        setSex(p.sex ?? "");
        setActivity(p.activityLevel ?? "");
        setTargetWeightInput(p.bodyweightGoalKg?.toString() ?? "");

        const latest = Array.isArray(b) ? b[0]?.weightKg : null;
        if (latest != null) {
          setLatestWeight(latest);
          setWeightInput(latest.toString());
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const foodByName = useMemo(() => {
    const m = new Map<string, Food>();
    for (const f of foods) m.set(f.nameEn, f);
    return m;
  }, [foods]);

  const currentWeight = parseFloat(weightInput) || null;
  const targetWeight = parseFloat(targetWeightInput) || null;
  const height = parseInt(heightInput) || null;
  const age = parseInt(ageInput) || null;

  const canCompute =
    currentWeight != null &&
    height != null &&
    age != null &&
    sex !== "" &&
    activity !== "";

  const recommendation = useMemo(() => {
    if (!canCompute) return null;
    const dir: Direction = directionFn(currentWeight!, targetWeight);
    const bmrVal = bmrCalc(currentWeight!, height!, age!, sex as Sex);
    const tdeeVal = tdeeCalc(bmrVal, activity as ActivityLevel);
    const kcal = dailyKcalTarget(tdeeVal, dir);
    const macros = macroTargets(kcal, currentWeight!, dir);
    const b = bmiCalc(currentWeight!, height!);
    return {
      direction: dir,
      bmr: Math.round(bmrVal),
      tdee: Math.round(tdeeVal),
      kcal,
      macros,
      bmi: b,
      bmiInfo: bmiLabel(b),
    };
  }, [canCompute, currentWeight, targetWeight, height, age, sex, activity]);

  const scaledPlan = useMemo<ScaledDay[] | null>(() => {
    if (!recommendation) return null;
    const factor = recommendation.kcal / BASE_DAILY_KCAL;
    const todayIdx = todayPlanIndex();
    const todayName = DAY_NAMES[todayIdx];

    const scaled = WEEKLY_PLAN.map((day) => {
      const meals: ScaledMeal[] = MEAL_ORDER.map((mealKey) => {
        const items = (day.meals[mealKey] ?? []).map((it): ScaledPlanItem => {
          const food = foodByName.get(it.nameEn) ?? null;
          // Round scaled grams to the nearest 5g for a readable plan.
          const grams = Math.max(5, Math.round((it.grams * factor) / 5) * 5);
          const k = (food?.caloriesPer100g ?? 0) * grams / 100;
          const p = (food?.proteinPer100g ?? 0) * grams / 100;
          const c = (food?.carbsPer100g ?? 0) * grams / 100;
          const f = (food?.fatPer100g ?? 0) * grams / 100;
          return { ...it, grams, food, kcal: k, proteinG: p, carbsG: c, fatG: f };
        });
        const mk = items.reduce((s, i) => s + i.kcal, 0);
        const mp = items.reduce((s, i) => s + i.proteinG, 0);
        return { meal: mealKey, items, kcal: mk, proteinG: mp };
      });
      const kcal = meals.reduce((s, m) => s + m.kcal, 0);
      const proteinG = meals.reduce((s, m) => s + m.proteinG, 0);
      const carbsG = meals.reduce(
        (s, m) => s + m.items.reduce((ss, i) => ss + i.carbsG, 0),
        0
      );
      const fatG = meals.reduce(
        (s, m) => s + m.items.reduce((ss, i) => ss + i.fatG, 0),
        0
      );
      return {
        day: day.day,
        meals,
        kcal,
        proteinG,
        carbsG,
        fatG,
        isToday: day.day === todayName,
      };
    });

    // Rotate so today's day appears first, then the rest of the week in order.
    return [...scaled.slice(todayIdx), ...scaled.slice(0, todayIdx)];
  }, [recommendation, foodByName]);

  const saveProfileAndGoals = async (opts: {
    saveInputs?: boolean;
    saveGoals?: boolean;
  }) => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        ...profile,
      };
      if (opts.saveInputs) {
        Object.assign(body, {
          heightCm: height,
          age,
          sex: sex || null,
          activityLevel: activity || null,
          bodyweightGoalKg: targetWeight,
        });
      }
      if (opts.saveGoals && recommendation) {
        Object.assign(body, {
          kcalGoal: recommendation.kcal,
          proteinGoal: recommendation.macros.proteinG,
          carbsGoal: recommendation.macros.carbsG,
          fatGoal: recommendation.macros.fatG,
        });
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      const next = await res.json();
      setProfile(next);
      // Also log today's weight if the user typed a new one
      if (
        currentWeight != null &&
        (latestWeight == null || Math.abs(currentWeight - latestWeight) > 1e-6)
      ) {
        await fetch("/api/bodyweight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weightKg: currentWeight }),
        });
        setLatestWeight(currentWeight);
      }
      showToast("Saved", "success");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const logMeal = async (dayIdx: number, meal: ScaledMeal) => {
    const key = `${dayIdx}-${meal.meal}`;
    setLoggingKey(key);
    try {
      const today = todayLocalISO();
      // Only log items whose food was resolved against the catalog.
      const resolved = meal.items.filter((i) => i.food);
      for (const it of resolved) {
        await fetch("/api/food-entries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            foodId: it.food!.id,
            grams: it.grams,
            date: today,
            meal: meal.meal,
          }),
        });
      }
      showToast(`${MEAL_LABEL[meal.meal]} logged to today`, "success");
    } catch {
      showToast("Failed to log meal", "error");
    } finally {
      setLoggingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="h-32 bg-background-secondary rounded-xl animate-pulse" />
        <div className="h-64 bg-background-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display">Nutrition plan</h1>
        <p className="text-sm text-foreground-muted">
          Daily target based on your body and a weekly meal plan to hit it
        </p>
      </div>

      {/* Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-accent" />
            Your body
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <LabeledNumber
              label="Current weight"
              value={weightInput}
              onChange={setWeightInput}
              suffix="kg"
              step="0.1"
            />
            <LabeledNumber
              label="Target weight"
              value={targetWeightInput}
              onChange={setTargetWeightInput}
              suffix="kg"
              step="0.1"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LabeledNumber
              label="Height"
              value={heightInput}
              onChange={setHeightInput}
              suffix="cm"
            />
            <LabeledNumber
              label="Age"
              value={ageInput}
              onChange={setAgeInput}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground-muted mb-1.5">
              Sex
            </p>
            <div className="flex gap-2">
              {SEX_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSex(o.value)}
                  className={cn(
                    "flex-1 h-10 rounded-lg text-sm font-medium border transition-colors",
                    sex === o.value
                      ? "bg-accent text-background border-accent"
                      : "bg-background-tertiary text-foreground-muted border-border hover:text-foreground"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground-muted mb-1.5">
              Activity level
            </p>
            <div className="space-y-1.5">
              {ACTIVITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setActivity(o.value)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm border transition-colors text-left",
                    activity === o.value
                      ? "bg-accent/10 text-accent border-accent/40"
                      : "bg-background-tertiary text-foreground-muted border-border hover:text-foreground"
                  )}
                >
                  <span>{o.label}</span>
                  {activity === o.value && (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => saveProfileAndGoals({ saveInputs: true })}
            isLoading={saving}
          >
            <Save className="w-4 h-4 mr-1" />
            Save body details
          </Button>
        </CardContent>
      </Card>

      {!canCompute ? (
        <Card>
          <CardContent className="text-sm text-foreground-muted">
            Fill in weight, height, age, sex, and activity to see your
            recommendation.
          </CardContent>
        </Card>
      ) : recommendation ? (
        <>
          {/* Recommendation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-4 h-4 text-accent" />
                Recommendation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0",
                    recommendation.direction === "CUT"
                      ? "bg-sky-500/15 text-sky-500"
                      : recommendation.direction === "BULK"
                        ? "bg-orange-500/15 text-orange-500"
                        : "bg-accent/15 text-accent"
                  )}
                >
                  <Activity className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">
                    {DIRECTION_LABEL[recommendation.direction]}
                  </p>
                  <p className="text-xs text-foreground-muted">
                    {recommendation.direction === "CUT"
                      ? "Moderate deficit of 500 kcal/day"
                      : recommendation.direction === "BULK"
                        ? "Lean surplus of 400 kcal/day"
                        : "You're close to your target weight"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat
                  label="BMI"
                  value={recommendation.bmi.toFixed(1)}
                  caption={recommendation.bmiInfo.label}
                  tone={recommendation.bmiInfo.tone}
                />
                <Stat
                  label="TDEE"
                  value={`${recommendation.tdee}`}
                  caption="kcal maintenance"
                />
              </div>

              <div className="rounded-xl bg-background-tertiary/40 border border-border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <p className="text-2xl font-bold font-mono">
                    {recommendation.kcal}
                    <span className="text-sm font-medium text-foreground-muted ml-1">
                      kcal / day
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs text-foreground-muted">
                  <span>
                    Protein{" "}
                    <span className="font-mono text-foreground">
                      {recommendation.macros.proteinG}g
                    </span>
                  </span>
                  <span>
                    Carbs{" "}
                    <span className="font-mono text-foreground">
                      {recommendation.macros.carbsG}g
                    </span>
                  </span>
                  <span>
                    Fat{" "}
                    <span className="font-mono text-foreground">
                      {recommendation.macros.fatG}g
                    </span>
                  </span>
                </div>
              </div>

              <Button
                fullWidth
                onClick={() =>
                  saveProfileAndGoals({ saveInputs: true, saveGoals: true })
                }
                isLoading={saving}
              >
                <Save className="w-4 h-4 mr-1" />
                Save as my daily goals
              </Button>
              <p className="text-xs text-foreground-subtle text-center">
                Updates kcal / P / C / F goals used by the Food page rings.
              </p>
            </CardContent>
          </Card>

          {/* Weekly plan */}
          {scaledPlan && (
            <>
              <div className="flex items-center justify-between pt-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground-muted">
                  Weekly plan
                </h2>
                <Link
                  href="/food"
                  className="text-xs text-accent inline-flex items-center gap-1"
                >
                  View daily log <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="space-y-3">
                {scaledPlan.map((day, idx) => (
                  <DayCard
                    key={day.day}
                    day={day}
                    index={idx}
                    targetKcal={recommendation.kcal}
                    loggingKey={loggingKey}
                    onLogMeal={logMeal}
                  />
                ))}
              </div>
            </>
          )}
        </>
      ) : null}

      <div className="pt-2">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground"
        >
          <Settings className="w-4 h-4" />
          All settings
        </Link>
      </div>
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
  suffix,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-foreground-muted mb-1.5">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          className={cn(
            "w-full h-10 px-3 bg-background-secondary border border-border rounded-lg",
            "text-foreground placeholder:text-foreground-subtle font-mono",
            "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
            suffix && "pr-12"
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-subtle text-xs">
            {suffix}
          </span>
        )}
      </div>
    </label>
  );
}

function Stat({
  label,
  value,
  caption,
  tone = "muted",
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "muted" | "ok" | "warn" | "danger";
}) {
  const toneClass = {
    muted: "text-foreground-muted",
    ok: "text-accent",
    warn: "text-orange-500",
    danger: "text-danger",
  }[tone];
  return (
    <div className="rounded-lg bg-background-tertiary/40 border border-border px-3 py-2">
      <p className="text-xs text-foreground-muted uppercase tracking-wide">
        {label}
      </p>
      <p className="text-xl font-mono font-bold">{value}</p>
      {caption && <p className={cn("text-xs", toneClass)}>{caption}</p>}
    </div>
  );
}

function DayCard({
  day,
  index,
  targetKcal,
  loggingKey,
  onLogMeal,
}: {
  day: ScaledDay;
  index: number;
  targetKcal: number;
  loggingKey: string | null;
  onLogMeal: (dayIdx: number, meal: ScaledMeal) => void;
}) {
  const diff = Math.round(day.kcal - targetKcal);
  return (
    <Card
      padding="none"
      className={cn(day.isToday && "ring-2 ring-accent/60")}
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold">{day.day}</p>
            {day.isToday && (
              <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider">
                Today
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-muted">
            P {Math.round(day.proteinG)}g · C {Math.round(day.carbsG)}g · F{" "}
            {Math.round(day.fatG)}g
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono font-bold text-lg">{Math.round(day.kcal)}</p>
          <p
            className={cn(
              "text-xs font-mono",
              Math.abs(diff) <= 100
                ? "text-accent"
                : diff > 0
                  ? "text-orange-500"
                  : "text-sky-500"
            )}
          >
            {diff >= 0 ? "+" : ""}
            {diff} vs goal
          </p>
        </div>
      </div>
      <div className="divide-y divide-border">
        {day.meals.map((m) => (
          <MealBlock
            key={m.meal}
            meal={m}
            isLogging={loggingKey === `${index}-${m.meal}`}
            onLog={() => onLogMeal(index, m)}
          />
        ))}
      </div>
    </Card>
  );
}

function MealBlock({
  meal,
  isLogging,
  onLog,
}: {
  meal: ScaledMeal;
  isLogging: boolean;
  onLog: () => void;
}) {
  const anyUnresolved = meal.items.some((i) => !i.food);
  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
            {MEAL_LABEL[meal.meal]}
          </p>
          <p className="text-xs text-foreground-subtle">
            {Math.round(meal.kcal)} kcal · P {Math.round(meal.proteinG)}g
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={onLog}
          isLoading={isLogging}
          disabled={meal.items.length === 0}
        >
          Log
        </Button>
      </div>
      <ul className="space-y-1">
        {meal.items.map((it, i) => (
          <li
            key={i}
            className={cn(
              "flex items-center justify-between text-sm py-1",
              !it.food && "text-foreground-subtle italic"
            )}
          >
            <span className="min-w-0 truncate">
              {it.food
                ? it.food.nameRu
                  ? `${it.food.nameEn} (${it.food.nameRu})`
                  : it.food.nameEn
                : `${it.nameEn} (not in catalog)`}
              {it.food?.servingSizeG && it.food.servingLabel && (
                <span className="text-foreground-subtle ml-1">
                  · {Math.round(it.grams / it.food.servingSizeG)}{" "}
                  {it.food.servingLabel}
                  {Math.round(it.grams / it.food.servingSizeG) !== 1 ? "s" : ""}
                </span>
              )}
            </span>
            <span className="font-mono text-foreground-muted ml-2">
              {Math.round(it.grams)}g · {Math.round(it.kcal)}k
            </span>
          </li>
        ))}
      </ul>
      {anyUnresolved && (
        <p className="text-[11px] text-orange-500">
          Some items aren&apos;t in your catalog yet — logging will skip them.
        </p>
      )}
    </div>
  );
}
