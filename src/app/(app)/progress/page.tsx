"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ChevronDown, BarChart3, Activity, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressChart } from "@/components/progress/ProgressChart";
import { OverallProgressChart } from "@/components/progress/OverallProgressChart";
import { cn, formatWeight } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface ProgressData {
  date: string;
  maxWeight: number;
  volume: number;
  totalSets: number;
}

interface OverallSeriesPoint {
  date: string;
  volume: number;
  sets: number;
  sessions: number;
}

interface OverallData {
  bucket: "day" | "week" | "month";
  range: string;
  series: OverallSeriesPoint[];
  totals: { volume: number; sets: number; sessions: number };
  muscleBalance: { group: string; count: number; percentage: number }[];
}

const TIME_RANGES = [
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "all", label: "All Time" },
];

type ViewMode = "overall" | "exercise";

export default function ProgressPage() {
  const [view, setView] = useState<ViewMode>("overall");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(
    null
  );
  const [range, setRange] = useState("3m");
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [overall, setOverall] = useState<OverallData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);

  const fetchExercises = useCallback(async () => {
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      const exerciseList = Array.isArray(data) ? data : [];
      setExercises(exerciseList);
      if (exerciseList.length > 0 && !selectedExercise) {
        setSelectedExercise(exerciseList[0]);
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [selectedExercise]);

  const fetchExerciseProgress = useCallback(async () => {
    if (!selectedExercise) return;
    try {
      const res = await fetch(
        `/api/stats?exerciseId=${selectedExercise.id}&range=${range}`
      );
      const data = await res.json();
      setProgress(data.progress || []);
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    }
  }, [selectedExercise, range]);

  const fetchOverall = useCallback(async () => {
    try {
      const res = await fetch(`/api/stats/overall?range=${range}`);
      const data = await res.json();
      setOverall(data);
    } catch (error) {
      console.error("Failed to fetch overall stats:", error);
    }
  }, [range]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  useEffect(() => {
    if (view === "exercise") fetchExerciseProgress();
  }, [view, fetchExerciseProgress]);

  useEffect(() => {
    if (view === "overall") fetchOverall();
  }, [view, fetchOverall]);

  // Per-exercise stats (only meaningful in exercise view)
  const exerciseStats = {
    currentMax:
      progress.length > 0 ? progress[progress.length - 1].maxWeight : 0,
    startMax: progress.length > 0 ? progress[0].maxWeight : 0,
    improvement: 0,
    totalWorkouts: progress.length,
  };
  if (exerciseStats.startMax > 0) {
    exerciseStats.improvement =
      ((exerciseStats.currentMax - exerciseStats.startMax) /
        exerciseStats.startMax) *
      100;
  }

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
        <div className="h-12 bg-background-secondary rounded-lg animate-pulse" />
        <div className="h-64 bg-background-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold font-display">Progress</h1>

      {exercises.length === 0 ? (
        <div className="text-center py-16">
          <TrendingUp className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
          <p className="text-foreground-muted">
            Start tracking workouts to see your progress
          </p>
        </div>
      ) : (
        <>
          {/* View Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-background-secondary rounded-lg">
            <button
              type="button"
              onClick={() => setView("overall")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                view === "overall"
                  ? "bg-background-tertiary text-foreground"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <BarChart3 className="w-4 h-4" />
              Overall
            </button>
            <button
              type="button"
              onClick={() => setView("exercise")}
              className={cn(
                "flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors",
                view === "exercise"
                  ? "bg-background-tertiary text-foreground"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              <Dumbbell className="w-4 h-4" />
              By Exercise
            </button>
          </div>

          {/* Time Range */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  range === value
                    ? "bg-accent text-background"
                    : "bg-background-secondary text-foreground-muted hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {view === "overall" ? (
            <OverallView data={overall} />
          ) : (
            <ExerciseView
              exercises={exercises}
              selectedExercise={selectedExercise}
              setSelectedExercise={setSelectedExercise}
              isOpen={isExerciseDropdownOpen}
              setIsOpen={setIsExerciseDropdownOpen}
              progress={progress}
              stats={exerciseStats}
            />
          )}
        </>
      )}
    </div>
  );
}

