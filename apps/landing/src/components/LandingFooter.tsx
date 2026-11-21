import Link from "next/link";

import { siteName } from "@/lib/site";

export function LandingFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-md px-md py-2xl md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-xs">
          <span className="font-heading text-lg font-semibold text-foreground">{siteName}</span>
          <p className="max-w-md text-base text-muted-foreground">
            Marketing site for the Self Study learning app. Study data stays on your device unless you sign in to sync.
          </p>
        </div>
        <nav aria-label="Legal" className="flex flex-wrap gap-lg">
          <Link href="/privacy/" className="min-h-11 text-base text-muted-foreground hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms/" className="min-h-11 text-base text-muted-foreground hover:text-foreground">
            Terms
          </Link>
        </nav>
        <p className="text-sm text-muted-foreground">© {year} {siteName}</p>
      </div>
    </footer>
  );
}