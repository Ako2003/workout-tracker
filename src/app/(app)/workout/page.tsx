"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ExercisePicker } from "@/components/workout/ExercisePicker";
import { ExerciseItem } from "@/components/workout/ExerciseItem";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";

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

export default function WorkoutPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const { showToast } = useToast();

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions/today");
      const data = await res.json();
      setSession(data.session);
    } catch (error) {
      console.error("Failed to fetch session:", error);
      showToast("Failed to load workout", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const startWorkout = async () => {
    try {
      const res = await fetch("/api/sessions/today", { method: "POST" });
      const data = await res.json();
      setSession(data.session);
      showToast("Workout started! Let's go!", "success");
    } catch (error) {
      console.error("Failed to start workout:", error);
      showToast("Failed to start workout", "error");
    }
  };

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
      showToast("Failed to add set", "error");
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
      showToast("Failed to save", "error");
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await fetch(`/api/sets/${setId}`, { method: "DELETE" });
      fetchSession();
      showToast("Set deleted", "info");
    } catch (error) {
      console.error("Failed to delete set:", error);
      showToast("Failed to delete set", "error");
    }
  };

  const handleRemoveExercise = async (exerciseId: string) => {
    if (!session) return;

    const exerciseData = (session.exercises || []).find(
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
      showToast("Failed to remove exercise", "error");
    }
  };

  const handleNewPR = (exerciseName: string, weight: number) => {
    showToast(`NEW PR! ${exerciseName}: ${weight}kg`, "pr");
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
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-muted mb-6">
            <Dumbbell className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold font-display mb-2">
            Start Today&apos;s Workout
          </h1>
          <p className="text-foreground-muted mb-6">
            {formatDate(new Date())}
          </p>
          <Button size="lg" onClick={startWorkout}>
            <Plus className="w-5 h-5 mr-2" />
            Start Workout
          </Button>
        </div>
      </div>
    );
  }

  const exercises = session.exercises || [];
  const existingExerciseIds = exercises.map((e) => e.exercise.id);

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display">Today&apos;s Workout</h1>
          <p className="text-sm text-foreground-muted">
            {formatDate(new Date(session.date))}
          </p>
        </div>
        <Button onClick={() => setIsPickerOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Exercise
        </Button>
      </div>

      {/* Exercises */}
      {exercises.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-xl">
          <Dumbbell className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
          <p className="text-foreground-muted mb-4">No exercises yet</p>
          <Button variant="secondary" onClick={() => setIsPickerOpen(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Exercise
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {exercises.map(({ exercise, sets }) => (
            <ExerciseItem
              key={exercise.id}
              exercise={exercise}
              sets={sets}
              sessionId={session.id}
              onAddSet={handleAddSet}
              onUpdateSet={handleUpdateSet}
              onDeleteSet={handleDeleteSet}
              onRemoveExercise={handleRemoveExercise}
              onNewPR={handleNewPR}
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
