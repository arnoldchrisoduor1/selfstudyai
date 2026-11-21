import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="inline-flex min-h-11 cursor-pointer items-center gap-sm text-body-md text-foreground">
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className={cn(
          "h-md w-md cursor-pointer rounded-sm border border-border bg-surface text-primary",
          "focus-visible:outline-none focus-visible:shadow-focus",
          className,
        )}
        {...props}
      />
      <span>{label}</span>
    </label>
  );
});
