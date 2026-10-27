import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

async function assertOwnedSession(id: string, userId: string) {
  return prisma.workoutSession.findFirst({
    where: { id, userId },
    select: { id: true },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const owned = await assertOwnedSession(id, auth.userId);
    if (!owned) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const body = await request.json();
    const distanceMeters = Math.max(0, Math.round(Number(body.distanceMeters)));
    const durationSeconds = Math.max(
      0,
      Math.round(Number(body.durationSeconds))
    );
    const caloriesBurned =
      body.caloriesBurned != null && body.caloriesBurned !== ""
        ? Math.max(0, Math.round(Number(body.caloriesBurned)))
        : null;
    const notes = body.notes?.toString()?.trim() || null;

    if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds)) {
      return NextResponse.json(
        { error: "Invalid distance or duration" },
        { status: 400 }
      );
    }

    const run = await prisma.runEntry.upsert({
      where: { sessionId: id },
      update: { distanceMeters, durationSeconds, caloriesBurned, notes },
      create: {
        sessionId: id,
        distanceMeters,
        durationSeconds,
        caloriesBurned,
        notes,
      },
    });

    return NextResponse.json(run);
  } catch (error) {
    console.error("Upsert run error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const owned = await assertOwnedSession(id, auth.userId);
    if (!owned) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    await prisma.runEntry
      .delete({ where: { sessionId: id } })
      .catch(() => null);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete run error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
