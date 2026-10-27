"use client";

import { useEffect, useRef, useState } from "react";
import { Footprints, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export interface RunData {
  id: string;
  distanceMeters: number;
  durationSeconds: number;
  caloriesBurned: number | null;
  notes: string | null;
}

interface Props {
  sessionId: string;
  run: RunData | null;
  onChange: (run: RunData | null) => void;
}

type Unit = "km" | "m";

function toDistance(meters: number, unit: Unit): string {
  if (meters === 0) return "";
  return unit === "km" ? (meters / 1000).toString() : meters.toString();
}

function fromDistance(value: string, unit: Unit): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return unit === "km" ? Math.round(n * 1000) : Math.round(n);
}

function secondsToClock(total: number): { mm: string; ss: string } {
  const mm = Math.floor(total / 60);
  const ss = total - mm * 60;
  return {
    mm: mm > 0 ? mm.toString() : "",
    ss: ss > 0 ? ss.toString() : "",
  };
}

function clockToSeconds(mm: string, ss: string): number {
  const m = parseInt(mm) || 0;
  const s = parseInt(ss) || 0;
  return m * 60 + s;
}

function formatPace(meters: number, seconds: number): string {
  if (meters === 0 || seconds === 0) return "—";
  const secPerKm = (seconds / meters) * 1000;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm - m * 60);
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

function formatSpeed(meters: number, seconds: number): string {
  if (meters === 0 || seconds === 0) return "—";
  const kph = meters / 1000 / (seconds / 3600);
  return `${kph.toFixed(1)} km/h`;
}

