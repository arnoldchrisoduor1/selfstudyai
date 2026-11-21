import type { TdHTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {}

export function TableCell({ className, ...props }: TableCellProps) {
  return <td className={cn("min-h-11 px-md py-3 align-middle", className)} {...props} />;
}
