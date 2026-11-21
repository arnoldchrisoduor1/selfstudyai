import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FilterChip } from "@self-study/ui/FilterChip";
import { Icon } from "@self-study/ui/Icon";
import { Modal } from "@self-study/ui/Modal";
import { PageHeader } from "@self-study/ui/PageHeader";
import { SearchInput } from "@self-study/ui/SearchInput";
import { useToast } from "@self-study/ui/useToast";

import { useSubjects } from "@/hooks/useSubjects";
import { setActiveSessionId } from "@/lib/active-session";
import {
  createSession,
  getDashboard,
  getDueQueue,
  getQuestionSettings,
  listQuestions,
  listSources,
  listTests,
  listTopics,
  type Subject,
  type Topic,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";
import {
  subjectsPlaceholder,
  type SubjectBar,
  type SubjectCardSample,
  type SubjectModuleSample,
  type SubjectTone,
} from "@/lib/placeholders/subjects";

interface SubjectFacts {
  cards: number;
  sources: number;
  due: number;
  topics: Topic[];
}

interface LiveTotals {
  cards: number | null;
  sources: number | null;
  tests: number | null;
  gold: number | null;
  due: number | null;
  facts: Record<string, SubjectFacts>;
}

const barClass: Record<SubjectBar, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  review: "bg-status-review",
};

const masteryClass: Record<SubjectBar, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  review: "text-status-review",
};

