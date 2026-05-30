"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, Trophy, History } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SetRow } from "./SetRow";
import { cn } from "@/lib/utils";

interface Set {
  id: string;
  setNumber: number;
  reps: number;
  weight: number;
}

interface LastPerformance {
  date: string;
  sets: { setNumber: number; reps: number; weight: number }[];
  maxWeight: number;
  totalVolume: number;
}

interface PersonalRecord {
  weight: number;
  reps: number;
  date: string;
}

interface ExerciseItemProps {
  exercise: {
    id: string;
    name: string;
    muscleGroup: string;
  };
  sets: Set[];
  sessionId: string;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (setId: string, reps: number, weight: number) => void;
  onDeleteSet: (setId: string) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onNewPR?: (exerciseName: string, weight: number) => void;
}

export function ExerciseItem({
  exercise,
  sets,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onRemoveExercise,
  onNewPR,
}: ExerciseItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastPerformance, setLastPerformance] = useState<LastPerformance | null>(null);
  const [personalRecord, setPersonalRecord] = useState<PersonalRecord | null>(null);
  const [prCelebrated, setPrCelebrated] = useState(false);

  const totalVolume = sets.reduce((sum, set) => sum + set.reps * set.weight, 0);
  const maxWeight = sets.length > 0 ? Math.max(...sets.map((s) => s.weight)) : 0;

  // Check if current session has a new PR
  const isNewPR = personalRecord && maxWeight > personalRecord.weight && maxWeight > 0;

  useEffect(() => {
    fetchHistory();
  }, [exercise.id]);

  // Trigger PR celebration when new PR is detected
  useEffect(() => {
    if (isNewPR && !prCelebrated && onNewPR) {
      onNewPR(exercise.name, maxWeight);
      setPrCelebrated(true);
    }
  }, [isNewPR, prCelebrated, maxWeight, exercise.name, onNewPR]);

  async function fetchHistory() {
    try {
      const res = await fetch(`/api/exercises/${exercise.id}/history`);
      const data = await res.json();
      if (data.lastPerformance) {
        setLastPerformance(data.lastPerformance);
      }
      if (data.personalRecord) {
        setPersonalRecord(data.personalRecord);
      }
    } catch (error) {
      console.error("Failed to fetch exercise history:", error);
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="bg-background-secondary rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-background-tertiary/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-left">{exercise.name}</h3>
              {(isNewPR || (personalRecord && maxWeight === personalRecord.weight && maxWeight > 0)) && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-500 text-xs font-bold">
                  <Trophy className="w-3 h-3" />
                  PR
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="muscle" muscleGroup={exercise.muscleGroup}>
                {exercise.muscleGroup.toLowerCase()}
              </Badge>
              <span className="text-xs text-foreground-muted">
                {sets.length} sets
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {sets.length > 0 && (
            <div className="text-right">
              <p className={cn(
                "font-mono font-bold",
                isNewPR ? "text-yellow-500" : "text-accent"
              )}>
                {maxWeight} kg
              </p>
              <p className="text-xs text-foreground-muted">
                {totalVolume.toFixed(0)} vol
              </p>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-foreground-muted" />
          ) : (
            <ChevronDown className="w-5 h-5 text-foreground-muted" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          isExpanded ? "max-h-[1000px]" : "max-h-0"
        )}
      >
        <div className="px-4 pb-4 space-y-3">
          {/* Last Performance Info */}
          {lastPerformance && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-tertiary/50 text-sm">
              <History className="w-4 h-4 text-foreground-muted" />
              <span className="text-foreground-muted">Last:</span>
              <span className="font-medium">
                {lastPerformance.sets.length}×{lastPerformance.sets[0]?.reps || 0} @ {lastPerformance.maxWeight}kg
              </span>
              <span className="text-foreground-subtle">
                ({formatDate(lastPerformance.date)})
              </span>
            </div>
          )}

          {/* Sets */}
          {sets.map((set) => (
            <SetRow
              key={set.id}
              setNumber={set.setNumber}
              reps={set.reps}
              weight={set.weight}
              onUpdate={(reps, weight) => onUpdateSet(set.id, reps, weight)}
              onDelete={() => onDeleteSet(set.id)}
              suggestedReps={lastPerformance?.sets[set.setNumber - 1]?.reps}
              suggestedWeight={lastPerformance?.sets[set.setNumber - 1]?.weight}
            />
          ))}

          {/* Add Set Button */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAddSet(exercise.id)}
              className="flex-1"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Set
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveExercise(exercise.id)}
              className="text-foreground-subtle hover:text-danger"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
