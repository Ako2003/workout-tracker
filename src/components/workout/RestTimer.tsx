"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";

const PRESETS = [60, 90, 120, 180];

export function RestTimer() {
  const [target, setTarget] = useState(90);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(90);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setRunning(false);
          try {
            navigator.vibrate?.(300);
          } catch {}
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = (seconds: number) => {
    setTarget(seconds);
    setRemaining(seconds);
    setRunning(true);
  };

  const toggle = () => {
    if (remaining === 0) {
      setRemaining(target);
      setRunning(true);
    } else {
      setRunning((r) => !r);
    }
  };

  const reset = () => {
    setRunning(false);
    setRemaining(target);
  };

  const mm = Math.floor(remaining / 60);
  const ss = remaining - mm * 60;
  const progress = target > 0 ? (1 - remaining / target) * 100 : 0;

  return (
    <div className="fixed bottom-20 right-4 z-40 safe-area-bottom">
      <div className="bg-background-secondary border border-border rounded-xl shadow-lg p-2 flex items-center gap-2">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              strokeWidth="3"
              className="stroke-background-tertiary"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              strokeWidth="3"
              className={
                remaining === 0 ? "stroke-accent" : "stroke-sky-500"
              }
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <Timer className="w-4 h-4 text-foreground-muted" />
        </div>
        <div className="font-mono text-sm w-10 text-center">
          {mm}:{ss.toString().padStart(2, "0")}
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-1.5 rounded hover:bg-background-tertiary transition-colors"
          aria-label={running ? "Pause" : "Start"}
        >
          {running ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          className="p-1.5 rounded hover:bg-background-tertiary transition-colors"
          aria-label="Reset"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 pl-1 border-l border-border">
          {PRESETS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => start(s)}
              className={`text-xs px-1.5 py-0.5 rounded font-medium transition-colors ${
                target === s
                  ? "bg-accent text-background"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              {s < 60 ? `${s}s` : `${s / 60}m`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
