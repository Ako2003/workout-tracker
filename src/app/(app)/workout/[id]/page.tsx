"use client";

import { useState, useEffect, useCallback, use, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Dumbbell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { ExerciseItem } from "@/components/workout/ExerciseItem";
import { useToast } from "@/components/ui/Toast";
import { formatDateFull } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
}

interface Set {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
  exerciseId: string;
}

interface WorkoutExercise {
  exercise: Exercise;
  sets: Set[];
}

interface Session {
  id: string;
  date: string;
  notes: string | null;
  exercises: WorkoutExercise[];
}

const MUSCLE_ORDER = [
  "CHEST",
  "BACK",
  "SHOULDERS",
  "BICEPS",
  "TRICEPS",
  "LEGS",
  "CORE",
];

const MUSCLE_LABEL: Record<string, string> = {
  CHEST: "Chest",
  BACK: "Back",
  SHOULDERS: "Shoulders",
  BICEPS: "Biceps",
  TRICEPS: "Triceps",
  LEGS: "Legs",
  CORE: "Core",
};

const muscleAccent: Record<string, string> = {
  BICEPS: "bg-muscle-biceps",
  TRICEPS: "bg-muscle-triceps",
  CHEST: "bg-muscle-chest",
  BACK: "bg-muscle-back",
  SHOULDERS: "bg-muscle-shoulders",
  LEGS: "bg-muscle-legs",
  CORE: "bg-muscle-core",
};

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) {
        router.push("/workout");
        return;
      }
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      router.push("/workout");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleAddExercise = async (exercise: Exercise) => {
    if (!session) return;

    try {
      const res = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          exerciseId: exercise.id,
          reps: 0,
          weight: 0,
        }),
      });

      if (res.ok) {
        fetchSession();
        showToast(`Added ${exercise.name}`, "success");
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
      showToast("Failed to add exercise", "error");
    }
  };

  const handleAddSet = async (exerciseId: string) => {
    if (!session) return;

    try {
      const res = await fetch("/api/sets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          exerciseId,
          reps: 0,
          weight: 0,
        }),
      });

      if (res.ok) {
        fetchSession();
      }
    } catch (error) {
      console.error("Failed to add set:", error);
    }
  };

  // Optimistic update: change local state immediately so a re-render
  // mid-typing can't override the user's input.
  const handleUpdateSet = async (
    setId: string,
    reps: number,
    weight: number
  ) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId ? { ...s, reps, weight } : s
          ),
        })),
      };
    });

    try {
      const res = await fetch(`/api/sets/${setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps, weight }),
      });
      if (!res.ok) throw new Error("Save failed");
    } catch (error) {
      console.error("Failed to update set:", error);
      showToast("Failed to save", "error");
      fetchSession();
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await fetch(`/api/sets/${setId}`, { method: "DELETE" });
      fetchSession();
    } catch (error) {
      console.error("Failed to delete set:", error);
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!session) return;

    const exerciseData = session.exercises.find(
      (e) => e.exercise.id === exerciseId
    );
    if (!exerciseData) return;

    try {
      await Promise.all(
        exerciseData.sets.map((set) =>
          fetch(`/api/sets/${set.id}`, { method: "DELETE" })
        )
      );
      fetchSession();
      showToast(`Removed ${exerciseData.exercise.name}`, "info");
    } catch (error) {
      console.error("Failed to remove exercise:", error);
    }
  };

  const handleDeleteWorkout = async () => {
    if (!session) return;
    if (
      !confirm(
        "Delete this entire workout? This will remove all sets logged on this date."
      )
    )
      return;

    try {
      await fetch(`/api/sessions/${session.id}`, { method: "DELETE" });
      router.push("/workout");
    } catch (error) {
      console.error("Failed to delete workout:", error);
      showToast("Failed to delete workout", "error");
    }
  };

  // Group exercises by muscle group so each group is visually separated.
  const groupedExercises = useMemo(() => {
    if (!session) return [] as { muscleGroup: string; items: WorkoutExercise[] }[];

    const map = new Map<string, WorkoutExercise[]>();
    for (const ex of session.exercises) {
      const list = map.get(ex.exercise.muscleGroup) ?? [];
      list.push(ex);
      map.set(ex.exercise.muscleGroup, list);
    }

    const known = MUSCLE_ORDER.filter((g) => map.has(g)).map((g) => ({
      muscleGroup: g,
      items: map.get(g)!,
    }));
    const other = [...map.entries()]
      .filter(([g]) => !MUSCLE_ORDER.includes(g))
      .map(([g, items]) => ({ muscleGroup: g, items }));

    return [...known, ...other];
  }, [session]);

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="h-32 bg-background-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const existingExerciseIds = session.exercises.map((e) => e.exercise.id);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          title="Back"
          className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold font-display truncate">
            Workout
          </h1>
          <p className="text-sm text-foreground-muted truncate">
            {formatDateFull(new Date(session.date))}
          </p>
        </div>
        <Button onClick={() => setIsPickerOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Exercise
        </Button>
      </div>

      {/* Exercises grouped by muscle */}
      {session.exercises.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-xl">
          <Dumbbell className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
          <p className="text-foreground-muted mb-4">No exercises logged</p>
          <Button variant="secondary" onClick={() => setIsPickerOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Exercise
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedExercises.map(({ muscleGroup, items }) => {
            const setCount = items.reduce((sum, e) => sum + e.sets.length, 0);
            return (
              <section key={muscleGroup} className="space-y-2">
                <div className="flex items-center gap-3 px-1">
                  <span
                    className={`inline-block w-1.5 h-6 rounded-full ${muscleAccent[muscleGroup] ?? "bg-accent"}`}
                  />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    {MUSCLE_LABEL[muscleGroup] ?? muscleGroup.toLowerCase()}
                  </h2>
                  <span className="text-xs text-foreground-muted">
                    {items.length} {items.length === 1 ? "exercise" : "exercises"} · {setCount} sets
                  </span>
                  <div className="flex-1 h-px bg-border ml-1" />
                </div>
                <div className="space-y-3">
                  {items.map(({ exercise, sets }) => (
                    <ExerciseItem
                      key={exercise.id}
                      exercise={exercise}
                      sets={sets}
                      sessionId={session.id}
                      onAddSet={handleAddSet}
                      onUpdateSet={handleUpdateSet}
                      onDeleteSet={handleDeleteSet}
                      onRemoveExercise={handleRemoveExercise}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Delete workout */}
      <div className="pt-4 flex justify-center">
        <button
          type="button"
          onClick={handleDeleteWorkout}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete this workout
        </button>
      </div>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onSelect={handleAddExercise}
        excludeIds={existingExerciseIds}
      />
    </div>
  );
}
