import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { ErrorState } from "@self-study/ui/ErrorState";
import { EventTimeline } from "@self-study/ui/EventTimeline";
import { Loader } from "@self-study/ui/Loader";
import { ProgressRing } from "@self-study/ui/ProgressRing";
import { ScoreBadge } from "@self-study/ui/ScoreBadge";
import { StatCard } from "@self-study/ui/StatCard";

import { getTestResults, type TestResults } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export interface TestResultsSectionProps {
  testId: string;
}

export function TestResultsSection({ testId }: TestResultsSectionProps) {
  const router = useRouter();
  const [results, setResults] = useState<TestResults | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    getTestResults(testId)
      .then((data) => {
        setResults(data);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [testId]);

  if (status === "loading") return <Loader label="Loading results" />;
  if (status === "error") {
    return <ErrorState title="Results unavailable" message="Could not load test results." />;
  }
  if (!results) return null;

  const scorePct = Math.round(results.score * 100);

  return (
    <section className="flex max-w-4xl flex-col gap-lg" data-testid="test-results">
      <h1 className="font-heading text-3xl font-semibold">Test results</h1>
      <div className="flex flex-wrap items-center gap-lg">
        <ProgressRing value={scorePct} label={`${scorePct}%`} data-testid="test-score-ring" />
        <ScoreBadge
          score={results.score}
          verdict={results.pass ? "correct" : "incorrect"}
          data-testid="test-score-badge"
        />
        <StatCard
          label="Pass"
          value={results.pass ? "Pass" : "Fail"}
          data-testid="test-pass-stat"
        />
        {results.time_taken_s !== null ? (
          <StatCard label="Time" value={`${results.time_taken_s}s`} data-testid="test-time-stat" />
        ) : null}
      </div>
      <DataTable
        rows={results.per_question}
        getRowId={(row) => row.question_id}
        columns={[
          { key: "pos", header: "#", cell: (row) => String(row.position) },
          { key: "stem", header: "Question", cell: (row) => row.question.stem },
          {
            key: "score",
            header: "Score",
            cell: (row) =>
              row.attempt ? `${Math.round(row.attempt.score * 100)}%` : "—",
          },
        ]}
      />
      {results.topic_breakdown.length ? (
        <DataTable
          rows={results.topic_breakdown}
          getRowId={(row) => row.topic_id ?? row.topic_title}
          columns={[
            { key: "title", header: "Topic", cell: (row) => row.topic_title },
            { key: "avg", header: "Avg score", cell: (row) => `${Math.round(row.average_score * 100)}%` },
          ]}
        />
      ) : null}
      <div>
        <h2 className="mb-sm font-heading text-xl font-semibold">Integrity timeline</h2>
        <EventTimeline
          events={results.integrity_timeline.map((event) => ({
            id: event.id,
            kind: event.kind,
            at: event.at,
          }))}
          data-testid="test-integrity-timeline"
        />
      </div>
      <div className="flex flex-wrap gap-md">
        <Button variant="secondary" onClick={() => router.push(`${basePath}/tests/`)} data-testid="test-back-history">
          Back to history
        </Button>
        <Button onClick={() => router.push(`${basePath}/tests/new/`)} data-testid="test-new-again">
          New test
        </Button>
      </div>
    </section>
  );
}