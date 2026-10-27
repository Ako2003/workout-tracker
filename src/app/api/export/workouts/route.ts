import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await getSession();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessions = await prisma.workoutSession.findMany({
    where: { userId: auth.userId },
    include: {
      sets: {
        include: { exercise: true },
        orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
      },
      run: true,
    },
    orderBy: { date: "asc" },
  });

  const headers = [
    "date",
    "exercise",
    "muscle_group",
    "set_number",
    "reps",
    "weight_kg",
    "notes",
    "run_distance_m",
    "run_duration_s",
    "run_kcal",
    "run_notes",
  ];
  const rows: unknown[][] = [];

  for (const s of sessions) {
    const d = formatDate(s.date);
    if (s.sets.length === 0 && !s.run) {
      rows.push([d, "", "", "", "", "", "", "", "", "", ""]);
      continue;
    }
    for (const set of s.sets) {
      rows.push([
        d,
        set.exercise.name,
        set.exercise.muscleGroup,
        set.setNumber,
        set.reps,
        set.weight,
        set.notes ?? "",
        "",
        "",
        "",
        "",
      ]);
    }
    if (s.run) {
      rows.push([
        d,
        "RUN",
        "CARDIO",
        "",
        "",
        "",
        "",
        s.run.distanceMeters,
        s.run.durationSeconds,
        s.run.caloriesBurned ?? "",
        s.run.notes ?? "",
      ]);
    }
  }

  const csv = toCsv(headers, rows);
  const filename = `workouts-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
