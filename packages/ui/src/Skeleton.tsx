import { cn } from "./cn";

export interface SkeletonProps {
  className?: string;
  "data-testid"?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid={props["data-testid"]}
      className={cn("animate-pulse rounded-md bg-muted motion-reduce:animate-none", className)}
    />
  );
}