const toneBadge: Record<SubjectTone, "strong" | "stable" | "review" | "neutral"> = {
  strong: "strong",
  stable: "stable",
  review: "review",
  neutral: "neutral",
};

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function Meter({ value, tone }: { value: number; tone: SubjectBar }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-sm w-full overflow-hidden rounded-full bg-surface-dim">
      <div className={`h-full rounded-full ${barClass[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <Card className="flex min-w-0 flex-col justify-between rounded-lg p-md shadow-sm">
      <div className="flex items-start justify-between gap-sm">
        <span className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">{label}</span>
      </div>
      <p className="mt-sm text-headline-md font-bold leading-none text-foreground">{value}</p>
      <div className="mt-sm text-label-sm text-text-muted">{children}</div>
    </Card>
  );
}

export function SubjectsSection() {
  const router = useRouter();
  const { push } = useToast();
  const { rows, status, reload, deleteSubject } = useSubjects();
  const [pending, setPending] = useState<Subject | null>(null);
  const [query, setQuery] = useState("");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);
  const [live, setLive] = useState<LiveTotals | null>(null);
  const sample = subjectsPlaceholder;

  useEffect(() => {
    if (status !== "ready") return;
    let cancelled = false;
    Promise.allSettled([
      listSources(),
      listQuestions({}),
      listQuestions({ gold: true }),
      listTests(),
      getDashboard(),
      Promise.all(rows.map((subject) => getDueQueue(subject.id).then((items) => [subject.id, items.length] as const))),
    ]).then(async (results) => {
      if (cancelled) return;
      const [sourcesResult, questionsResult, goldResult, testsResult, dashboardResult, dueResult] = results;
      const sources = sourcesResult.status === "fulfilled" ? sourcesResult.value : [];
      const questions = questionsResult.status === "fulfilled" ? questionsResult.value : null;
      const facts: Record<string, SubjectFacts> = {};
      for (const subject of rows) {
        facts[subject.id] = { cards: 0, sources: 0, due: 0, topics: [] };
      }
      for (const source of sources) {
        const bucket = facts[source.subject_id];
        if (bucket) bucket.sources += 1;
      }
      if (questions) {
        for (const question of questions) {
          const bucket = facts[question.subject_id];
          if (bucket) bucket.cards += 1;
        }
      }
      if (dueResult.status === "fulfilled") {
        for (const [id, count] of dueResult.value) {
          if (facts[id]) facts[id].due = count;
        }
      }
      const topicLists = await Promise.allSettled(sources.map((source) => listTopics(source.id)));
      topicLists.forEach((result, index) => {
        if (result.status !== "fulfilled") return;
        const bucket = facts[sources[index].subject_id];
        if (bucket) bucket.topics.push(...result.value);
      });
      if (cancelled) return;
      setLive({
        cards: questions ? questions.length : null,
        sources: sourcesResult.status === "fulfilled" ? sources.length : null,
        tests: testsResult.status === "fulfilled" ? testsResult.value.length : null,
        gold: goldResult.status === "fulfilled" ? goldResult.value.length : null,
        due: dashboardResult.status === "fulfilled" ? dashboardResult.value.due_today : null,
        facts,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [rows, status]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((subject) => {
      const haystack = `${subject.name} ${subject.description ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows]);

  const dueTotal = live ? Object.values(live.facts).reduce((sum, fact) => sum + fact.due, 0) : null;
  const busiest = useMemo(() => {
    if (!live) return null;
    let best: { name: string; due: number } | null = null;
    for (const subject of rows) {
      const due = live.facts[subject.id]?.due ?? 0;
      if (!best || due > best.due) best = { name: subject.name, due };
    }
    return best;
  }, [live, rows]);

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

  async function studyNow(subjectId: string) {
    setStartingId(subjectId);
    try {
      const settings = await getQuestionSettings();
      const session = await createSession({
        subject_id: subjectId,
        scope: { source_ids: [], topic_ids: [] },
        grounding_mode: settings.default_grounding_mode,
        burst_size: settings.default_burst_size,
        mode: "review_due",
      });
      setActiveSessionId(session.id);
      await router.push(`${basePath}/study/session/?id=${session.id}`);
    } catch {
      push("Could not start session", "error");
    } finally {
      setStartingId(null);
    }
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg" data-testid="subjects">
      <PageHeader
        title="Subjects & Curricula"
        description="Structured study paths based on your uploaded course materials and notes."
        actions={
          <>
            <div className="min-w-0 md:w-64">
              <SearchInput
                label="Filter subjects or topics"
                labelHidden
                value={query}
                placeholder="Filter subjects or topics..."
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex items-center gap-xs">
              <Button
                variant={layout === "grid" ? "secondary" : "quiet"}
                className="min-h-11 min-w-11 px-sm"
                aria-pressed={layout === "grid"}
                onClick={() => setLayout("grid")}
              >
                <Icon name="grid_view" size="sm" />
                <span className="sr-only">Grid</span>
              </Button>
              <Button
                variant={layout === "list" ? "secondary" : "quiet"}
                className="min-h-11 min-w-11 px-sm"
                aria-pressed={layout === "list"}
                onClick={() => setLayout("list")}
              >
                <Icon name="view_agenda" size="sm" />
                <span className="sr-only">List</span>
              </Button>
            </div>
            <Button onClick={() => router.push(`${basePath}/subjects/new/`)}>
              <Icon name="add" size="sm" />
              New Subject
            </Button>
          </>
        }
      />

      {status === "error" ? (
        <ErrorState title="Subjects unavailable" message="The API did not respond." onRetry={reload} />
      ) : null}

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 min-[1138px]:grid-cols-4">
        {/* BACKEND_GAP(subjects-1) */}
        <Stat label="Total Mastery Coverage" value={`${sample.mastery}%`}>
          <span className="font-semibold text-primary">{sample.masteryDelta}</span>
          <p>{sample.masteryDetail}</p>
          <Meter value={sample.mastery} tone="primary" />
        </Stat>
        <Stat label="Active Study Vault" value={live?.cards == null ? String(sample.vaultCards) : String(live.cards)}>
          <p>Cards</p>
          <p>
            {live?.sources == null ? sample.vaultDocs : live.sources} documents ·{" "}
            {live?.tests == null ? sample.vaultQuizzes : live.tests} quizzes
          </p>
        </Stat>
        <Stat label="Urgent Reviews Due" value={dueTotal == null ? String(sample.urgentDue) : String(dueTotal)}>
          <p>Due Today</p>
          <p>
            {busiest && busiest.due > 0 ? busiest.name : sample.urgentSubject}{" "}
            <Badge
              label={`${busiest && busiest.due > 0 ? busiest.due : sample.urgentSubjectDue} due`}
              tone="weak"
              className="rounded-md"
            />
          </p>
          {/* BACKEND_GAP(subjects-2) */}
          <p>{sample.urgentMinutes}</p>
        </Stat>
        <Stat label="Gold Questions" value={live?.gold == null ? String(sample.goldCount) : String(live.gold)}>
          <p>Top tier</p>
          <p>High-yield mastered concepts</p>
          {/* BACKEND_GAP(subjects-3) */}
          <p className="font-semibold text-status-strong">{sample.goldRate}</p>
        </Stat>
      </div>

      <div className="flex min-w-0 flex-col justify-between gap-sm md:flex-row md:items-center">
        <div className="flex flex-wrap gap-xs">
          <FilterChip label={`All Subjects (${rows.length})`} selected />
          {/* BACKEND_GAP(subjects-4) */}
          {sample.categories.map((category) => (
            <FilterChip
              key={category.id}
              label={`${category.label} (${category.count})`}
              disabled
              title="Coming soon"
              className="disabled:opacity-100"
            />
          ))}
        </div>
        {/* BACKEND_GAP(subjects-5) */}
        <Button variant="quiet" className="min-h-11 whitespace-nowrap px-sm disabled:opacity-100" disabled title="Coming soon">
          Sort by: Review Urgency
          <Icon name="expand_more" size="sm" />
        </Button>
      </div>

      <div
        className={
          layout === "list"
            ? "grid grid-cols-1 gap-lg"
            : "grid grid-cols-1 gap-lg min-[1138px]:grid-cols-3"
        }
      >
        {visible.map((subject, index) => {
          const extra = sample.cards[index % sample.cards.length];
          const facts = live?.facts[subject.id];
          const modules: SubjectModuleSample[] =
            facts && facts.topics.length > 0
              ? facts.topics.slice(0, 3).map((topic, topicIndex) => ({
                  title: topic.title,
                  score: extra.modules[topicIndex % extra.modules.length].score,
                  tone: extra.modules[topicIndex % extra.modules.length].tone,
                }))
              : extra.modules;
          return (
            <SubjectCard
              key={subject.id}
              subject={subject}
              sample={extra}
              cardsLabel={facts ? `${facts.cards} cards` : extra.cardsLabel}
              notesLabel={facts ? `${facts.sources} notes` : extra.notesLabel}
              due={facts?.due ?? 0}
              modules={modules}
              moduleCount={facts && facts.topics.length > 0 ? facts.topics.length : extra.moduleCount}
              menuOpen={menuId === subject.id}
              starting={startingId === subject.id}
              onMenu={() => setMenuId((current) => (current === subject.id ? null : subject.id))}
              onEdit={() => router.push(`${basePath}/subjects/edit/?id=${subject.id}`)}
              onDelete={() => {
                setMenuId(null);
                setPending(subject);
              }}
              onStudy={() => void studyNow(subject.id)}
            />
          );
        })}
        <Button
          variant="secondary"
          className="h-auto min-h-11 w-full whitespace-normal border-dashed px-lg py-lg"
          onClick={() => router.push(`${basePath}/subjects/new/`)}
        >
          <span className="flex flex-col items-center gap-sm text-center">
            <Icon name="add" />
            <span>+ New subject</span>
            <span className="max-w-xs text-body-sm font-normal text-text-muted">
              Create a custom curriculum from notes, textbooks, or syllabus files
            </span>
          </span>
        </Button>
      </div>

      <Card className="flex flex-col items-start justify-between gap-md rounded-lg p-lg shadow-sm md:flex-row md:items-center">
        <div className="flex items-start gap-md">
          <span className="inline-flex h-logo w-logo shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-primary">
            <Icon name="upload_file" />
          </span>
          <div>
            <h2 className="text-headline-sm font-bold text-foreground">Add material to a subject</h2>
            <p className="mt-xs max-w-reading text-body-sm text-text-muted">
              Upload syllabus PDFs, lecture slides, or Markdown notes. Topics and study cards are extracted
              automatically.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <Button variant="secondary" onClick={() => router.push(`${basePath}/sources/`)}>
            <Icon name="cloud_upload" size="sm" />
            Upload course files
          </Button>
          {/* BACKEND_GAP(subjects-6) */}
          <Button
            variant="secondary"
            className="hidden min-h-11 min-w-11 px-sm disabled:opacity-100 lg:inline-flex"
            disabled
            title="Coming soon"
          >
            <Icon name="history" size="sm" />
            <span className="sr-only">View import history</span>
          </Button>
        </div>
      </Card>

      <Modal open={pending !== null} title="Delete subject" onClose={() => setPending(null)}>
        <p className="mb-md text-body-md">Delete {pending?.name}?</p>
        <Button variant="destructive" onClick={() => void confirmDelete()} data-testid="confirm-delete">
          Delete
        </Button>
      </Modal>
    </section>
  );
}

