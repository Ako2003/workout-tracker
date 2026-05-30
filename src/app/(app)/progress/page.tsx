"use client";

import { useState, useEffect } from "react";
import { TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ProgressChart } from "@/components/progress/ProgressChart";
import { cn } from "@/lib/utils";

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

const TIME_RANGES = [
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "all", label: "All Time" },
];

export default function ProgressPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [range, setRange] = useState("3m");
  const [progress, setProgress] = useState<ProgressData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExerciseDropdownOpen, setIsExerciseDropdownOpen] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  useEffect(() => {
    if (selectedExercise) {
      fetchProgress();
    }
  }, [selectedExercise, range]);

  async function fetchExercises() {
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      const exerciseList = Array.isArray(data) ? data : [];
      setExercises(exerciseList);
      if (exerciseList.length > 0) {
        setSelectedExercise(exerciseList[0]);
      }
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProgress() {
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
  }

  // Calculate stats from progress data
  const stats = {
    currentMax:
      progress.length > 0 ? progress[progress.length - 1].maxWeight : 0,
    startMax: progress.length > 0 ? progress[0].maxWeight : 0,
    improvement: 0,
    totalWorkouts: progress.length,
  };

  if (stats.startMax > 0) {
    stats.improvement =
      ((stats.currentMax - stats.startMax) / stats.startMax) * 100;
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
          {/* Exercise Selector */}
          <div className="relative">
            <button
              onClick={() => setIsExerciseDropdownOpen(!isExerciseDropdownOpen)}
              className="w-full flex items-center justify-between p-3 bg-background-secondary rounded-lg hover:bg-background-tertiary transition-colors"
            >
              <div className="text-left">
                <p className="text-xs text-foreground-muted">Exercise</p>
                <p className="font-medium">{selectedExercise?.name || "Select"}</p>
              </div>
              <ChevronDown
                className={cn(
                  "w-5 h-5 text-foreground-muted transition-transform",
                  isExerciseDropdownOpen && "rotate-180"
                )}
              />
            </button>

            {isExerciseDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-background-secondary border border-border rounded-lg shadow-xl z-10 max-h-64 overflow-y-auto">
                {exercises.map((exercise) => (
                  <button
                    key={exercise.id}
                    onClick={() => {
                      setSelectedExercise(exercise);
                      setIsExerciseDropdownOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 hover:bg-background-tertiary transition-colors",
                      selectedExercise?.id === exercise.id && "bg-accent/10 text-accent"
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

          {/* Time Range */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            {TIME_RANGES.map(({ value, label }) => (
              <button
                key={value}
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
      )}
    </div>
  );
}
