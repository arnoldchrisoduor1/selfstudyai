import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FilterChip } from "@self-study/ui/FilterChip";
import { Heatmap } from "@self-study/ui/Heatmap";
import { Icon } from "@self-study/ui/Icon";
import { Loader } from "@self-study/ui/Loader";
import { useToast } from "@self-study/ui/useToast";

import {
  createSession,
  getDailyActivity,
  getDashboard,
  getDueQueue,
  getLearningSettings,
  listQuestions,
  listSources,
  listSubjects,
  listTests,
  listTopics,
  type DailyActivity,
  type Dashboard,
  type DueQueueItem,
  type FinalTest,
  type Question,
} from "@/lib/api-client";
import { setActiveSessionId } from "@/lib/active-session";
import { basePath } from "@/lib/nav";
import { analyticsPlaceholder } from "@/lib/placeholders/analytics";

type RangeId = "7" | "30" | "all";

interface TopicRow {
  key: string;
  subjectId: string;
  topicId: string | null;
  title: string;
  curriculum: string;
  mastery: string;
  stability: string;
  lapses: string;
  status: string;
  tone: "strong" | "stable" | "review" | "weak" | "neutral";
  live: boolean;
}

function ymd(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function sliceWindow(rows: DailyActivity[], days: number | null, shiftDays: number): DailyActivity[] {
  const end = addDays(new Date(), -shiftDays);
  const endKey = ymd(end);
  if (days == null) return rows.filter((row) => row.date <= endKey);
  const startKey = ymd(addDays(end, -(days - 1)));
  return rows.filter((row) => row.date >= startKey && row.date <= endKey);
}

function hoursOf(rows: DailyActivity[]): number {
  const minutes = rows.reduce((sum, row) => sum + row.minutes_studied, 0);
  return minutes / 60;
}

function heatmapCells(rows: DailyActivity[]) {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  const end = new Date();
  const start = addDays(end, -83);
  const mondayBack = (start.getDay() + 6) % 7;
  const cells = [];
  for (let cursor = addDays(start, -mondayBack); ymd(cursor) <= ymd(end); cursor = addDays(cursor, 1)) {
    const key = ymd(cursor);
    const row = byDate.get(key);
    cells.push({
      date: key,
      questions_answered: row?.questions_answered ?? 0,
      goal_met: row?.goal_met,
    });
  }
  return cells;
}

function Spark({ values, target }: { values: number[]; target?: number }) {
  const width = 320;
  const height = 120;
  const min = 50;
  const max = 100;
  const point = (value: number, index: number) => {
    const x = (index / Math.max(values.length - 1, 1)) * width;
    const y = height - ((value - min) / (max - min)) * height;
    return `${x},${y}`;
  };
  const targetY = target == null ? null : height - ((target - min) / (max - min)) * height;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-32 w-full text-primary" role="img" aria-label="Retention curve">
      {targetY != null ? (
        <line x1="0" x2={width} y1={targetY} y2={targetY} stroke="currentColor" className="text-text-subtle" strokeDasharray="4 4" />
      ) : null}
      <polyline fill="none" stroke="currentColor" strokeWidth="2" points={values.map(point).join(" ")} />
    </svg>
  );
}

