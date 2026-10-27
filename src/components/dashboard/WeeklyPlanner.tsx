"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Calendar, Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TemplatePicker } from "@/components/workout/TemplatePicker";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  date: string;
  template: { id: string; name: string };
}

interface SessionLite {
  id: string;
  date: string;
  totalSets: number;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // Monday-first week; getDay() is 0=Sun, 1=Mon…
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function WeeklyPlanner() {
  const { showToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<SessionLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerDate, setPickerDate] = useState<string | null>(null);
  const [actionDate, setActionDate] = useState<string | null>(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const fetchWeek = useCallback(async () => {
    setLoading(true);
    try {
      const from = iso(weekStart);
      const to = iso(weekEnd);
      const [plansRes, sessionsRes] = await Promise.all([
        fetch(`/api/plans?from=${from}&to=${to}`),
        // Use the paginated sessions list and filter client-side; the
        // list is already keyed by date desc, and 20 entries is more than
        // a week.
        fetch(`/api/sessions?limit=50&offset=0`),
      ]);
      const plansData = await plansRes.json();
      const sessionsData = await sessionsRes.json();
      setPlans(Array.isArray(plansData) ? plansData : []);
      setSessions(sessionsData.sessions ?? []);
    } catch {
      // keep whatever we have
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    fetchWeek();
  }, [fetchWeek]);

  const planByDate = useMemo(() => {
    const m = new Map<string, Plan>();
    for (const p of plans) {
      const d = new Date(p.date);
      m.set(iso(d), p);
    }
    return m;
  }, [plans]);

  const sessionByDate = useMemo(() => {
    const m = new Map<string, SessionLite>();
    for (const s of sessions) {
      const d = new Date(s.date);
      m.set(iso(d), s);
    }
    return m;
  }, [sessions]);

  const clearPlan = async (dateStr: string) => {
    try {
      const res = await fetch(`/api/plans?date=${dateStr}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setPlans((prev) =>
        prev.filter((p) => iso(new Date(p.date)) !== dateStr)
      );
      setActionDate(null);
    } catch {
      showToast("Failed to clear plan", "error");
    }
  };

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(startOfWeek(d));
  };

  const today = new Date();
  const todayStr = iso(new Date(today.getFullYear(), today.getMonth(), today.getDate()));

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between mb-0">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Weekly plan
          </CardTitle>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftWeek(-1)}
              className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="text-xs font-medium text-foreground-muted hover:text-foreground px-2"
            >
              This week
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(1)}
              className="p-1.5 rounded-lg hover:bg-background-tertiary text-foreground-muted transition-colors"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d, i) => {
              const dStr = iso(d);
              const plan = planByDate.get(dStr);
              const session = sessionByDate.get(dStr);
              const isToday = dStr === todayStr;
              const isPast = d < today && !isToday;
              const didWorkout = session && session.totalSets > 0;
              return (
                <button
                  key={dStr}
                  type="button"
                  onClick={() =>
                    plan
                      ? setActionDate(dStr)
                      : (() => {
                          setPickerDate(dStr);
                        })()
                  }
                  className={cn(
                    "flex flex-col items-center justify-start gap-1 p-2 rounded-lg border transition-colors text-center",
                    isToday
                      ? "border-accent bg-accent/5"
                      : "border-border bg-background-tertiary/40 hover:bg-background-tertiary"
                  )}
                >
                  <span className="text-[10px] font-semibold text-foreground-muted uppercase tracking-wide">
                    {DAY_LABELS[i]}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold",
                      isToday ? "text-accent" : "text-foreground"
                    )}
                  >
                    {d.getDate()}
                  </span>
                  <div className="h-6 flex items-center justify-center">
                    {didWorkout ? (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent/20 text-accent"
                        title="Workout logged"
                      >
                        <Check className="w-3 h-3" />
                      </span>
                    ) : plan ? (
                      <span className="text-[10px] text-accent font-semibold truncate max-w-full">
                        {plan.template.name}
                      </span>
                    ) : isPast ? (
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-background-tertiary text-foreground-subtle"
                        title="Rest day"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    ) : (
                      <span className="text-foreground-subtle">
                        <Plus className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {loading && (
            <p className="text-xs text-foreground-muted text-center mt-2">
              Loading…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Pick template to plan a day */}
      <TemplatePicker
        isOpen={pickerDate !== null}
        onClose={() => setPickerDate(null)}
        date={pickerDate ?? undefined}
        onStarted={() => {
          // The /start endpoint created the session, added the template's
          // exercises, and upserted the WorkoutPlan. Just refresh the grid.
          setPickerDate(null);
          fetchWeek();
        }}
      />

      {/* Action modal for an already-planned day */}
      <Modal
        isOpen={actionDate !== null}
        onClose={() => setActionDate(null)}
        title={
          actionDate
            ? planByDate.get(actionDate)?.template.name ?? "Plan"
            : "Plan"
        }
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-foreground-muted">
            {actionDate &&
              new Date(actionDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
          </p>
          {actionDate &&
            (sessionByDate.get(actionDate) ? (
              <Link
                href={`/workout/${sessionByDate.get(actionDate)!.id}`}
                className="block"
              >
                <Button fullWidth>Open workout</Button>
              </Link>
            ) : (
              <Button
                fullWidth
                onClick={() => {
                  setPickerDate(actionDate);
                  setActionDate(null);
                }}
              >
                Start this workout
              </Button>
            ))}
          <Button
            variant="secondary"
            fullWidth
            onClick={() => actionDate && clearPlan(actionDate)}
          >
            Remove plan
          </Button>
        </div>
      </Modal>
    </>
  );
}
