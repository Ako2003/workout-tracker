"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Slot = { key: string; hhmm: string; title: string; body: string };

const LS_KEY = "meal-reminders-enabled";

type Permission = "default" | "granted" | "denied" | "unsupported";

function readPermission(): Permission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission as Permission;
}

function minutesUntil(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const now = new Date();
  const target = new Date(now);
  target.setHours(h, m, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  // Only schedule future meals today; past meals are skipped so reloading
  // mid-afternoon doesn't fire a backlog of morning notifications.
  if (diffMs <= 0) return null;
  return Math.ceil(diffMs / 60000);
}

export function useMealReminders(slots: Slot[]) {
  const [permission, setPermission] = useState<Permission>("default");
  const [enabled, setEnabledState] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    setPermission(readPermission());
    if (typeof window !== "undefined") {
      setEnabledState(window.localStorage.getItem(LS_KEY) === "1");
    }
  }, []);

  const clearAll = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  const schedule = useCallback(() => {
    clearAll();
    if (permission !== "granted") return;
    for (const slot of slots) {
      const mins = minutesUntil(slot.hhmm);
      if (mins == null) continue;
      const ms = mins * 60_000;
      // Cap at 12h so we don't hold a timer past end-of-day. The hook
      // re-schedules on each render when `slots` or `enabled` changes.
      if (ms > 12 * 60 * 60 * 1000) continue;
      const id = setTimeout(() => {
        try {
          new Notification(slot.title, { body: slot.body, tag: slot.key });
        } catch {
          // Browser blocked us; nothing to do.
        }
      }, ms);
      timeoutsRef.current.push(id);
    }
  }, [slots, permission, clearAll]);

  useEffect(() => {
    if (enabled) schedule();
    else clearAll();
    return clearAll;
  }, [enabled, schedule, clearAll]);

  const enable = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    let perm = Notification.permission as Permission;
    if (perm === "default") {
      perm = (await Notification.requestPermission()) as Permission;
    }
    setPermission(perm);
    if (perm === "granted") {
      window.localStorage.setItem(LS_KEY, "1");
      setEnabledState(true);
    }
  }, []);

  const disable = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, "0");
    }
    setEnabledState(false);
    clearAll();
  }, [clearAll]);

  return { permission, enabled, enable, disable };
}
