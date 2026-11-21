import { cn } from "./cn";

export interface ToggleProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  className?: string;
  "data-testid"?: string;
}

export function Toggle({ checked, onCheckedChange, label, className, ...props }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center gap-sm text-base text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-primary" : "bg-border",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 block h-5 w-5 rounded-full bg-card transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </span>
      <span>{label}</span>
    </button>
  );
}
