import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");

    const [sessions, total] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId: session.userId },
        include: {
          sets: {
            include: { exercise: true },
          },
        },
        orderBy: { date: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.workoutSession.count({
        where: { userId: session.userId },
      }),
    ]);

    // Calculate stats for each session
    const sessionsWithStats = sessions.map((s) => {
      const exercises = [...new Set(s.sets.map((set) => set.exerciseId))];
      const totalVolume = s.sets.reduce(
        (sum, set) => sum + set.reps * set.weight,
        0
      );
      const totalSets = s.sets.length;

      return {
        ...s,
        exerciseCount: exercises.length,
        totalVolume,
        totalSets,
      };
    });

    return NextResponse.json({
      sessions: sessionsWithStats,
      total,
      hasMore: offset + limit < total,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, notes } = await request.json();
    const sessionDate = date ? new Date(date) : new Date();

    // Normalize to start of day
    sessionDate.setHours(0, 0, 0, 0);

    // Check if session already exists for this date
    const existing = await prisma.workoutSession.findFirst({
      where: {
        userId: session.userId,
        date: sessionDate,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Session already exists for this date", session: existing },
        { status: 409 }
      );
    }

    const workoutSession = await prisma.workoutSession.create({
      data: {
        userId: session.userId,
        date: sessionDate,
        notes,
      },
      include: {
        sets: {
          include: { exercise: true },
        },
      },
    });

    return NextResponse.json(workoutSession, { status: 201 });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
