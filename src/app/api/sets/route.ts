import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, exerciseId, reps, weight } = await request.json();

    if (!sessionId || !exerciseId || reps === undefined || weight === undefined) {
      return NextResponse.json(
        { error: "Session ID, exercise ID, reps, and weight are required" },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user
    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id: sessionId,
        userId: session.userId,
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Verify the exercise exists and is accessible
    const exercise = await prisma.exercise.findFirst({
      where: {
        id: exerciseId,
        OR: [{ userId: null }, { userId: session.userId }],
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // Get the next set number for this exercise in this session
    const existingSets = await prisma.workoutSet.count({
      where: {
        sessionId,
        exerciseId,
      },
    });

    const set = await prisma.workoutSet.create({
      data: {
        sessionId,
        exerciseId,
        setNumber: existingSets + 1,
        reps,
        weight,
      },
      include: {
        exercise: true,
      },
    });

    return NextResponse.json(set, { status: 201 });
  } catch (error) {
    console.error("Create set error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
