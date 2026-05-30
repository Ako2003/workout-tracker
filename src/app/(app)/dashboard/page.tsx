"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Flame,
  TrendingUp,
  Dumbbell,
  ChevronRight,
  Trophy,
  BarChart3,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { WorkoutHeatmap } from "@/components/progress/WorkoutHeatmap";
import { formatDate, formatWeight } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Stats {
  totalSessions: number;
  thisWeekSessions: number;
  totalVolume: number;
  streak: number;
  topMuscleGroups: { group: string; count: number }[];
  heatmapData: { date: string; count: number }[];
  bestLifts: { name: string; weight: number; reps: number; date: string }[];
  weeklySummary: { week: string; sessions: number; volume: number }[];
  muscleBalance: { group: string; percentage: number; count: number }[];
}

interface TodaySession {
  id: string;
  date: string;
  exercises: {
    exercise: { id: string; name: string; muscleGroup: string };
    sets: { id: string; reps: number; weight: number }[];
  }[];
}

const muscleColors: Record<string, string> = {
  BICEPS: "bg-muscle-biceps",
  TRICEPS: "bg-muscle-triceps",
  CHEST: "bg-muscle-chest",
  BACK: "bg-muscle-back",
  SHOULDERS: "bg-muscle-shoulders",
  LEGS: "bg-muscle-legs",
  CORE: "bg-muscle-core",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [todaySession, setTodaySession] = useState<TodaySession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, todayRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/sessions/today"),
        ]);

        const statsData = await statsRes.json();
        const todayData = await todayRes.json();

        if (!statsData.error) setStats(statsData);
        setTodaySession(todayData.session);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-background-secondary rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="h-48 bg-background-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold font-display">
          Ready to lift?
        </h1>
        <p className="text-foreground-muted mt-1">
          {formatDate(new Date())}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Calendar className="w-5 h-5 text-accent" />}
          label="Total Workouts"
          value={stats?.totalSessions || 0}
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-500" />}
          label="Current Streak"
          value={`${stats?.streak || 0} days`}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
          label="This Week"
          value={stats?.thisWeekSessions || 0}
        />
        <StatCard
          icon={<Dumbbell className="w-5 h-5 text-purple-500" />}
          label="Total Volume"
          value={`${formatWeight((stats?.totalVolume || 0) / 1000)}t`}
        />
      </div>

      {/* Today's Workout */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between mb-0">
          <CardTitle>Today&apos;s Workout</CardTitle>
          <Link href="/workout">
            <Button variant="ghost" size="sm">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {todaySession && todaySession.exercises?.length > 0 ? (
            <div className="space-y-3">
              {todaySession.exercises.slice(0, 3).map((ex) => (
                <div
                  key={ex.exercise.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium">{ex.exercise.name}</p>
                    <p className="text-sm text-foreground-muted">
                      {ex.sets.length} sets
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-accent">
                      {Math.max(...ex.sets.map((s) => s.weight))} kg
                    </p>
                  </div>
                </div>
              ))}
              {todaySession.exercises.length > 3 && (
                <p className="text-sm text-foreground-muted text-center">
                  +{todaySession.exercises.length - 3} more exercises
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <Dumbbell className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
              <p className="text-foreground-muted mb-4">
                No workout logged today
              </p>
              <Link href="/workout">
                <Button>Start Workout</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity Heatmap */}
      {stats?.heatmapData && stats.heatmapData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" />
              Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WorkoutHeatmap data={stats.heatmapData} />
          </CardContent>
        </Card>
      )}

      {/* Best Lifts */}
      {stats?.bestLifts && stats.bestLifts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Best Lifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.bestLifts.map((lift, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-foreground-muted">
                      #{i + 1}
                    </span>
                    <div>
                      <p className="font-medium">{lift.name}</p>
                      <p className="text-xs text-foreground-muted">
                        {lift.reps} reps
                      </p>
                    </div>
                  </div>
                  <p className="font-mono font-bold text-yellow-500">
                    {lift.weight} kg
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Summary */}
      {stats?.weeklySummary && stats.weeklySummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.weeklySummary.map((week, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">{week.week}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      <span className="font-bold">{week.sessions}</span> sessions
                    </span>
                    <span className="text-sm font-mono text-accent">
                      {formatWeight(week.volume)} kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Muscle Balance */}
      {stats?.muscleBalance && stats.muscleBalance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muscle Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.muscleBalance
                .sort((a, b) => b.percentage - a.percentage)
                .map(({ group, percentage }) => (
                  <div key={group} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize">{group.toLowerCase()}</span>
                      <span className="text-foreground-muted">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          muscleColors[group] || "bg-accent"
                        )}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card padding="md">
      <CardContent className="flex flex-col gap-2">
        {icon}
        <div>
          <p className="text-2xl font-bold font-display">{value}</p>
          <p className="text-sm text-foreground-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
