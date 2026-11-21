import { useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FileDropzone } from "@self-study/ui/FileDropzone";
import { Loader } from "@self-study/ui/Loader";
import { ProgressBar } from "@self-study/ui/ProgressBar";
import { Select } from "@self-study/ui/Select";
import { StatusChip } from "@self-study/ui/StatusChip";
import { useToast } from "@self-study/ui/useToast";

import { useSources } from "@/hooks/useSources";
import { listSubjects, type Subject } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

function statusTone(status: string): "neutral" | "accent" | "danger" {
  if (status === "ready") return "accent";
  if (status === "failed") return "danger";
  return "neutral";
}

export function SourcesSection() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const { sources, status, reload, upload, remove } = useSources(subjectId || undefined);

  useEffect(() => {
    listSubjects()
      .then((rows) => {
        setSubjects(rows);
        if (!subjectId && rows[0]) setSubjectId(rows[0].id);
      })
      .catch(() => push("Could not load subjects", "error"));
  }, [push, subjectId]);

  useEffect(() => {
    if (!subjectId) return;
    const timer = window.setInterval(() => {
      if (sources.some((s) => s.status === "pending" || s.status === "processing")) reload();
    }, 1500);
    return () => window.clearInterval(timer);
  }, [reload, sources, subjectId]);

  async function onFile(file: File) {
    if (!subjectId) {
      push("Pick a subject first", "warning");
      return;
    }
    try {
      await upload(file);
      push("Upload started", "success");
      reload();
    } catch {
      push("Upload failed", "error");
    }
  }

  if (status === "loading" && sources.length === 0) return <Loader label="Loading sources" />;
  if (status === "error") {
    return <ErrorState title="Sources unavailable" message="The API did not respond." onRetry={reload} />;
  }

  return (
    <section className="flex max-w-4xl flex-col gap-lg" data-testid="sources-page">
      <h1 className="font-heading text-3xl font-semibold">Sources</h1>
      <Select
        label="Subject"
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
        data-testid="sources-subject"
      />
      <FileDropzone
        label="Upload notes or book"
        accept=".md,.txt,.pdf,.epub"
        onFile={onFile}
        disabled={!subjectId}
        data-testid="sources-upload"
      />
      {sources.length === 0 ? (
        <EmptyState title="No sources" message="Upload a markdown, text, PDF, or EPUB file." />
      ) : (
        <DataTable
          rows={sources}
          getRowId={(row) => row.id}
          columns={[
            {
              key: "title",
              header: "Title",
              cell: (row) => (
                <Link className="underline" href={`${basePath}/sources/detail/?id=${row.id}`}>
                  {row.title}
                </Link>
              ),
            },
            {
              key: "kind",
              header: "Kind",
              cell: (row) => <Badge label={row.kind} />,
            },
            {
              key: "status",
              header: "Status",
              cell: (row) => (
                <div className="flex min-w-40 flex-col gap-sm">
                  <StatusChip label={row.status} tone={statusTone(row.status)} />
                  {row.status === "processing" || row.status === "pending" ? (
                    <ProgressBar value={row.progress} />
                  ) : null}
                  {row.error ? <span className="text-sm text-destructive">{row.error}</span> : null}
                </div>
              ),
            },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <Button
                  variant="destructive"
                  data-testid={`source-delete-${row.id}`}
                  onClick={async () => {
                    try {
                      await remove(row.id);
                      reload();
                    } catch {
                      push("Could not delete source", "error");
                    }
                  }}
                >
                  Delete
                </Button>
              ),
            },
          ]}
        />
      )}
    </section>
  );
}
