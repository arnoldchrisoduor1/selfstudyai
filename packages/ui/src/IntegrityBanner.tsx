import { cn } from "./cn";

export interface IntegrityBannerProps {
  visible: boolean;
  message?: string;
  className?: string;
  "data-testid"?: string;
}

export function IntegrityBanner({
  visible,
  message = "Focus left the test window. This was logged. The browser cannot prevent cheating.",
  className,
  ...props
}: IntegrityBannerProps) {
  if (!visible) return null;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-border bg-muted px-md py-sm text-base text-foreground",
        className,
      )}
      data-testid={props["data-testid"]}
    >
      {message}
    </div>
  );
}