export function AnalyticsSection() {
  const router = useRouter();
  const { push } = useToast();
  const sample = analyticsPlaceholder;
  const [range, setRange] = useState<RangeId>("30");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [activity, setActivity] = useState<DailyActivity[]>([]);
  const [target, setTarget] = useState<number | null>(null);
  const [subjects, setSubjects] = useState(0);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [tests, setTests] = useState<FinalTest[]>([]);
  const [topics, setTopics] = useState<TopicRow[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      getDashboard(),
      getDailyActivity(),
      getLearningSettings(),
      listSubjects(),
      listTests(),
      getDueQueue(),
      listQuestions({}),
      listSources(),
    ]).then(async ([dash, days, learning, subjectRows, testRows, dueRows, questionRows, sourceRows]) => {
      if (dash.status === "rejected") {
        setStatus("error");
        return;
      }
      setDashboard(dash.value);
      if (days.status === "fulfilled") setActivity(days.value);
      if (learning.status === "fulfilled") setTarget(learning.value.settings.desired_retention);
      if (subjectRows.status === "fulfilled") setSubjects(subjectRows.value.length);
      if (testRows.status === "fulfilled") setTests(testRows.value);
      const due = dueRows.status === "fulfilled" ? dueRows.value : [];
      const questions = questionRows.status === "fulfilled" ? questionRows.value : [];
      setDueCount(due.length);
      const sources = sourceRows.status === "fulfilled" ? sourceRows.value : [];
      setTopics(await loadTopics(sources, questions, due));
      setStatus("ready");
    });
  }, []);

  const days = range === "all" ? null : Number(range);
  const current = useMemo(() => sliceWindow(activity, days, 0), [activity, days]);
  const previous = useMemo(() => (days == null ? [] : sliceWindow(activity, days, days)), [activity, days]);
  const studyHours = hoursOf(current);
  const previousHours = hoursOf(previous);
  const studyDelta =
    previousHours > 0 ? `${studyHours >= previousHours ? "+" : ""}${(((studyHours - previousHours) / previousHours) * 100).toFixed(1)}%` : null;
  const perDay = current.length ? studyHours / current.length : 0;
  const pointsTotal = dashboard?.total_points ?? 0;
  const pointBase = pointsTotal > 0 ? pointsTotal : sample.samplePoints;
  const cells = useMemo(() => heatmapCells(activity), [activity]);
  const scored = useMemo(
    () =>
      tests
        .filter((test) => test.score != null)
        .sort((a, b) => (a.submitted_at ?? a.created_at).localeCompare(b.submitted_at ?? b.created_at)),
    [tests],
  );
  const targetPct = target == null ? 90 : Math.round(target * 1000) / 10;

  async function practice(row: TopicRow) {
    if (!row.live || !row.subjectId) return;
    setStarting(true);
    try {
      const session = await createSession({
        subject_id: row.subjectId,
        scope: { source_ids: [], topic_ids: row.topicId ? [row.topicId] : [] },
        grounding_mode: "notes",
        burst_size: 4,
        mode: "practice",
      });
      setActiveSessionId(session.id);
      await router.push(`${basePath}/study/session/?id=${session.id}`);
    } catch {
      push("Could not start practice", "error");
    } finally {
      setStarting(false);
    }
  }

  if (status === "loading") return <Loader label="Loading analytics" />;
  if (status === "error" || !dashboard) {
    return <ErrorState title="Analytics unavailable" message="The API did not respond." />;
  }

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg pb-xl" data-testid="analytics">
      <header className="flex flex-col justify-between gap-md min-[795px]:flex-row min-[795px]:items-end">
        <div className="flex flex-col gap-xs">
          <div className="flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
            <span>Workspace</span>
            <span>/</span>
            <span className="text-primary">Analytics</span>
          </div>
          <h1 className="font-heading text-headline-lg text-foreground">Analytics</h1>
          <p className="text-body-md text-text-muted">Track retention velocity, syllabus mastery, and test progress</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <FilterChip label="7 days" selected={range === "7"} onClick={() => setRange("7")} />
          <FilterChip label="30 days" selected={range === "30"} onClick={() => setRange("30")} />
          {/* BACKEND_GAP(analytics-1) */}
          <FilterChip label="Semester" disabled title="Coming soon" className="disabled:opacity-100" />
          <FilterChip label="All time" selected={range === "all"} onClick={() => setRange("all")} />
          {/* BACKEND_GAP(analytics-2) */}
          <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
            <Icon name="download" size="sm" />
            Export report
          </Button>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-md sm:grid-cols-2 min-[795px]:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Card className="flex min-w-0 flex-col justify-between gap-sm overflow-hidden p-md">
          <div className="flex min-w-0 items-center justify-between gap-xs text-label-sm uppercase tracking-wide text-text-muted [&>span]:min-w-0">
            <span>Study Time</span>
            <Icon name="schedule" size="sm" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-xs">
              <span className="font-heading text-headline-md text-foreground">{studyHours.toFixed(1)}</span>
              <span className="text-body-sm text-text-muted">hrs</span>
              {studyDelta ? <span className="text-label-sm text-status-strong">{studyDelta}</span> : null}
            </div>
            <p className="mt-xs text-body-sm text-text-muted">
              Averaging {perDay.toFixed(1)} hrs/day across {subjects} subjects
            </p>
          </div>
        </Card>
        {/* BACKEND_GAP(analytics-3) */}
        <Card className="flex min-w-0 flex-col justify-between gap-sm overflow-hidden p-md">
          <div className="flex min-w-0 items-center justify-between gap-xs text-label-sm uppercase tracking-wide text-text-muted [&>span]:min-w-0">
            <span>Retention Rate</span>
            <Icon name="neurology" size="sm" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-xs">
              <span className="font-heading text-headline-md text-foreground">{sample.retention}</span>
              <span className="text-label-sm text-status-strong">{sample.retentionDelta}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">Targeting {targetPct.toFixed(1)}% optimal recall balance</p>
          </div>
        </Card>
        {/* BACKEND_GAP(analytics-4) */}
        <Card className="flex min-w-0 flex-col justify-between gap-sm overflow-hidden p-md">
          <div className="flex min-w-0 items-center justify-between gap-xs text-label-sm uppercase tracking-wide text-text-muted [&>span]:min-w-0">
            <span>Concepts Mastered</span>
            <Icon name="verified" size="sm" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-xs">
              <span className="font-heading text-headline-md text-foreground">{sample.concepts}</span>
              <span className="text-body-sm text-text-muted">of {sample.conceptsTotal}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">
              {sample.coverage}
              {dueCount != null ? ` · ${dueCount} due now` : ` · ${sample.conceptsDue}`}
            </p>
          </div>
        </Card>
        {/* BACKEND_GAP(analytics-5) */}
        <Card className="flex min-w-0 flex-col justify-between gap-sm overflow-hidden p-md">
          <div className="flex min-w-0 items-center justify-between gap-xs text-label-sm uppercase tracking-wide text-text-muted [&>span]:min-w-0">
            <span>Knowledge Score</span>
            <Icon name="workspace_premium" size="sm" />
          </div>
          <div>
            <div className="flex flex-wrap items-baseline gap-xs">
              <span className="font-heading text-headline-md text-foreground">{sample.score}</span>
              <span className="text-body-sm text-text-muted">{sample.scoreTotal}</span>
              <Badge label={sample.scoreTone} tone="strong" />
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.scoreDetail}</p>
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-md min-[795px]:grid-cols-12 [&>*]:min-w-0">
        {/* BACKEND_GAP(analytics-3) */}
        <Card className="flex flex-col gap-md p-lg min-[795px]:col-span-8">
          <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-headline-sm text-foreground">Retention Rate Decay &amp; Target Efficacy</h2>
              <p className="text-body-sm text-text-muted">
                Recall probability over elapsed intervals compared against target threshold
              </p>
            </div>
            <div className="flex flex-wrap gap-sm text-label-sm text-text-muted">
              <span>Actual Retention</span>
              <span>Target {targetPct.toFixed(0)}%</span>
            </div>
          </div>
          <Spark values={sample.decay} target={targetPct} />
          <div className="grid grid-cols-3 gap-xs text-center text-label-sm text-text-muted sm:grid-cols-6">
            {sample.decayLabels.map((label, index) => (
              <span key={label}>
                {label} ({sample.decay[index]}%)
              </span>
            ))}
          </div>
          <div className="flex flex-col justify-between gap-sm rounded-md bg-muted p-sm sm:flex-row sm:items-center">
            <p className="text-body-sm text-text-muted">{sample.decayNote}</p>
            <Button variant="secondary" size="sm" onClick={() => router.push(`${basePath}/settings/`)}>
              Adjust Parameters
            </Button>
          </div>
        </Card>
        {/* BACKEND_GAP(analytics-6) */}
        <Card className="flex flex-col gap-md p-lg min-[795px]:col-span-4">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Cognitive Load &amp; Distribution</h2>
            <p className="text-body-sm text-text-muted">Study volume allocation across active curricula and learning formats.</p>
          </div>
          <div className="flex flex-col gap-sm">
            {sample.load.map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between text-label-md">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-text-muted">
                    {row.hours} ({row.pct}%)
                  </span>
                </div>
                <div className="mt-xs h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <p className="text-label-sm uppercase tracking-wide text-text-muted">Study Modality Mix</p>
            <div className="mt-sm flex h-2 overflow-hidden rounded-full">
              {sample.modality.map((part, index) => (
                <div
                  key={part.label}
                  className={index === 0 ? "bg-primary" : index === 1 ? "bg-secondary" : "bg-status-review"}
                  style={{ width: `${part.pct}%` }}
                />
              ))}
            </div>
            <div className="mt-sm flex flex-wrap gap-sm text-label-sm text-text-muted">
              {sample.modality.map((part) => (
                <span key={part.label}>
                  {part.label} {part.pct}%
                </span>
              ))}
            </div>
          </div>
          <p className="text-body-sm text-text-muted">{sample.peak}</p>
        </Card>
      </div>

      <div className="grid min-w-0 grid-cols-1 items-start gap-md min-[795px]:grid-cols-12 [&>*]:min-w-0">
        <Card className="flex flex-col gap-md p-lg min-[795px]:col-span-8">
          <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
            <div>
              <h2 className="font-heading text-headline-sm text-foreground">Study Activity</h2>
              <p className="text-body-sm text-text-muted">Daily active study distribution and revision frequency</p>
            </div>
            <span className="inline-flex items-center gap-xs text-label-md text-status-review">
              <Icon name="local_fire_department" size="sm" />
              Current streak {dashboard.streak.current} days · Longest {dashboard.streak.longest} days
            </span>
          </div>
          <Heatmap days={cells} />
          <p className="text-label-sm text-text-muted">Today is {todayLabel}</p>
        </Card>
        {/* BACKEND_GAP(analytics-7) */}
        <Card className="flex flex-col gap-md p-lg min-[795px]:col-span-4">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Points Breakdown</h2>
            <div className="mt-sm flex items-baseline gap-xs">
              <span className="font-heading text-headline-md text-foreground">{pointBase.toLocaleString("en-US")}</span>
              <span className="text-body-sm text-text-muted">pts</span>
            </div>
            <p className="text-body-sm text-text-muted">Earned this semester toward syllabus milestones</p>
          </div>
          <div className="flex flex-col gap-sm">
            {sample.points.map((part) => (
              <div key={part.label} className="flex items-center justify-between text-label-md">
                <span className="text-foreground">{part.label}</span>
                <span className="text-text-muted">
                  {Math.round((pointBase * part.pct) / 100).toLocaleString("en-US")} pts ({part.pct}%)
                </span>
              </div>
            ))}
          </div>
          <p className="text-label-md text-text-muted">Tier rank · Level {dashboard.level}</p>
        </Card>
      </div>

      <Card className="flex min-w-0 flex-col gap-md overflow-hidden p-lg">
        <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Curriculum Topic Competency &amp; Lapse Frequency</h2>
            <p className="text-body-sm text-text-muted">
              Local evaluation analytics detailing concept retrievability, stability intervals, and remediation priorities.
            </p>
          </div>
          {/* BACKEND_GAP(analytics-8) */}
          <Button variant="secondary" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
            <Icon name="filter_list" size="sm" />
            Filter Lapses
          </Button>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-[36rem] flex-col gap-sm">
            <div className="grid grid-cols-[minmax(0,1.6fr)_5rem_7rem_5rem_7rem_auto] gap-sm text-label-sm uppercase tracking-wide text-text-muted">
              <span>Topic &amp; Curriculum</span>
              <span>Mastery</span>
              <span>Stability</span>
              <span>Lapses</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {(topics.length ? topics : sampleTopics()).map((row) => (
              <div
                key={row.key}
                className="grid grid-cols-[minmax(0,1.6fr)_5rem_7rem_5rem_7rem_auto] items-center gap-sm rounded-md bg-muted/40 p-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-label-md font-semibold text-foreground">{row.title}</p>
                  <p className="truncate text-body-sm text-text-muted">{row.curriculum}</p>
                </div>
                <span className="text-label-md text-foreground">{row.mastery}</span>
                <span className="truncate text-body-sm text-text-muted">{row.stability}</span>
                <span className="text-body-sm text-text-muted">{row.lapses}</span>
                <Badge label={row.status} tone={row.tone} />
                <div className="flex gap-xs">
                  <Button
                    variant="quiet"
                    size="sm"
                    disabled={!row.live || starting}
                    title={row.live ? undefined : "Coming soon"}
                    className="disabled:opacity-100"
                    onClick={() => practice(row)}
                  >
                    Practice
                  </Button>
                  <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Test Score Progression Over Time</h2>
            <p className="text-body-sm text-text-muted">Score trajectories across timed examinations and practice papers</p>
          </div>
        </div>
        {scored.length ? (
          <Spark values={scored.map((test) => Math.round((test.score ?? 0) * 100))} />
        ) : (
          /* BACKEND_GAP(analytics-9) */
          <Spark values={sample.tests} />
        )}
        <div className="grid grid-cols-2 gap-xs text-center text-label-sm text-text-muted sm:grid-cols-5">
          {scored.length
            ? scored.map((test) => (
                <span key={test.id}>
                  {new Date(test.submitted_at ?? test.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                  <span className="block">{Math.round((test.score ?? 0) * 100)}%</span>
                </span>
              ))
            : sample.testLabels.map((label, index) => (
                <span key={label}>
                  {label}
                  <span className="block">{sample.testDates[index]}</span>
                </span>
              ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-sm text-body-sm text-text-muted">
          <span>
            {scored.length >= 2
              ? `${scored[scored.length - 1].score! >= scored[0].score! ? "+" : ""}${Math.round(((scored[scored.length - 1].score ?? 0) - (scored[0].score ?? 0)) * 100)} pts from first scored test to latest`
              : sample.testDelta}
          </span>
          <span>Updated {todayLabel}</span>
        </div>
      </Card>
    </section>
  );
}

function sampleTopics(): TopicRow[] {
  return analyticsPlaceholder.topics.map((topic) => ({
    key: topic.title,
    subjectId: "",
    topicId: null,
    title: topic.title,
    curriculum: topic.curriculum,
    mastery: topic.mastery,
    stability: topic.stability,
    lapses: topic.lapses,
    status: topic.status,
    tone: topic.tone,
    live: false,
  }));
}

async function loadTopics(
  sources: { id: string; subject_id: string; title: string }[],
  questions: Question[],
  due: DueQueueItem[],
): Promise<TopicRow[]> {
  const cards = new Map(due.map((item) => [item.question_id, item.card_state]));
  const rows: TopicRow[] = [];
  for (const source of sources.slice(0, 4)) {
    let topics: { id: string; title: string }[] = [];
    try {
      topics = await listTopics(source.id);
    } catch {
      continue;
    }
    for (const topic of topics) {
      const related = questions.filter((question) => question.topic_id === topic.id);
      const states = related.map((question) => cards.get(question.id)).filter((state) => state != null);
      const lapses = states.reduce((sum, state) => sum + (state?.lapses ?? 0), 0);
      const stabilityValues = states.map((state) => state?.stability ?? 0);
      const stability = stabilityValues.length
        ? stabilityValues.reduce((sum, value) => sum + value, 0) / stabilityValues.length
        : null;
      rows.push({
        key: topic.id,
        subjectId: source.subject_id,
        topicId: topic.id,
        title: topic.title,
        curriculum: source.title,
        mastery: "—",
        stability: stability == null ? "—" : `${stability.toFixed(1)} days`,
        lapses: states.length ? `${lapses} ${lapses === 1 ? "lapse" : "lapses"}` : "—",
        status: lapses >= 3 ? "Review Priority" : lapses > 0 ? "On Track" : "No due cards",
        tone: lapses >= 3 ? "weak" : lapses > 0 ? "review" : "neutral",
        live: true,
      });
    }
  }
  return rows.filter((row) => row.lapses !== "—").slice(0, 5);
}
