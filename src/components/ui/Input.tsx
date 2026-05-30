"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  suffix?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, error, suffix, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground-muted mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            type={type}
            id={inputId}
            className={cn(
              "w-full h-12 px-4 bg-background-secondary border border-border rounded-lg",
              "text-foreground placeholder:text-foreground-subtle",
              "transition-colors duration-150",
              "hover:border-border-hover",
              "focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent",
              error && "border-danger focus:border-danger focus:ring-danger",
              suffix && "pr-12",
              type === "number" && "font-mono",
              className
            )}
            ref={ref}
            {...props}
          />
          {suffix && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground-subtle text-sm font-medium">
              {suffix}
            </span>
          )}
        </div>
        {error && (
          <p className="mt-1.5 text-sm text-danger">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
