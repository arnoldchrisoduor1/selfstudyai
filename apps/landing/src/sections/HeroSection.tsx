import { Button } from "@self-study/ui/Button";

import { appUrl } from "@/lib/site";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="pb-2xl pt-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-lg px-md text-center">
        <div className="flex max-w-3xl flex-col gap-sm">
          <h1 id="hero-title" className="font-heading text-4xl font-semibold text-foreground lg:text-5xl">
            Self Study
          </h1>
          <p className="text-base text-muted-foreground">
            Local-first study from your notes and books. Ingest sources, search chunks, practice in bursts, schedule
            review with FSRS, and run tests—with optional accounts, sync, and prepaid cloud AI credits.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-md">
          {appUrl ? (
            <a
              href={appUrl}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open app
            </a>
          ) : (
            <Button variant="secondary" disabled data-testid="open-app-placeholder">
              Open app (URL placeholder)
            </Button>
          )}
          <a
            href="#how-it-works"
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border-2 border-primary bg-transparent px-6 py-3 text-base font-semibold text-primary hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            How it works
          </a>
        </div>
        {!appUrl ? (
          <p id="open-app-placeholder-hint" className="text-sm text-muted-foreground">
            Set <code className="text-foreground">NEXT_PUBLIC_APP_URL</code> at build time to link the product app (for
            example <code className="text-foreground">http://localhost:8088/app/</code> in Docker).
          </p>
        ) : null}
      </div>
    </section>
  );
}