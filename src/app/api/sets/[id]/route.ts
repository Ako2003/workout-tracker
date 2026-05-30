import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

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
    const { reps, weight } = await request.json();

    // Verify the set belongs to user's session
    const set = await prisma.workoutSet.findFirst({
      where: { id },
      include: {
        session: true,
      },
    });

    if (!set || set.session.userId !== session.userId) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    const updated = await prisma.workoutSet.update({
      where: { id },
      data: {
        ...(reps !== undefined && { reps }),
        ...(weight !== undefined && { weight }),
      },
      include: {
        exercise: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update set error:", error);
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

    // Verify the set belongs to user's session
    const set = await prisma.workoutSet.findFirst({
      where: { id },
      include: {
        session: true,
      },
    });

    if (!set || set.session.userId !== session.userId) {
      return NextResponse.json({ error: "Set not found" }, { status: 404 });
    }

    await prisma.workoutSet.delete({ where: { id } });

    // Renumber remaining sets for this exercise
    const remainingSets = await prisma.workoutSet.findMany({
      where: {
        sessionId: set.sessionId,
        exerciseId: set.exerciseId,
      },
      orderBy: { setNumber: "asc" },
    });

    for (let i = 0; i < remainingSets.length; i++) {
      if (remainingSets[i].setNumber !== i + 1) {
        await prisma.workoutSet.update({
          where: { id: remainingSets[i].id },
          data: { setNumber: i + 1 },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete set error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
