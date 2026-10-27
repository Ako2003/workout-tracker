"use client";

import { useState, useEffect, useCallback, use, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Dumbbell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { ExerciseItem } from "@/components/workout/ExerciseItem";
import { RunSection, type RunData } from "@/components/workout/RunSection";
import { RestTimer } from "@/components/workout/RestTimer";
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
  notes: string | null;
  exerciseId: string;
}

type SetPatch = { reps?: number; weight?: number; notes?: string | null };

interface WorkoutExercise {
  exercise: Exercise;
  sets: Set[];
}

interface ExerciseHistory {
  lastPerformance: {
    date: string;
    sets: { setNumber: number; reps: number; weight: number }[];
    maxWeight: number;
    totalVolume: number;
  } | null;
  personalRecord: {
    weight: number;
    reps: number;
    date: string;
  } | null;
}

interface Session {
  id: string;
  date: string;
  notes: string | null;
  exercises: WorkoutExercise[];
  run: RunData | null;
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
  const [history, setHistory] = useState<Record<string, ExerciseHistory>>({});
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Serialize PUTs per set so a later edit never gets overtaken by an
  // older one still in flight. Each entry is the tail of that set's chain.
  const setUpdateChains = useRef<Map<string, Promise<unknown>>>(new Map());

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

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}/history`);
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.byExerciseId ?? {});
    } catch (error) {
      console.error("Failed to fetch history:", error);
    }
  }, [id]);

  useEffect(() => {
    fetchSession();
    fetchHistory();
  }, [fetchSession, fetchHistory]);

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

      if (!res.ok) throw new Error("Failed");
      const newSet = await res.json();
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: [
            ...prev.exercises,
            {
              exercise,
              sets: [
                {
                  id: newSet.id,
                  setNumber: newSet.setNumber,
                  reps: newSet.reps,
                  weight: newSet.weight,
                  notes: newSet.notes ?? null,
                  exerciseId: exercise.id,
                },
              ],
            },
          ],
        };
      });
      showToast(`Added ${exercise.name}`, "success");
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

      if (!res.ok) throw new Error("Failed");
      const newSet = await res.json();
      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          exercises: prev.exercises.map((ex) =>
            ex.exercise.id === exerciseId
              ? {
                  ...ex,
                  sets: [
                    ...ex.sets,
                    {
                      id: newSet.id,
                      setNumber: newSet.setNumber,
                      reps: newSet.reps,
                      weight: newSet.weight,
                      notes: newSet.notes ?? null,
                      exerciseId,
                    },
                  ],
                }
              : ex
          ),
        };
      });
    } catch (error) {
      console.error("Failed to add set:", error);
      showToast("Failed to add set", "error");
    }
  };

  // Optimistic + chained: later saves for the same set wait for earlier
  // ones to finish, so an in-flight {reps:10, weight:0} can't land after
  // {reps:10, weight:80} and overwrite the typed weight.
  const handleUpdateSet = (setId: string, patch: SetPatch) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.map((ex) => ({
          ...ex,
          sets: ex.sets.map((s) =>
            s.id === setId ? { ...s, ...patch } : s
          ),
        })),
      };
    });

    const prevChain =
      setUpdateChains.current.get(setId) ?? Promise.resolve();
    const nextChain = prevChain
      .catch(() => {})
      .then(async () => {
        const res = await fetch(`/api/sets/${setId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error("Save failed");
      })
      .catch((error) => {
        console.error("Failed to update set:", error);
        showToast("Failed to save", "error");
      });
    setUpdateChains.current.set(setId, nextChain);
  };

  const handleDeleteSet = async (setId: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises
          .map((ex) => {
            const filtered = ex.sets.filter((s) => s.id !== setId);
            // Renumber remaining sets to match the server-side renumber.
            const renumbered = filtered.map((s, i) => ({
              ...s,
              setNumber: i + 1,
            }));
            return { ...ex, sets: renumbered };
          })
          .filter((ex) => ex.sets.length > 0),
      };
    });
    setUpdateChains.current.delete(setId);
    try {
      const res = await fetch(`/api/sets/${setId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    } catch (error) {
      console.error("Failed to delete set:", error);
      showToast("Failed to delete set", "error");
      fetchSession();
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!session) return;

    const exerciseData = session.exercises.find(
      (e) => e.exercise.id === exerciseId
    );
    if (!exerciseData) return;

    const setIds = exerciseData.sets.map((s) => s.id);
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        exercises: prev.exercises.filter((e) => e.exercise.id !== exerciseId),
      };
    });
    setIds.forEach((sid) => setUpdateChains.current.delete(sid));

    try {
      await Promise.all(
        setIds.map((sid) =>
          fetch(`/api/sets/${sid}`, { method: "DELETE" })
        )
      );
      showToast(`Removed ${exerciseData.exercise.name}`, "info");
    } catch (error) {
      console.error("Failed to remove exercise:", error);
      showToast("Failed to remove exercise", "error");
      fetchSession();
    }
  };

  const handleRunChange = (run: RunData | null) => {
    setSession((prev) => (prev ? { ...prev, run } : prev));
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
                      lastPerformance={history[exercise.id]?.lastPerformance ?? null}
                      personalRecord={history[exercise.id]?.personalRecord ?? null}
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

      {/* Running (cardio at the end of the session) */}
      <RunSection
        sessionId={session.id}
        run={session.run}
        onChange={handleRunChange}
      />

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

      {/* Floating rest timer */}
      <RestTimer />
    </div>
  );
}
