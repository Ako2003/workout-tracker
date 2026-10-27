import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

function parseDateParam(value: string | null): Date {
  const d = value ? new Date(value) : new Date();
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

    const entries = await prisma.waterEntry.findMany({
      where: { userId: auth.userId, date },
      orderBy: { createdAt: "asc" },
    });
    const totalMl = entries.reduce((sum, e) => sum + e.ml, 0);

    return NextResponse.json({ entries, totalMl });
  } catch (error) {
    console.error("Get water error:", error);
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
    const { ml, date } = await request.json();
    const amount = Math.round(Number(ml));
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 5000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const entry = await prisma.waterEntry.create({
      data: {
        userId: auth.userId,
        ml: amount,
        date: parseDateParam(date),
      },
    });
    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Create water error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
