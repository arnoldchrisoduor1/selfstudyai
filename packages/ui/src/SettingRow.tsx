import type { ReactNode } from "react";

import { cn } from "./cn";
import { StatusChip } from "./StatusChip";

export interface SettingRowProps {
  label: string;
  source?: string;
  helper?: string;
  control: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function SettingRow({ label, source, helper, control, className, ...props }: SettingRowProps) {
  return (
    <div className={cn("flex flex-col gap-sm", className)} data-testid={props["data-testid"]}>
      <div className="flex flex-wrap items-center gap-sm">
        <span className="text-base font-semibold text-foreground">{label}</span>
        {source ? <StatusChip label={source} tone="neutral" /> : null}
      </div>
      {control}
      {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
    </div>
  );
}