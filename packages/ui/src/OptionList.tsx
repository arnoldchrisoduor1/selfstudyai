import { cn } from "./cn";

export interface OptionListProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  name?: string;
  className?: string;
  "data-testid"?: string;
}

export function OptionList({ options, value, onChange, name = "options", className, ...props }: OptionListProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Answer options"
      data-testid={props["data-testid"]}
      className={cn("flex flex-col gap-sm", className)}
    >
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            data-testid={props["data-testid"] ? `${props["data-testid"]}-option` : undefined}
            className={cn(
              "min-h-11 cursor-pointer rounded-md border-2 px-md py-3 text-left text-base transition-opacity duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              selected
                ? "border-accent bg-muted text-foreground"
                : "border-border bg-card text-card-foreground hover:opacity-90",
            )}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
