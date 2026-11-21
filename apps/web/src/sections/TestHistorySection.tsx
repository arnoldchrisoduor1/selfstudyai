import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { Checkbox } from "@self-study/ui/Checkbox";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Icon } from "@self-study/ui/Icon";
import { Loader } from "@self-study/ui/Loader";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { Toggle } from "@self-study/ui/Toggle";
import { useToast } from "@self-study/ui/useToast";

import {
  createTest,
  getLearningSettings,
  getQuestionSettings,
  listSubjects,
  listTests,
  startTest,
  type FinalTest,
  type QuestionSettings,
  type Subject,
  type TestDefaults,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";
import { finalTestsPlaceholder } from "@/lib/placeholders/final-tests";

const fieldClass =
  "[&_label]:gap-xs [&_label>span]:text-label-sm [&_label>span]:uppercase [&_label>span]:tracking-wide [&_label>span]:text-text-muted [&_select]:min-h-11 [&_select]:bg-muted [&_select]:py-2 [&_select]:text-label-md";
const mixClass = "[&>span]:sr-only [&_button]:min-h-11 [&_button]:px-sm [&_button]:py-1 [&_button]:text-label-sm";

const countChoices = ["20", "35", "50"];
const minuteChoices = ["60", "90", "120", "180"];

function configNumber(config: Record<string, unknown>, key: string): number | null {
  const value = config[key];
  return typeof value === "number" ? value : null;
}

function configFlag(config: Record<string, unknown>, key: string): boolean {
  return config[key] === true;
}

function minutesOf(test: FinalTest): number | null {
  if (test.time_limit_s) return Math.round(test.time_limit_s / 60);
  const fromConfig = configNumber(test.config, "time_limit_s");
  return fromConfig ? Math.round(fromConfig / 60) : null;
}

function questionCount(test: FinalTest): number | null {
  return configNumber(test.config, "question_count");
}

function finished(test: FinalTest): boolean {
  return test.status === "submitted" || test.status === "expired";
}

function active(test: FinalTest): boolean {
  return test.status === "draft" || test.status === "in_progress";
}

function scoreCopy(score: number | null): { label: string; tone: "strong" | "stable" | "review" | "weak" } | null {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  if (pct >= 90) return { label: `${pct}% Excellent`, tone: "strong" };
  if (pct >= 80) return { label: `${pct}% Good`, tone: "stable" };
  if (pct >= 70) return { label: `${pct}% Needs Review`, tone: "review" };
  return { label: `${pct}% Weak`, tone: "weak" };
}

function withChoice(choices: string[], value: string, suffix: string) {
  const options = choices.map((choice) => ({ value: choice, label: `${choice} ${suffix}` }));
  if (!value || choices.includes(value)) return options;
  return [{ value, label: `${value} ${suffix}` }, ...options];
}

function Meter({ value, tone }: { value: number; tone: "strong" | "primary" | "review" }) {
  const fill = tone === "strong" ? "bg-status-strong" : tone === "review" ? "bg-status-review" : "bg-primary";
  return (
    <div className="mt-md h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function TestHistorySection() {
  const router = useRouter();
  const { push } = useToast();
  const sample = finalTestsPlaceholder;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tests, setTests] = useState<FinalTest[]>([]);
  const [filterId, setFilterId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [count, setCount] = useState("35");
  const [minutes, setMinutes] = useState("120");
  const [kind, setKind] = useState("mcq");
  const [application, setApplication] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [useDefaults, setUseDefaults] = useState(true);
  const [defaults, setDefaults] = useState<TestDefaults | null>(null);
  const [cognitive, setCognitive] = useState<QuestionSettings["cognitive_mix"] | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);

  function applyDefaults(next: TestDefaults) {
    setCount(String(next.question_count));
    setMinutes(next.time_limit_s ? String(Math.round(next.time_limit_s / 60)) : "120");
    setKind(next.kind_mcq_pct >= 50 ? "mcq" : "written");
    setFocusMode(next.focus_mode);
    setApplication(false);
  }

  useEffect(() => {
    Promise.allSettled([listSubjects(), listTests(), getLearningSettings(), getQuestionSettings()]).then(
      ([subjectRows, testRows, learning, questions]) => {
        if (subjectRows.status === "rejected" || testRows.status === "rejected") {
          setStatus("error");
          return;
        }
        setSubjects(subjectRows.value);
        setTests(testRows.value);
        if (subjectRows.value[0]) setSubjectId(subjectRows.value[0].id);
        if (learning.status === "fulfilled") {
          setDefaults(learning.value.settings.test_defaults);
          applyDefaults(learning.value.settings.test_defaults);
        }
        if (questions.status === "fulfilled") setCognitive(questions.value.cognitive_mix);
        setStatus("ready");
      },
    );
  }, []);

  useEffect(() => {
    if (status !== "ready") return;
    listTests(filterId || undefined)
      .then(setTests)
      .catch(() => push("Could not load tests", "error"));
  }, [filterId, status, push]);

  useEffect(() => {
    if (!subjectId || !useDefaults) return;
    getLearningSettings(subjectId)
      .then((resolved) => {
        setDefaults(resolved.settings.test_defaults);
        applyDefaults(resolved.settings.test_defaults);
      })
      .catch(() => undefined);
  }, [subjectId, useDefaults]);

  const names = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const featured = useMemo(() => {
    return [...tests].filter(active).sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0] ?? null;
  }, [tests]);
  const past = tests.filter((test) => test.id !== featured?.id);
  const completed = tests.filter(finished);
  const completedPct = tests.length ? Math.round((completed.length / tests.length) * 100) : 0;

  async function build() {
    if (!subjectId || !defaults || !cognitive) return;
    setSaving(true);
    const mcq = kind === "mcq" ? 100 : 0;
    const mix = application
      ? { recall: 25, understand: 25, apply: 30, analyze: 20 }
      : cognitive;
    try {
      const test = await createTest({
        subject_id: subjectId,
        source_ids: [],
        topic_ids: [],
        question_count: Number(count) || defaults.question_count,
        time_limit_s: Number(minutes) ? Number(minutes) * 60 : null,
        kinds: { mcq_pct: mcq, written_pct: 100 - mcq },
        cognitive_mix: mix,
        include_gold: defaults.include_gold,
        use_existing: true,
        pass_mark: defaults.pass_mark,
        feedback_timing: defaults.feedback_timing,
        navigation: defaults.navigation,
        focus_mode: focusMode,
      });
      try {
        await startTest(test.id);
      } catch {
        push("Test created but could not start", "warning");
      }
      await router.push(`${basePath}/tests/session/?id=${test.id}`);
    } catch {
      push("Could not create test", "error");
    } finally {
      setSaving(false);
    }
  }

  function openTest(test: FinalTest) {
    const path =
      test.status === "in_progress" || test.status === "draft"
        ? `${basePath}/tests/session/?id=${test.id}`
        : `${basePath}/tests/results/?id=${test.id}`;
    void router.push(path);
  }

  if (status === "loading") return <Loader label="Loading tests" />;
  if (status === "error") {
    return <ErrorState title="Tests unavailable" message="The API did not respond." />;
  }
  if (!subjects.length) {
    return <EmptyState title="No subjects" message="Create a subject before building a test." />;
  }

  const featuredName = featured ? (names.get(featured.subject_id) ?? "Subject") : sample.examName;
  const featuredMinutes = featured ? minutesOf(featured) : null;
  const featuredCount = featured ? questionCount(featured) : null;
  const featuredFocus = featured ? configFlag(featured.config, "focus_mode") : true;

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg pb-xl" data-testid="test-history">
      <header className="flex flex-col gap-xs">
        <div className="flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
          <span>Workspace</span>
          <span>/</span>
          <span className="text-primary">Final Tests</span>
        </div>
        <div className="flex flex-col gap-xs sm:flex-row sm:items-baseline sm:justify-between">
          <h1 className="font-heading text-headline-lg text-foreground">Final Tests</h1>
          <p className="text-body-md text-text-muted">Timed practice exams built from your notes</p>
        </div>
      </header>

      <Card className="relative overflow-hidden rounded-card border-0 p-lg shadow-md">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/15 blur-3xl" />
        <div className="relative flex flex-col gap-lg">
          <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
            <div className="flex items-center gap-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted text-secondary shadow-sm">
                <Icon name="event_upcoming" size="md" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-sm">
                  <span className="font-heading text-headline-sm text-foreground">{featuredName} Final</span>
                  {featured ? (
                    <Badge label={featured.status === "in_progress" ? "In progress" : "Draft"} tone="review" />
                  ) : (
                    /* BACKEND_GAP(final-tests-1) */
                    <Badge label={sample.dueLabel} tone="review" />
                  )}
                </div>
                <p className="mt-xs text-body-sm text-text-muted">
                  {featured
                    ? subjects.find((subject) => subject.id === featured.subject_id)?.description?.trim() ||
                      sample.examDetail
                    : sample.examDetail}
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-xs text-label-sm text-text-muted sm:flex">
              <Icon name="schedule" size="sm" />
              {sample.schedule}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-sm min-[1004px]:grid-cols-4">
            <div className="flex flex-col gap-xs rounded-md bg-muted p-md">
              <span className="inline-flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
                <Icon name="timer" size="sm" />
                Duration
              </span>
              <span className="font-heading text-headline-md text-foreground">
                {featuredMinutes != null ? `${featuredMinutes} min` : sample.duration}
              </span>
              <span className="text-body-sm text-text-muted">{sample.durationDetail}</span>
            </div>
            <div className="flex flex-col gap-xs rounded-md bg-muted p-md">
              <span className="inline-flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
                <Icon name="ballot" size="sm" />
                Questions
              </span>
              <span className="font-heading text-headline-md text-foreground">
                {featuredCount != null ? String(featuredCount) : sample.questions}
              </span>
              <span className="text-body-sm text-text-muted">{sample.questionsDetail}</span>
            </div>
            {/* BACKEND_GAP(final-tests-2) */}
            <div className="flex flex-col gap-xs rounded-md bg-muted p-md">
              <span className="inline-flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
                <Icon name="trending_up" size="sm" />
                Projected grade
              </span>
              <div className="flex items-baseline gap-sm">
                <span className="font-heading text-headline-md text-status-strong">{sample.grade}</span>
                <Badge label={sample.gradeTone} tone="strong" />
              </div>
              <span className="text-body-sm text-text-muted">{sample.gradeDetail}</span>
            </div>
            <div className="flex flex-col gap-xs rounded-md bg-muted p-md">
              <span className="inline-flex items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
                <Icon name="shield" size="sm" />
                Mode
              </span>
              <span className="font-heading text-headline-md text-foreground">
                {featured ? (featuredFocus ? "Focus mode" : "Open mode") : sample.mode}
              </span>
              <span className="text-body-sm text-text-muted">{sample.modeDetail}</span>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
            {/* BACKEND_GAP(final-tests-4) */}
            <span className="inline-flex items-center gap-xs text-body-sm text-text-muted">
              <Icon name="bookmark" size="sm" />
              {featured ? "Saved progress is on this test" : sample.progress}
            </span>
            <div className="flex flex-wrap items-center gap-sm">
              <Button
                variant="secondary"
                disabled={!featured}
                title={featured ? undefined : "Coming soon"}
                className="disabled:opacity-100"
                onClick={() => featured && openTest(featured)}
              >
                <Icon name="fast_forward" size="sm" />
                {featured ? "Resume saved test" : sample.resume}
              </Button>
              <Button
                disabled={!featured || saving}
                title={featured ? undefined : "Coming soon"}
                className="disabled:opacity-100"
                onClick={() => featured && openTest(featured)}
              >
                <Icon name="play_arrow" size="sm" />
                Start final test
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 min-[1004px]:grid-cols-4">
        {/* BACKEND_GAP(final-tests-2) */}
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-md">
          <div className="flex items-center justify-between text-label-sm uppercase tracking-wide text-text-muted">
            <span>Readiness</span>
            <Icon name="verified" size="sm" />
          </div>
          <div className="mt-sm">
            <div className="flex items-baseline gap-sm">
              <span className="font-heading text-headline-lg text-foreground">{sample.readiness}</span>
              <span className="text-body-sm text-status-strong">{sample.readinessDelta}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.readinessDetail}</p>
          </div>
          <Meter value={sample.readinessBar} tone="strong" />
        </Card>
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-md">
          <div className="flex items-center justify-between text-label-sm uppercase tracking-wide text-text-muted">
            <span>Tests completed</span>
            <Icon name="task_alt" size="sm" />
          </div>
          <div className="mt-sm">
            <div className="flex items-baseline gap-sm">
              <span className="whitespace-nowrap font-heading text-headline-lg text-foreground">
                {completed.length} of {tests.length}
              </span>
              <span className="text-body-sm text-secondary">{completedPct}% completed</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">Semester schedule</p>
          </div>
          <Meter value={completedPct} tone="primary" />
        </Card>
        {/* BACKEND_GAP(final-tests-3) */}
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-md">
          <div className="flex items-center justify-between text-label-sm uppercase tracking-wide text-text-muted">
            <span>Syllabus coverage</span>
            <Icon name="menu_book" size="sm" />
          </div>
          <div className="mt-sm">
            <div className="flex items-baseline gap-sm">
              <span className="font-heading text-headline-lg text-foreground">{sample.coverage}</span>
              <span className="text-body-sm text-primary">{sample.coverageDetail}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.coverageNote}</p>
          </div>
          <Meter value={sample.coverageBar} tone="primary" />
        </Card>
        {/* BACKEND_GAP(final-tests-1) */}
        <Card className="flex flex-col justify-between rounded-card border-0 p-md shadow-md">
          <div className="flex items-center justify-between text-label-sm uppercase tracking-wide text-text-muted">
            <span>Next final in</span>
            <Icon name="event_note" size="sm" />
          </div>
          <div className="mt-sm">
            <div className="flex items-baseline gap-sm">
              <span className="font-heading text-headline-lg text-status-review">{sample.next}</span>
              <span className="text-body-sm text-text-muted">{sample.nextDate}</span>
            </div>
            <p className="mt-xs text-body-sm text-text-muted">{sample.nextSubject}</p>
          </div>
          <Meter value={sample.nextBar} tone="review" />
        </Card>
      </div>

      <Card className="flex flex-col gap-lg rounded-card border-0 p-lg shadow-md">
        <div>
          <h2 className="font-heading text-headline-sm text-foreground">Create a final test</h2>
          <p className="text-body-md text-text-muted">
            Build a customized timed practice exam from your synced notes and syllabus.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2 min-[1004px]:grid-cols-4">
          <div className={fieldClass}>
            <Select
              label="Subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
          </div>
          {/* BACKEND_GAP(final-tests-5) */}
          <div className={fieldClass}>
            <Select
              label="Format"
              value="full"
              disabled
              title="Coming soon"
              className="disabled:opacity-100"
              options={[
                { value: "full", label: "Full exam" },
                { value: "midterm", label: "Midterm" },
                { value: "short", label: "Short quiz" },
              ]}
            />
          </div>
          <div className={fieldClass}>
            <Select
              label="Number of questions"
              value={count}
              onChange={(event) => {
                setCount(event.target.value);
                setUseDefaults(false);
              }}
              options={withChoice(countChoices, count, "questions")}
            />
          </div>
          <div className={fieldClass}>
            <Select
              label="Duration"
              value={minutes}
              onChange={(event) => {
                setMinutes(event.target.value);
                setUseDefaults(false);
              }}
              options={withChoice(minuteChoices, minutes, "minutes")}
            />
          </div>
        </div>
        <div className="flex flex-col justify-between gap-md rounded-md bg-muted/60 p-md min-[1004px]:flex-row min-[1004px]:items-center">
          <div className="flex flex-col items-start gap-sm sm:flex-row sm:items-center">
            <span className="text-label-sm uppercase tracking-wide text-text-muted">Question mix:</span>
            <SegmentedControl
              className={mixClass}
              label="Question mix"
              value={kind}
              onChange={(value) => {
                setKind(value);
                setUseDefaults(false);
              }}
              options={[
                { value: "mcq", label: "Multiple choice" },
                { value: "written", label: "Written" },
              ]}
            />
            <Button
              variant="quiet"
              size="sm"
              aria-pressed={application}
              className={application ? "bg-surface text-foreground shadow-sm" : ""}
              onClick={() => {
                setApplication((value) => !value);
                setUseDefaults(false);
              }}
            >
              Application 30%
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-lg">
            <Toggle
              label="Focus mode (fullscreen, strict timing)"
              checked={focusMode}
              onCheckedChange={(next) => {
                setFocusMode(next);
                setUseDefaults(false);
              }}
            />
            <Checkbox
              label="Use my saved defaults for this subject"
              checked={useDefaults}
              onChange={(event) => {
                const next = event.target.checked;
                setUseDefaults(next);
                if (next && defaults) applyDefaults(defaults);
              }}
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-sm">
          <Button variant="quiet" data-testid="test-new-link" onClick={() => router.push(`${basePath}/tests/new/`)}>
            Full builder
          </Button>
          <Button onClick={build} disabled={saving || !defaults || !cognitive}>
            <Icon name="build" size="sm" />
            {saving ? "Building…" : "Build test"}
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-md rounded-card border-0 p-lg shadow-md">
        <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Past tests</h2>
            <p className="text-body-md text-text-muted">Previous test results, time spent, and review notes</p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <span className="text-body-sm text-text-muted">Showing {completed.length} completed</span>
            <div className={`${fieldClass} min-w-40`}>
              <Select
                label="Subject filter"
                data-testid="test-history-subject"
                value={filterId}
                onChange={(event) => setFilterId(event.target.value)}
                options={[{ value: "", label: "All subjects" }, ...subjects.map((subject) => ({ value: subject.id, label: subject.name }))]}
              />
            </div>
          </div>
        </div>
        {past.length === 0 ? (
          <EmptyState title="No tests" message="Build a test to see it here." />
        ) : (
          <div className="flex flex-col gap-sm">
            {past.map((test) => {
              const score = scoreCopy(test.score);
              const when = new Date(test.submitted_at ?? test.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              });
              const limit = minutesOf(test);
              const countLabel = questionCount(test);
              const clean = test.integrity_status === "clean";
              return (
                <div
                  key={test.id}
                  className="flex flex-col gap-sm rounded-md bg-muted/40 p-md min-[1004px]:flex-row min-[1004px]:items-center"
                >
                  <div className="min-w-0 min-[1004px]:flex-1">
                    <p className="text-label-md font-semibold text-foreground">
                      {/* BACKEND_GAP(final-tests-7) */}
                      {names.get(test.subject_id) ?? "Subject"} test
                    </p>
                    <p className="mt-xs text-body-sm text-text-muted">
                      {names.get(test.subject_id) ?? "Subject"}
                      {countLabel != null ? ` · ${countLabel} questions` : ""}
                    </p>
                  </div>
                  <span className="text-body-sm text-text-muted min-[1004px]:w-32">{when}</span>
                  {/* BACKEND_GAP(final-tests-6) */}
                  <span className="text-body-sm text-text-muted min-[1004px]:w-36">
                    {limit != null ? `${limit} min` : "—"}
                  </span>
                  <span className="min-[1004px]:w-40">
                    {score ? <Badge label={score.label} tone={score.tone} /> : <span className="text-body-sm text-text-muted">—</span>}
                  </span>
                  <span
                    className={`inline-flex items-center gap-xs text-body-sm min-[1004px]:w-28 ${clean ? "text-status-strong" : "text-status-review"}`}
                  >
                    <Icon name={clean ? "check_circle" : "warning"} size="sm" />
                    {test.integrity_status}
                  </span>
                  <Button variant="quiet" size="sm" data-testid="test-open" onClick={() => openTest(test)}>
                    {finished(test) ? "Review" : "Open"}
                    <Icon name="arrow_forward" size="sm" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