export function RunSection({ sessionId, run, onChange }: Props) {
  const { showToast } = useToast();
  const [unit, setUnit] = useState<Unit>("km");
  const [distance, setDistance] = useState(toDistance(run?.distanceMeters ?? 0, "km"));
  const [mm, setMm] = useState(secondsToClock(run?.durationSeconds ?? 0).mm);
  const [ss, setSs] = useState(secondsToClock(run?.durationSeconds ?? 0).ss);
  const [kcal, setKcal] = useState(run?.caloriesBurned?.toString() ?? "");
  const [notes, setNotes] = useState(run?.notes ?? "");
  const [saving, setSaving] = useState(false);

  // Track last-saved values so we don't send dup PUTs on blur.
  const lastSent = useRef({
    distanceMeters: run?.distanceMeters ?? 0,
    durationSeconds: run?.durationSeconds ?? 0,
    caloriesBurned: run?.caloriesBurned ?? null,
    notes: run?.notes ?? null,
  });

  const focused = useRef(false);

  // Keep local inputs in sync when the server-side run changes (e.g. first fetch)
  // and we're not currently editing.
  useEffect(() => {
    if (focused.current) return;
    setDistance(toDistance(run?.distanceMeters ?? 0, unit));
    const clock = secondsToClock(run?.durationSeconds ?? 0);
    setMm(clock.mm);
    setSs(clock.ss);
    setKcal(run?.caloriesBurned?.toString() ?? "");
    setNotes(run?.notes ?? "");
    lastSent.current = {
      distanceMeters: run?.distanceMeters ?? 0,
      durationSeconds: run?.durationSeconds ?? 0,
      caloriesBurned: run?.caloriesBurned ?? null,
      notes: run?.notes ?? null,
    };
  }, [run?.distanceMeters, run?.durationSeconds, run?.caloriesBurned, run?.notes, unit]);

  const currentMeters = fromDistance(distance, unit);
  const currentSeconds = clockToSeconds(mm, ss);

  const commit = async () => {
    const distanceMeters = currentMeters;
    const durationSeconds = currentSeconds;
    const caloriesBurned = kcal ? Math.max(0, Math.round(Number(kcal))) : null;
    const notesVal = notes.trim() || null;

    const last = lastSent.current;
    if (
      distanceMeters === last.distanceMeters &&
      durationSeconds === last.durationSeconds &&
      caloriesBurned === last.caloriesBurned &&
      notesVal === last.notes
    ) {
      return;
    }
    // Don't persist an empty run just from focus/blur.
    if (!run && distanceMeters === 0 && durationSeconds === 0 && !caloriesBurned && !notesVal) {
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/run`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          distanceMeters,
          durationSeconds,
          caloriesBurned,
          notes: notesVal,
        }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      lastSent.current = {
        distanceMeters: saved.distanceMeters,
        durationSeconds: saved.durationSeconds,
        caloriesBurned: saved.caloriesBurned,
        notes: saved.notes,
      };
      onChange(saved);
    } catch {
      showToast("Failed to save run", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!run) return;
    if (!confirm("Remove the running entry for this workout?")) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/run`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      lastSent.current = {
        distanceMeters: 0,
        durationSeconds: 0,
        caloriesBurned: null,
        notes: null,
      };
      setDistance("");
      setMm("");
      setSs("");
      setKcal("");
      setNotes("");
      onChange(null);
    } catch {
      showToast("Failed to delete run", "error");
    }
  };

  const handleUnitToggle = (next: Unit) => {
    if (next === unit) return;
    // Preserve the actual distance when switching units.
    const meters = fromDistance(distance, unit);
    setUnit(next);
    setDistance(toDistance(meters, next));
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center gap-3 px-1">
        <span className="inline-block w-1.5 h-6 rounded-full bg-sky-500" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
          Running
        </h2>
        <span className="text-xs text-foreground-muted">end-of-workout cardio</span>
        <div className="flex-1 h-px bg-border ml-1" />
      </div>

      <Card>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center flex-shrink-0">
              <Footprints className="w-5 h-5 text-sky-500" />
            </div>
            <div className="flex-1 min-w-0 flex items-center gap-3 text-sm">
              <div>
                <p className="text-foreground-muted text-xs">Pace</p>
                <p className="font-mono font-semibold">
                  {formatPace(currentMeters, currentSeconds)}
                </p>
              </div>
              <div>
                <p className="text-foreground-muted text-xs">Speed</p>
                <p className="font-mono font-semibold">
                  {formatSpeed(currentMeters, currentSeconds)}
                </p>
              </div>
            </div>
            {run && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
                aria-label="Delete run"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Distance + unit toggle */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Distance"
                type="number"
                inputMode="decimal"
                value={distance}
                onFocus={(e) => {
                  focused.current = true;
                  e.currentTarget.select();
                }}
                onBlur={() => {
                  focused.current = false;
                  commit();
                }}
                onChange={(e) => setDistance(e.target.value)}
                suffix={unit}
              />
            </div>
            <div className="flex rounded-lg overflow-hidden border border-border mb-[1px] h-12">
              {(["km", "m"] as Unit[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => handleUnitToggle(u)}
                  className={`px-3 text-sm font-medium transition-colors ${
                    unit === u
                      ? "bg-accent text-background"
                      : "bg-background-secondary text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">
              Duration
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="numeric"
                value={mm}
                placeholder="0"
                onFocus={(e) => {
                  focused.current = true;
                  e.currentTarget.select();
                }}
                onBlur={() => {
                  focused.current = false;
                  commit();
                }}
                onChange={(e) => setMm(e.target.value)}
                suffix="min"
              />
              <Input
                type="number"
                inputMode="numeric"
                value={ss}
                placeholder="0"
                onFocus={(e) => {
                  focused.current = true;
                  e.currentTarget.select();
                }}
                onBlur={() => {
                  focused.current = false;
                  commit();
                }}
                onChange={(e) => setSs(e.target.value)}
                suffix="sec"
              />
            </div>
          </div>

          {/* Calories */}
          <Input
            label="Calories burned (optional)"
            type="number"
            inputMode="numeric"
            value={kcal}
            placeholder="estimate"
            onFocus={(e) => {
              focused.current = true;
              e.currentTarget.select();
            }}
            onBlur={() => {
              focused.current = false;
              commit();
            }}
            onChange={(e) => setKcal(e.target.value)}
            suffix="kcal"
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-foreground-muted mb-1.5">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onFocus={() => {
                focused.current = true;
              }}
              onBlur={() => {
                focused.current = false;
                commit();
              }}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="How did it feel?"
              className="w-full px-4 py-2 bg-background-secondary border border-border rounded-lg text-foreground placeholder:text-foreground-subtle transition-colors duration-150 hover:border-border-hover focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-none"
            />
          </div>

          {saving && (
            <p className="text-xs text-foreground-muted text-right">Saving…</p>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
