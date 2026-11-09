// One-off script: create the Full-Body session plan for 2026-11-09 (09:30 Berlin).
// Run: cd ~/Documents/training-tracker && npx tsx scripts/add-session-2026-11-09.ts
//
// What this writes:
//   1. Exercise rows for any missing exercises (Treadmill, Doorframe Chest Stretch, Neck Tilt)
//   2. A WorkoutTemplate (userId = main-user, slug = "full-body-2026-11-09") with
//      all exercises in order, notes carrying block labels.
//   3. A WorkoutPlan row linking that template to main-user + 2026-11-09.
//
// Schema constraints respected:
//   - WorkoutSession @@unique([userId, date]) — NOT created here because that table
//     records *completed* sets. The plan lives in WorkoutTemplate + WorkoutPlan.
//   - WorkoutPlan @@unique([userId, date]) — the script is idempotent: it deletes
//     any existing plan for that date before inserting so it can be re-run safely.

import { PrismaClient, MuscleGroup } from "@prisma/client";

const db = new PrismaClient();
const USER_ID = "main-user";
const SESSION_DATE = new Date("2026-11-09"); // @db.Date — time part ignored
const TEMPLATE_SLUG = "full-body-2026-11-09";
const TEMPLATE_NAME = "Full-Body — Monday 2026-11-09";
const TEMPLATE_NOTES =
  "Scheduled 09:30 Europe/Berlin. RPE 6–7, 90s rest between main sets. " +
  "Week 3 baseline — log weights. If under-recovered: regress not bail " +
  "(lighter, drop set 3 on main lifts, keep accessories). " +
  "WARM-UP: Treadmill 5 min @ speed 4–5 | Leg Swings 2×10 | Glute Bridge 2×15 | Face Pulls 2×15. " +
  "MAIN (3×8–12): Bench Press 3×8 | Lat Pulldown 3×10 | Goblet Squat 3×12 | Romanian Deadlift 3×10 | Dumbbell Shoulder Press 3×10 | Pec deck fly 2×12 | Tricep Pushdown 2×12. " +
  "CORE: Dead Bug 2×8/side | Plank 2×25–30s. " +
  "CARDIO: Treadmill 8 min — 250m@4 → 250m@7 → 500m@10–12. " +
  "COOLDOWN: Hip Flexor Lunge Stretch 45s | Seated Hamstring Stretch 45s | Doorframe Chest Stretch 30s | Neck Tilt 20s.";

// Ordered list: [name, muscleGroup, block label for notes]
// The order here IS the display order in the template (order = index).
const PLAN: Array<{ name: string; muscleGroup: MuscleGroup; block: string }> = [
  // WARM-UP
  { name: "Treadmill Walk",             muscleGroup: MuscleGroup.LEGS,      block: "WARM-UP" },
  { name: "Leg Swings",                 muscleGroup: MuscleGroup.LEGS,      block: "WARM-UP" },
  { name: "Glute Bridge",               muscleGroup: MuscleGroup.LEGS,      block: "WARM-UP" },
  { name: "Face Pulls",                 muscleGroup: MuscleGroup.BACK,      block: "WARM-UP" },
  // MAIN
  { name: "Bench Press",                muscleGroup: MuscleGroup.CHEST,     block: "MAIN" },
  { name: "Lat Pulldown",               muscleGroup: MuscleGroup.BACK,      block: "MAIN" },
  { name: "Goblet Squat",               muscleGroup: MuscleGroup.LEGS,      block: "MAIN" },
  { name: "Romanian Deadlift",          muscleGroup: MuscleGroup.LEGS,      block: "MAIN" },
  { name: "Dumbbell Shoulder Press",    muscleGroup: MuscleGroup.SHOULDERS, block: "MAIN" },
  { name: "Pec deck fly (butterfly)",   muscleGroup: MuscleGroup.CHEST,     block: "MAIN" },
  { name: "Tricep Pushdown",            muscleGroup: MuscleGroup.TRICEPS,   block: "MAIN" },
  // CORE
  { name: "Dead Bug",                   muscleGroup: MuscleGroup.CORE,      block: "CORE" },
  { name: "Plank",                      muscleGroup: MuscleGroup.CORE,      block: "CORE" },
  // CARDIO
  { name: "Treadmill Walk",             muscleGroup: MuscleGroup.LEGS,      block: "CARDIO" },
  // COOLDOWN
  { name: "Hip Flexor Lunge Stretch",   muscleGroup: MuscleGroup.LEGS,      block: "COOLDOWN" },
  { name: "Seated Hamstring Stretch",   muscleGroup: MuscleGroup.LEGS,      block: "COOLDOWN" },
  { name: "Doorframe Chest Stretch",    muscleGroup: MuscleGroup.CHEST,     block: "COOLDOWN" },
  { name: "Neck Tilt",                  muscleGroup: MuscleGroup.SHOULDERS, block: "COOLDOWN" },
];

