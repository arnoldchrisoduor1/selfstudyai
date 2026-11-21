import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
  labelHidden?: boolean;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { label, labelHidden = false, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="flex min-w-0 flex-col gap-xs text-body-md text-foreground">
      <span className={labelHidden ? "sr-only" : undefined}>{label}</span>
      <input
        ref={ref}
        id={inputId}
        type="search"
        className={cn(
          "min-h-11 rounded-md border border-border bg-surface px-md text-body-md text-foreground transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus",
          className,
        )}
        {...props}
      />
    </label>
  );
});
