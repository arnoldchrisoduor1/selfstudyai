import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";

import { SectionHeading } from "@/components/SectionHeading";

export function PricingSection() {
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="bg-muted py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2xl px-md">
        <SectionHeading
          id="pricing-title"
          eyebrow="Pricing"
          title="Free locally, prepaid in the cloud"
          description="Matches the credits ledger in the API—no subscription fiction and no checkout integration yet."
        />
        <div className="grid gap-md md:grid-cols-2">
          <article className="flex flex-col gap-md rounded-md border border-border bg-card p-lg">
            <Badge label="Local" tone="accent" />
            <h3 className="font-heading text-2xl font-semibold text-foreground">On-device study</h3>
            <p className="text-base text-muted-foreground">
              Run the web UI against your API, use your own AI providers or the mock provider, and keep data in SQLite. No
              account required.
            </p>
            <p className="font-heading text-3xl font-semibold text-foreground">$0</p>
          </article>
          <article className="flex flex-col gap-md rounded-md border border-border bg-card p-lg">
            <Badge label="Cloud credits" tone="neutral" />
            <h3 className="font-heading text-2xl font-semibold text-foreground">Platform AI when signed in</h3>
            <p className="text-base text-muted-foreground">
              Cloud generation draws from a prepaid credits ledger with reserve/settle accounting and a configurable daily
              cap. Top-ups use a mock payment provider today; real payment gateways are not wired (see docs/PAYMENTS_TODO.md).
            </p>
            <p className="text-base text-muted-foreground">Balance and usage history appear in the app after sign-in.</p>
            <Button variant="secondary" disabled data-testid="pricing-topup-placeholder">
              Top-up (placeholder)
            </Button>
          </article>
        </div>
      </div>
    </section>
  );
}