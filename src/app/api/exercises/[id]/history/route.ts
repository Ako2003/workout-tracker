import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: exerciseId } = await params;

    // Get all sets for this exercise, ordered by date descending
    const sets = await prisma.workoutSet.findMany({
      where: {
        exerciseId,
        session: {
          userId: session.userId,
        },
      },
      include: {
        session: true,
      },
      orderBy: {
        session: { date: "desc" },
      },
    });

    if (sets.length === 0) {
      return NextResponse.json({
        lastPerformance: null,
        personalRecord: null,
        totalSessions: 0,
      });
    }

    // Find the most recent session with this exercise (excluding today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastSets = sets.filter((s) => {
      const setDate = new Date(s.session.date);
      setDate.setHours(0, 0, 0, 0);
      return setDate.getTime() < today.getTime();
    });

    // Group past sets by session to get last performance
    let lastPerformance = null;
    if (pastSets.length > 0) {
      const lastSessionId = pastSets[0].sessionId;
      const lastSessionSets = pastSets.filter((s) => s.sessionId === lastSessionId);
      const lastSessionDate = pastSets[0].session.date;

      lastPerformance = {
        date: lastSessionDate,
        sets: lastSessionSets.map((s) => ({
          setNumber: s.setNumber,
          reps: s.reps,
          weight: s.weight,
        })),
        maxWeight: Math.max(...lastSessionSets.map((s) => s.weight)),
        totalVolume: lastSessionSets.reduce((sum, s) => sum + s.reps * s.weight, 0),
      };
    }

    // Calculate personal record (highest weight ever lifted for any reps)
    const allWeights = sets.map((s) => s.weight);
    const prWeight = Math.max(...allWeights);
    const prSet = sets.find((s) => s.weight === prWeight);

    const personalRecord = prSet
      ? {
          weight: prWeight,
          reps: prSet.reps,
          date: prSet.session.date,
        }
      : null;

    // Count unique sessions
    const uniqueSessions = new Set(sets.map((s) => s.sessionId));

    return NextResponse.json({
      lastPerformance,
      personalRecord,
      totalSessions: uniqueSessions.size,
    });
  } catch (error) {
    console.error("Get exercise history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
