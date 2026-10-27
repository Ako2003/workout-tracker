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
      include: {
        ingredients: {
          include: { food: true },
          orderBy: { order: "asc" },
        },
      },
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

function toNumOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

interface RecipeIngredientInput {
  foodId: string;
  grams: number;
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
      servingSizeG,
      servingLabel,
      isRecipe,
      recipeTotalGrams,
      ingredients,
    } = body as {
      nameEn?: string;
      nameRu?: string;
      servingSizeG?: unknown;
      servingLabel?: string;
      isRecipe?: boolean;
      recipeTotalGrams?: unknown;
      ingredients?: RecipeIngredientInput[];
    };

    if (!nameEn || typeof nameEn !== "string" || !nameEn.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    if (isRecipe) {
      // Compound-meal path: derive per-100g values from ingredients.
      const total = toNumOrNull(recipeTotalGrams);
      if (!total || total <= 0) {
        return NextResponse.json(
          { error: "recipeTotalGrams must be > 0" },
          { status: 400 }
        );
      }
      if (!Array.isArray(ingredients) || ingredients.length === 0) {
        return NextResponse.json(
          { error: "At least one ingredient is required" },
          { status: 400 }
        );
      }

      const foodIds = ingredients.map((i) => i.foodId).filter(Boolean);
      const foods = await prisma.food.findMany({
        where: {
          id: { in: foodIds },
          OR: [{ userId: null }, { userId: auth.userId }],
        },
      });
      const foodById = new Map(foods.map((f) => [f.id, f]));
      if (foodById.size !== foodIds.length) {
        return NextResponse.json(
          { error: "Some ingredients are not accessible" },
          { status: 400 }
        );
      }

      let totalKcal = 0;
      let totalP = 0;
      let totalC = 0;
      let totalF = 0;
      for (const ing of ingredients) {
        const f = foodById.get(ing.foodId)!;
        const factor = Number(ing.grams) / 100;
        if (!Number.isFinite(factor) || factor <= 0) {
          return NextResponse.json(
            { error: "Ingredient grams must be > 0" },
            { status: 400 }
          );
        }
        totalKcal += f.caloriesPer100g * factor;
        totalP += (f.proteinPer100g ?? 0) * factor;
        totalC += (f.carbsPer100g ?? 0) * factor;
        totalF += (f.fatPer100g ?? 0) * factor;
      }

      const per100 = (v: number) => Math.round((v / total) * 100 * 10) / 10;

      const food = await prisma.food.create({
        data: {
          nameEn: nameEn.trim(),
          nameRu: nameRu?.trim() || null,
          caloriesPer100g: per100(totalKcal),
          proteinPer100g: per100(totalP),
          carbsPer100g: per100(totalC),
          fatPer100g: per100(totalF),
          servingSizeG: toNumOrNull(servingSizeG),
          servingLabel: servingLabel?.trim() || null,
          isRecipe: true,
          recipeTotalGrams: total,
          isCustom: true,
          userId: auth.userId,
          ingredients: {
            create: ingredients.map((ing, i) => ({
              foodId: ing.foodId,
              grams: Number(ing.grams),
              order: i,
            })),
          },
        },
        include: {
          ingredients: {
            include: { food: true },
            orderBy: { order: "asc" },
          },
        },
      });

      return NextResponse.json(food, { status: 201 });
    }

    // Plain food
    const caloriesPer100g = toNumOrNull(body.caloriesPer100g);
    if (caloriesPer100g == null) {
      return NextResponse.json(
        { error: "Calories per 100g is required" },
        { status: 400 }
      );
    }

    const food = await prisma.food.create({
      data: {
        nameEn: nameEn.trim(),
        nameRu: nameRu?.trim() || null,
        caloriesPer100g,
        proteinPer100g: toNumOrNull(body.proteinPer100g),
        carbsPer100g: toNumOrNull(body.carbsPer100g),
        fatPer100g: toNumOrNull(body.fatPer100g),
        servingSizeG: toNumOrNull(servingSizeG),
        servingLabel: servingLabel?.trim() || null,
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
