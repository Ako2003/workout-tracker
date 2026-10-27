import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workoutSession = await prisma.workoutSession.findFirst({
      where: { id, userId: auth.userId },
      select: { id: true, date: true, sets: { select: { exerciseId: true } } },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const exerciseIds = Array.from(
      new Set(workoutSession.sets.map((s) => s.exerciseId))
    );

    if (exerciseIds.length === 0) {
      return NextResponse.json({ byExerciseId: {} });
    }

    // Pull all historical sets for the exercises in this session in one query.
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId: { in: exerciseIds },
        session: { userId: auth.userId },
      },
      include: { session: { select: { id: true, date: true } } },
      orderBy: { session: { date: "desc" } },
    });

    const sessionDate = new Date(workoutSession.date);
    sessionDate.setHours(0, 0, 0, 0);

    const byExerciseId: Record<
      string,
      {
        lastPerformance: {
          date: string;
          sets: { setNumber: number; reps: number; weight: number }[];
          maxWeight: number;
          totalVolume: number;
        } | null;
        personalRecord: { weight: number; reps: number; date: string } | null;
      }
    > = {};

    for (const exId of exerciseIds) {
      const exerciseSets = sets.filter((s) => s.exerciseId === exId);
      if (exerciseSets.length === 0) {
        byExerciseId[exId] = { lastPerformance: null, personalRecord: null };
        continue;
      }

      // Last performance: most recent session that is strictly before the
      // current session date (so this workout doesn't suggest off itself).
      const pastSets = exerciseSets.filter((s) => {
        const d = new Date(s.session.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < sessionDate.getTime();
      });

      let lastPerformance = null as (typeof byExerciseId)[string]["lastPerformance"];
      if (pastSets.length > 0) {
        const lastSessionId = pastSets[0].session.id;
        const lastSessionSets = pastSets
          .filter((s) => s.session.id === lastSessionId)
          .sort((a, b) => a.setNumber - b.setNumber);
        lastPerformance = {
          date: pastSets[0].session.date.toISOString(),
          sets: lastSessionSets.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps,
            weight: s.weight,
          })),
          maxWeight: Math.max(...lastSessionSets.map((s) => s.weight)),
          totalVolume: lastSessionSets.reduce(
            (sum, s) => sum + s.reps * s.weight,
            0
          ),
        };
      }

      const prSet = exerciseSets.reduce((best, s) =>
        s.weight > best.weight ? s : best
      );
      const personalRecord = {
        weight: prSet.weight,
        reps: prSet.reps,
        date: prSet.session.date.toISOString(),
      };

      byExerciseId[exId] = { lastPerformance, personalRecord };
    }

    return NextResponse.json({ byExerciseId });
  } catch (error) {
    console.error("Get session history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
