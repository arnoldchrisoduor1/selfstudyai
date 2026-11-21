import { useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";
import { Modal } from "@self-study/ui/Modal";
import { useToast } from "@self-study/ui/useToast";

import { useSubjects } from "@/hooks/useSubjects";
import type { Subject } from "@/lib/api-client";

export function SubjectsSection() {
  const router = useRouter();
  const { push } = useToast();
  const { rows, status, reload, deleteSubject } = useSubjects();
  const [pending, setPending] = useState<Subject | null>(null);

  async function confirmDelete() {
    if (!pending) return;
    try {
      await deleteSubject(pending.id);
      setPending(null);
      reload();
    } catch {
      push("Could not delete subject", "error");
    }
  }

  return (
    <section className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h1 className="font-heading text-3xl font-semibold">Subjects</h1>
        <Button onClick={() => router.push("/subjects/new/")}>New subject</Button>
      </div>
      {status === "loading" ? <Loader label="Loading subjects" /> : null}
      {status === "error" ? (
        <ErrorState title="Subjects unavailable" message="The API did not respond." onRetry={reload} />
      ) : null}
      {status === "ready" && rows.length === 0 ? (
        <EmptyState title="No subjects" message="Create a subject to start a study list." />
      ) : null}
      {status === "ready" && rows.length > 0 ? (
        <DataTable
          rows={rows}
          getRowId={(row) => row.id}
          columns={[
            { key: "name", header: "Name", cell: (row) => row.name },
            {
              key: "description",
              header: "Description",
              cell: (row) => row.description ?? "",
            },
            {
              key: "actions",
              header: "Actions",
              align: "right",
              cell: (row) => (
                <span className="inline-flex items-center justify-end gap-1">
                  <Button
                    variant="quiet"
                    onClick={() => router.push(`/subjects/edit/?id=${row.id}`)}
                  >
                    Edit
                  </Button>
                  <Button variant="quiet-destructive" onClick={() => setPending(row)}>
                    Delete
                  </Button>
                </span>
              ),
            },
          ]}
        />
      ) : null}
      <Modal open={pending !== null} title="Delete subject" onClose={() => setPending(null)}>
        <p className="mb-md text-base">Delete {pending?.name}?</p>
        <Button variant="destructive" onClick={confirmDelete} data-testid="confirm-delete">
          Delete
        </Button>
      </Modal>
    </section>
  );
}
