"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  isCustom: boolean;
}

const MUSCLE_GROUPS = [
  "ALL",
  "BICEPS",
  "TRICEPS",
  "CHEST",
  "BACK",
  "SHOULDERS",
  "LEGS",
  "CORE",
];

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscleGroup: "BICEPS",
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchExercises();
  }, []);

  async function fetchExercises() {
    try {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }

  const filteredExercises = exercises.filter((ex) => {
    if (filter !== "ALL" && ex.muscleGroup !== filter) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const presetExercises = filteredExercises.filter((ex) => !ex.isCustom);
  const customExercises = filteredExercises.filter((ex) => ex.isCustom);

  const handleCreate = async () => {
    if (!newExercise.name.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExercise),
      });

      if (res.ok) {
        setNewExercise({ name: "", muscleGroup: "BICEPS" });
        setIsCreateOpen(false);
        fetchExercises();
      }
    } catch (error) {
      console.error("Failed to create exercise:", error);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exercise?")) return;

    try {
      await fetch(`/api/exercises/${id}`, { method: "DELETE" });
      fetchExercises();
    } catch (error) {
      console.error("Failed to delete exercise:", error);
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold font-display">Exercises</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Create
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
        <Input
          type="text"
          placeholder="Search exercises..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {MUSCLE_GROUPS.map((group) => (
          <button
            key={group}
            onClick={() => setFilter(group)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
              filter === group
                ? "bg-accent text-background"
                : "bg-background-secondary text-foreground-muted hover:text-foreground"
            )}
          >
            {group === "ALL" ? "All" : group.charAt(0) + group.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Exercises List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-background-secondary rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Custom Exercises */}
          {customExercises.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-foreground-muted mb-2 uppercase tracking-wider">
                Your Exercises
              </h2>
              <div className="space-y-2">
                {customExercises.map((exercise) => (
                  <ExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onDelete={() => handleDelete(exercise.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Preset Exercises */}
          <div>
            <h2 className="text-sm font-semibold text-foreground-muted mb-2 uppercase tracking-wider">
              Preset Exercises
            </h2>
            <div className="space-y-2">
              {presetExercises.map((exercise) => (
                <ExerciseCard key={exercise.id} exercise={exercise} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Exercise Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Exercise"
      >
        <div className="p-4 space-y-4">
          <Input
            label="Exercise Name"
            placeholder="e.g., Barbell Curl"
            value={newExercise.name}
            onChange={(e) =>
              setNewExercise({ ...newExercise, name: e.target.value })
            }
          />

          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-2">
              Muscle Group
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MUSCLE_GROUPS.filter((g) => g !== "ALL").map((group) => (
                <button
                  key={group}
                  onClick={() =>
                    setNewExercise({ ...newExercise, muscleGroup: group })
                  }
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    newExercise.muscleGroup === group
                      ? "bg-accent text-background"
                      : "bg-background-tertiary text-foreground-muted hover:text-foreground"
                  )}
                >
                  {group.charAt(0) + group.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <Button
            fullWidth
            onClick={handleCreate}
            isLoading={creating}
            disabled={!newExercise.name.trim()}
          >
            Create Exercise
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ExerciseCard({
  exercise,
  onDelete,
}: {
  exercise: Exercise;
  onDelete?: () => void;
}) {
  return (
    <Card padding="md">
      <CardContent className="flex items-center justify-between">
        <div>
          <p className="font-medium">{exercise.name}</p>
          <Badge variant="muscle" muscleGroup={exercise.muscleGroup}>
            {exercise.muscleGroup.toLowerCase()}
          </Badge>
        </div>
        {onDelete && (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </CardContent>
    </Card>
  );
}
