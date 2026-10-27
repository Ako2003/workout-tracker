import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function parseDateParam(value: string | null): Date {
  if (!value) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }
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
    const date = parseDateParam(searchParams.get("date"));

    const entries = await prisma.foodEntry.findMany({
      where: { userId: auth.userId, date },
      include: { food: true },
      orderBy: { createdAt: "asc" },
    });

    const totals = entries.reduce(
      (acc, e) => {
        const factor = e.grams / 100;
        acc.calories += e.food.caloriesPer100g * factor;
        if (e.food.proteinPer100g != null)
          acc.protein += e.food.proteinPer100g * factor;
        if (e.food.carbsPer100g != null)
          acc.carbs += e.food.carbsPer100g * factor;
        if (e.food.fatPer100g != null) acc.fat += e.food.fatPer100g * factor;
        acc.grams += e.grams;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, grams: 0 }
    );

    return NextResponse.json({ entries, totals });
  } catch (error) {
    console.error("Get food entries error:", error);
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

    const { foodId, grams, date, meal } = await request.json();
    if (!foodId || grams == null || Number.isNaN(Number(grams))) {
      return NextResponse.json(
        { error: "foodId and grams are required" },
        { status: 400 }
      );
    }

    // Verify the food exists and is accessible to this user
    const food = await prisma.food.findFirst({
      where: { id: foodId, OR: [{ userId: null }, { userId: auth.userId }] },
    });
    if (!food) {
      return NextResponse.json({ error: "Food not found" }, { status: 404 });
    }

    const entryDate = parseDateParam(date);

    const entry = await prisma.foodEntry.create({
      data: {
        userId: auth.userId,
        foodId,
        grams: Number(grams),
        date: entryDate,
        meal: meal || null,
      },
      include: { food: true },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create food entry error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
