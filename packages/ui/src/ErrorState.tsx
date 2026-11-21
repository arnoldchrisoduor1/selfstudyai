import { Button } from "./Button";

export interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  "data-testid"?: string;
}

export function ErrorState({ title, message, onRetry, ...props }: ErrorStateProps) {
  return (
    <div
      role="alert"
      data-testid={props["data-testid"] ?? "error-state"}
      className="rounded-lg border-2 border-destructive bg-card p-lg text-card-foreground shadow-sm"
    >
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-sm text-base text-muted-foreground">{message}</p>
      {onRetry ? (
        <div className="mt-md">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
}
