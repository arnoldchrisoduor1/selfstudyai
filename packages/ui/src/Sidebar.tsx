import type { ReactNode } from "react";

import { cn } from "./cn";
import { Icon } from "./Icon";

export interface SidebarItem {
  href: string;
  label: string;
  current?: boolean;
  icon?: ReactNode;
  badge?: string;
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
        "z-sidebar flex h-dvh max-h-dvh shrink-0 flex-col overflow-hidden border-r border-border bg-surface",
        "transition-[width,transform] duration-slow ease-standard motion-reduce:transition-none",
        "md:static md:translate-x-0",
        collapsed ? "md:w-sidebar-collapsed" : "md:w-sidebar",
        "fixed inset-y-0 left-0 w-sidebar",
        mobileOpen ? "translate-x-0 shadow-lg" : "-translate-x-full md:shadow-none",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-header shrink-0 items-center gap-sm border-b border-border px-md",
          collapsed && "md:justify-center md:px-sm",
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-logo w-logo shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
        >
          <Icon name="menu_book" size="sm" />
        </span>
        <p
          className={cn(
            "min-w-0 flex-1 truncate text-headline-sm text-foreground",
            collapsed && "md:hidden",
          )}
        >
          {title}
        </p>
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-text-muted hover:bg-muted md:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation"
        >
          <Icon name="close" />
        </button>
      </div>

      <p className={cn("px-md pt-md text-label-sm uppercase text-text-muted", collapsed && "md:sr-only")}>
        Workspace
      </p>

      <nav
        aria-label={title}
        className="sidebar-scroll flex min-h-0 flex-1 flex-col gap-xs overflow-y-auto overflow-x-hidden p-sm"
      >
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            aria-current={item.current ? "page" : undefined}
            onClick={() => onMobileClose?.()}
            className={cn(
              "group relative inline-flex min-h-11 w-full cursor-pointer items-center gap-sm rounded-lg px-sm text-label-md font-semibold",
              "focus-visible:outline-none focus-visible:shadow-focus",
              collapsed && "md:justify-center md:px-0",
              item.current ? "bg-primary-subtle text-primary" : "text-foreground hover:bg-muted",
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center">
                {item.icon}
              </span>
            ) : null}
            <span className={cn("truncate", collapsed && "md:sr-only")}>{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "ml-auto rounded-full bg-primary-subtle px-sm font-mono text-mono-metric text-primary",
                  collapsed && "md:hidden",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </a>
        ))}
      </nav>

      {onToggleCollapse ? (
        <button
          type="button"
          data-testid="sidebar-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          onClick={onToggleCollapse}
          className="hidden min-h-11 cursor-pointer items-center justify-center gap-sm border-t border-border text-label-sm text-text-muted hover:bg-muted md:inline-flex"
        >
          <Icon name={collapsed ? "chevron_right" : "chevron_left"} size="sm" />
          <span className={cn(collapsed && "sr-only")}>{expanded ? "Collapse" : "Expand"}</span>
        </button>
      ) : null}
    </aside>
  );
}