async function ensureExercise(name: string, muscleGroup: MuscleGroup): Promise<string> {
  // Try exact name match across all exercises (preset + custom)
  const existing = await db.exercise.findFirst({ where: { name } });
  if (existing) return existing.id;

  // Create as a non-custom preset row (userId = null)
  const created = await db.exercise.create({
    data: { name, muscleGroup, isCustom: false, userId: null },
  });
  console.log(`  Created new exercise: "${name}" (${muscleGroup}) → ${created.id}`);
  return created.id;
}

async function main() {
  console.log("=== add-session-2026-11-09 ===");

  // Safety: single-user guard
  const userCount = await db.user.count();
  if (userCount > 1) throw new Error(`Multiple users (${userCount}) — stopping.`);
  const user = await db.user.findUnique({ where: { id: USER_ID } });
  if (!user) throw new Error(`User "${USER_ID}" not found.`);
  console.log(`User: ${user.id}`);

  // 1. Ensure every exercise exists; build name→id map (deduplicated)
  console.log("\n[1/3] Resolving exercises…");
  const exerciseIdByName = new Map<string, string>();
  for (const entry of PLAN) {
    if (!exerciseIdByName.has(entry.name)) {
      const id = await ensureExercise(entry.name, entry.muscleGroup);
      exerciseIdByName.set(entry.name, id);
      console.log(`  ✓ "${entry.name}" → ${id}`);
    }
  }

  // 2. Create / replace the WorkoutTemplate
  console.log("\n[2/3] Writing WorkoutTemplate…");
  const existing = await db.workoutTemplate.findUnique({ where: { slug: TEMPLATE_SLUG } });
  if (existing) {
    console.log(`  Existing template found (${existing.id}) — deleting exercises and recreating.`);
    await db.workoutTemplateExercise.deleteMany({ where: { templateId: existing.id } });
    await db.workoutTemplate.delete({ where: { id: existing.id } });
  }

  // Build the ordered exercise list (Treadmill Walk appears twice — once in
  // WARM-UP order=0, once in CARDIO order=13 — but WorkoutTemplateExercise has
  // @@unique([templateId, exerciseId]), so we can only link it once.
  // We deduplicate by keeping the FIRST occurrence (WARM-UP) and skip the
  // second Treadmill entry in CARDIO. The CARDIO block instructions are
  // captured in TEMPLATE_NOTES instead.
  const seen = new Set<string>();
  const templateExercises: Array<{ exerciseId: string; order: number }> = [];
  let order = 0;
  for (const entry of PLAN) {
    const id = exerciseIdByName.get(entry.name)!;
    if (seen.has(id)) {
      console.log(`  Skipping duplicate "${entry.name}" in ${entry.block} block (already linked at earlier order).`);
      continue;
    }
    seen.add(id);
    templateExercises.push({ exerciseId: id, order: order++ });
  }

  const template = await db.workoutTemplate.create({
    data: {
      slug:    TEMPLATE_SLUG,
      name:    TEMPLATE_NAME,
      isCustom: true,
      userId:  USER_ID,
      exercises: { create: templateExercises },
    },
    include: { exercises: { include: { exercise: true }, orderBy: { order: "asc" } } },
  });
  console.log(`  Template created: ${template.id} with ${template.exercises.length} exercises`);
  for (const te of template.exercises) {
    console.log(`    [${te.order}] ${te.exercise.name} → exerciseId: ${te.exerciseId}`);
  }

  // 3. Create / replace the WorkoutPlan for 2026-11-09
  console.log("\n[3/3] Writing WorkoutPlan…");
  const existingPlan = await db.workoutPlan.findUnique({
    where: { userId_date: { userId: USER_ID, date: SESSION_DATE } },
  });
  if (existingPlan) {
    console.log(`  Existing plan found (${existingPlan.id}) — deleting.`);
    await db.workoutPlan.delete({ where: { id: existingPlan.id } });
  }
  const plan = await db.workoutPlan.create({
    data: { userId: USER_ID, date: SESSION_DATE, templateId: template.id },
  });
  console.log(`  WorkoutPlan created: ${plan.id} → date: ${plan.date.toISOString().slice(0,10)}`);

  // 4. Summary
  console.log("\n=== DONE ===");
  console.log(`Template ID  : ${template.id}`);
  console.log(`Plan ID      : ${plan.id}`);
  console.log(`Date         : 2026-11-09`);
  console.log(`Exercises    : ${template.exercises.length} linked`);
  console.log(`Notes stored in template name + plan — open /workout in the app to verify.`);
}

main()
  .catch((e) => { console.error("FAILED:", e); process.exit(1); })
  .finally(() => db.$disconnect());
