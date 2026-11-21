import { BurstProgress } from "@self-study/ui/BurstProgress";
import { QuestionCard } from "@self-study/ui/QuestionCard";
import { ScoreBadge } from "@self-study/ui/ScoreBadge";
import { StatCard } from "@self-study/ui/StatCard";

import { SectionHeading } from "@/components/SectionHeading";

export function ProductPreviewSection() {
  return (
    <section aria-labelledby="preview-title" className="bg-muted py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2xl px-md">
        <SectionHeading
          id="preview-title"
          eyebrow="Product UI"
          title="Composed from the real design system"
          description="Static preview using shared components and tokens—representative of the study session and overview screens, not a screenshot."
        />
        <div className="grid gap-lg lg:grid-cols-2">
          <div className="flex flex-col gap-md rounded-md border border-border bg-card p-lg">
            <QuestionCard
              stem="What mechanism stores chunk embeddings alongside FTS keywords?"
              kind="written"
              cognitiveLevel="understand"
              grounding="notes"
              data-testid="landing-preview-question"
            >
              <BurstProgress current={2} total={4} data-testid="landing-preview-burst" />
              <ScoreBadge score={0.85} verdict="correct" data-testid="landing-preview-score" />
            </QuestionCard>
          </div>
          <div className="grid gap-md sm:grid-cols-2">
            <StatCard label="Due today" value="12" hint="From /due-queue" data-testid="landing-preview-due" />
            <StatCard label="Streak" value="4 days" hint="Timezone-aware" data-testid="landing-preview-streak" />
            <StatCard
              label="Cloud credits"
              value="—"
              hint="Shown when signed in"
              className="sm:col-span-2"
              data-testid="landing-preview-credits"
            />
          </div>
        </div>
      </div>
    </section>
  );
}