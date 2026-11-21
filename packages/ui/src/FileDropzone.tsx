import { forwardRef, useId, useRef, type ChangeEvent, type DragEvent } from "react";

import { cn } from "./cn";

export interface FileDropzoneProps {
  label: string;
  hint?: string;
  accept?: string;
  disabled?: boolean;
  onFile: (file: File) => void;
  className?: string;
  "data-testid"?: string;
}

export const FileDropzone = forwardRef<HTMLInputElement, FileDropzoneProps>(function FileDropzone(
  { label, hint = "Drop a file or click to browse", accept, disabled, onFile, className, ...props },
  ref,
) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function assignRef(node: HTMLInputElement | null) {
    inputRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    handleFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    if (disabled) return;
    handleFiles(event.dataTransfer.files);
  }

  return (
    <div className={cn("flex flex-col gap-sm", className)} data-testid={props["data-testid"]}>
      <label htmlFor={generatedId} className="text-base text-foreground">
        {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
        className={cn(
          "flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border bg-card px-md py-lg text-center text-base text-muted-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span>{hint}</span>
        {accept ? <span className="mt-sm text-sm">{accept}</span> : null}
      </button>
      <input
        ref={assignRef}
        id={generatedId}
        type="file"
        className="sr-only"
        accept={accept}
        disabled={disabled}
        aria-label={label}
        onChange={onChange}
      />
    </div>
  );
});
