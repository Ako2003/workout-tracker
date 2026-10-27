import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const foods = await prisma.food.findMany({
      where: { OR: [{ userId: null }, { userId: auth.userId }] },
      orderBy: [{ isCustom: "desc" }, { nameEn: "asc" }],
    });

    return NextResponse.json(foods);
  } catch (error) {
    console.error("Get foods error:", error);
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

    const body = await request.json();
    const {
      nameEn,
      nameRu,
      caloriesPer100g,
      proteinPer100g,
      carbsPer100g,
      fatPer100g,
    } = body;

    if (!nameEn || typeof nameEn !== "string" || !nameEn.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (caloriesPer100g == null || Number.isNaN(Number(caloriesPer100g))) {
      return NextResponse.json(
        { error: "Calories per 100g is required" },
        { status: 400 }
      );
    }

    const food = await prisma.food.create({
      data: {
        nameEn: nameEn.trim(),
        nameRu: nameRu?.trim() || null,
        caloriesPer100g: Number(caloriesPer100g),
        proteinPer100g:
          proteinPer100g != null && proteinPer100g !== ""
            ? Number(proteinPer100g)
            : null,
        carbsPer100g:
          carbsPer100g != null && carbsPer100g !== ""
            ? Number(carbsPer100g)
            : null,
        fatPer100g:
          fatPer100g != null && fatPer100g !== "" ? Number(fatPer100g) : null,
        isCustom: true,
        userId: auth.userId,
      },
    });

    return NextResponse.json(food, { status: 201 });
  } catch (error) {
    console.error("Create food error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
