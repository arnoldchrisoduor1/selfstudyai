import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import { cn } from "./cn";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const areaId = id ?? generatedId;

  return (
    <label htmlFor={areaId} className="flex flex-col gap-sm text-base text-foreground">
      <span>{label}</span>
      <textarea
        ref={ref}
        id={areaId}
        className={cn(
          "min-h-24 w-full rounded-md border border-border bg-card px-md py-3 text-base text-card-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className,
        )}
        {...props}
      />
    </label>
  );
});