function OverallView({ data }: { data: OverallData | null }) {
  if (!data) {
    return (
      <div className="h-64 bg-background-secondary rounded-xl animate-pulse" />
    );
  }

  const { totals, series, muscleBalance, bucket } = data;
  const avgPerSession =
    totals.sessions > 0 ? totals.volume / totals.sessions : 0;

  return (
    <>
      {/* Totals */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm">
          <CardContent>
            <p className="text-xs text-foreground-muted">Sessions</p>
            <p className="text-lg font-bold font-mono">{totals.sessions}</p>
          </CardContent>
        </Card>
        <Card padding="sm">
          <CardContent>
            <p className="text-xs text-foreground-muted">Total Sets</p>
            <p className="text-lg font-bold font-mono">{totals.sets}</p>
          </CardContent>
        </Card>
        <Card padding="sm">
          <CardContent>
            <p className="text-xs text-foreground-muted">Total Volume</p>
            <p className="text-lg font-bold font-mono text-accent">
              {formatWeight(totals.volume)} kg
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-accent" />
            Volume &amp; Sessions per{" "}
            {bucket === "day" ? "Day" : bucket === "week" ? "Week" : "Month"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OverallProgressChart data={series} bucket={bucket} />
          <p className="mt-3 text-xs text-foreground-subtle text-center">
            Avg {formatWeight(avgPerSession)} kg volume per session
          </p>
        </CardContent>
      </Card>

      {/* Muscle distribution */}
      {muscleBalance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Muscle Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {muscleBalance.map(({ group, percentage }) => (
                <div key={group} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="capitalize">{group.toLowerCase()}</span>
                    <span className="text-foreground-muted">{percentage}%</span>
                  </div>
                  <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function ExerciseView({
  exercises,
  selectedExercise,
  setSelectedExercise,
  isOpen,
  setIsOpen,
  progress,
  stats,
}: {
  exercises: Exercise[];
  selectedExercise: Exercise | null;
  setSelectedExercise: (e: Exercise) => void;
  isOpen: boolean;
  setIsOpen: (b: boolean) => void;
  progress: ProgressData[];
  stats: {
    currentMax: number;
    startMax: number;
    improvement: number;
    totalWorkouts: number;
  };
}) {
  return (
    <>
      {/* Exercise Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors"
        >
          <div className="text-left">
            <p className="text-xs text-foreground-muted">Exercise</p>
            <p className="font-medium">{selectedExercise?.name || "Select"}</p>
          </div>
          <ChevronDown
            className={cn(
              "w-5 h-5 text-foreground-muted transition-transform",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
            {exercises.map((exercise) => (
              <button
                key={exercise.id}
                type="button"
                onClick={() => {
                  setSelectedExercise(exercise);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 hover:bg-background-tertiary transition-colors",
                  selectedExercise?.id === exercise.id &&
                    "bg-accent/10 text-accent"
                )}
              >
                <p className="font-medium">{exercise.name}</p>
                <p className="text-xs text-foreground-muted capitalize">
                  {exercise.muscleGroup.toLowerCase()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      {progress.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card padding="sm">
            <CardContent>
              <p className="text-xs text-foreground-muted">Current Max</p>
              <p className="text-lg font-bold font-mono text-accent">
                {stats.currentMax} kg
              </p>
            </CardContent>
          </Card>
          <Card padding="sm">
            <CardContent>
              <p className="text-xs text-foreground-muted">Improvement</p>
              <p
                className={cn(
                  "text-lg font-bold font-mono",
                  stats.improvement > 0
                    ? "text-accent"
                    : stats.improvement < 0
                      ? "text-danger"
                      : "text-foreground"
                )}
              >
                {stats.improvement > 0 ? "+" : ""}
                {stats.improvement.toFixed(0)}%
              </p>
            </CardContent>
          </Card>
          <Card padding="sm">
            <CardContent>
              <p className="text-xs text-foreground-muted">Workouts</p>
              <p className="text-lg font-bold font-mono">
                {stats.totalWorkouts}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Max Weight Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            Max Weight
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart data={progress} metric="maxWeight" />
        </CardContent>
      </Card>

      {/* Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            Training Volume
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProgressChart data={progress} metric="volume" />
        </CardContent>
      </Card>
    </>
  );
}
