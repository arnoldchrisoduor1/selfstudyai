import type { ReactNode } from "react";

import { cn } from "./cn";

export interface SidebarItem {
  href: string;
  label: string;
  current?: boolean;
  icon?: ReactNode;
}

export interface SidebarProps {
  title: string;
  items: SidebarItem[];
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  /** Mobile drawer visibility. Ignored at md+. */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  id?: string;
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      width="16"
      height="16"
    >
      <path
        d="M12.5 4.5 7 10l5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar({
  title,
  items,
  className,
  collapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onMobileClose,
  id = "app-sidebar",
}: SidebarProps) {
  const expanded = !collapsed;

  return (
    <aside
      id={id}
      data-testid="sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      data-mobile-open={mobileOpen ? "true" : "false"}
      className={cn(
        "relative z-40 flex h-dvh max-h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-card",
        "transition-[width,transform] duration-[320ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
        // Desktop widths
        "md:translate-x-0",
        collapsed ? "md:w-16" : "md:w-60",
        // Mobile drawer
        "fixed inset-y-0 left-0 w-60 md:static",
        mobileOpen ? "translate-x-0 shadow-lg" : "-translate-x-full md:shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-sm border-b border-border px-md",
          collapsed && "md:justify-center md:px-sm",
        )}
      >
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground"
        >
          S
        </span>
        <p
          aria-hidden={collapsed ? true : undefined}
          className={cn(
            "font-heading min-w-0 flex-1 truncate text-base font-semibold text-foreground",
            "transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
            collapsed
              ? "md:pointer-events-none md:absolute md:opacity-0 md:-translate-x-1.5"
              : "opacity-100 translate-x-0",
          )}
        >
          {title}
        </p>
      </div>

      <nav
        aria-label={title}
        className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-xs overflow-y-auto overflow-x-hidden p-sm"
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            onClick={() => {
              onMobileClose?.();
            }}
            className={cn(
              "group relative inline-flex min-h-11 w-full cursor-pointer items-center gap-sm rounded-lg px-sm text-sm font-semibold",
              "transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed && "md:justify-center md:px-0",
              item.current
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-foreground hover:bg-muted",
            )}
          >
            {item.current ? (
              <span
                aria-hidden="true"
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary"
              />
            ) : null}
            {item.icon ? (
              <span
                aria-hidden="true"
                className={cn(
                  "inline-flex h-5 w-5 shrink-0 items-center justify-center [&_svg]:h-5 [&_svg]:w-5",
                  item.current ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                )}
              >
                {item.icon}
              </span>
            ) : null}
            <span
              className={cn(
                "truncate whitespace-nowrap",
                "transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                collapsed
                  ? "md:pointer-events-none md:absolute md:opacity-0 md:-translate-x-1.5"
                  : "opacity-100 translate-x-0",
              )}
            >
              {item.label}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-50 -translate-y-1/2",
                "rounded-md bg-foreground px-sm py-xs text-xs font-medium text-background shadow-md",
                "opacity-0 transition-[opacity,transform] duration-[160ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                "hidden -translate-x-1 md:group-hover:translate-x-0 md:group-hover:opacity-100",
                "md:group-focus-visible:translate-x-0 md:group-focus-visible:opacity-100",
                collapsed ? "md:block" : "md:hidden",
              )}
            >
              {item.label}
            </span>
          </a>
        ))}
      </nav>

      {onToggleCollapse ? (
        <button
          type="button"
          data-testid="sidebar-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          title={expanded ? "Collapse sidebar (⌘B)" : "Expand sidebar (⌘B)"}
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-[66px] right-[-12px] z-50 hidden md:inline-flex",
            "h-11 w-11 cursor-pointer items-center justify-center",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          )}
        >
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm",
              "transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <ChevronIcon
              className={cn(
                "transition-transform duration-[320ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none",
                collapsed && "rotate-180",
              )}
            />
          </span>
        </button>
      ) : null}
    </aside>
  );
}
