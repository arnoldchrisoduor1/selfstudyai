import Link from "next/link";

import { Button } from "@self-study/ui/Button";

import { appUrl, siteName } from "@/lib/site";

const nav = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-md px-md py-md">
        <Link href="/" className="font-heading text-xl font-semibold text-foreground">
          {siteName}
        </Link>
        <nav aria-label="Primary" className="flex flex-wrap items-center gap-md">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="min-h-11 text-base text-muted-foreground hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>
        {appUrl ? (
          <a
            href={appUrl}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Open app
          </a>
        ) : (
          <Button variant="secondary" disabled aria-describedby="open-app-placeholder-hint">
            Open app (placeholder)
          </Button>
        )}
      </div>
    </header>
  );
}