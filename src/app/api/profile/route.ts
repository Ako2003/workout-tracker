import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.userProfile.findUnique({
      where: { userId: auth.userId },
    });

    return NextResponse.json(
      profile ?? {
        userId: auth.userId,
        kcalGoal: null,
        proteinGoal: null,
        carbsGoal: null,
        fatGoal: null,
        waterGoalMl: null,
        bodyweightGoalKg: null,
        heightCm: null,
        age: null,
        sex: null,
        activityLevel: null,
      }
    );
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function toIntOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : null;
}

function toFloatOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function PUT(request: Request) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const SEX_VALUES = ["MALE", "FEMALE"] as const;
    const ACTIVITY_VALUES = [
      "SEDENTARY",
      "LIGHT",
      "MODERATE",
      "VERY_ACTIVE",
      "EXTRA_ACTIVE",
    ] as const;
    const data = {
      kcalGoal: toIntOrNull(body.kcalGoal),
      proteinGoal: toIntOrNull(body.proteinGoal),
      carbsGoal: toIntOrNull(body.carbsGoal),
      fatGoal: toIntOrNull(body.fatGoal),
      waterGoalMl: toIntOrNull(body.waterGoalMl),
      bodyweightGoalKg: toFloatOrNull(body.bodyweightGoalKg),
      heightCm: toIntOrNull(body.heightCm),
      age: toIntOrNull(body.age),
      sex: SEX_VALUES.includes(body.sex) ? body.sex : null,
      activityLevel: ACTIVITY_VALUES.includes(body.activityLevel)
        ? body.activityLevel
        : null,
    };

    const profile = await prisma.userProfile.upsert({
      where: { userId: auth.userId },
      update: data,
      create: { userId: auth.userId, ...data },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
