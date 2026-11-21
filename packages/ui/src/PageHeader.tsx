import type { ReactNode } from "react";

import { cn } from "./cn";

export interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function PageHeader({ title, eyebrow, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header
      data-testid={props["data-testid"]}
      className={cn("flex flex-col gap-sm md:flex-row md:items-end md:justify-between", className)}
    >
      <div className="flex min-w-0 flex-col gap-xs">
        {eyebrow ? <p className="text-label-sm uppercase text-text-muted">{eyebrow}</p> : null}
        <h1 className="font-heading text-headline-lg text-foreground">{title}</h1>
        {description ? <p className="max-w-reading text-body-md text-text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-sm">{actions}</div> : null}
    </header>
  );
}
