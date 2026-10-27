import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const auth = await getSession();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      365,
      parseInt(searchParams.get("limit") || "60", 10)
    );

    const entries = await prisma.bodyWeight.findMany({
      where: { userId: auth.userId },
      orderBy: { date: "desc" },
      take: limit,
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Get body weight error:", error);
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

    const { weightKg, date } = await request.json();
    const kg = Number(weightKg);
    if (!Number.isFinite(kg) || kg <= 0 || kg > 500) {
      return NextResponse.json({ error: "Invalid weight" }, { status: 400 });
    }

    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);

    const entry = await prisma.bodyWeight.upsert({
      where: { userId_date: { userId: auth.userId, date: d } },
      update: { weightKg: kg },
      create: { userId: auth.userId, weightKg: kg, date: d },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create body weight error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
