import { cn } from "@/lib/utils";

const muscleColors: Record<string, string> = {
  BICEPS: "bg-muscle-biceps/20 text-muscle-biceps",
  TRICEPS: "bg-muscle-triceps/20 text-muscle-triceps",
  CHEST: "bg-muscle-chest/20 text-muscle-chest",
  BACK: "bg-muscle-back/20 text-muscle-back",
  SHOULDERS: "bg-muscle-shoulders/20 text-muscle-shoulders",
  LEGS: "bg-muscle-legs/20 text-muscle-legs",
  CORE: "bg-muscle-core/20 text-muscle-core",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "muscle";
  muscleGroup?: string;
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  muscleGroup,
  className,
}: BadgeProps) {
  const colorClass =
    variant === "muscle" && muscleGroup
      ? muscleColors[muscleGroup] || "bg-background-tertiary text-foreground-muted"
      : "bg-background-tertiary text-foreground-muted";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium",
        colorClass,
        className
      )}
    >
      {children}
    </span>
  );
}
