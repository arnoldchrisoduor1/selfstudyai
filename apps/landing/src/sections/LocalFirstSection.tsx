import { SectionHeading } from "@/components/SectionHeading";

export function LocalFirstSection() {
  return (
    <section aria-labelledby="local-title" className="py-3xl">
      <div className="mx-auto grid max-w-[1200px] gap-2xl px-md lg:grid-cols-2 lg:items-center">
        <SectionHeading
          id="local-title"
          eyebrow="Local-first"
          title="Your library stays on your machine"
          description="The default path is SQLite on your device—desktop app data or a local API file. Uploads live in a configurable files directory. Nothing is sent to the cloud until you create an account and choose to sync or use cloud AI."
          align="start"
        />
        <ul className="flex flex-col gap-md">
          {[
            "Study offline against the embedded desktop API or a local Rust server.",
            "Export JSON via the API; delete your cloud account to remove server-side data.",
            "Sync uses versioned rows and tombstones—conflicts resolve with documented rules, not silent drops.",
            "Provider keys and cloud platform keys stay server-side and out of logs.",
          ].map((line) => (
            <li key={line} className="rounded-md border border-border bg-card p-md text-base text-muted-foreground">
              {line}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}