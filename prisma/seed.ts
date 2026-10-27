import { PrismaClient, MuscleGroup } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PRESET_TEMPLATES: Array<{ slug: string; name: string; exercises: string[] }> = [
  {
    slug: "push",
    name: "Push",
    exercises: [
      "Bench Press",
      "Incline Dumbbell Press",
      "Overhead Press",
      "Lateral Raise",
      "Tricep Pushdown",
      "Skull Crushers",
    ],
  },
  {
    slug: "pull",
    name: "Pull",
    exercises: [
      "Deadlift",
      "Pull-ups",
      "Barbell Row",
      "Lat Pulldown",
      "Face Pulls",
      "Barbell Curl",
      "Hammer Curl",
    ],
  },
  {
    slug: "legs",
    name: "Legs",
    exercises: [
      "Squat",
      "Romanian Deadlift",
      "Leg Press",
      "Leg Curl",
      "Leg Extension",
      "Calf Raise",
    ],
  },
  {
    slug: "upper",
    name: "Upper",
    exercises: [
      "Bench Press",
      "Barbell Row",
      "Overhead Press",
      "Pull-ups",
      "Lateral Raise",
      "Barbell Curl",
      "Tricep Pushdown",
    ],
  },
  {
    slug: "lower",
    name: "Lower",
    exercises: [
      "Squat",
      "Romanian Deadlift",
      "Lunges",
      "Leg Curl",
      "Leg Extension",
      "Calf Raise",
    ],
  },
  {
    slug: "full-body",
    name: "Full Body",
    exercises: [
      "Squat",
      "Bench Press",
      "Barbell Row",
      "Overhead Press",
      "Deadlift",
    ],
  },
  {
    slug: "bro-chest",
    name: "Chest Day",
    exercises: [
      "Bench Press",
      "Incline Bench Press",
      "Dumbbell Flyes",
      "Cable Crossover",
      "Push-ups",
    ],
  },
  {
    slug: "bro-back",
    name: "Back Day",
    exercises: [
      "Pull-ups",
      "Lat Pulldown",
      "Barbell Row",
      "Seated Cable Row",
      "Deadlift",
    ],
  },
  {
    slug: "bro-shoulders",
    name: "Shoulder Day",
    exercises: [
      "Overhead Press",
      "Lateral Raise",
      "Front Raise",
      "Rear Delt Fly",
      "Shrugs",
    ],
  },
  {
    slug: "bro-arms",
    name: "Arm Day",
    exercises: [
      "Barbell Curl",
      "Dumbbell Curl",
      "Hammer Curl",
      "Tricep Pushdown",
      "Skull Crushers",
      "Dips",
    ],
  },
  {
    slug: "bro-legs",
    name: "Leg Day",
    exercises: [
      "Squat",
      "Leg Press",
      "Romanian Deadlift",
      "Leg Curl",
      "Leg Extension",
      "Calf Raise",
    ],
  },
];

