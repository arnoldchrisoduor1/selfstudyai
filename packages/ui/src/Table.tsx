import type { TableHTMLAttributes } from "react";

import { cn } from "./cn";

export interface TableProps extends TableHTMLAttributes<HTMLTableElement> {}

export function Table({ className, ...props }: TableProps) {
  return <table className={cn("w-full border-collapse text-left text-sm", className)} {...props} />;
}
