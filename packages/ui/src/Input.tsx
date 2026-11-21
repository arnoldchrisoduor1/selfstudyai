import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="flex flex-col gap-sm text-base text-foreground">
      <span>{label}</span>
      <input
        ref={ref}
        id={inputId}
        className={cn(
          "min-h-11 rounded-md border border-border bg-card px-md py-3 text-base text-card-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      />
    </label>
  );
});
