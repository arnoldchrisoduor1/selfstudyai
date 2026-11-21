import { cn } from "./cn";

export interface HeatmapCell {
  date: string;
  questions_answered: number;
  goal_met?: boolean;
}

export interface HeatmapProps {
  days: HeatmapCell[];
  className?: string;
  "data-testid"?: string;
}

function tier(count: number): string {
  if (count <= 0) return "bg-muted";
  if (count < 3) return "bg-accent/40";
  if (count < 8) return "bg-accent";
  return "bg-primary";
}

function chunkWeeks(days: HeatmapCell[]): HeatmapCell[][] {
  const weeks: HeatmapCell[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function Heatmap({ days, className, ...props }: HeatmapProps) {
  if (!days.length) {
    return (
      <p className="text-base text-muted-foreground" data-testid={props["data-testid"]}>
        No activity yet.
      </p>
    );
  }

  const weeks = chunkWeeks(days);

  return (
    <div className={cn("flex flex-col gap-sm", className)} data-testid={props["data-testid"]}>
      <div
        className="flex gap-[3px] overflow-x-auto pb-xs"
        role="img"
        aria-label="Study activity heatmap"
      >
        {weeks.map((week, weekIndex) => (
          <div key={week[0]?.date ?? weekIndex} className="flex flex-col gap-[3px]">
            {week.map((day, dayIndex) => (
              <span
                key={day.date}
                title={`${day.date}: ${day.questions_answered} questions${day.goal_met ? ", goal met" : ""}`}
                className={cn(
                  "h-4 w-4 rounded-[4px] transition-transform duration-150 hover:z-10 hover:scale-125 motion-safe:animate-[heatmap-in_420ms_ease-out_both]",
                  tier(day.questions_answered),
                )}
                style={{ animationDelay: `${Math.min(weekIndex * 18 + dayIndex * 8, 480)}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-sm text-xs text-muted-foreground">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[3px] bg-muted" aria-hidden="true" />
        <span className="h-3 w-3 rounded-[3px] bg-accent/40" aria-hidden="true" />
        <span className="h-3 w-3 rounded-[3px] bg-accent" aria-hidden="true" />
        <span className="h-3 w-3 rounded-[3px] bg-primary" aria-hidden="true" />
        <span>More</span>
      </div>
    </div>
  );
}
