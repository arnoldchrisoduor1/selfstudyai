import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "./Button";
import { cn } from "./cn";

export type IntegrityEventKind =
  | "tab_hidden"
  | "focus_lost"
  | "fullscreen_exit"
  | "copy"
  | "paste"
  | "context_menu"
  | "resize";

export interface FullscreenGateProps {
  active: boolean;
  onEvent?: (kind: IntegrityEventKind) => void;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function FullscreenGate({ active, onEvent, children, className, ...props }: FullscreenGateProps) {
  const [granted, setGranted] = useState(!active);

  const report = useCallback(
    (kind: IntegrityEventKind) => {
      onEvent?.(kind);
    },
    [onEvent],
  );

  useEffect(() => {
    if (!active || !granted) return;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") report("tab_hidden");
    };
    const onBlur = () => report("focus_lost");
    const onFs = () => {
      if (!document.fullscreenElement) {
        report("fullscreen_exit");
        setGranted(false);
      }
    };
    const onCopy = () => report("copy");
    const onPaste = () => report("paste");
    const onContext = () => report("context_menu");
    const onResize = () => report("resize");

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFs);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    window.addEventListener("resize", onResize);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFs);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      window.removeEventListener("resize", onResize);
    };
  }, [active, granted, report]);

  async function enterFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setGranted(true);
    } catch {
      setGranted(true);
    }
  }

  if (!active) return <>{children}</>;

  if (!granted) {
    return (
      <div
        className={cn("flex max-w-lg flex-col gap-md rounded-md border border-border bg-card p-lg", className)}
        data-testid={props["data-testid"]}
      >
        <h2 className="font-heading text-xl font-semibold text-foreground">Fullscreen required</h2>
        <p className="text-base text-muted-foreground">
          This test uses focus mode. Enter fullscreen to begin. Integrity events are logged in the browser but
          cannot prevent cheating.
        </p>
        <Button onClick={enterFullscreen} data-testid="fullscreen-enter">
          Enter fullscreen
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}