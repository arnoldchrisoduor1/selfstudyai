import { useState } from "react";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FileDropzone } from "@self-study/ui/FileDropzone";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Modal } from "@self-study/ui/Modal";
import { ProgressBar } from "@self-study/ui/ProgressBar";
import { ResultCard } from "@self-study/ui/ResultCard";
import { SearchInput } from "@self-study/ui/SearchInput";
import { SecretInput } from "@self-study/ui/SecretInput";
import { Select } from "@self-study/ui/Select";
import { StatusChip } from "@self-study/ui/StatusChip";
import { Tabs } from "@self-study/ui/Tabs";
import { Textarea } from "@self-study/ui/Textarea";
import { Toggle } from "@self-study/ui/Toggle";

export function GallerySection() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState("note");
  const [on, setOn] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("one");
  const [secret, setSecret] = useState("");
  const [search, setSearch] = useState("");

  return (
    <section data-testid="component-gallery" className="flex max-w-3xl flex-col gap-lg">
      <h1 className="font-heading text-3xl font-semibold">Components</h1>
      <Button data-testid="gallery-button">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
      <Select
        label="Kind"
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        options={[
          { value: "note", label: "Note" },
          { value: "book", label: "Book" },
        ]}
      />
      <Toggle checked={on} onCheckedChange={setOn} label="Review reminders" />
      <StatusChip label={on ? "On" : "Off"} tone={on ? "accent" : "neutral"} />
      <Loader label="Sample loader" />
      <EmptyState title="Empty" message="Nothing here yet." />
      <ErrorState title="Error" message="Sample error state." />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open modal
      </Button>
      <Modal open={open} title="Sample dialog" onClose={() => setOpen(false)}>
        <p className="text-base">Dialog body.</p>
      </Modal>
      <DataTable
        rows={[{ id: "1", name: "Sample row" }]}
        getRowId={(row) => row.id}
        columns={[{ key: "name", header: "Name", cell: (row) => row.name }]}
      />
      <Badge label="notes" tone="accent" />
      <ProgressBar label="Ingest" value={42} />
      <SearchInput label="Search sample" value={search} onChange={(event) => setSearch(event.target.value)} />
      <SecretInput label="API key sample" value={secret} onChange={(event) => setSecret(event.target.value)} />
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "one", label: "One" },
          { id: "two", label: "Two" },
        ]}
      />
      <FileDropzone label="Sample dropzone" onFile={() => undefined} />
      <ResultCard sourceTitle="Sample source" topicTitle="Sample topic" pageRef="p.1">
        Sample chunk text.
      </ResultCard>
    </section>
  );
}
