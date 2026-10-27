import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { toCsv } from "@/lib/csv";

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const auth = await getSession();
  if (!auth) {
    return new Response("Unauthorized", { status: 401 });
  }

  const entries = await prisma.foodEntry.findMany({
    where: { userId: auth.userId },
    include: { food: true },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const headers = [
    "date",
    "meal",
    "food_en",
    "food_ru",
    "grams",
    "kcal",
    "protein_g",
    "carbs_g",
    "fat_g",
  ];
  const rows = entries.map((e) => {
    const factor = e.grams / 100;
    const kcal = Math.round(e.food.caloriesPer100g * factor);
    const protein = e.food.proteinPer100g
      ? Math.round(e.food.proteinPer100g * factor * 10) / 10
      : "";
    const carbs = e.food.carbsPer100g
      ? Math.round(e.food.carbsPer100g * factor * 10) / 10
      : "";
    const fat = e.food.fatPer100g
      ? Math.round(e.food.fatPer100g * factor * 10) / 10
      : "";
    return [
      formatDate(e.date),
      e.meal ?? "",
      e.food.nameEn,
      e.food.nameRu ?? "",
      e.grams,
      kcal,
      protein,
      carbs,
      fat,
    ];
  });

  const csv = toCsv(headers, rows);
  const filename = `food-${new Date().toISOString().slice(0, 10)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
