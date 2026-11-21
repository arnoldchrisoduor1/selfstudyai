import { cn } from "./cn";

export interface IconProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Icon({ name, size = "md", className }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "material-symbols-outlined",
        size === "sm" && "icon-sm",
        size === "lg" && "icon-lg",
        className,
      )}
    >
      {name}
    </span>
  );
}
