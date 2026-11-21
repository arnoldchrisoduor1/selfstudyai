import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FilterBar } from "@self-study/ui/FilterBar";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Modal } from "@self-study/ui/Modal";
import { Select } from "@self-study/ui/Select";
import { Textarea } from "@self-study/ui/Textarea";
import { useToast } from "@self-study/ui/useToast";

import {
  archiveQuestion,
  deleteQuestion,
  listQuestions,
  listSubjects,
  updateQuestion,
  type Question,
  type Subject,
} from "@/lib/api-client";

export function QuestionBankSection() {
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [rows, setRows] = useState<Question[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [subjectId, setSubjectId] = useState("");
  const [kind, setKind] = useState("");
  const [grounding, setGrounding] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);
  const [stem, setStem] = useState("");

  function reload() {
    setStatus("loading");
    listQuestions({
      subject_id: subjectId || undefined,
      kind: kind || undefined,
      grounding: grounding || undefined,
      status: "active",
    })
      .then((next) => {
        setRows(next);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    listSubjects()
      .then((list) => {
        setSubjects(list);
        if (list[0]) setSubjectId(list[0].id);
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, kind, grounding]);

  if (status === "loading") return <Loader label="Loading questions" />;
  if (status === "error") {
    return <ErrorState title="Question bank unavailable" message="The API did not respond." onRetry={reload} />;
  }

  return (
    <section className="flex flex-col gap-lg" data-testid="question-bank">
      <h1 className="font-heading text-3xl font-semibold">Question bank</h1>
      <FilterBar data-testid="question-filters">
        <Select
          label="Subject"
          data-testid="bank-subject"
          value={subjectId}
          onChange={(event) => setSubjectId(event.target.value)}
          options={subjects.map((s) => ({ value: s.id, label: s.name }))}
        />
        <Select
          label="Kind"
          data-testid="bank-kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "mcq", label: "MCQ" },
            { value: "written", label: "Written" },
          ]}
        />
        <Select
          label="Grounding"
          data-testid="bank-grounding"
          value={grounding}
          onChange={(event) => setGrounding(event.target.value)}
          options={[
            { value: "", label: "All" },
            { value: "notes", label: "Notes" },
            { value: "online", label: "Online" },
          ]}
        />
      </FilterBar>
      {!rows.length ? (
        <EmptyState title="No questions" message="Generate questions from a study session." />
      ) : (
        <DataTable
          rows={rows}
          getRowId={(row) => row.id}
          columns={[
            { key: "stem", header: "Stem", cell: (row) => row.stem },
            { key: "kind", header: "Kind", cell: (row) => row.kind },
            { key: "level", header: "Level", cell: (row) => row.cognitive_level },
            { key: "grounding", header: "Grounding", cell: (row) => row.grounding },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <div className="flex flex-wrap gap-sm">
                  <Button
                    variant="secondary"
                    data-testid="bank-edit"
                    onClick={() => {
                      setEditing(row);
                      setStem(row.stem);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    data-testid="bank-archive"
                    onClick={async () => {
                      try {
                        await archiveQuestion(row.id);
                        reload();
                      } catch {
                        push("Could not archive", "error");
                      }
                    }}
                  >
                    Archive
                  </Button>
                  <Button
                    variant="destructive"
                    data-testid="bank-delete"
                    onClick={async () => {
                      try {
                        await deleteQuestion(row.id);
                        reload();
                      } catch {
                        push("Could not delete", "error");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
      <Modal
        open={Boolean(editing)}
        title="Edit question"
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <div className="flex flex-col gap-md">
            <Textarea label="Stem" value={stem} onChange={(event) => setStem(event.target.value)} data-testid="edit-stem" />
            <Input label="Kind" value={editing.kind} readOnly />
            <Button
              data-testid="edit-save"
              onClick={async () => {
                try {
                  await updateQuestion(editing.id, { stem });
                  setEditing(null);
                  reload();
                } catch {
                  push("Could not save", "error");
                }
              }}
            >
              Save
            </Button>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
