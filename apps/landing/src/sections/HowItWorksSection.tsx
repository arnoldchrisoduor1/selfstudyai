import { SectionHeading } from "@/components/SectionHeading";

const steps = [
  {
    title: "Organize",
    body: "Create subjects and upload sources—markdown, text, PDF, or EPUB. Ingest runs in the background with visible progress.",
  },
  {
    title: "Explore",
    body: "Browse topics and run hybrid search over your chunks. Tune AI and embedding providers in settings.",
  },
  {
    title: "Study",
    body: "Start a session in bursts. Answer MCQ or written questions, see graded feedback, and override grades when needed.",
  },
  {
    title: "Retain",
    body: "FSRS schedules the next review from your scores. Track points, streaks, and timed tests with integrity logging.",
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-title" className="py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2xl px-md">
        <SectionHeading
          id="how-title"
          eyebrow="How it works"
          title="From upload to scheduled review"
          description="Four steps match the shipped web and API flows—no account required for local use."
        />
        <ol className="grid gap-md md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-sm rounded-md border border-border bg-card p-md"
            >
              <span className="font-heading text-2xl font-semibold text-primary" aria-hidden="true">
                {index + 1}
              </span>
              <h3 className="font-heading text-xl font-semibold text-foreground">{step.title}</h3>
              <p className="text-base text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}