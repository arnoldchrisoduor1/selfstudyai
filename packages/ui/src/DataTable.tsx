import type { ReactNode } from "react";

import { cn } from "./cn";
import { Table } from "./Table";
import { TableBody } from "./TableBody";
import { TableCell } from "./TableCell";
import { TableHead } from "./TableHead";
import { TableHeaderCell } from "./TableHeaderCell";
import { TableRow } from "./TableRow";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: "left" | "right";
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  caption?: string;
  emptyTitle?: string;
  emptyMessage?: string;
  /** Flush inside a parent card — no second frame. */
  embedded?: boolean;
  "data-testid"?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowId,
  caption,
  emptyTitle = "No rows",
  emptyMessage = "Nothing to show yet.",
  embedded = false,
  className,
  ...props
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden",
        embedded
          ? "rounded-lg"
          : "rounded-xl border border-border bg-card shadow-md shadow-foreground/5",
        className,
      )}
      data-testid={props["data-testid"]}
    >
      <div className="max-h-[36rem] overflow-auto">
        <Table className="min-w-full">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHead>
            <TableRow className="border-b border-border bg-muted/80">
              {columns.map((column) => (
                <TableHeaderCell
                  key={column.key}
                  className={cn(
                    "sticky top-0 z-10 bg-muted/95 text-xs uppercase tracking-wider text-muted-foreground backdrop-blur",
                    column.align === "right" && "text-right",
                  )}
                >
                  {column.header}
                </TableHeaderCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, index) => (
              <TableRow
                key={getRowId(row)}
                className={cn(
                  "border-b border-border/60 transition-colors last:border-0 hover:bg-muted/70",
                  "motion-safe:animate-[reveal-up_320ms_ease-out_both]",
                )}
                style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
              >
                {columns.map((column) => (
                  <TableCell
                    key={column.key}
                    className={cn(column.align === "right" && "text-right tabular-nums")}
                  >
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="px-md py-16 text-center">
                  <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{emptyMessage}</p>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between border-t border-border px-md py-3 text-xs text-muted-foreground">
        <span aria-live="polite">
          Showing {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
