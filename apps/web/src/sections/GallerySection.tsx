import { useState } from "react";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { ChartFrame } from "@self-study/ui/ChartFrame";
import { Checkbox } from "@self-study/ui/Checkbox";
import { DataTable } from "@self-study/ui/DataTable";
import { Drawer } from "@self-study/ui/Drawer";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FilterChip } from "@self-study/ui/FilterChip";
import { Input } from "@self-study/ui/Input";
import { Modal } from "@self-study/ui/Modal";
import { PageHeader } from "@self-study/ui/PageHeader";
import { ProgressBar } from "@self-study/ui/ProgressBar";
import { ProgressRing } from "@self-study/ui/ProgressRing";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { Skeleton } from "@self-study/ui/Skeleton";
import { Slider } from "@self-study/ui/Slider";
import { StatCard } from "@self-study/ui/StatCard";
import { Tabs } from "@self-study/ui/Tabs";
import { Textarea } from "@self-study/ui/Textarea";
import { Toggle } from "@self-study/ui/Toggle";

export function GallerySection() {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState("note");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [slider, setSlider] = useState("40");
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [tab, setTab] = useState("one");
  const [segment, setSegment] = useState("all");
  const [chip, setChip] = useState("due");

  return (
    <section data-testid="component-gallery" className="mx-auto flex w-full max-w-workspace flex-col gap-lg">
      <PageHeader
        eyebrow="Dev"
        title="Components"
        description="Every shared variant. Resize to 768 and 390: the table becomes cards, and the page does not scroll sideways."
      />

      <div className="flex flex-wrap gap-sm">
        <Button data-testid="gallery-button">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="quiet">Quiet</Button>
      </div>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Reviews due" value="28" hint="On track" />
        <StatCard label="Mastered" value="84%" hint="Strong" />
        <StatCard label="Streak" value="12" hint="Review" />
        <StatCard label="Lapses" value="3" hint="Weak" />
      </div>

      <div className="flex flex-wrap gap-sm">
        <Badge label="Strong" tone="strong" />
        <Badge label="Stable" tone="stable" />
        <Badge label="Review" tone="review" />
        <Badge label="Weak" tone="weak" />
        <FilterChip label="Due" selected={chip === "due"} onClick={() => setChip("due")} />
        <FilterChip label="New" selected={chip === "new"} onClick={() => setChip("new")} />
        <FilterChip label="All" selected={chip === "all"} onClick={() => setChip("all")} />
      </div>

      <Card className="flex flex-col gap-md">
        <ProgressBar label="Ingest" value={42} />
        <ProgressRing value={72} label="Mastery" />
      </Card>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "one", label: "Study" },
          { id: "two", label: "Exams" },
        ]}
      />
      <SegmentedControl
        label="Scope"
        value={segment}
        onChange={setSegment}
        options={[
          { value: "all", label: "All" },
          { value: "core", label: "Core" },
        ]}
      />

      <DataTable
        rows={[
          { id: "1", name: "Raft", status: "Strong" },
          { id: "2", name: "Paxos", status: "Review" },
        ]}
        getRowId={(row) => row.id}
        columns={[
          { key: "name", header: "Topic", cell: (row) => row.name },
          { key: "status", header: "Status", cell: (row) => row.status },
        ]}
      />

      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
        <Select
          label="Kind"
          value={kind}
          onChange={(event) => setKind(event.target.value)}
          options={[
            { value: "note", label: "Note" },
            { value: "book", label: "Book" },
          ]}
        />
        <Textarea label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        <div className="flex flex-col gap-sm">
          <Toggle checked={on} onCheckedChange={setOn} label="Review reminders" />
          <Checkbox label="Include gold questions" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
          <Slider label="Daily goal" min={1} max={100} value={slider} onChange={(event) => setSlider(event.target.value)} />
        </div>
      </div>

      <ChartFrame title="Retention" description="Wide chart scrolls inside this card.">
        <div className="h-header min-w-reading rounded-md bg-muted" />
      </ChartFrame>

      <div className="flex flex-col gap-sm">
        <Skeleton className="h-md w-full" />
        <Skeleton className="h-lg w-sidebar" />
      </div>

      <EmptyState title="Empty" message="Nothing here yet." />
      <ErrorState title="Error" message="Sample error state." />

      <div className="flex flex-wrap gap-sm">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open modal
        </Button>
        <Button variant="secondary" onClick={() => setDrawer(true)}>
          Open drawer
        </Button>
      </div>
      <Modal open={open} title="Sample dialog" onClose={() => setOpen(false)}>
        <p className="text-body-md">Dialog body.</p>
      </Modal>
      <Drawer open={drawer} title="Sample drawer" onClose={() => setDrawer(false)}>
        <p className="text-body-md">Drawer body.</p>
      </Drawer>
    </section>
  );
}
