import { forwardRef } from "react";

import { Textarea, type TextareaProps } from "./Textarea";
import { cn } from "./cn";

export interface AnswerEditorProps extends Omit<TextareaProps, "label"> {
  label?: string;
}

export const AnswerEditor = forwardRef<HTMLTextAreaElement, AnswerEditorProps>(function AnswerEditor(
  { label = "Your answer", className, ...props },
  ref,
) {
  return <Textarea ref={ref} label={label} className={cn("min-h-32", className)} {...props} />;
});
