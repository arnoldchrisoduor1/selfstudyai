import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Icon } from "./Icon";
import { Sidebar, type SidebarItem } from "./Sidebar";
import { cn } from "./cn";

const STORAGE_KEY = "self-study-sidebar-collapsed";
const SIDEBAR_ID = "app-sidebar";

export interface AppShellProps {
  title: string;
  items: SidebarItem[];
  children: ReactNode;
  header?: ReactNode;
}

export function AppShell({ title, items, children, header }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        const target = event.target as HTMLElement | null;
        const tag = target?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
        event.preventDefault();
        toggleCollapsed();
      }
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleCollapsed]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <div data-testid="app-shell" className="relative flex h-dvh overflow-hidden bg-background text-foreground">
      <button
        type="button"
        aria-label="Close navigation"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-dropdown cursor-pointer bg-foreground/40 transition-opacity duration-fast md:hidden motion-reduce:transition-none",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobile}
      />

      <Sidebar
        id={SIDEBAR_ID}
        title={title}
        items={items}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      <div className="relative z-0 flex min-h-0 min-w-0 flex-1 flex-col">
        <header
          data-testid="app-shell-header"
          className="relative z-header flex h-header shrink-0 items-center gap-sm border-b border-border bg-surface px-margin"
        >
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={SIDEBAR_ID}
            data-testid="sidebar-mobile-open"
            className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Icon name="menu" />
            <span className="sr-only">Open navigation</span>
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-sm">{header}</div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-margin md:p-margin-desktop">
          {children}
        </main>
      </div>
    </div>
  );
}
