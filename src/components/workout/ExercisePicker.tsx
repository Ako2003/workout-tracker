"use client";

import { useState, useEffect } from "react";
import { Search, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

interface ExercisePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (exercise: Exercise) => void;
  excludeIds?: string[];
}

export function ExercisePicker({
  isOpen,
  onClose,
  onSelect,
  excludeIds = [],
}: ExercisePickerProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchExercises();
    }
  }, [isOpen]);

  async function fetchExercises() {
    setLoading(true);
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
    if (excludeIds.includes(ex.id)) return false;
    if (filter !== "ALL" && ex.muscleGroup !== filter) return false;
    if (search && !ex.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleSelect = (exercise: Exercise) => {
    onSelect(exercise);
    onClose();
    setSearch("");
    setFilter("ALL");
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Exercise">
      <div className="p-4 border-b border-border">
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
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {MUSCLE_GROUPS.map((group) => (
            <button
              key={group}
              onClick={() => setFilter(group)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                filter === group
                  ? "bg-accent text-background"
                  : "bg-background-tertiary text-foreground-muted hover:text-foreground"
              )}
            >
              {group === "ALL" ? "All" : group.charAt(0) + group.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-background-tertiary rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-foreground-muted">No exercises found</p>
            {search && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => {
                  // Could implement custom exercise creation here
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create &quot;{search}&quot;
              </Button>
            )}
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <button
              key={exercise.id}
              onClick={() => handleSelect(exercise)}
              className="w-full flex items-center justify-between p-3 rounded-lg bg-background-tertiary hover:bg-border transition-colors text-left"
            >
              <div>
                <p className="font-medium">{exercise.name}</p>
                <Badge variant="muscle" muscleGroup={exercise.muscleGroup}>
                  {exercise.muscleGroup.toLowerCase()}
                </Badge>
              </div>
              {exercise.isCustom && (
                <span className="text-xs text-foreground-subtle">Custom</span>
              )}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
