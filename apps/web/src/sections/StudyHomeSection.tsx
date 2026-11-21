import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Icon } from "@self-study/ui/Icon";
import { Loader } from "@self-study/ui/Loader";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import {
  createSession,
  getDashboard,
  getDueQueue,
  getLearningSettings,
  getQuestionSettings,
  listOpenSessions,
  listQuestions,
  listSources,
  listSubjects,
  listTopics,
  type DueQueueItem,
  type Question,
  type Source,
  type StudySession,
  type Subject,
  type Topic,
} from "@/lib/api-client";
import { setActiveSessionId } from "@/lib/active-session";
import { basePath } from "@/lib/nav";
import { reviewsPlaceholder, type ReviewWeakSample } from "@/lib/placeholders/reviews";

const controlClass =
  "[&>span]:sr-only [&_button]:min-h-11 [&_button]:px-sm [&_button]:py-1 [&_button]:text-label-sm";
const fieldClass =
  "min-w-0 flex-1 [&_label]:gap-xs [&_label>span]:sr-only [&_select]:min-h-11 [&_select]:py-1 [&_select]:text-label-md";

const weakIcons = ["psychology_alt", "functions", "grain"];

interface DueCard {
  questionId: string;
  subjectId: string;
  state: string;
  stability: number;
  lapses: number;
  overdue: number;
  stem: string;
  body: string;
  topicId: string | null;
}

function minutesFor(count: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(count * 0.5));
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function joinDue(items: DueQueueItem[], questions: Question[]): DueCard[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  return items.map((item) => {
    const question = byId.get(item.question_id);
    return {
      questionId: item.question_id,
      subjectId: question?.subject_id ?? "",
      state: item.card_state.state,
      stability: item.card_state.stability,
      lapses: item.card_state.lapses,
      overdue: item.overdue_days,
      stem: question?.stem ?? "Card",
      body: question?.explanation?.trim() || "Repeated recall lapse on this card.",
      topicId: question?.topic_id ?? null,
    };
  });
}

