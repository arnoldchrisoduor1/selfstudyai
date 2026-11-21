import { cn } from "./cn";

export interface LoaderProps {
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function Loader({ label = "Loading", className, ...props }: LoaderProps) {
  return (
    <div
      role="status"
      data-testid={props["data-testid"] ?? "loader"}
      className={cn("inline-flex items-center gap-sm text-base text-muted-foreground", className)}
    >
      <span className="flex items-center gap-1" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-primary motion-safe:animate-[dot-bounce_0.6s_ease-in-out_infinite]"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </div>
  );
}
