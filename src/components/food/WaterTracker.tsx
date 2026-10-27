"use client";

import { useCallback, useEffect, useState } from "react";
import { Coffee, Droplets, Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

interface Props {
  date: string;
  goalMl: number | null;
}

const PRESETS = [250, 500, 1000];

export function WaterTracker({ date, goalMl }: Props) {
  const { showToast } = useToast();
  const [totalMl, setTotalMl] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTotal = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/water?date=${date}`);
      const data = await res.json();
      setTotalMl(data.totalMl ?? 0);
    } catch {
      // fine; keep local
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  const addWater = async (ml: number) => {
    // Optimistic: refuse to go below 0 locally.
    const nextLocal = Math.max(0, totalMl + ml);
    setTotalMl(nextLocal);
    try {
      const res = await fetch("/api/water", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ml, date }),
      });
      if (!res.ok) throw new Error();
    } catch {
      showToast("Failed to save water", "error");
      fetchTotal();
    }
  };

  const hasGoal = goalMl != null && goalMl > 0;
  const pct = hasGoal ? Math.min(1, totalMl / goalMl!) : 0;

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-5 h-5 text-sky-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold font-mono">
              {loading ? "—" : (totalMl / 1000).toFixed(2)}
              <span className="text-sm font-medium text-foreground-muted ml-1">
                L
              </span>
              {hasGoal && (
                <span className="text-sm text-foreground-muted ml-2">
                  / {(goalMl! / 1000).toFixed(1)} L
                </span>
              )}
            </p>
            {hasGoal && (
              <div className="mt-1 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full transition-all"
                  style={{ width: `${pct * 100}%` }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => addWater(-250)}
            disabled={totalMl === 0}
            className="p-2 rounded-lg text-foreground-subtle hover:text-foreground hover:bg-background-tertiary transition-colors disabled:opacity-30"
            aria-label="Remove 250 ml"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {PRESETS.map((ml) => (
            <button
              key={ml}
              type="button"
              onClick={() => addWater(ml)}
              className="flex-1 h-9 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-500 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              {ml < 1000 ? `${ml} ml` : `${ml / 1000} L`}
            </button>
          ))}
          <button
            type="button"
            onClick={() => addWater(250)}
            className="flex-1 h-9 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1"
            title="Tea / coffee count fully as water"
          >
            <Coffee className="w-3.5 h-3.5" />
            Tea
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
