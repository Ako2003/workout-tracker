// Energy, macro, and BMI helpers used by the plan page.

export type Sex = "MALE" | "FEMALE";
export type ActivityLevel =
  | "SEDENTARY"
  | "LIGHT"
  | "MODERATE"
  | "VERY_ACTIVE"
  | "EXTRA_ACTIVE";
export type Direction = "CUT" | "MAINTAIN" | "BULK";

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  SEDENTARY: 1.2,
  LIGHT: 1.375,
  MODERATE: 1.55,
  VERY_ACTIVE: 1.725,
  EXTRA_ACTIVE: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  SEDENTARY: "Sedentary (desk job, no exercise)",
  LIGHT: "Light (walks, 1–2 workouts/week)",
  MODERATE: "Moderate (3–5 workouts/week)",
  VERY_ACTIVE: "Very active (6+ workouts/week)",
  EXTRA_ACTIVE: "Extra active (physical job + daily training)",
};

// Mifflin-St Jeor equation. Returns BMR in kcal/day. Inputs in metric units.
export function bmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: Sex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "MALE" ? base + 5 : base - 161;
}

export function tdee(bmrValue: number, level: ActivityLevel): number {
  return bmrValue * ACTIVITY_MULTIPLIER[level];
}

// Decide direction from current weight vs goal; threshold of 2kg keeps the
// recommendation stable near the goal.
export function direction(
  currentKg: number,
  goalKg: number | null | undefined
): Direction {
  if (goalKg == null) return "MAINTAIN";
  const delta = currentKg - goalKg;
  if (delta > 2) return "CUT";
  if (delta < -2) return "BULK";
  return "MAINTAIN";
}

// Daily kcal target based on direction. Deficit/surplus kept moderate for
// sustainability (not aggressive).
export function dailyKcalTarget(tdeeValue: number, dir: Direction): number {
  const base =
    dir === "CUT" ? tdeeValue - 500 : dir === "BULK" ? tdeeValue + 400 : tdeeValue;
  return Math.round(base / 10) * 10;
}

export interface MacroTargets {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

// Macro split:
//  - Protein: 1.8 g/kg body weight (good for both cut and lean bulk)
//  - Fat: 25% of kcal (cut) / 30% (maintain/bulk) → kept at 25% for CUT, 28% else
//  - Carbs: remainder
export function macroTargets(
  kcal: number,
  weightKg: number,
  dir: Direction
): MacroTargets {
  const proteinG = Math.round(weightKg * 1.8);
  const fatPct = dir === "CUT" ? 0.25 : 0.28;
  const fatG = Math.round((kcal * fatPct) / 9);
  const remainingKcal = kcal - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingKcal / 4));
  return { kcal, proteinG, fatG, carbsG };
}

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

// Weight in kg for a given target BMI at a given height.
function weightForBmi(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100;
  return targetBmi * m * m;
}

// "Optimal" weight = midpoint of the healthy BMI range (BMI 22). Rounded to
// the nearest 0.5 kg so the suggestion reads cleanly.
export function optimalWeight(heightCm: number): number {
  return Math.round(weightForBmi(22, heightCm) * 2) / 2;
}

// WHO healthy BMI range is 18.5–24.9; we clamp slightly in from the edges
// (20–25) to avoid suggesting the extremes.
export function healthyWeightRange(heightCm: number): [number, number] {
  const lo = Math.round(weightForBmi(20, heightCm) * 2) / 2;
  const hi = Math.round(weightForBmi(25, heightCm) * 2) / 2;
  return [lo, hi];
}

export function bmiLabel(value: number): {
  label: string;
  tone: "muted" | "ok" | "warn" | "danger";
} {
  if (value < 18.5) return { label: "Underweight", tone: "warn" };
  if (value < 25) return { label: "Healthy weight", tone: "ok" };
  if (value < 30) return { label: "Overweight", tone: "warn" };
  return { label: "Obese", tone: "danger" };
}

export const DIRECTION_LABEL: Record<Direction, string> = {
  CUT: "Lose weight",
  MAINTAIN: "Maintain",
  BULK: "Gain muscle",
};

// Default meal times (HH:MM, 24h) keyed to the goal direction.
// CUT: eat earlier, finish by ~19:30 to curb evening hunger / improve sleep.
// MAINTAIN: standard four-meal day.
// BULK: shift slightly later and keep dinner at 20:00 so you can fit the
//   larger surplus; snack is positioned mid-afternoon to split the load.
export const DEFAULT_MEAL_TIMES: Record<
  Direction,
  { BREAKFAST: string; LUNCH: string; SNACK: string; DINNER: string }
> = {
  CUT: {
    BREAKFAST: "08:00",
    LUNCH: "13:00",
    SNACK: "16:00",
    DINNER: "19:30",
  },
  MAINTAIN: {
    BREAKFAST: "08:30",
    LUNCH: "13:00",
    SNACK: "16:30",
    DINNER: "20:00",
  },
  BULK: {
    BREAKFAST: "08:00",
    LUNCH: "12:30",
    SNACK: "16:00",
    DINNER: "20:00",
  },
};
