import { SectionHeading } from "@/components/SectionHeading";

const features = [
  {
    title: "Ingest and search",
    body: "Upload sources, extract topics and chunks, embed text, and search with keyword + vector fusion.",
  },
  {
    title: "Your AI providers",
    body: "Bring OpenAI-compatible or Ollama endpoints, or use the mock provider in development. Keys never return to the browser.",
  },
  {
    title: "Study sessions",
    body: "Burst-based practice with citations for notes-grounded items and clear labels for online-grounded items.",
  },
  {
    title: "FSRS and points",
    body: "Every graded attempt feeds scheduling via rs-fsrs. Points and streaks come from an append-only ledger.",
  },
  {
    title: "Tests",
    body: "Build timed tests, record integrity events, and submit for results—attempts still update your review schedule.",
  },
  {
    title: "Optional cloud",
    body: "Sign in to sync devices, export data, and spend prepaid credits on platform-hosted cloud AI—local-only mode stays supported.",
  },
];

export function FeatureHighlightsSection() {
  return (
    <section id="features" aria-labelledby="features-title" className="py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2xl px-md">
        <SectionHeading
          id="features-title"
          eyebrow="Features"
          title="Built for serious self-study"
          description="Highlights reflect features documented in docs/FEATURES.md—implemented in the Rust API and web app."
        />
        <ul className="grid gap-md md:grid-cols-2 lg:grid-cols-3">
          {features.map((item) => (
            <li key={item.title} className="rounded-md border border-border bg-card p-md">
              <h3 className="font-heading text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-sm text-base text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}