function SubjectCard({
  subject,
  sample,
  cardsLabel,
  notesLabel,
  due,
  modules,
  moduleCount,
  menuOpen,
  starting,
  onMenu,
  onEdit,
  onDelete,
  onStudy,
}: {
  subject: Subject;
  sample: SubjectCardSample;
  cardsLabel: string;
  notesLabel: string;
  due: number;
  modules: SubjectModuleSample[];
  moduleCount: number;
  menuOpen: boolean;
  starting: boolean;
  onMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStudy: () => void;
}) {
  return (
    <Card className="flex min-w-0 flex-col justify-between rounded-lg p-0 shadow-sm">
      <div className="p-md">
        <div className="mb-sm flex items-start justify-between gap-sm">
          {/* BACKEND_GAP(subjects-4) */}
          <Badge label={sample.category} tone="stable" className="rounded-md" />
          <div className="relative">
            <Button variant="quiet" className="min-h-11 min-w-11 px-sm" aria-expanded={menuOpen} onClick={onMenu}>
              <Icon name="more_vert" size="sm" />
              <span className="sr-only">Subject options</span>
            </Button>
            {menuOpen ? (
              <div className="absolute right-0 z-dropdown flex min-w-32 flex-col rounded-md border border-border bg-surface p-xs shadow-md">
                <Button variant="quiet" className="min-h-11 justify-start px-sm" onClick={onEdit}>
                  Edit
                </Button>
                <Button variant="quiet-destructive" className="min-h-11 justify-start px-sm" onClick={onDelete}>
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex items-start gap-sm">
          <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary-border bg-primary-subtle text-body-md font-bold text-primary">
            {initials(subject.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-headline-sm font-bold text-foreground">{subject.name}</h3>
            <p className="mt-xs line-clamp-2 text-body-sm text-text-muted">
              {subject.description || "No description"}
            </p>
          </div>
        </div>
        <div className="mt-md flex flex-col gap-xs">
          <div className="flex items-center justify-between text-label-sm">
            <span className="text-text-muted">Mastery Coverage</span>
            {/* BACKEND_GAP(subjects-1) */}
            <span className={`font-bold ${masteryClass[sample.bar]}`}>{sample.mastery}%</span>
          </div>
          <Meter value={sample.mastery} tone={sample.bar} />
          <div className="flex items-center justify-between text-label-sm text-text-muted">
            <span>{cardsLabel}</span>
            <span>{notesLabel}</span>
          </div>
        </div>
      </div>
      <div className="border-y border-border bg-surface-dim px-md py-sm">
        <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">Key Syllabus Modules</p>
        <div className="mt-sm flex flex-col gap-xs">
          {modules.map((module, index) => (
            <div
              key={`${module.title}-${index}`}
              className="flex items-center justify-between gap-sm rounded-md border border-border bg-surface p-sm"
            >
              <span className="flex min-w-0 items-center gap-sm">
                <span className="text-label-sm text-text-subtle">{String(index + 1).padStart(2, "0")}</span>
                <span className="truncate text-body-sm font-medium text-foreground">{module.title}</span>
              </span>
              {/* BACKEND_GAP(subjects-7) */}
              <Badge label={module.score} tone={toneBadge[module.tone]} className="shrink-0 rounded-full" />
            </div>
          ))}
        </div>
        {/* BACKEND_GAP(subjects-8) */}
        <Button variant="quiet" className="mt-sm w-full disabled:opacity-100" disabled title="Coming soon">
          View all {moduleCount} modules
        </Button>
      </div>
      <div className="flex flex-col gap-sm p-md">
        <div className="flex items-center justify-between text-label-sm">
          <span className="inline-flex items-center gap-xs font-medium text-text-muted">
            <Icon name="schedule" size="sm" />
            {due} due today
          </span>
          {/* BACKEND_GAP(subjects-2) */}
          <span className="text-text-subtle">{sample.minutes}</span>
        </div>
        <div className="flex items-center gap-sm">
          <Button className="min-w-0 flex-1 whitespace-nowrap px-sm text-body-sm" disabled={starting} onClick={onStudy}>
            <Icon name="play_arrow" size="sm" />
            Study now
          </Button>
          {/* BACKEND_GAP(subjects-8) */}
          <Button variant="secondary" className="whitespace-nowrap px-sm text-body-sm disabled:opacity-100" disabled title="Coming soon">
            <Icon name="menu_book" size="sm" />
            Open subject
          </Button>
        </div>
      </div>
    </Card>
  );
}
