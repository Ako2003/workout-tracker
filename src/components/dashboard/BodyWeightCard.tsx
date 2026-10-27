"use client";

import { useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface BodyWeightEntry {
  id: string;
  weightKg: number;
  date: string;
}

export function BodyWeightCard() {
  const { showToast } = useToast();
  const [entries, setEntries] = useState<BodyWeightEntry[]>([]);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/bodyweight?limit=30")
      .then((r) => r.json())
      .then((d) => setEntries(Array.isArray(d) ? d : []))
      .catch(() => setEntries([]));
  }, []);

  const latest = entries[0];
  const prior = entries[1];
  const delta = useMemo(() => {
    if (!latest || !prior) return null;
    const d = latest.weightKg - prior.weightKg;
    return Math.round(d * 10) / 10;
  }, [latest, prior]);

  const handleSave = async () => {
    const kg = parseFloat(input);
    if (!Number.isFinite(kg) || kg <= 0) {
      showToast("Enter a valid weight", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bodyweight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weightKg: kg }),
      });
      if (!res.ok) throw new Error();
      const saved = await res.json();
      setEntries((prev) => {
        const withoutToday = prev.filter(
          (e) =>
            new Date(e.date).toDateString() !== new Date(saved.date).toDateString()
        );
        return [saved, ...withoutToday];
      });
      setInput("");
      showToast("Weight saved", "success");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-accent" />
          Body Weight
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <p className="text-3xl font-bold font-mono">
              {latest ? latest.weightKg.toFixed(1) : "—"}
              <span className="text-sm font-medium text-foreground-muted ml-1">
                kg
              </span>
            </p>
            {delta !== null && (
              <p
                className={`text-xs mt-0.5 ${
                  delta > 0
                    ? "text-orange-500"
                    : delta < 0
                      ? "text-sky-500"
                      : "text-foreground-muted"
                }`}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)} kg vs last
              </p>
            )}
          </div>
          <div className="w-28">
            <Input
              type="number"
              inputMode="decimal"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="today"
              suffix="kg"
              step="0.1"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
            />
          </div>
          <Button
            onClick={handleSave}
            isLoading={saving}
            disabled={!input}
            size="md"
          >
            Log
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
