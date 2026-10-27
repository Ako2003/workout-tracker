import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;

    const body = await request.json().catch(() => ({}));
    const date = body?.date ? new Date(body.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const template = await prisma.workoutTemplate.findFirst({
      where: { id, OR: [{ userId: null }, { userId: auth.userId }] },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const session = await prisma.workoutSession.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      update: {},
      create: { userId: auth.userId, date },
    });

    const existing = await prisma.workoutSet.findMany({
      where: { sessionId: session.id },
      select: { exerciseId: true, setNumber: true },
    });
    const exerciseIdsInSession = new Set(existing.map((s) => s.exerciseId));

    // For every template exercise not yet in the session, add one empty set.
    // Preserves user-added sets and never duplicates exercises.
    const toCreate = template.exercises
      .filter((e) => !exerciseIdsInSession.has(e.exerciseId))
      .map((e) => ({
        sessionId: session.id,
        exerciseId: e.exerciseId,
        setNumber: 1,
        reps: 0,
        weight: 0,
      }));

    if (toCreate.length > 0) {
      await prisma.workoutSet.createMany({ data: toCreate });
    }

    // Record the plan so the weekly calendar reflects it.
    await prisma.workoutPlan.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      update: { templateId: template.id },
      create: { userId: auth.userId, date, templateId: template.id },
    });

    return NextResponse.json({ sessionId: session.id, added: toCreate.length });
  } catch (error) {
    console.error("Start template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
