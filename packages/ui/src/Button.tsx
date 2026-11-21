import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "./cn";
import { IconCheck, IconX } from "./icons";

export type ButtonStatus = "idle" | "loading" | "success" | "error";
export type ButtonVariant = "primary" | "secondary" | "accent" | "destructive" | "quiet" | "quiet-destructive";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  /** Async action — drives loading/success/error when provided. */
  onAction?: () => Promise<unknown>;
  status?: ButtonStatus;
  idleLabel?: ReactNode;
  loadingLabel?: ReactNode;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  resetDelay?: number;
}

const idleGradient: Record<Exclude<ButtonVariant, "quiet" | "quiet-destructive">, string> = {
  primary: "from-secondary via-primary to-primary",
  secondary: "from-secondary via-primary to-primary",
  accent: "from-accent via-accent to-accent",
  destructive: "from-destructive via-destructive to-destructive",
};

const idleShadow: Record<Exclude<ButtonVariant, "quiet" | "quiet-destructive">, string> = {
  primary: "shadow-primary/30 hover:shadow-primary/35",
  secondary: "shadow-primary/30 hover:shadow-primary/35",
  accent: "shadow-accent/30 hover:shadow-accent/35",
  destructive: "shadow-destructive/30 hover:shadow-destructive/35",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    className,
    type = "button",
    onAction,
    status: controlledStatus,
    idleLabel,
    loadingLabel = "Working…",
    successLabel = "Completed",
    errorLabel = "Failed",
    resetDelay = 2200,
    children,
    onClick,
    disabled,
    ...props
  },
  ref,
) {
  const [internal, setInternal] = useState<ButtonStatus>("idle");
  const status = controlledStatus ?? internal;
  const mounted = useRef(true);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  const runAction = useCallback(async () => {
    if (status !== "idle" || !onAction) return;
    setInternal("loading");
    let next: ButtonStatus = "success";
    try {
      await onAction();
    } catch {
      next = "error";
    }
    if (!mounted.current) return;
    setInternal(next);
    resetTimer.current = setTimeout(() => {
      if (mounted.current) setInternal("idle");
    }, resetDelay);
  }, [status, onAction, resetDelay]);

  const isBusy = status === "loading";
  const isIdle = status === "idle";
  const label =
    status === "loading"
      ? loadingLabel
      : status === "success"
        ? successLabel
        : status === "error"
          ? errorLabel
          : (idleLabel ?? children);

  if (variant === "quiet" || variant === "quiet-destructive") {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        onClick={onClick}
        className={cn(
          "inline-flex h-9 min-h-9 cursor-pointer items-center justify-center rounded-lg px-3 text-sm font-semibold",
          "bg-transparent shadow-none transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variant === "quiet"
            ? "text-primary hover:bg-muted"
            : "text-destructive hover:bg-destructive/10",
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  }

  const fill =
    status === "loading"
      ? "from-primary via-secondary to-primary"
      : status === "success"
        ? "from-accent via-accent to-accent"
        : status === "error"
          ? "from-destructive via-destructive to-destructive"
          : idleGradient[variant];

  return (
    <button
      ref={ref}
      type={type}
      aria-busy={isBusy}
      aria-disabled={!isIdle || disabled}
      disabled={disabled || (!isIdle && Boolean(onAction))}
      onClick={(event) => {
        if (onAction) {
          event.preventDefault();
          void runAction();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "relative inline-flex cursor-pointer select-none items-center justify-center overflow-hidden font-semibold text-primary-foreground",
        size === "sm" ? "h-9 min-h-9 min-w-0 rounded-lg px-3 text-sm" : "h-12 min-h-11 rounded-xl px-6",
        "shadow-md transition-[opacity,box-shadow] duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "hover:opacity-95 hover:shadow-lg",
        idleShadow[variant],
        isBusy && "cursor-wait",
        (!isIdle || disabled) && !isBusy && "cursor-default opacity-90",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 bg-gradient-to-r", fill)} />
      {status === "loading" ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 motion-safe:animate-[btn-shimmer_1.4s_linear_infinite] bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.35)_50%,transparent_75%)]"
        />
      ) : null}
      <span className="relative z-10 flex items-center justify-center gap-2" role="status" aria-live="polite">
        {status === "loading" ? (
          <span className="flex items-center gap-1" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-1.5 w-1.5 rounded-full bg-primary-foreground motion-safe:animate-[dot-bounce_0.6s_ease-in-out_infinite]"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : null}
        {status === "success" ? <IconCheck className="h-4 w-4" strokeWidth={3} /> : null}
        {status === "error" ? <IconX className="h-4 w-4" strokeWidth={3} /> : null}
        <span>{label}</span>
      </span>
    </button>
  );
});
