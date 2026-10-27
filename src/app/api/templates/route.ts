import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.workoutTemplate.findMany({
      where: { OR: [{ userId: null }, { userId: auth.userId }] },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ isCustom: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error("Get templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, exerciseIds } = await request.json();
    if (!name?.trim() || !Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return NextResponse.json(
        { error: "Name and at least one exercise are required" },
        { status: 400 }
      );
    }

    const template = await prisma.workoutTemplate.create({
      data: {
        name: name.trim(),
        isCustom: true,
        userId: auth.userId,
        exercises: {
          create: exerciseIds.map((exerciseId: string, i: number) => ({
            exerciseId,
            order: i,
          })),
        },
      },
      include: {
        exercises: {
          include: { exercise: true },
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("Create template error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
