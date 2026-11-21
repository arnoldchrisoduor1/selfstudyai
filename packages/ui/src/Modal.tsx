import { useEffect, useId, type ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
  "data-testid"?: string;
}

export function Modal({ open, title, children, onClose, className, ...props }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/40 p-md">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid={props["data-testid"]}
        className={cn("w-full max-w-md rounded-lg bg-card p-lg text-card-foreground shadow-lg", className)}
      >
        <div className="mb-md flex items-center justify-between gap-sm">
          <h2 id={titleId} className="font-heading text-xl font-semibold">
            {title}
          </h2>
          <Button variant="secondary" onClick={onClose} aria-label="Close dialog">
            Close
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
