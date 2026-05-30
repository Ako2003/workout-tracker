import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        userId: session.userId,
        date: today,
      },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ session: null });
    }

    // Group sets by exercise
    const exerciseMap = new Map<
      string,
      {
        exercise: (typeof workoutSession.sets)[0]["exercise"];
        sets: (typeof workoutSession.sets)[0][];
      }
    >();

    for (const set of workoutSession.sets) {
      const existing = exerciseMap.get(set.exerciseId);
      if (existing) {
        existing.sets.push(set);
      } else {
        exerciseMap.set(set.exerciseId, {
          exercise: set.exercise,
          sets: [set],
        });
      }
    }

    const exercises = Array.from(exerciseMap.values());

    return NextResponse.json({
      session: {
        ...workoutSession,
        exercises,
      },
    });
  } catch (error) {
    console.error("Get today session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Try to find existing session for today
    let workoutSession = await prisma.workoutSession.findFirst({
      where: {
        userId: session.userId,
        date: today,
      },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });

    // If not found, create new one
    if (!workoutSession) {
      workoutSession = await prisma.workoutSession.create({
        data: {
          userId: session.userId,
          date: today,
        },
        include: {
          sets: {
            include: { exercise: true },
          },
        },
      });
    }

    // Group sets by exercise
    const exerciseMap = new Map<
      string,
      {
        exercise: (typeof workoutSession.sets)[0]["exercise"];
        sets: (typeof workoutSession.sets)[0][];
      }
    >();

    for (const set of workoutSession.sets) {
      const existing = exerciseMap.get(set.exerciseId);
      if (existing) {
        existing.sets.push(set);
      } else {
        exerciseMap.set(set.exerciseId, {
          exercise: set.exercise,
          sets: [set],
        });
      }
    }

    const exercises = Array.from(exerciseMap.values());

    return NextResponse.json({
      session: {
        ...workoutSession,
        exercises,
      },
    });
  } catch (error) {
    console.error("Create today session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
