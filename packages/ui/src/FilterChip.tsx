import { cn } from "./cn";

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
  className?: string;
  "data-testid"?: string;
}

export function FilterChip({
  label,
  selected = false,
  onClick,
  disabled = false,
  title,
  className,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex min-h-11 cursor-pointer items-center rounded-full border px-md text-label-md",
        "focus-visible:outline-none focus-visible:shadow-focus",
        "disabled:cursor-not-allowed",
        selected
          ? "border-primary-border bg-primary-subtle text-primary"
          : "border-border bg-surface text-secondary hover:bg-muted",
        className,
      )}
    >
      {label}
    </button>
  );
}