const PRESET_FOODS: Array<{
  nameEn: string;
  nameRu: string;
  caloriesPer100g: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
}> = [
  { nameEn: "Chicken breast", nameRu: "Куриная грудка", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatPer100g: 3.6 },
  { nameEn: "Chicken thigh", nameRu: "Куриное бедро", caloriesPer100g: 209, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 11 },
  { nameEn: "Lean beef", nameRu: "Говядина (постная)", caloriesPer100g: 217, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 12 },
  { nameEn: "Salmon", nameRu: "Лосось", caloriesPer100g: 208, proteinPer100g: 20, carbsPer100g: 0, fatPer100g: 13 },
  { nameEn: "Tuna (canned in water)", nameRu: "Тунец (в собственном соку)", caloriesPer100g: 116, proteinPer100g: 26, carbsPer100g: 0, fatPer100g: 1 },
  { nameEn: "Egg", nameRu: "Яйцо", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatPer100g: 11 },
  { nameEn: "Egg white", nameRu: "Яичный белок", caloriesPer100g: 52, proteinPer100g: 11, carbsPer100g: 0.7, fatPer100g: 0.2 },
  { nameEn: "White rice (cooked)", nameRu: "Белый рис (варёный)", caloriesPer100g: 130, proteinPer100g: 2.7, carbsPer100g: 28, fatPer100g: 0.3 },
  { nameEn: "Brown rice (cooked)", nameRu: "Бурый рис (варёный)", caloriesPer100g: 112, proteinPer100g: 2.6, carbsPer100g: 23, fatPer100g: 0.9 },
  { nameEn: "Buckwheat (cooked)", nameRu: "Гречка (варёная)", caloriesPer100g: 110, proteinPer100g: 4, carbsPer100g: 20, fatPer100g: 1.1 },
  { nameEn: "Oats (dry)", nameRu: "Овсянка (сухая)", caloriesPer100g: 389, proteinPer100g: 17, carbsPer100g: 66, fatPer100g: 7 },
  { nameEn: "Pasta (cooked)", nameRu: "Макароны (варёные)", caloriesPer100g: 157, proteinPer100g: 5.8, carbsPer100g: 31, fatPer100g: 0.9 },
  { nameEn: "Potato (boiled)", nameRu: "Картофель (варёный)", caloriesPer100g: 87, proteinPer100g: 1.9, carbsPer100g: 20, fatPer100g: 0.1 },
  { nameEn: "Sweet potato", nameRu: "Батат", caloriesPer100g: 86, proteinPer100g: 1.6, carbsPer100g: 20, fatPer100g: 0.1 },
  { nameEn: "Bread (white)", nameRu: "Хлеб (белый)", caloriesPer100g: 265, proteinPer100g: 9, carbsPer100g: 49, fatPer100g: 3.2 },
  { nameEn: "Banana", nameRu: "Банан", caloriesPer100g: 89, proteinPer100g: 1.1, carbsPer100g: 23, fatPer100g: 0.3 },
  { nameEn: "Apple", nameRu: "Яблоко", caloriesPer100g: 52, proteinPer100g: 0.3, carbsPer100g: 14, fatPer100g: 0.2 },
  { nameEn: "Orange", nameRu: "Апельсин", caloriesPer100g: 47, proteinPer100g: 0.9, carbsPer100g: 12, fatPer100g: 0.1 },
  { nameEn: "Strawberry", nameRu: "Клубника", caloriesPer100g: 32, proteinPer100g: 0.7, carbsPer100g: 7.7, fatPer100g: 0.3 },
  { nameEn: "Milk (2%)", nameRu: "Молоко 2%", caloriesPer100g: 50, proteinPer100g: 3.3, carbsPer100g: 5, fatPer100g: 2 },
  { nameEn: "Greek yogurt", nameRu: "Греческий йогурт", caloriesPer100g: 59, proteinPer100g: 10, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { nameEn: "Cottage cheese", nameRu: "Творог", caloriesPer100g: 98, proteinPer100g: 11, carbsPer100g: 3.4, fatPer100g: 4.3 },
  { nameEn: "Cheese", nameRu: "Сыр", caloriesPer100g: 402, proteinPer100g: 25, carbsPer100g: 1.3, fatPer100g: 33 },
  { nameEn: "Olive oil", nameRu: "Оливковое масло", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatPer100g: 100 },
  { nameEn: "Peanut butter", nameRu: "Арахисовая паста", caloriesPer100g: 588, proteinPer100g: 25, carbsPer100g: 20, fatPer100g: 50 },
  { nameEn: "Almonds", nameRu: "Миндаль", caloriesPer100g: 579, proteinPer100g: 21, carbsPer100g: 22, fatPer100g: 50 },
  { nameEn: "Walnuts", nameRu: "Грецкий орех", caloriesPer100g: 654, proteinPer100g: 15, carbsPer100g: 14, fatPer100g: 65 },
  { nameEn: "Broccoli", nameRu: "Брокколи", caloriesPer100g: 34, proteinPer100g: 2.8, carbsPer100g: 7, fatPer100g: 0.4 },
  { nameEn: "Spinach", nameRu: "Шпинат", caloriesPer100g: 23, proteinPer100g: 2.9, carbsPer100g: 3.6, fatPer100g: 0.4 },
  { nameEn: "Carrot", nameRu: "Морковь", caloriesPer100g: 41, proteinPer100g: 0.9, carbsPer100g: 10, fatPer100g: 0.2 },
  { nameEn: "Cucumber", nameRu: "Огурец", caloriesPer100g: 15, proteinPer100g: 0.7, carbsPer100g: 3.6, fatPer100g: 0.1 },
  { nameEn: "Tomato", nameRu: "Помидор", caloriesPer100g: 18, proteinPer100g: 0.9, carbsPer100g: 3.9, fatPer100g: 0.2 },
  { nameEn: "Avocado", nameRu: "Авокадо", caloriesPer100g: 160, proteinPer100g: 2, carbsPer100g: 9, fatPer100g: 15 },
  { nameEn: "Whey protein", nameRu: "Протеин (сывороточный)", caloriesPer100g: 400, proteinPer100g: 80, carbsPer100g: 7, fatPer100g: 5 },
  { nameEn: "Dark chocolate (85%)", nameRu: "Тёмный шоколад (85%)", caloriesPer100g: 598, proteinPer100g: 7.8, carbsPer100g: 46, fatPer100g: 43 },
  { nameEn: "Honey", nameRu: "Мёд", caloriesPer100g: 304, proteinPer100g: 0.3, carbsPer100g: 82, fatPer100g: 0 },
];

const PRESET_EXERCISES: Record<MuscleGroup, string[]> = {
  [MuscleGroup.BICEPS]: [
    "Barbell Curl",
    "Dumbbell Curl",
    "Hammer Curl",
    "Preacher Curl",
    "Concentration Curl",
    "Cable Curl",
    "Incline Dumbbell Curl",
    "EZ Bar Curl",
  ],
  [MuscleGroup.TRICEPS]: [
    "Tricep Pushdown",
    "Skull Crushers",
    "Overhead Tricep Extension",
    "Dips",
    "Close-Grip Bench Press",
    "Diamond Push-ups",
    "Tricep Kickbacks",
    "Cable Overhead Extension",
  ],
  [MuscleGroup.CHEST]: [
    "Bench Press",
    "Incline Bench Press",
    "Decline Bench Press",
    "Dumbbell Flyes",
    "Cable Crossover",
    "Push-ups",
    "Chest Press Machine",
    "Incline Dumbbell Press",
    "Dumbbell Bench Press",
  ],
  [MuscleGroup.BACK]: [
    "Pull-ups",
    "Lat Pulldown",
    "Barbell Row",
    "Dumbbell Row",
    "Seated Cable Row",
    "T-Bar Row",
    "Face Pulls",
    "Deadlift",
    "Chin-ups",
  ],
  [MuscleGroup.SHOULDERS]: [
    "Overhead Press",
    "Lateral Raise",
    "Front Raise",
    "Rear Delt Fly",
    "Arnold Press",
    "Upright Row",
    "Shrugs",
    "Military Press",
    "Dumbbell Shoulder Press",
  ],
  [MuscleGroup.LEGS]: [
    "Squat",
    "Leg Press",
    "Romanian Deadlift",
    "Leg Curl",
    "Leg Extension",
    "Lunges",
    "Bulgarian Split Squat",
    "Calf Raise",
    "Hip Thrust",
    "Goblet Squat",
  ],
  [MuscleGroup.CORE]: [
    "Plank",
    "Crunches",
    "Russian Twist",
    "Leg Raise",
    "Ab Wheel Rollout",
    "Cable Crunch",
    "Dead Bug",
    "Mountain Climbers",
    "Bicycle Crunches",
  ],
};

async function main() {
  console.log("Starting database seeding...");

  // Create user with hashed password
  const password = process.env.SEED_PASSWORD || "changeme123";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { id: "main-user" },
    update: { passwordHash },
    create: {
      id: "main-user",
      passwordHash,
    },
  });

  console.log(`User created/updated: ${user.id}`);

  // Preset exercises — reconcile by name (userId=null is treated as DISTINCT by
  // Postgres unique indexes, so we can't rely on upsert against the compound
  // unique. Match by name manually and update-or-create.) Nothing is deleted,
  // so historical WorkoutSets referencing a preset exercise stay intact.
  const existingPresetExercises = await prisma.exercise.findMany({
    where: { isCustom: false, userId: null },
    select: { id: true, name: true, muscleGroup: true },
  });
  const existingExerciseByName = new Map(
    existingPresetExercises.map((e) => [e.name, e])
  );

  let exercisesCreated = 0;
  let exercisesUpdated = 0;
  for (const [muscleGroup, exercises] of Object.entries(PRESET_EXERCISES)) {
    for (const name of exercises) {
      const existing = existingExerciseByName.get(name);
      if (!existing) {
        await prisma.exercise.create({
          data: {
            name,
            muscleGroup: muscleGroup as MuscleGroup,
            isCustom: false,
            userId: null,
          },
        });
        exercisesCreated++;
      } else if (existing.muscleGroup !== muscleGroup) {
        await prisma.exercise.update({
          where: { id: existing.id },
          data: { muscleGroup: muscleGroup as MuscleGroup },
        });
        exercisesUpdated++;
      }
    }
  }
  console.log(
    `Preset exercises: ${exercisesCreated} created, ${exercisesUpdated} updated`
  );

  // Preset foods — same reconcile-by-name approach. User-created foods and
  // FoodEntries pointing at the preset catalog are left alone.
  const existingPresetFoods = await prisma.food.findMany({
    where: { isCustom: false, userId: null },
  });
  const existingFoodByName = new Map(
    existingPresetFoods.map((f) => [f.nameEn, f])
  );

  let foodsCreated = 0;
  let foodsUpdated = 0;
  for (const f of PRESET_FOODS) {
    const existing = existingFoodByName.get(f.nameEn);
    const payload = {
      nameRu: f.nameRu,
      caloriesPer100g: f.caloriesPer100g,
      proteinPer100g: f.proteinPer100g ?? null,
      carbsPer100g: f.carbsPer100g ?? null,
      fatPer100g: f.fatPer100g ?? null,
    };
    if (!existing) {
      await prisma.food.create({
        data: {
          nameEn: f.nameEn,
          ...payload,
          isCustom: false,
          userId: null,
        },
      });
      foodsCreated++;
    } else {
      const changed =
        existing.nameRu !== payload.nameRu ||
        existing.caloriesPer100g !== payload.caloriesPer100g ||
        existing.proteinPer100g !== payload.proteinPer100g ||
        existing.carbsPer100g !== payload.carbsPer100g ||
        existing.fatPer100g !== payload.fatPer100g;
      if (changed) {
        await prisma.food.update({
          where: { id: existing.id },
          data: payload,
        });
        foodsUpdated++;
      }
    }
  }
  console.log(
    `Preset foods: ${foodsCreated} created, ${foodsUpdated} updated`
  );

  // Preset workout templates — reconcile by slug. Replaces the exercise list
  // when a template already exists to keep it in sync with this file.
  const allExercises = await prisma.exercise.findMany({
    where: { isCustom: false, userId: null },
    select: { id: true, name: true },
  });
  const exerciseIdByName = new Map(allExercises.map((e) => [e.name, e.id]));

  let templatesCreated = 0;
  let templatesUpdated = 0;
  let templatesSkipped = 0;
  for (const tpl of PRESET_TEMPLATES) {
    const resolved = tpl.exercises
      .map((name, i) => ({ exerciseId: exerciseIdByName.get(name), order: i }))
      .filter(
        (e): e is { exerciseId: string; order: number } =>
          typeof e.exerciseId === "string"
      );
    if (resolved.length === 0) {
      console.warn(`Template "${tpl.name}": no exercises resolved, skipping`);
      templatesSkipped++;
      continue;
    }

    const existing = await prisma.workoutTemplate.findUnique({
      where: { slug: tpl.slug },
      include: { exercises: true },
    });

    if (!existing) {
      await prisma.workoutTemplate.create({
        data: {
          slug: tpl.slug,
          name: tpl.name,
          isCustom: false,
          userId: null,
          exercises: { create: resolved },
        },
      });
      templatesCreated++;
    } else {
      await prisma.workoutTemplateExercise.deleteMany({
        where: { templateId: existing.id },
      });
      await prisma.workoutTemplate.update({
        where: { id: existing.id },
        data: {
          name: tpl.name,
          exercises: { create: resolved },
        },
      });
      templatesUpdated++;
    }
  }
  console.log(
    `Preset templates: ${templatesCreated} created, ${templatesUpdated} updated, ${templatesSkipped} skipped`
  );

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
