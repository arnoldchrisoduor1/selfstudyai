import type { HTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {}

export function TableRow({ className, ...props }: TableRowProps) {
  return <tr className={cn("border-b border-border", className)} {...props} />;
}
