"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Dumbbell,
  Calendar,
  ChevronRight,
  CalendarPlus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatWeight } from "@/lib/utils";

interface SessionItem {
  id: string;
  date: string;
  notes: string | null;
  exerciseCount: number;
  totalVolume: number;
  totalSets: number;
  sets: {
    exercise: { name: string; muscleGroup: string };
  }[];
}

function toDateInputValue(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sameLocalDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function WorkoutPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [creatingToday, setCreatingToday] = useState(false);
  const [isPastOpen, setIsPastOpen] = useState(false);
  const [pastDate, setPastDate] = useState(toDateInputValue(new Date()));
  const [creatingPast, setCreatingPast] = useState(false);

  const fetchSessions = useCallback(async (offset = 0) => {
    try {
      const res = await fetch(`/api/sessions?limit=15&offset=${offset}`);
      const data = await res.json();
      if (offset === 0) {
        setSessions(data.sessions);
      } else {
        setSessions((prev) => [...prev, ...data.sessions]);
      }
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const today = new Date();
  const todaySession =
    sessions.find((s) => sameLocalDay(new Date(s.date), today)) ?? null;
  const pastSessions = sessions.filter(
    (s) => !sameLocalDay(new Date(s.date), today)
  );

  const startToday = async () => {
    setCreatingToday(true);
    try {
      const res = await fetch("/api/sessions/today", { method: "POST" });
      const data = await res.json();
      if (data?.session?.id) {
        router.push(`/workout/${data.session.id}`);
      } else {
        showToast("Failed to start workout", "error");
      }
    } catch (error) {
      console.error("Failed to start workout:", error);
      showToast("Failed to start workout", "error");
    } finally {
      setCreatingToday(false);
    }
  };

  const createPastWorkout = async () => {
    if (!pastDate) return;
    setCreatingPast(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: pastDate }),
      });
      const data = await res.json();
      if (res.status === 409 && data?.session?.id) {
        // Already exists — just navigate to it.
        setIsPastOpen(false);
        router.push(`/workout/${data.session.id}`);
        return;
      }
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create workout");
      }
      setIsPastOpen(false);
      router.push(`/workout/${data.id}`);
    } catch (error) {
      console.error("Failed to create past workout:", error);
      showToast("Failed to create workout", "error");
    } finally {
      setCreatingPast(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this workout?")) return;
    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete session:", error);
      showToast("Failed to delete workout", "error");
    }
  };

  const loadMore = () => {
    setLoadingMore(true);
    fetchSessions(sessions.length);
  };

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="h-32 bg-background-secondary rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-background-secondary rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold font-display">Workouts</h1>
          <p className="text-sm text-foreground-muted">
            All your training sessions
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => {
            setPastDate(toDateInputValue(new Date()));
            setIsPastOpen(true);
          }}
        >
          <CalendarPlus className="w-4 h-4 mr-1" />
          Log past
        </Button>
      </div>

      {/* Today */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider px-1">
          Today · {formatDate(today)}
        </h2>
        {todaySession ? (
          <TodayCard
            session={todaySession}
            onOpen={() => router.push(`/workout/${todaySession.id}`)}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-5 h-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">No workout yet today</p>
                  <p className="text-xs text-foreground-muted">
                    Tap start to begin logging
                  </p>
                </div>
              </div>
              <Button onClick={startToday} isLoading={creatingToday}>
                <Plus className="w-4 h-4 mr-1" />
                Start
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Past workouts */}
      <section className="space-y-2">
        <h2 className="text-xs font-semibold text-foreground-muted uppercase tracking-wider px-1">
          Past Workouts
        </h2>
        {pastSessions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Calendar className="w-10 h-10 text-foreground-subtle mx-auto mb-2" />
              <p className="text-sm text-foreground-muted">
                No past workouts yet. Your history will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pastSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
            {hasMore && (
              <Button
                variant="secondary"
                fullWidth
                onClick={loadMore}
                isLoading={loadingMore}
              >
                Load More
              </Button>
            )}
          </div>
        )}
      </section>

      {/* Log past workout modal */}
      <Modal
        isOpen={isPastOpen}
        onClose={() => setIsPastOpen(false)}
        title="Log a past workout"
      >
        <div className="p-4 space-y-4">
          <p className="text-sm text-foreground-muted">
            Pick the date you trained on. You can add exercises and sets after.
          </p>
          <Input
            label="Date"
            type="date"
            value={pastDate}
            max={toDateInputValue(new Date())}
            onChange={(e) => setPastDate(e.target.value)}
          />
          <Button
            fullWidth
            onClick={createPastWorkout}
            isLoading={creatingPast}
            disabled={!pastDate}
          >
            Open workout
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function TodayCard({
  session,
  onOpen,
}: {
  session: SessionItem;
  onOpen: () => void;
}) {
  const names = [...new Set(session.sets.map((s) => s.exercise.name))];
  return (
    <Card padding="none">
      <CardContent className="p-0">
        <button
          type="button"
          onClick={onOpen}
          className="w-full text-left flex items-center justify-between p-4 hover:bg-background-tertiary/50 transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
              <Dumbbell className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Continue today&apos;s workout</p>
              <p className="text-xs text-foreground-muted truncate">
                {session.exerciseCount} exercises · {session.totalSets} sets ·{" "}
                {formatWeight(session.totalVolume)} kg vol
              </p>
              {names.length > 0 && (
                <p className="text-xs text-foreground-subtle truncate mt-0.5">
                  {names.slice(0, 3).join(", ")}
                  {names.length > 3 && ` +${names.length - 3} more`}
                </p>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-foreground-muted flex-shrink-0 ml-2" />
        </button>
      </CardContent>
    </Card>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: SessionItem;
  onDelete: () => void;
}) {
  const names = [...new Set(session.sets.map((s) => s.exercise.name))];
  return (
    <Card padding="none">
      <CardContent className="p-0">
        <Link
          href={`/workout/${session.id}`}
          className="flex items-center justify-between p-4 hover:bg-background-tertiary/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-accent" />
              <span className="font-semibold">
                {formatDate(new Date(session.date))}
              </span>
            </div>
            <p className="text-sm text-foreground-muted truncate">
              {names.length > 0
                ? `${names.slice(0, 3).join(", ")}${
                    names.length > 3 ? ` +${names.length - 3} more` : ""
                  }`
                : "No exercises logged"}
            </p>
            <div className="flex items-center gap-4 mt-2 text-xs text-foreground-subtle">
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3 h-3" />
                {session.exerciseCount} exercises
              </span>
              <span>{session.totalSets} sets</span>
              <span>{formatWeight(session.totalVolume)} kg vol</span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-foreground-muted flex-shrink-0 ml-2" />
        </Link>
        <div className="border-t border-border px-4 py-2 flex justify-end">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            title="Delete workout"
            className="p-1.5 rounded text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
