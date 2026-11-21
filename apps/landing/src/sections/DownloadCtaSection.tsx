import { Button } from "@self-study/ui/Button";

import { SectionHeading } from "@/components/SectionHeading";
import { appUrl } from "@/lib/site";

export function DownloadCtaSection() {
  return (
    <section aria-labelledby="cta-title" className="py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-lg px-md text-center">
        <SectionHeading
          id="cta-title"
          title="Try the product"
          description="Open the study app in your browser or run the Tauri desktop shell from source. Published installers are not linked yet."
        />
        <div className="flex flex-wrap justify-center gap-md">
          {appUrl ? (
            <a
              href={appUrl}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Open app
            </a>
          ) : (
            <Button variant="secondary" disabled data-testid="cta-open-app-placeholder">
              Open app (URL placeholder)
            </Button>
          )}
          <Button variant="secondary" disabled data-testid="cta-download-placeholder">
            Download desktop (placeholder)
          </Button>
        </div>
        <p className="max-w-xl text-sm text-muted-foreground">
          Build locally with <code className="text-foreground">npm run dev:web</code> and{" "}
          <code className="text-foreground">cd apps/desktop; npm run dev</code>. Release artifacts and auto-update
          are future work.
        </p>
      </div>
    </section>
  );
}