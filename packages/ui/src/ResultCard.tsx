import type { ReactNode } from "react";

import { cn } from "./cn";

export interface ResultCardProps {
  sourceTitle: string;
  topicTitle: string;
  pageRef?: string | null;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function ResultCard({
  sourceTitle,
  topicTitle,
  pageRef,
  children,
  className,
  ...props
}: ResultCardProps) {
  return (
    <article
      data-testid={props["data-testid"]}
      className={cn("flex flex-col gap-sm border-b border-border py-md", className)}
    >
      <div className="flex flex-wrap items-baseline gap-sm text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{sourceTitle}</span>
        <span aria-hidden="true">·</span>
        <span>{topicTitle}</span>
        {pageRef ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{pageRef}</span>
          </>
        ) : null}
      </div>
      <div className="text-base text-foreground">{children}</div>
    </article>
  );
}
