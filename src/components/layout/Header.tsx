"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Dumbbell, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-6 h-6 text-accent" />
          <span className="font-bold font-display text-lg">LIFT</span>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-secondary transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-foreground-muted"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
