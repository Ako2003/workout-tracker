"use client";

import { useEffect, useMemo, useState } from "react";
import { Dumbbell, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

interface TemplateExercise {
  exercise: { id: string; name: string; muscleGroup: string };
  order: number;
}

export interface Template {
  id: string;
  name: string;
  slug: string | null;
  isCustom: boolean;
  exercises: TemplateExercise[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Called with the resulting sessionId after the template is applied.
  onStarted: (sessionId: string) => void;
  // When provided, applies to this specific date (yyyy-mm-dd); otherwise today.
  date?: string;
}

export function TemplatePicker({ isOpen, onClose, onStarted, date }: Props) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/templates")
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const presets = useMemo(
    () => templates.filter((t) => !t.isCustom),
    [templates]
  );
  const custom = useMemo(
    () => templates.filter((t) => t.isCustom),
    [templates]
  );

  const start = async (id: string) => {
    setStartingId(id);
    try {
      const res = await fetch(`/api/templates/${id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(date ? { date } : {}),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onStarted(data.sessionId);
    } catch {
      showToast("Failed to start template", "error");
    } finally {
      setStartingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start from a template">
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 bg-background-tertiary rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : (
          <>
            {custom.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                  Your templates
                </h3>
                <div className="space-y-2">
                  {custom.map((t) => (
                    <TemplateCard
                      key={t.id}
                      template={t}
                      isStarting={startingId === t.id}
                      isDeleting={deletingId === t.id}
                      onStart={() => start(t.id)}
                      onDelete={() => remove(t.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground-muted">
                Preset routines
              </h3>
              <div className="space-y-2">
                {presets.map((t) => (
                  <TemplateCard
                    key={t.id}
                    template={t}
                    isStarting={startingId === t.id}
                    onStart={() => start(t.id)}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}

function TemplateCard({
  template,
  isStarting,
  isDeleting,
  onStart,
  onDelete,
}: {
  template: Template;
  isStarting: boolean;
  isDeleting?: boolean;
  onStart: () => void;
  onDelete?: () => void;
}) {
  const names = template.exercises.map((e) => e.exercise.name);
  return (
    <div
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl border border-border bg-background-tertiary/40",
        isStarting && "opacity-60"
      )}
    >
      <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0">
        {template.isCustom ? (
          <Sparkles className="w-5 h-5 text-accent" />
        ) : (
          <Dumbbell className="w-5 h-5 text-accent" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{template.name}</p>
        <p className="text-xs text-foreground-muted truncate">
          {names.length === 0
            ? "No exercises"
            : `${names.slice(0, 3).join(", ")}${
                names.length > 3 ? ` +${names.length - 3} more` : ""
              }`}
        </p>
      </div>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="p-2 rounded-lg text-foreground-subtle hover:text-danger hover:bg-danger/10 transition-colors disabled:opacity-30"
          aria-label="Delete template"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
      <Button size="sm" onClick={onStart} isLoading={isStarting}>
        Start
      </Button>
    </div>
  );
}
