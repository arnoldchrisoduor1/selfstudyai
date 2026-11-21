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

const variants: Record<ButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "border border-border bg-transparent text-secondary hover:bg-muted",
  accent: "border border-status-strong bg-status-strong text-primary-foreground hover:opacity-90",
  destructive: "border border-destructive bg-destructive text-destructive-foreground hover:opacity-90",
  quiet: "border border-transparent bg-transparent text-text-muted hover:bg-muted",
  "quiet-destructive": "border border-transparent bg-transparent text-destructive hover:bg-destructive/10",
};

const statusClass: Record<Exclude<ButtonStatus, "idle">, string> = {
  loading: "border-primary bg-primary text-primary-foreground",
  success: "border-status-strong bg-status-strong text-primary-foreground",
  error: "border-destructive bg-destructive text-destructive-foreground",
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
  }, [onAction, resetDelay, status]);

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

  const quiet = variant === "quiet" || variant === "quiet-destructive";

  return (
    <button
      ref={ref}
      type={type}
      aria-busy={!quiet && isBusy}
      aria-disabled={!quiet && (!isIdle || disabled)}
      disabled={disabled || (!quiet && !isIdle && Boolean(onAction))}
      onClick={(event) => {
        if (!quiet && onAction) {
          event.preventDefault();
          void runAction();
          return;
        }
        onClick?.(event);
      }}
      className={cn(
        "inline-flex min-h-11 cursor-pointer select-none items-center justify-center gap-sm rounded-md font-semibold",
        size === "sm" ? "px-sm text-label-sm" : "px-md text-label-md",
        "transition-colors duration-fast ease-standard",
        "focus-visible:outline-none focus-visible:shadow-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isBusy && "cursor-wait",
        status === "idle" || quiet ? variants[variant] : statusClass[status],
        className,
      )}
      {...props}
    >
      {!quiet && status === "loading" ? (
        <span className="flex items-center gap-xs" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="h-xs w-xs rounded-full bg-primary-foreground motion-safe:animate-[dot-bounce_0.6s_ease-in-out_infinite]"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </span>
      ) : null}
      {!quiet && status === "success" ? <IconCheck className="h-md w-md" strokeWidth={3} /> : null}
      {!quiet && status === "error" ? <IconX className="h-md w-md" strokeWidth={3} /> : null}
      <span className="inline-flex items-center gap-sm">{quiet ? children : label}</span>
    </button>
  );
});
