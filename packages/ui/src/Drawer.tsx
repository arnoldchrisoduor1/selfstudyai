import { useEffect, useId, type ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export interface DrawerProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  "data-testid"?: string;
}

export function Drawer({ open, title, children, onClose, className, ...props }: DrawerProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-modal">
      <button type="button" aria-label="Close drawer" className="absolute inset-0 cursor-pointer bg-foreground/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={props["data-testid"]}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full flex-col gap-md border-l border-border bg-surface p-md text-foreground shadow-lg md:w-drawer",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-sm">
          <h2 id={titleId} className="text-headline-sm">
            {title}
          </h2>
          <Button variant="quiet" onClick={onClose} aria-label="Close drawer">
            Close
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
