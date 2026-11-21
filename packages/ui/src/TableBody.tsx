import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableBodyProps extends HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className, ...props }: TableBodyProps) {
  return <tbody className={cn("bg-card text-card-foreground", className)} {...props} />;
}
