import { useCallback, useEffect, useState, type ReactNode } from "react";

import { Button } from "./Button";
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

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" width="20" height="20">
      <path
        d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
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
      <div
        aria-hidden={!mobileOpen}
        className={cn(
          "fixed inset-0 z-30 bg-foreground/40 transition-opacity duration-200 md:hidden motion-reduce:transition-none",
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
          className="z-20 flex min-h-16 shrink-0 items-center gap-md border-b border-border bg-card/75 px-md py-sm shadow-sm shadow-primary/5 backdrop-blur-xl md:px-lg"
        >
          <Button
            type="button"
            variant="secondary"
            aria-expanded={mobileOpen}
            aria-controls={SIDEBAR_ID}
            data-testid="sidebar-mobile-open"
            className="min-h-11 min-w-0 px-3 md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <MenuIcon />
            <span className="sr-only">Open navigation</span>
          </Button>
          <div className="flex min-w-0 flex-1 items-center gap-md">{header}</div>
        </header>
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto px-lg py-lg">{children}</main>
      </div>
    </div>
  );
}
