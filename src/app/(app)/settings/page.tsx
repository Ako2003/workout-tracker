"use client";

import { useEffect, useState } from "react";
import { Download, Save, Target } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

interface Profile {
  kcalGoal: number | null;
  proteinGoal: number | null;
  carbsGoal: number | null;
  fatGoal: number | null;
  waterGoalMl: number | null;
  bodyweightGoalKg: number | null;
}

const EMPTY: Profile = {
  kcalGoal: null,
  proteinGoal: null,
  carbsGoal: null,
  fatGoal: null,
  waterGoalMl: null,
  bodyweightGoalKg: null,
};

function toStr(v: number | null): string {
  return v == null ? "" : v.toString();
}

export default function SettingsPage() {
  const { showToast } = useToast();
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        setProfile({
          kcalGoal: d.kcalGoal,
          proteinGoal: d.proteinGoal,
          carbsGoal: d.carbsGoal,
          fatGoal: d.fatGoal,
          waterGoalMl: d.waterGoalMl,
          bodyweightGoalKg: d.bodyweightGoalKg,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof Profile, value: string) => {
    const num = value === "" ? null : Number(value);
    setProfile((p) => ({ ...p, [key]: Number.isFinite(num as number) ? num : null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error();
      showToast("Goals saved", "success");
    } catch {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-48 bg-background-secondary rounded animate-pulse" />
        <div className="h-64 bg-background-secondary rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold font-display">Settings</h1>
        <p className="text-sm text-foreground-muted">Goals and data export</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Daily goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            label="Calories"
            type="number"
            inputMode="numeric"
            value={toStr(profile.kcalGoal)}
            onChange={(e) => update("kcalGoal", e.target.value)}
            placeholder="e.g., 2600"
            suffix="kcal"
          />
          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Protein"
              type="number"
              inputMode="numeric"
              value={toStr(profile.proteinGoal)}
              onChange={(e) => update("proteinGoal", e.target.value)}
              placeholder="180"
              suffix="g"
            />
            <Input
              label="Carbs"
              type="number"
              inputMode="numeric"
              value={toStr(profile.carbsGoal)}
              onChange={(e) => update("carbsGoal", e.target.value)}
              placeholder="300"
              suffix="g"
            />
            <Input
              label="Fat"
              type="number"
              inputMode="numeric"
              value={toStr(profile.fatGoal)}
              onChange={(e) => update("fatGoal", e.target.value)}
              placeholder="70"
              suffix="g"
            />
          </div>
          <Input
            label="Water"
            type="number"
            inputMode="numeric"
            value={toStr(profile.waterGoalMl)}
            onChange={(e) => update("waterGoalMl", e.target.value)}
            placeholder="2500"
            suffix="ml"
          />
          <Input
            label="Target body weight"
            type="number"
            inputMode="decimal"
            value={toStr(profile.bodyweightGoalKg)}
            onChange={(e) => update("bodyweightGoalKg", e.target.value)}
            placeholder="e.g., 78"
            suffix="kg"
            step="0.1"
          />
          <Button fullWidth onClick={handleSave} isLoading={saving}>
            <Save className="w-4 h-4 mr-1" />
            Save goals
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-4 h-4 text-accent" />
            Export data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-foreground-muted">
            Download your logs as CSV — one row per set / food entry. Open in
            Numbers, Excel, or share with a coach.
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href="/api/export/workouts"
              className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-background-tertiary hover:bg-background-tertiary/70 border border-border text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Workouts.csv
            </a>
            <a
              href="/api/export/food"
              className="h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-background-tertiary hover:bg-background-tertiary/70 border border-border text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Food.csv
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
