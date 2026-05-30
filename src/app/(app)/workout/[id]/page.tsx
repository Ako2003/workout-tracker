"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { ExerciseItem } from "@/components/workout/ExerciseItem";
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

export default function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (!res.ok) {
        router.push("/history");
        return;
      }
      const data = await res.json();
      setSession(data);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      router.push("/history");
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
      }
    } catch (error) {
      console.error("Failed to add exercise:", error);
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

  const handleUpdateSet = async (setId: string, reps: number, weight: number) => {
    try {
      await fetch(`/api/sets/${setId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reps, weight }),
      });
      fetchSession();
    } catch (error) {
      console.error("Failed to update set:", error);
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
    } catch (error) {
      console.error("Failed to remove exercise:", error);
    }
  };

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
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold font-display">Workout Details</h1>
          <p className="text-sm text-foreground-muted">
            {formatDateFull(new Date(session.date))}
          </p>
        </div>
        <Button onClick={() => setIsPickerOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Exercise
        </Button>
      </div>

      {/* Exercises */}
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
        <div className="space-y-3">
          {session.exercises.map(({ exercise, sets }) => (
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
      )}

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
