import { PrismaClient, MuscleGroup } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

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

  // Delete existing preset exercises and recreate them
  await prisma.exercise.deleteMany({
    where: { isCustom: false, userId: null },
  });

  const exercisesToCreate = Object.entries(PRESET_EXERCISES).flatMap(
    ([muscleGroup, exercises]) =>
      exercises.map((name) => ({
        name,
        muscleGroup: muscleGroup as MuscleGroup,
        isCustom: false,
        userId: null,
      }))
  );

  await prisma.exercise.createMany({
    data: exercisesToCreate,
  });

  console.log(`Created ${exercisesToCreate.length} preset exercises`);
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
