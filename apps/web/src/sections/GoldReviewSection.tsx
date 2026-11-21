import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";
import { QuestionCard } from "@self-study/ui/QuestionCard";
import { useToast } from "@self-study/ui/useToast";

import { listGoldQueue, reviewGold, type Question } from "@/lib/api-client";

export function GoldReviewSection() {
  const { push } = useToast();
  const [rows, setRows] = useState<Question[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  function reload() {
    setStatus("loading");
    listGoldQueue()
      .then((next) => {
        setRows(next);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    reload();
  }, []);

  if (status === "loading") return <Loader label="Loading gold queue" />;
  if (status === "error") {
    return <ErrorState title="Gold review unavailable" message="The API did not respond." onRetry={reload} />;
  }

  return (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="gold-review">
      <h1 className="font-heading text-3xl font-semibold">Gold review</h1>
      {!rows.length ? (
        <EmptyState title="Queue empty" message="No proposed gold questions." />
      ) : (
        rows.map((row) => (
          <div key={row.id} className="flex flex-col gap-md border-b border-border pb-md">
            <QuestionCard
              stem={row.stem}
              kind={row.kind}
              cognitiveLevel={row.cognitive_level}
              grounding={row.grounding}
            />
            <div className="flex flex-wrap gap-md">
              <Button
                data-testid="gold-confirm"
                onClick={async () => {
                  try {
                    await reviewGold(row.id, true);
                    reload();
                  } catch {
                    push("Could not confirm", "error");
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                variant="secondary"
                data-testid="gold-reject"
                onClick={async () => {
                  try {
                    await reviewGold(row.id, false);
                    reload();
                  } catch {
                    push("Could not reject", "error");
                  }
                }}
              >
                Reject
              </Button>
            </div>
          </div>
        ))
      )}
    </section>
  );
}
