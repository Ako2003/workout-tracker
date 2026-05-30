import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const exerciseId = searchParams.get("exerciseId");
    const range = searchParams.get("range") || "3m";

    // Calculate date range
    const now = new Date();
    let startDate: Date | undefined;

    switch (range) {
      case "1m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 1));
        break;
      case "3m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
        break;
      case "6m":
        startDate = new Date(new Date().setMonth(now.getMonth() - 6));
        break;
      case "1y":
        startDate = new Date(new Date().setFullYear(now.getFullYear() - 1));
        break;
      case "all":
        startDate = undefined;
        break;
      default:
        startDate = new Date(new Date().setMonth(now.getMonth() - 3));
    }

    if (exerciseId) {
      // Get progress data for a specific exercise
      const sets = await prisma.workoutSet.findMany({
        where: {
          exerciseId,
          session: {
            userId: session.userId,
            ...(startDate && { date: { gte: startDate } }),
          },
        },
        include: {
          session: true,
        },
        orderBy: {
          session: { date: "asc" },
        },
      });

      const dataByDate = new Map<
        string,
        { date: string; maxWeight: number; volume: number; totalSets: number }
      >();

      for (const set of sets) {
        const dateKey = set.session.date.toISOString().split("T")[0];
        const existing = dataByDate.get(dateKey);

        if (existing) {
          existing.maxWeight = Math.max(existing.maxWeight, set.weight);
          existing.volume += set.reps * set.weight;
          existing.totalSets += 1;
        } else {
          dataByDate.set(dateKey, {
            date: dateKey,
            maxWeight: set.weight,
            volume: set.reps * set.weight,
            totalSets: 1,
          });
        }
      }

      return NextResponse.json({ progress: Array.from(dataByDate.values()) });
    }

    // Get all data for dashboard
    const [allSessions, allSets] = await Promise.all([
      prisma.workoutSession.findMany({
        where: { userId: session.userId },
        orderBy: { date: "desc" },
        select: { id: true, date: true },
      }),
      prisma.workoutSet.findMany({
        where: {
          session: { userId: session.userId },
        },
        include: {
          exercise: true,
          session: true,
        },
      }),
    ]);

    // Basic stats
    const totalSessions = allSessions.length;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const thisWeekSessions = allSessions.filter((s) => {
      const d = new Date(s.date);
      return d >= weekAgo;
    }).length;

    // Total volume (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const recentSets = allSets.filter((s) => new Date(s.session.date) >= threeMonthsAgo);
    const totalVolume = recentSets.reduce((sum, set) => sum + set.reps * set.weight, 0);

    // Streak calculation
    let streak = 0;
    for (const s of allSessions) {
      const sessionDate = new Date(s.date);
      sessionDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      if (sessionDate.getTime() === expectedDate.getTime()) {
        streak++;
      } else if (streak === 0) {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (sessionDate.getTime() === yesterday.getTime()) {
          streak++;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Top muscle groups
    const muscleGroupCounts = new Map<string, number>();
    for (const set of recentSets) {
      const count = muscleGroupCounts.get(set.exercise.muscleGroup) || 0;
      muscleGroupCounts.set(set.exercise.muscleGroup, count + 1);
    }
    const topMuscleGroups = Array.from(muscleGroupCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([group, count]) => ({ group, count }));

    // Heatmap data (last 365 days)
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    const heatmapData: { date: string; count: number }[] = [];
    const sessionsByDate = new Map<string, number>();

    for (const s of allSessions) {
      const d = new Date(s.date);
      if (d >= yearAgo) {
        const dateKey = d.toISOString().split("T")[0];
        sessionsByDate.set(dateKey, (sessionsByDate.get(dateKey) || 0) + 1);
      }
    }

    // Fill in all dates for the heatmap
    const current = new Date(yearAgo);
    while (current <= today) {
      const dateKey = current.toISOString().split("T")[0];
      heatmapData.push({
        date: dateKey,
        count: sessionsByDate.get(dateKey) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    // Best lifts (PR for each exercise)
    const exercisePRs = new Map<string, { name: string; weight: number; reps: number; date: string }>();
    for (const set of allSets) {
      const existing = exercisePRs.get(set.exerciseId);
      if (!existing || set.weight > existing.weight) {
        exercisePRs.set(set.exerciseId, {
          name: set.exercise.name,
          weight: set.weight,
          reps: set.reps,
          date: set.session.date.toISOString(),
        });
      }
    }
    const bestLifts = Array.from(exercisePRs.values())
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    // Weekly summary (last 4 weeks)
    const weeklySummary: { week: string; sessions: number; volume: number }[] = [];
    for (let i = 0; i < 4; i++) {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(today);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekSessions = allSessions.filter((s) => {
        const d = new Date(s.date);
        return d >= weekStart && d < weekEnd;
      });

      const weekSets = allSets.filter((s) => {
        const d = new Date(s.session.date);
        return d >= weekStart && d < weekEnd;
      });

      const weekVolume = weekSets.reduce((sum, set) => sum + set.reps * set.weight, 0);

      weeklySummary.push({
        week: i === 0 ? "This week" : i === 1 ? "Last week" : `${i + 1} weeks ago`,
        sessions: weekSessions.length,
        volume: weekVolume,
      });
    }

    // Muscle balance (percentage distribution)
    const totalMuscleCount = Array.from(muscleGroupCounts.values()).reduce((a, b) => a + b, 0);
    const muscleBalance = Array.from(muscleGroupCounts.entries()).map(([group, count]) => ({
      group,
      percentage: totalMuscleCount > 0 ? Math.round((count / totalMuscleCount) * 100) : 0,
      count,
    }));

    return NextResponse.json({
      totalSessions,
      thisWeekSessions,
      totalVolume,
      streak,
      topMuscleGroups,
      heatmapData,
      bestLifts,
      weeklySummary,
      muscleBalance,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
