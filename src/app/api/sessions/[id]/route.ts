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

    const { id } = await params;

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      include: {
        sets: {
          include: { exercise: true },
          orderBy: [{ exerciseId: "asc" }, { setNumber: "asc" }],
        },
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
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
      ...workoutSession,
      exercises,
    });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { notes } = await request.json();

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const updated = await prisma.workoutSession.update({
      where: { id },
      data: { notes },
      include: {
        sets: {
          include: { exercise: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const workoutSession = await prisma.workoutSession.findFirst({
      where: {
        id,
        userId: session.userId,
      },
    });

    if (!workoutSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.workoutSession.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
