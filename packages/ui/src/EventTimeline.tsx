import { cn } from "./cn";

export interface TimelineEvent {
  id: string;
  kind: string;
  at: string;
  detail?: string;
}

export interface EventTimelineProps {
  events: TimelineEvent[];
  className?: string;
  "data-testid"?: string;
}

export function EventTimeline({ events, className, ...props }: EventTimelineProps) {
  if (!events.length) {
    return (
      <p className="text-base text-muted-foreground" data-testid={props["data-testid"]}>
        No events.
      </p>
    );
  }

  return (
    <ol className={cn("flex flex-col gap-sm", className)} data-testid={props["data-testid"]}>
      {events.map((event) => (
        <li key={event.id} className="rounded-md border border-border bg-card px-md py-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-sm">
            <span className="text-base font-semibold text-foreground">{event.kind}</span>
            <time className="text-sm text-muted-foreground">{event.at}</time>
          </div>
          {event.detail ? <p className="text-sm text-muted-foreground">{event.detail}</p> : null}
        </li>
      ))}
    </ol>
  );
}