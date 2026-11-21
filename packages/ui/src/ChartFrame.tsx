import type { ReactNode } from "react";

import { Card } from "./Card";
import { cn } from "./cn";

export interface ChartFrameProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function ChartFrame({ title, description, children, className, ...props }: ChartFrameProps) {
  return (
    <Card data-testid={props["data-testid"]} className={cn("flex flex-col gap-md", className)}>
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-foreground">{title}</h2>
        {description ? <p className="text-body-sm text-text-muted">{description}</p> : null}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}
