import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableHeadProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableHead({ className, ...props }: TableHeadProps) {
  return <thead className={cn("bg-muted text-muted-foreground", className)} {...props} />;
}