export function StudyHomeSection() {
  const router = useRouter();
  const { push } = useToast();
  const sample = reviewsPlaceholder;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [openSessions, setOpenSessions] = useState<StudySession[]>([]);
  const [cards, setCards] = useState<DueCard[]>([]);
  const [streak, setStreak] = useState<number | null>(null);
  const [retentionTarget, setRetentionTarget] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [grounding, setGrounding] = useState("notes");
  const [studyMode, setStudyMode] = useState("practice");
  const [burstSize, setBurstSize] = useState("4");
  const [showAllWeak, setShowAllWeak] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      listSubjects(),
      getQuestionSettings(),
      getLearningSettings(),
      getDashboard(),
      getDueQueue(),
      listQuestions({}),
    ]).then(([subjectRows, settings, learning, dashboard, due, questions]) => {
      if (subjectRows.status === "rejected") {
        setStatus("error");
        return;
      }
      setSubjects(subjectRows.value);
      if (subjectRows.value[0]) setSubjectId(subjectRows.value[0].id);
      if (settings.status === "fulfilled") {
        setBurstSize(String(settings.value.default_burst_size));
        setGrounding(settings.value.default_grounding_mode);
      }
      if (learning.status === "fulfilled") {
        setRetentionTarget(learning.value.settings.desired_retention);
      }
      if (dashboard.status === "fulfilled") {
        setStreak(dashboard.value.streak.current);
      }
      const dueItems = due.status === "fulfilled" ? due.value : [];
      const questionRows = questions.status === "fulfilled" ? questions.value : [];
      setCards(joinDue(dueItems, questionRows));
      setStatus("ready");
    });
  }, []);

  useEffect(() => {
    const mode = router.query.mode;
    if (typeof mode === "string" && ["practice", "review_due", "mixed"].includes(mode)) {
      setStudyMode(mode);
    }
  }, [router.query.mode]);

  useEffect(() => {
    if (!subjectId) return;
    listSources(subjectId)
      .then(setSources)
      .catch(() => push("Could not load sources", "error"));
    listOpenSessions(subjectId)
      .then(setOpenSessions)
      .catch(() => setOpenSessions([]));
  }, [subjectId, push]);

  useEffect(() => {
    if (!sourceId) {
      setTopics([]);
      setTopicId("");
      return;
    }
    listTopics(sourceId)
      .then(setTopics)
      .catch(() => push("Could not load topics", "error"));
  }, [sourceId, push]);

  const forecast = useMemo(() => {
    const start = new Date();
    return sample.forecast.map((count, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return {
        count,
        weekday: date.toLocaleDateString("en-US", { weekday: "short" }),
        label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      };
    });
  }, [sample.forecast]);

  const forecastMax = Math.max(...sample.forecast, 1);

  const bySubject = useMemo(() => {
    const map = new Map<string, DueCard[]>();
    for (const card of cards) {
      const list = map.get(card.subjectId) ?? [];
      list.push(card);
      map.set(card.subjectId, list);
    }
    return map;
  }, [cards]);

  const queues = useMemo(() => {
    return [...subjects]
      .map((subject) => {
        const rows = bySubject.get(subject.id) ?? [];
        return { subject, rows };
      })
      .sort((a, b) => b.rows.length - a.rows.length);
  }, [subjects, bySubject]);

  const busiest = queues.find((queue) => queue.rows.length > 0) ?? null;
  const activeDecks = queues.filter((queue) => queue.rows.length > 0).length;
  const newCount = cards.filter((card) => card.state === "new").length;
  const learningCount = cards.filter(
    (card) => card.state === "learning" || card.state === "relearning",
  ).length;
  const reviewCount = cards.filter((card) => card.state === "review").length;
  const overdue = cards.some((card) => card.overdue > 0);
  const deckStability = mean(cards.map((card) => card.stability));
  const selectedDue = (bySubject.get(subjectId) ?? []).length;
  const liveWeak = useMemo(
    () => [...cards].filter((card) => card.lapses > 0).sort((a, b) => b.lapses - a.lapses),
    [cards],
  );
  const usingSampleWeak = liveWeak.length === 0;
  const weakRows = usingSampleWeak ? sample.weak : liveWeak;
  const visibleWeak = showAllWeak || usingSampleWeak ? weakRows : weakRows.slice(0, 3);

  async function start(overrides?: { subjectId?: string; mode?: string; topicId?: string }) {
    const sid = overrides?.subjectId ?? subjectId;
    if (!sid) return;
    setStarting(true);
    try {
      const scoped = !overrides;
      const session = await createSession({
        subject_id: sid,
        scope: {
          source_ids: scoped && sourceId ? [sourceId] : [],
          topic_ids: overrides?.topicId ? [overrides.topicId] : scoped && topicId ? [topicId] : [],
        },
        grounding_mode: grounding,
        burst_size: Number(burstSize) || 4,
        mode: overrides?.mode ?? studyMode,
      });
      setActiveSessionId(session.id);
      await router.push(`${basePath}/study/session/?id=${session.id}`);
    } catch {
      push("Could not start session", "error");
    } finally {
      setStarting(false);
    }
  }

  async function resume(id: string) {
    setActiveSessionId(id);
    await router.push(`${basePath}/study/session/?id=${id}`);
  }

  if (status === "loading") return <Loader label="Loading reviews" />;
  if (status === "error") {
    return <ErrorState title="Reviews unavailable" message="The API did not respond." />;
  }
  if (!subjects.length) {
    return <EmptyState title="No subjects" message="Create a subject before reviewing." />;
  }

  const targetLabel =
    retentionTarget == null ? "90.0%" : `${(retentionTarget * 100).toFixed(1)}%`;
  const streakDays = streak ?? 12;
  const stabilityLabel =
    deckStability == null ? sample.stability : `${deckStability.toFixed(1)} Days`;
  const sessionMinutes = minutesFor(cards.length);

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg pb-xl" data-testid="study-home">
      <header className="flex flex-col justify-between gap-md md:flex-row md:items-center">
        <div className="flex min-w-0 flex-col gap-xs">
          <div className="flex items-center gap-xs text-label-sm text-text-subtle">
            <span>Workspace</span>
            <span>/</span>
            <span className="font-medium text-primary">Reviews</span>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <h1 className="font-heading text-headline-lg text-foreground">Spaced Repetition &amp; Reviews</h1>
            <Badge label="FSRS" tone="stable" />
          </div>
          <p className="max-w-reading text-body-md text-text-muted">
            Reviews scheduled for long-term retention across your active subjects.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-sm">
          <Button variant="secondary" onClick={() => router.push(`${basePath}/settings/`)}>
            <Icon name="tune" size="sm" />
            Configure FSRS weights
          </Button>
          {/* BACKEND_GAP(reviews-5) */}
          <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
            <Icon name="file_download" size="sm" />
            Export deck
          </Button>
        </div>
      </header>

      <Card className="relative overflow-hidden rounded-card border-0 p-lg shadow-md">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-lg lg:flex-row lg:items-center">
          <div className="flex max-w-reading flex-col gap-sm">
            <Badge label="Daily Session Ready" tone="review" />
            <div>
              <h2 className="font-heading text-headline-md text-foreground">Consolidate Today&apos;s Memory Traces</h2>
              <p className="mt-xs text-body-md text-text-muted">
                {cards.length} cards due across {activeDecks || subjects.length} subjects
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-sm">
              <span className="inline-flex items-center gap-xs rounded-md bg-muted px-sm py-xs text-label-md text-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                {newCount} New
              </span>
              <span className="inline-flex items-center gap-xs rounded-md bg-muted px-sm py-xs text-label-md text-foreground">
                <span className="h-2 w-2 rounded-full bg-status-review" />
                {learningCount} Learning
              </span>
              <span className="inline-flex items-center gap-xs rounded-md bg-muted px-sm py-xs text-label-md text-foreground">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                {reviewCount} Review
              </span>
              {/* BACKEND_GAP(reviews-4) */}
              <span className="inline-flex items-center gap-xs rounded-md bg-muted px-sm py-xs text-label-md text-text-muted">
                <Icon name="timer" size="sm" />
                ~{sessionMinutes} min estimated
              </span>
            </div>
            <div className="flex flex-nowrap items-end gap-sm overflow-x-auto">
              <div className="w-40 shrink-0">
                <div className={fieldClass}>
                  <Select
                    label="Subject"
                    data-testid="study-subject"
                    value={subjectId}
                    onChange={(event) => {
                      setSubjectId(event.target.value);
                      setSourceId("");
                    }}
                    options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                  />
                </div>
              </div>
              <SegmentedControl
                className={controlClass}
                label="Grounding"
                data-testid="study-grounding"
                value={grounding}
                onChange={setGrounding}
                options={[
                  { value: "notes", label: "Notes" },
                  { value: "online", label: "Online" },
                ]}
              />
              <SegmentedControl
                className={controlClass}
                label="Study mode"
                data-testid="study-mode"
                value={studyMode}
                onChange={setStudyMode}
                options={[
                  { value: "practice", label: "Practice" },
                  { value: "review_due", label: selectedDue ? `Due (${selectedDue})` : "Due" },
                  { value: "mixed", label: "Mixed" },
                ]}
              />
              <div className="w-16 shrink-0">
                <div className={fieldClass}>
                  <Select
                    label="Burst size"
                    data-testid="study-burst-size"
                    value={burstSize}
                    onChange={(event) => setBurstSize(event.target.value)}
                    options={[2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
                  />
                </div>
              </div>
              <Button variant="quiet" size="sm" onClick={() => setScopeOpen((open) => !open)}>
                Scope
              </Button>
            </div>
            {scopeOpen ? (
              <div className="flex flex-wrap gap-sm">
                <div className="min-w-40 flex-1">
                  <Select
                    label="Source (optional)"
                    data-testid="study-source"
                    value={sourceId}
                    onChange={(event) => setSourceId(event.target.value)}
                    options={[{ value: "", label: "All sources" }, ...sources.map((source) => ({ value: source.id, label: source.title }))]}
                  />
                </div>
                <div className="min-w-40 flex-1">
                  <Select
                    label="Topic (optional)"
                    data-testid="study-topic"
                    value={topicId}
                    onChange={(event) => setTopicId(event.target.value)}
                    options={[{ value: "", label: "All topics" }, ...topics.map((topic) => ({ value: topic.id, label: topic.title }))]}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-col items-start justify-between gap-md sm:flex-row lg:flex-col lg:items-end">
            <div className="flex flex-col lg:items-end">
              <span className="text-label-sm uppercase tracking-wide text-text-subtle">Target Retention</span>
              <div className="flex items-baseline gap-xs">
                <span className="font-heading text-headline-lg font-semibold text-foreground">{targetLabel}</span>
                <span className="text-body-sm text-secondary">benchmark</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-sm">
              <div className="inline-flex items-center gap-xs rounded-lg border border-border bg-muted p-xs">
                <Button
                  variant="quiet"
                  size="sm"
                  className={burstSize === "4" ? "bg-surface text-primary shadow-sm" : ""}
                  onClick={() => setBurstSize("4")}
                >
                  Burst of 4
                </Button>
                {/* BACKEND_GAP(reviews-6) */}
                <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                  Full session (~{sessionMinutes} min)
                </Button>
              </div>
              <Button onClick={() => start()} disabled={starting} data-testid="study-start">
                <Icon name="play_arrow" size="sm" />
                {starting ? "Starting…" : "Start review"}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {openSessions.length ? (
        <div className="flex flex-wrap gap-sm">
          {openSessions.map((session) => (
            <Button
              key={session.id}
              variant="secondary"
              data-testid="study-resume"
              onClick={() => resume(session.id)}
            >
              Resume {session.grounding_mode} · burst {session.burst_size}
            </Button>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-sm">
          <div className="mb-sm flex items-center justify-between text-text-muted">
            <span className="text-label-md">Reviews Due Today</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-primary">
              <Icon name="alarm" size="sm" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-xs">
              <span className="font-heading text-headline-lg text-foreground">{cards.length}</span>
              <span className={overdue ? "text-label-md text-status-weak" : "text-label-md text-text-muted"}>
                {overdue ? "Urgent priority" : "Due now"}
              </span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">
              {busiest
                ? `${busiest.subject.name} has ${busiest.rows.length} pending`
                : "No cards pending"}
            </p>
          </div>
        </Card>
        {/* BACKEND_GAP(reviews-1) */}
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-sm">
          <div className="mb-sm flex items-center justify-between text-text-muted">
            <span className="text-label-md">Retention Rate</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-secondary">
              <Icon name="verified" size="sm" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-xs">
              <span className="font-heading text-headline-lg text-foreground">{sample.retention}</span>
              <span className="text-label-md text-secondary">{sample.retentionDelta}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.retentionDetail}</p>
          </div>
        </Card>
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-sm">
          <div className="mb-sm flex items-center justify-between text-text-muted">
            <span className="text-label-md">Review Streak</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-status-review">
              <Icon name="local_fire_department" size="sm" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-xs">
              <span className="font-heading text-headline-lg text-foreground">{streakDays} Days</span>
              <span className="text-label-md font-semibold text-status-review">Active habit</span>
            </div>
            {/* BACKEND_GAP(reviews-7) */}
            <p className="mt-xs text-body-sm text-text-muted">
              {streakDays}-day streak · {sample.milestone}
            </p>
          </div>
        </Card>
        {/* BACKEND_GAP(reviews-2) */}
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-sm">
          <div className="mb-sm flex items-center justify-between text-text-muted">
            <span className="text-label-md">FSRS Average Stability</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-muted text-text-muted">
              <Icon name="timeline" size="sm" />
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-xs">
              <span className="font-heading text-headline-lg text-foreground">{stabilityLabel}</span>
              <span className="text-label-md text-secondary">{sample.stabilityHint}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.stabilityDetail}</p>
          </div>
        </Card>
      </div>

      <div>
        <div className="mb-sm flex flex-wrap items-center justify-between gap-sm">
          <div className="flex flex-wrap items-center gap-sm">
            <h3 className="font-heading text-headline-sm text-foreground">Subject Review Queues</h3>
            <span className="text-body-sm text-text-muted">
              {activeDecks} decks active · Priority sorted by urgency
            </span>
          </div>
          <span className="text-label-sm text-text-subtle">Sorted by urgency</span>
        </div>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {queues.map(({ subject, rows }) => {
            const stability = mean(rows.map((row) => row.stability));
            const urgent = rows.some((row) => row.overdue > 0);
            return (
              <Card key={subject.id} className="flex flex-col justify-between rounded-card p-md shadow-sm">
                <div>
                  <div className="mb-sm flex items-center justify-between gap-sm">
                    <Badge
                      tone={rows.length && urgent ? "weak" : rows.length ? "stable" : "neutral"}
                      label={
                        rows.length
                          ? `${urgent ? "Urgent" : "Scheduled"} · ${rows.length} cards`
                          : "Clear · 0 cards"
                      }
                    />
                    {/* BACKEND_GAP(reviews-4) */}
                    <span className="text-body-sm text-text-muted">~{minutesFor(rows.length)} min</span>
                  </div>
                  <h4 className="font-heading text-headline-sm font-semibold text-foreground">{subject.name}</h4>
                  <p className="mt-xs text-body-sm text-text-muted">
                    {subject.description?.trim() || "No description yet."}
                  </p>
                  <div className="mt-md flex items-center justify-between rounded-md bg-muted p-sm text-label-md text-text-muted">
                    <span>FSRS Stability</span>
                    <span className="font-semibold text-foreground">
                      {stability == null ? "—" : `${stability.toFixed(1)} days`}
                    </span>
                  </div>
                </div>
                <div className="pt-md">
                  <Button
                    variant="secondary"
                    className="w-full"
                    disabled={starting || rows.length === 0}
                    onClick={() => start({ subjectId: subject.id, mode: "review_due" })}
                  >
                    <Icon name="play_arrow" size="sm" />
                    Review subject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* BACKEND_GAP(reviews-3) */}
      <Card className="rounded-card border-0 p-lg shadow-sm">
        <div className="mb-lg flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div>
            <h3 className="font-heading text-headline-sm font-semibold text-foreground">
              Upcoming 7-Day Review Forecast
            </h3>
            <p className="text-body-sm text-text-muted">Projected review load based on memory decay modeling.</p>
          </div>
          <Badge label={`Total forecasted: ${sample.forecastTotal} cards`} tone="neutral" />
        </div>
        <div className="grid grid-cols-7 items-end gap-xs sm:gap-md">
          {forecast.map((day, index) => {
            const today = index === 0;
            const height = Math.round((day.count / forecastMax) * 100);
            return (
              <div key={day.label} className="flex min-w-0 flex-col items-center gap-xs">
                <span className={today ? "text-label-md font-semibold text-primary" : "text-label-md text-text-muted"}>
                  {day.count}
                </span>
                <div className="flex h-24 w-full items-end justify-center">
                  <div
                    className={
                      today
                        ? "w-full max-w-12 rounded-t-md bg-primary shadow-sm"
                        : "w-full max-w-12 rounded-t-md bg-muted"
                    }
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-center">
                  <span className={today ? "block text-label-md font-semibold text-primary" : "block text-label-md text-foreground"}>
                    {day.weekday}
                  </span>
                  <span className={today ? "block text-label-sm font-medium text-primary" : "block text-label-sm text-text-subtle"}>
                    {day.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="rounded-card border-0 p-lg shadow-sm">
        <div className="mb-md flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div>
            <h3 className="font-heading text-headline-sm font-semibold text-foreground">
              Difficult Cards &amp; Memory Weak Points
            </h3>
            <p className="text-body-sm text-text-muted">
              Cards with repeated recall lapses or unstable retention parameters. Drill these to prevent exam drop-off.
            </p>
          </div>
          <div className="flex items-center gap-sm">
            <span className="inline-flex items-center gap-xs text-label-md text-text-muted">
              <Icon name="warning" size="sm" />
              {usingSampleWeak ? sample.flagged : liveWeak.length} flagged for remediation
            </span>
            {usingSampleWeak ? (
              <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                Show all
              </Button>
            ) : (
              <Button variant="quiet" size="sm" onClick={() => setShowAllWeak((open) => !open)}>
                {showAllWeak ? "Show less" : "Show all"}
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-sm">
          {visibleWeak.map((row, index) => {
            const sampleRow = usingSampleWeak ? (row as ReviewWeakSample) : null;
            const live = usingSampleWeak ? null : (row as DueCard);
            const subjectName =
              sampleRow?.subject ??
              subjects.find((subject) => subject.id === live?.subjectId)?.name ??
              "Subject";
            const lapseClass =
              (sampleRow?.lapseTone ?? (live && live.lapses >= 4 ? "weak" : "review")) === "weak"
                ? "text-status-weak"
                : "text-status-review";
            const iconTone =
              index === 0 ? "bg-status-weak-bg text-status-weak" : index === 1 ? "bg-status-review-bg text-status-review" : "bg-status-stable-bg text-status-stable";
            return (
              <div
                key={sampleRow?.title ?? live?.questionId}
                className="flex flex-col justify-between gap-md rounded-md bg-muted p-md lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 items-start gap-md">
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconTone}`}>
                    <Icon name={sampleRow?.icon ?? weakIcons[index % weakIcons.length]} size="md" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-sm">
                      <span className="font-heading text-headline-sm font-semibold text-foreground">
                        {sampleRow?.title ?? live?.stem}
                      </span>
                      <span className="rounded-sm bg-surface px-sm py-xs text-label-sm text-text-muted">{subjectName}</span>
                    </div>
                    <p className="mt-xs text-body-sm text-text-muted">{sampleRow?.body ?? live?.body}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-lg lg:justify-end">
                  <div className="flex items-center gap-md text-right">
                    <div>
                      <span className="block text-label-sm uppercase text-text-subtle">Lapses</span>
                      <span className={`text-label-md font-semibold ${lapseClass}`}>
                        {sampleRow?.lapses ?? `${live?.lapses ?? 0} failures`}
                      </span>
                    </div>
                    <div>
                      <span className="block text-label-sm uppercase text-text-subtle">Stability</span>
                      <span className="text-label-md font-medium text-foreground">
                        {sampleRow?.stability ?? `${(live?.stability ?? 0).toFixed(1)} days`}
                      </span>
                    </div>
                  </div>
                  {/* BACKEND_GAP(reviews-8) */}
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={usingSampleWeak || starting || !live?.subjectId}
                    title={usingSampleWeak ? "Coming soon" : undefined}
                    className="disabled:opacity-100"
                    onClick={() => {
                      if (!live?.subjectId) return;
                      void start({
                        subjectId: live.subjectId,
                        mode: "practice",
                        topicId: live.topicId ?? undefined,
                      });
                    }}
                  >
                    <Icon name="fitness_center" size="sm" />
                    Practice
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </section>
  );
}
