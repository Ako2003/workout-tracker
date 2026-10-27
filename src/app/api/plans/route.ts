import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function toDate(value: string): Date {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function GET(request: Request) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: {
      userId: string;
      date?: { gte?: Date; lte?: Date };
    } = { userId: auth.userId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = toDate(from);
      if (to) where.date.lte = toDate(to);
    }

    const plans = await prisma.workoutPlan.findMany({
      where,
      include: {
        template: {
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { order: "asc" },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error("Get plans error:", error);
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
    const { date, templateId } = await request.json();
    if (!date || !templateId) {
      return NextResponse.json(
        { error: "date and templateId are required" },
        { status: 400 }
      );
    }

    // Verify template is accessible
    const template = await prisma.workoutTemplate.findFirst({
      where: { id: templateId, OR: [{ userId: null }, { userId: auth.userId }] },
    });
    if (!template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    const d = toDate(date);
    const plan = await prisma.workoutPlan.upsert({
      where: { userId_date: { userId: auth.userId, date: d } },
      update: { templateId },
      create: { userId: auth.userId, date: d, templateId },
      include: { template: true },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Create plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }
    await prisma.workoutPlan.deleteMany({
      where: { userId: auth.userId, date: toDate(date) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
