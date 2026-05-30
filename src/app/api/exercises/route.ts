import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { MuscleGroup } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const muscle = searchParams.get("muscle") as MuscleGroup | null;

    const exercises = await prisma.exercise.findMany({
      where: {
        OR: [
          { userId: null }, // Preset exercises
          { userId: session.userId }, // User's custom exercises
        ],
        ...(muscle && { muscleGroup: muscle }),
      },
      orderBy: [{ isCustom: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Get exercises error:", error);
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

    const { name, muscleGroup } = await request.json();

    if (!name || !muscleGroup) {
      return NextResponse.json(
        { error: "Name and muscle group are required" },
        { status: 400 }
      );
    }

    if (!Object.values(MuscleGroup).includes(muscleGroup)) {
      return NextResponse.json(
        { error: "Invalid muscle group" },
        { status: 400 }
      );
    }

    // Check if exercise with same name exists for this user
    const existing = await prisma.exercise.findFirst({
      where: {
        name,
        userId: session.userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Exercise with this name already exists" },
        { status: 409 }
      );
    }

    const exercise = await prisma.exercise.create({
      data: {
        name,
        muscleGroup,
        isCustom: true,
        userId: session.userId,
      },
    });

    return NextResponse.json(exercise, { status: 201 });
  } catch (error) {
    console.error("Create exercise error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
