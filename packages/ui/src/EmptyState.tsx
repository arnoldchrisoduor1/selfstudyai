export interface EmptyStateProps {
  title: string;
  message: string;
  "data-testid"?: string;
}

export function EmptyState({ title, message, ...props }: EmptyStateProps) {
  return (
    <div
      data-testid={props["data-testid"] ?? "empty-state"}
      className="rounded-lg border border-border bg-card p-lg text-card-foreground shadow-sm"
    >
      <h2 className="font-heading text-xl font-semibold">{title}</h2>
      <p className="mt-sm text-base text-muted-foreground">{message}</p>
    </div>
  );
}
