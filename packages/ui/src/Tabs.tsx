import { cn } from "./cn";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  "data-testid"?: string;
}

export function Tabs({ items, value, onChange, className, ...props }: TabsProps) {
  const index = Math.max(
    0,
    items.findIndex((item) => item.id === value),
  );
  const count = Math.max(items.length, 1);

  return (
    <div
      role="tablist"
      data-testid={props["data-testid"]}
      className={cn("relative grid rounded-full bg-muted p-1", className)}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute bottom-1 top-1 rounded-full bg-card shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
        style={{
          width: `calc((100% - 8px) / ${count})`,
          transform: `translateX(calc(${index} * 100%))`,
          left: 4,
        }}
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "relative z-10 min-h-11 cursor-pointer rounded-full px-md text-sm font-semibold transition-colors duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => onChange(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
