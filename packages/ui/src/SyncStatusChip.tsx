import { Button } from "./Button";
import { StatusChip } from "./StatusChip";
import { cn } from "./cn";

export type SyncDisplayState = "synced" | "syncing" | "offline" | "error";

export interface SyncStatusChipProps {
  state: SyncDisplayState;
  message?: string | null;
  onRetry?: () => void;
  className?: string;
  "data-testid"?: string;
}

const labels: Record<SyncDisplayState, string> = {
  synced: "Synced",
  syncing: "Syncing",
  offline: "Offline",
  error: "Sync error",
};

const tones: Record<SyncDisplayState, "neutral" | "accent" | "danger"> = {
  synced: "accent",
  syncing: "neutral",
  offline: "neutral",
  error: "danger",
};

export function SyncStatusChip({ state, message, onRetry, className, ...props }: SyncStatusChipProps) {
  return (
    <div className={cn("flex flex-col items-end gap-sm", className)} data-testid={props["data-testid"]}>
      <div className="flex flex-wrap items-center justify-end gap-sm">
        <StatusChip label={labels[state]} tone={tones[state]} data-testid="sync-status-chip" />
        {state === "error" && onRetry ? (
          <Button variant="secondary" onClick={onRetry} data-testid="sync-retry">
            Retry
          </Button>
        ) : null}
      </div>
      {message ? (
        <p className="max-w-xs text-right text-sm text-muted-foreground" data-testid="sync-status-message">
          {message}
        </p>
      ) : null}
    </div>
  );
}