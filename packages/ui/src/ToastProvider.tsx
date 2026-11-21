import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "./cn";
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconCheck,
  IconInfo,
  IconX,
} from "./icons";
import type { ToastTone } from "./toast-types";
import { ToastContext } from "./useToast";

export interface ToastProviderProps {
  children: ReactNode;
}

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  duration: number;
}

const RADIUS = 15;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const variantStyles: Record<
  ToastTone,
  {
    Icon: typeof IconCheck;
    text: string;
    iconBg: string;
    ring: string;
    blob: string;
    role: "status" | "alert";
  }
> = {
  success: {
    Icon: IconCheck,
    text: "text-accent",
    iconBg: "bg-accent/15",
    ring: "stroke-accent",
    blob: "bg-accent",
    role: "status",
  },
  error: {
    Icon: IconAlertCircle,
    text: "text-destructive",
    iconBg: "bg-destructive/15",
    ring: "stroke-destructive",
    blob: "bg-destructive",
    role: "alert",
  },
  info: {
    Icon: IconInfo,
    text: "text-secondary",
    iconBg: "bg-secondary/20",
    ring: "stroke-secondary",
    blob: "bg-secondary",
    role: "status",
  },
  warning: {
    Icon: IconAlertTriangle,
    text: "text-amber-400",
    iconBg: "bg-amber-500/15",
    ring: "stroke-amber-400",
    blob: "bg-amber-500",
    role: "alert",
  },
};

const ToastCard = forwardRef<HTMLDivElement, { toast: ToastItem; onDismiss: (id: string) => void }>(
  function ToastCard({ toast, onDismiss }, ref) {
    const s = variantStyles[toast.tone];
    const Icon = s.Icon;
    const ringRef = useRef<SVGCircleElement>(null);

    useEffect(() => {
      const el = ringRef.current;
      if (!el) return;

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reduce) {
        const t = window.setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => window.clearTimeout(t);
      }

      el.style.animationDuration = `${toast.duration}ms`;
      const onEnd = () => onDismiss(toast.id);
      el.addEventListener("animationend", onEnd);
      return () => el.removeEventListener("animationend", onEnd);
    }, [onDismiss, toast.duration, toast.id]);

    const pause = () => {
      if (ringRef.current) ringRef.current.style.animationPlayState = "paused";
    };
    const resume = () => {
      if (ringRef.current) ringRef.current.style.animationPlayState = "running";
    };

    return (
      <div
        ref={ref}
        role={s.role}
        onPointerEnter={pause}
        onPointerLeave={resume}
        onFocusCapture={pause}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume();
        }}
        className={cn(
          "pointer-events-auto relative w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl",
          "border border-white/10 bg-foreground/90 text-background shadow-xl backdrop-blur-xl",
          "motion-safe:animate-[toast-in_320ms_cubic-bezier(0.16,1,0.3,1)_both]",
        )}
      >
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-3xl",
            s.blob,
          )}
        />
        <div className="relative flex items-start gap-3 p-4">
          <div className="relative h-9 w-9 shrink-0">
            <svg
              viewBox="0 0 36 36"
              className="absolute inset-0 h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="18"
                cy="18"
                r={RADIUS}
                fill="none"
                strokeWidth="2"
                className="stroke-background/15"
              />
              <circle
                ref={ringRef}
                cx="18"
                cy="18"
                r={RADIUS}
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={0}
                className={cn(s.ring, "motion-safe:animate-[toast-ring_linear_forwards]")}
              />
            </svg>
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-[5px] flex items-center justify-center rounded-full",
                s.iconBg,
                s.text,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={2.5} />
            </span>
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-sm font-semibold leading-tight tracking-tight text-background">
              {toast.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="cursor-pointer -mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-background/40 transition-colors hover:bg-background/10 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background/60"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  },
);

export function ToastProvider({ children }: ToastProviderProps) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback((message: string, tone: ToastTone = "info") => {
    const id = crypto.randomUUID();
    setItems((prev) => [...prev, { id, message, tone, duration: 4000 }]);
  }, []);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:inset-x-auto sm:right-0 sm:items-end"
      >
        {items.map((item) => (
          <ToastCard key={item.id} toast={item} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
