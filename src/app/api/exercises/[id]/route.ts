import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MuscleGroup } from "@prisma/client";

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

    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        OR: [{ userId: null }, { userId: session.userId }],
      },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Get exercise error:", error);
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
    const { name, muscleGroup } = await request.json();

    // Check if it's the user's custom exercise
    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        userId: session.userId,
        isCustom: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found or cannot be edited" },
        { status: 404 }
      );
    }

    if (muscleGroup && !Object.values(MuscleGroup).includes(muscleGroup)) {
      return NextResponse.json(
        { error: "Invalid muscle group" },
        { status: 400 }
      );
    }

    const updated = await prisma.exercise.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(muscleGroup && { muscleGroup }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update exercise error:", error);
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

    // Check if it's the user's custom exercise
    const exercise = await prisma.exercise.findFirst({
      where: {
        id,
        userId: session.userId,
        isCustom: true,
      },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found or cannot be deleted" },
        { status: 404 }
      );
    }

    await prisma.exercise.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete exercise error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
