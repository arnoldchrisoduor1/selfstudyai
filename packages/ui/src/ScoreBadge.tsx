import { cn } from "./cn";

export interface ScoreBadgeProps {
  score: number;
  verdict: string;
  className?: string;
  "data-testid"?: string;
}

const tones: Record<string, string> = {
  correct: "bg-accent text-accent-foreground",
  partial: "bg-muted text-foreground",
  incorrect: "bg-destructive text-destructive-foreground",
};

export function ScoreBadge({ score, verdict, className, ...props }: ScoreBadgeProps) {
  const tone = tones[verdict] ?? tones.partial;
  return (
    <span
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-md py-2 text-base font-semibold",
        tone,
        className,
      )}
    >
      {verdict} · {Math.round(score * 100)}%
    </span>
  );
}
