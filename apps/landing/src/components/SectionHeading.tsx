import { cn } from "@self-study/ui/cn";

export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  className?: string;
  id?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  className,
  id,
}: SectionHeadingProps) {
  const centered = align === "center";
  return (
    <div
      id={id}
      className={cn(
        "flex max-w-2xl flex-col gap-sm",
        centered && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      ) : null}
      <h2 className="font-heading text-3xl font-semibold text-foreground">{title}</h2>
      {description ? <p className="text-base text-muted-foreground">{description}</p> : null}
    </div>
  );
}