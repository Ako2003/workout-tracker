"use client";

import { useState, useEffect, useRef } from "react";
import { Trash2, Check, Copy, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

type SetPatch = { reps?: number; weight?: number; notes?: string | null };

interface SetRowProps {
  setNumber: number;
  reps: number;
  weight: number;
  notes: string | null;
  onUpdate: (patch: SetPatch) => void;
  onDelete: () => void;
  isNew?: boolean;
  suggestedReps?: number;
  suggestedWeight?: number;
}

const displayValue = (v: number) => (v === 0 ? "" : v.toString());

export function SetRow({
  setNumber,
  reps,
  weight,
  notes,
  onUpdate,
  onDelete,
  isNew = false,
  suggestedReps,
  suggestedWeight,
}: SetRowProps) {
  const [localReps, setLocalReps] = useState(displayValue(reps));
  const [localWeight, setLocalWeight] = useState(displayValue(weight));
  const [localNotes, setLocalNotes] = useState(notes ?? "");
  const [isEditing, setIsEditing] = useState(isNew);
  const [notesOpen, setNotesOpen] = useState(Boolean(notes));
  const repsFocused = useRef(false);
  const weightFocused = useRef(false);
  const notesFocused = useRef(false);
  // Tracks the last values we committed upward. Comparing against this
  // instead of the prop prevents us from re-sending stale values when
  // a save is still in flight and the prop hasn't caught up.
  const lastSentReps = useRef(reps);
  const lastSentWeight = useRef(weight);
  const lastSentNotes = useRef<string | null>(notes);

  // Only sync from props when the user is not actively editing that field,
  // so a re-render mid-typing never wipes out unsaved input.
  useEffect(() => {
    if (!repsFocused.current) {
      setLocalReps(displayValue(reps));
      lastSentReps.current = reps;
    }
  }, [reps]);

  useEffect(() => {
    if (!weightFocused.current) {
      setLocalWeight(displayValue(weight));
      lastSentWeight.current = weight;
    }
  }, [weight]);

  useEffect(() => {
    if (!notesFocused.current) {
      setLocalNotes(notes ?? "");
      lastSentNotes.current = notes;
    }
  }, [notes]);

  const commitNumbers = () => {
    const newReps = parseInt(localReps) || 0;
    const newWeight = parseFloat(localWeight) || 0;
    const patch: SetPatch = {};
    if (newReps !== lastSentReps.current) {
      lastSentReps.current = newReps;
      patch.reps = newReps;
    }
    if (newWeight !== lastSentWeight.current) {
      lastSentWeight.current = newWeight;
      patch.weight = newWeight;
    }
    if (Object.keys(patch).length > 0) {
      onUpdate(patch);
    }
    setIsEditing(false);
  };

  const commitNotes = () => {
    const trimmed = localNotes.trim();
    const value = trimmed || null;
    if (value !== lastSentNotes.current) {
      lastSentNotes.current = value;
      onUpdate({ notes: value });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleCopyLast = () => {
    if (suggestedReps !== undefined && suggestedWeight !== undefined) {
      setLocalReps(suggestedReps.toString());
      setLocalWeight(suggestedWeight.toString());
      lastSentReps.current = suggestedReps;
      lastSentWeight.current = suggestedWeight;
      onUpdate({ reps: suggestedReps, weight: suggestedWeight });
    }
  };

  const showCopyButton =
    suggestedReps !== undefined &&
    suggestedWeight !== undefined &&
    (reps === 0 || weight === 0);

  return (
    <div
      className={cn(
        "rounded-lg transition-colors",
        isEditing ? "bg-background-tertiary" : "hover:bg-background-tertiary/50"
      )}
    >
      <div className="flex items-center gap-2 py-2 px-3">
        {/* Set Number */}
        <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-accent">{setNumber}</span>
        </div>

        {/* Reps Input */}
        <div className="flex-1 min-w-0">
          <Input
            type="number"
            inputMode="numeric"
            value={localReps}
            onFocus={(e) => {
              repsFocused.current = true;
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setLocalReps(e.target.value);
              setIsEditing(true);
            }}
            onBlur={() => {
              repsFocused.current = false;
              commitNumbers();
            }}
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
            inputMode="decimal"
            value={localWeight}
            onFocus={(e) => {
              weightFocused.current = true;
              e.currentTarget.select();
            }}
            onChange={(e) => {
              setLocalWeight(e.target.value);
              setIsEditing(true);
            }}
            onBlur={() => {
              weightFocused.current = false;
              commitNumbers();
            }}
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
              type="button"
              onClick={handleCopyLast}
              className="p-2 rounded-lg text-foreground-muted hover:text-accent hover:bg-accent/10 transition-colors"
              title="Copy from last session"
            >
              <Copy className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setNotesOpen((o) => !o)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              localNotes
                ? "text-accent hover:bg-accent/10"
                : "text-foreground-subtle hover:text-foreground hover:bg-background-tertiary"
            )}
            title={localNotes ? "Edit note" : "Add note"}
          >
            <MessageSquare className="w-4 h-4" />
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={commitNumbers}
              title="Save set"
              className="p-2 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
            >
              <Check className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onDelete}
              title="Delete set"
              className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {notesOpen && (
        <div className="px-3 pb-3">
          <textarea
            value={localNotes}
            onFocus={() => {
              notesFocused.current = true;
            }}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={() => {
              notesFocused.current = false;
              commitNotes();
            }}
            rows={2}
            placeholder="e.g., felt heavy, form broke on last rep"
            className="w-full px-3 py-2 bg-background-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle transition-colors duration-150 hover:border-border-hover focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
          />
        </div>
      )}
    </div>
  );
}
