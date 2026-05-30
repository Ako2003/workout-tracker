"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Dumbbell, ChevronRight, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatDate, formatWeight } from "@/lib/utils";

interface Session {
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

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchSessions = useCallback(async (offset = 0) => {
    try {
      const res = await fetch(`/api/sessions?limit=10&offset=${offset}`);
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

  const loadMore = () => {
    setLoadingMore(true);
    fetchSessions(sessions.length);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workout?")) return;

    try {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error("Failed to delete session:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-3">
        <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-background-secondary rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-xl font-bold font-display">Workout History</h1>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-foreground-subtle mx-auto mb-3" />
          <p className="text-foreground-muted mb-4">No workouts yet</p>
          <Link href="/workout">
            <Button>Start Your First Workout</Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onDelete={() => handleDelete(session.id)}
              />
            ))}
          </div>

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
        </>
      )}
    </div>
  );
}

function SessionCard({
  session,
  onDelete,
}: {
  session: Session;
  onDelete: () => void;
}) {
  // Get unique exercise names
  const exerciseNames = [...new Set(session.sets.map((s) => s.exercise.name))];

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
              {exerciseNames.slice(0, 3).join(", ")}
              {exerciseNames.length > 3 && ` +${exerciseNames.length - 3} more`}
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
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="p-1.5 rounded text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
