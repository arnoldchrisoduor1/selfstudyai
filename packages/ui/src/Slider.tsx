import { forwardRef, useId, type InputHTMLAttributes } from "react";

import { cn } from "./cn";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: string;
}

export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  { label, className, id, ...props },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <label htmlFor={inputId} className="flex min-h-11 flex-col justify-center gap-xs text-body-md text-foreground">
      <span>{label}</span>
      <input
        ref={ref}
        id={inputId}
        type="range"
        className={cn("w-full cursor-pointer accent-primary", className)}
        {...props}
      />
    </label>
  );
});
