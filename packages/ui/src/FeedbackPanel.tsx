import { Button } from "./Button";
import { CitationList } from "./CitationList";
import { ScoreBadge } from "./ScoreBadge";
import { cn } from "./cn";

export interface FeedbackPanelProps {
  score: number;
  verdict: string;
  corrections?: string[];
  additions?: string[];
  missingPoints?: string[];
  modelAnswer?: string | null;
  citations?: {
    type?: string;
    chunk_ids?: string[];
    url?: string;
    excerpt?: string;
  };
  lowConfidence?: boolean;
  onOverride?: () => void;
  className?: string;
  "data-testid"?: string;
}

export function FeedbackPanel({
  score,
  verdict,
  corrections = [],
  additions = [],
  missingPoints = [],
  modelAnswer,
  citations,
  lowConfidence,
  onOverride,
  className,
  ...props
}: FeedbackPanelProps) {
  return (
    <section
      data-testid={props["data-testid"]}
      className={cn("flex flex-col gap-md rounded-md border border-border bg-card p-md", className)}
    >
      <div className="flex flex-wrap items-center gap-md">
        <ScoreBadge score={score} verdict={verdict} data-testid="score-badge" />
        {lowConfidence ? (
          <span className="text-sm font-semibold text-destructive" data-testid="low-confidence">
            Low confidence grade
          </span>
        ) : null}
        {onOverride ? (
          <Button variant="secondary" onClick={onOverride} data-testid="override-grade">
            I was actually right
          </Button>
        ) : null}
      </div>
      {corrections.length ? (
        <div>
          <h3 className="font-semibold">Corrections</h3>
          <ul className="list-disc pl-md text-muted-foreground">
            {corrections.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {additions.length || missingPoints.length ? (
        <div>
          <h3 className="font-semibold">Additions</h3>
          <ul className="list-disc pl-md text-muted-foreground">
            {[...additions, ...missingPoints].map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {modelAnswer ? (
        <div>
          <h3 className="font-semibold">Model answer</h3>
          <p className="text-muted-foreground" data-testid="model-answer">
            {modelAnswer}
          </p>
        </div>
      ) : null}
      {citations ? <CitationList citations={citations} data-testid="citations" /> : null}
    </section>
  );
}
