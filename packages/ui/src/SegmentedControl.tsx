import { cn } from "./cn";

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className,
  ...props
}: SegmentedControlProps) {
  return (
    <div className={cn("flex flex-col gap-sm", className)}>
      <span className="text-base text-foreground">{label}</span>
      <div
        role="radiogroup"
        aria-label={label}
        data-testid={props["data-testid"]}
        className="flex flex-wrap gap-sm"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              data-testid={props["data-testid"] ? `${props["data-testid"]}-${option.value}` : undefined}
              className={cn(
                "min-h-11 cursor-pointer rounded-md px-md py-3 text-base font-semibold transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-border bg-transparent text-foreground hover:opacity-80",
              )}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
