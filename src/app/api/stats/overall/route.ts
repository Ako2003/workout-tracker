import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

type Bucket = "day" | "week" | "month";

function startOfDay(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(d: Date) {
  const out = startOfDay(d);
  const day = out.getDay();
  // Treat Monday as the start of the week.
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function bucketKey(date: Date, bucket: Bucket): string {
  const d =
    bucket === "day"
      ? startOfDay(date)
      : bucket === "week"
        ? startOfWeek(date)
        : startOfMonth(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "3m";

    const now = new Date();
    let startDate: Date | undefined;
    let bucket: Bucket = "week";

    switch (range) {
      case "1m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        bucket = "day";
        break;
      case "3m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        bucket = "week";
        break;
      case "6m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 6));
        bucket = "week";
        break;
      case "1y":
        startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
        bucket = "month";
        break;
      case "all":
        startDate = undefined;
        bucket = "month";
        break;
      default:
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        bucket = "week";
    }

    const sets = await prisma.workoutSet.findMany({
      where: {
        session: {
          userId: session.userId,
          ...(startDate && { date: { gte: startDate } }),
        },
      },
      include: {
        exercise: { select: { muscleGroup: true } },
        session: { select: { id: true, date: true } },
      },
    });

    type Row = {
      date: string;
      volume: number;
      sets: number;
      sessionIds: Set<string>;
      sessions: number;
    };

    const map = new Map<string, Row>();
    for (const s of sets) {
      const key = bucketKey(s.session.date, bucket);
      let row = map.get(key);
      if (!row) {
        row = {
          date: key,
          volume: 0,
          sets: 0,
          sessionIds: new Set(),
          sessions: 0,
        };
        map.set(key, row);
      }
      row.volume += s.reps * s.weight;
      row.sets += 1;
      row.sessionIds.add(s.session.id);
    }

    const series = [...map.values()]
      .map((r) => ({
        date: r.date,
        volume: Math.round(r.volume),
        sets: r.sets,
        sessions: r.sessionIds.size,
      }))
      .sort((a, b) => (a.date < b.date ? -1 : 1));

    // Totals across the range
    const totals = series.reduce(
      (acc, r) => {
        acc.volume += r.volume;
        acc.sets += r.sets;
        acc.sessions += r.sessions;
        return acc;
      },
      { volume: 0, sets: 0, sessions: 0 }
    );

    // Muscle group distribution across the range
    const muscleCounts = new Map<string, number>();
    for (const s of sets) {
      muscleCounts.set(
        s.exercise.muscleGroup,
        (muscleCounts.get(s.exercise.muscleGroup) || 0) + 1
      );
    }
    const muscleTotal = [...muscleCounts.values()].reduce((a, b) => a + b, 0);
    const muscleBalance = [...muscleCounts.entries()]
      .map(([group, count]) => ({
        group,
        count,
        percentage:
          muscleTotal > 0 ? Math.round((count / muscleTotal) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      bucket,
      range,
      series,
      totals,
      muscleBalance,
    });
  } catch (error) {
    console.error("Get overall stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
