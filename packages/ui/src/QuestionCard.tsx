import type { ReactNode } from "react";

import { Badge } from "./Badge";
import { cn } from "./cn";

export interface QuestionCardProps {
  stem: string;
  kind: string;
  cognitiveLevel: string;
  grounding: string;
  children?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function QuestionCard({
  stem,
  kind,
  cognitiveLevel,
  grounding,
  children,
  className,
  ...props
}: QuestionCardProps) {
  return (
    <article
      data-testid={props["data-testid"]}
      className={cn("flex flex-col gap-md", className)}
    >
      <div className="flex flex-wrap gap-sm">
        <Badge label={kind} />
        <Badge label={cognitiveLevel} />
        <Badge
          label={grounding === "online" ? "online grounded" : "notes"}
          tone={grounding === "online" ? "accent" : "neutral"}
          data-testid="grounding-badge"
        />
      </div>
      <h2 className="font-heading text-2xl font-semibold text-foreground">{stem}</h2>
      {children}
    </article>
  );
}
