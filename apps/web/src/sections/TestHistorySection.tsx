import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";
import { Select } from "@self-study/ui/Select";
import { StatusChip } from "@self-study/ui/StatusChip";

import { listSubjects, listTests, type FinalTest, type Subject } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export function TestHistorySection() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [tests, setTests] = useState<FinalTest[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  function reload() {
    setStatus("loading");
    Promise.all([listSubjects(), listTests(subjectId || undefined)])
      .then(([subj, rows]) => {
        setSubjects(subj);
        setTests(rows);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  if (status === "loading") return <Loader label="Loading tests" />;
  if (status === "error") {
    return <ErrorState title="Tests unavailable" message="The API did not respond." onRetry={reload} />;
  }

  return (
    <section className="flex max-w-4xl flex-col gap-lg" data-testid="test-history">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h1 className="font-heading text-3xl font-semibold">Tests</h1>
        <Button onClick={() => router.push(`${basePath}/tests/new/`)} data-testid="test-new-link">
          New test
        </Button>
      </div>
      <Select
        label="Subject filter"
        data-testid="test-history-subject"
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
      />
      {tests.length === 0 ? (
        <EmptyState title="No tests" message="Build a test to see it here." />
      ) : (
        <DataTable
          rows={tests}
          getRowId={(row) => row.id}
          columns={[
            { key: "status", header: "Status", cell: (row) => row.status },
            {
              key: "score",
              header: "Score",
              cell: (row) => (row.score !== null ? `${Math.round(row.score * 100)}%` : "—"),
            },
            {
              key: "pass",
              header: "Pass",
              cell: (row) =>
                row.pass === null ? "—" : <StatusChip label={row.pass ? "Pass" : "Fail"} tone={row.pass ? "accent" : "danger"} />,
            },
            { key: "integrity", header: "Integrity", cell: (row) => row.integrity_status },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <Button
                  variant="secondary"
                  data-testid="test-open"
                  onClick={() => {
                    const path =
                      row.status === "in_progress" || row.status === "pending"
                        ? `${basePath}/tests/session/?id=${row.id}`
                        : `${basePath}/tests/results/?id=${row.id}`;
                    router.push(path);
                  }}
                >
                  Open
                </Button>
              ),
            },
          ]}
        />
      )}
    </section>
  );
}