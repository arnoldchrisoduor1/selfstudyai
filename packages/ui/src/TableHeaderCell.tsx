import type { ThHTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableHeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {}

export function TableHeaderCell({ className, scope = "col", ...props }: TableHeaderCellProps) {
  return (
    <th
      scope={scope}
      className={cn("min-h-11 px-md py-3 text-left font-semibold", className)}
      {...props}
    />
  );
}
