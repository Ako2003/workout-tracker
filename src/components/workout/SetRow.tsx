"use client";

import { useState, useEffect } from "react";
import { Trash2, Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface SetRowProps {
  setNumber: number;
  reps: number;
  weight: number;
  onUpdate: (reps: number, weight: number) => void;
  onDelete: () => void;
  isNew?: boolean;
  suggestedReps?: number;
  suggestedWeight?: number;
}

export function SetRow({
  setNumber,
  reps,
  weight,
  onUpdate,
  onDelete,
  isNew = false,
  suggestedReps,
  suggestedWeight,
}: SetRowProps) {
  const [localReps, setLocalReps] = useState(reps.toString());
  const [localWeight, setLocalWeight] = useState(weight.toString());
  const [isEditing, setIsEditing] = useState(isNew);

  // Update local state when props change
  useEffect(() => {
    setLocalReps(reps.toString());
    setLocalWeight(weight.toString());
  }, [reps, weight]);

  const handleSave = () => {
    const newReps = parseInt(localReps) || 0;
    const newWeight = parseFloat(localWeight) || 0;
    if (newReps !== reps || newWeight !== weight) {
      onUpdate(newReps, newWeight);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    }
  };

  const handleCopyLast = () => {
    if (suggestedReps !== undefined && suggestedWeight !== undefined) {
      setLocalReps(suggestedReps.toString());
      setLocalWeight(suggestedWeight.toString());
      onUpdate(suggestedReps, suggestedWeight);
    }
  };

  const showCopyButton =
    suggestedReps !== undefined &&
    suggestedWeight !== undefined &&
    (reps === 0 || weight === 0);

  return (
    <div
      className={cn(
        "flex items-center gap-2 py-2 px-3 rounded-lg transition-colors",
        isEditing ? "bg-background-tertiary" : "hover:bg-background-tertiary/50"
      )}
    >
      {/* Set Number */}
      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-bold text-accent">{setNumber}</span>
      </div>

      {/* Reps Input */}
      <div className="flex-1 min-w-0">
        <Input
          type="number"
          value={localReps}
          onChange={(e) => {
            setLocalReps(e.target.value);
            setIsEditing(true);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={suggestedReps?.toString() || "0"}
          suffix="reps"
          className="text-center font-mono h-10"
        />
      </div>

      {/* Weight Input */}
      <div className="flex-1 min-w-0">
        <Input
          type="number"
          value={localWeight}
          onChange={(e) => {
            setLocalWeight(e.target.value);
            setIsEditing(true);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder={suggestedWeight?.toString() || "0"}
          suffix="kg"
          className="text-center font-mono h-10"
          step="0.5"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showCopyButton && (
          <button
            onClick={handleCopyLast}
            className="p-2 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition-colors"
            title="Copy from last session"
          >
            <Copy className="w-4 h-4" />
          </button>
        )}
        {isEditing ? (
          <button
            onClick={handleSave}
            className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
          >
            <Check className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
