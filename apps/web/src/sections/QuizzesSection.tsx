import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FilterChip } from "@self-study/ui/FilterChip";
import { Icon } from "@self-study/ui/Icon";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { ProgressBar } from "@self-study/ui/ProgressBar";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { Slider } from "@self-study/ui/Slider";
import { useToast } from "@self-study/ui/useToast";

import {
  createSession,
  getDueQueue,
  listOpenSessions,
  listQuestions,
  listSources,
  listSubjects,
  listTopics,
  type Source,
  type StudySession,
  type Subject,
} from "@/lib/api-client";
import { setActiveSessionId } from "@/lib/active-session";
import { basePath } from "@/lib/nav";
import { quizzesPlaceholder } from "@/lib/placeholders/quizzes";

const fieldClass =
  "[&_label]:gap-xs [&_label>span]:text-label-sm [&_label>span]:uppercase [&_label>span]:tracking-wide [&_label>span]:text-text-muted [&_select]:min-h-11 [&_select]:bg-muted [&_select]:py-2 [&_select]:text-label-md";
const mixClass = "[&>span]:sr-only [&_button]:min-h-11 [&_button]:px-sm [&_button]:py-1 [&_button]:text-label-sm";

function minutesFor(count: number): number {
  if (count <= 0) return 0;
  return Math.max(1, Math.round(count * 1.2));
}

export function QuizzesSection() {
  const router = useRouter();
  const { push } = useToast();
  const sample = quizzesPlaceholder;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [dueBySubject, setDueBySubject] = useState<Record<string, number>>({});
  const [topicsBySubject, setTopicsBySubject] = useState<Record<string, string[]>>({});
  const [goldCount, setGoldCount] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [grounding, setGrounding] = useState("notes");
  const [countChoice, setCountChoice] = useState("10");
  const [customCount, setCustomCount] = useState("15");
  const [focus, setFocus] = useState("due");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.allSettled([listSubjects(), listSources(), getDueQueue(), listQuestions({}), listQuestions({ gold: true })]).then(
      async ([subjectRows, sourceRows, dueRows, questionRows, goldRows]) => {
        if (subjectRows.status === "rejected") {
          setStatus("error");
          return;
        }
        const subjectList = subjectRows.value;
        setSubjects(subjectList);
        if (subjectList[0]) setSubjectId(subjectList[0].id);
        const sourceList = sourceRows.status === "fulfilled" ? sourceRows.value : [];
        setSources(sourceList);
        if (goldRows.status === "fulfilled") setGoldCount(goldRows.value.length);
        const questions = questionRows.status === "fulfilled" ? questionRows.value : [];
        const byQuestion = new Map(questions.map((question) => [question.id, question.subject_id]));
        const dueMap: Record<string, number> = {};
        if (dueRows.status === "fulfilled") {
          for (const item of dueRows.value) {
            const id = byQuestion.get(item.question_id);
            if (!id) continue;
            dueMap[id] = (dueMap[id] ?? 0) + 1;
          }
        }
        setDueBySubject(dueMap);
        const open = await Promise.allSettled(subjectList.map((subject) => listOpenSessions(subject.id)));
        setSessions(open.flatMap((result) => (result.status === "fulfilled" ? result.value : [])));
        const ranked = [...subjectList].sort((a, b) => (dueMap[b.id] ?? 0) - (dueMap[a.id] ?? 0)).slice(0, 3);
        const topicEntries = await Promise.all(
          ranked.map(async (subject) => {
            const source = sourceList.find((row) => row.subject_id === subject.id);
            if (!source) return [subject.id, [] as string[]] as const;
            try {
              const topics = await listTopics(source.id);
              return [subject.id, topics.map((topic) => topic.title)] as const;
            } catch {
              return [subject.id, [] as string[]] as const;
            }
          }),
        );
        setTopicsBySubject(Object.fromEntries(topicEntries));
        setStatus("ready");
      },
    );
  }, []);

  const names = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject.name])), [subjects]);
  const subjectSources = sources.filter((source) => source.subject_id === subjectId);
  const openSession = useMemo(
    () => [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null,
    [sessions],
  );
  const recommended = useMemo(
    () => [...subjects].sort((a, b) => (dueBySubject[b.id] ?? 0) - (dueBySubject[a.id] ?? 0)).slice(0, 3),
    [subjects, dueBySubject],
  );
  const burst = countChoice === "custom" ? Number(customCount) || 10 : Number(countChoice) || 10;

  async function start(next: { subjectId: string; sourceId?: string; mode: string; burst: number }) {
    if (!next.subjectId) return;
    setStarting(true);
    try {
      const session = await createSession({
        subject_id: next.subjectId,
        scope: { source_ids: next.sourceId ? [next.sourceId] : [], topic_ids: [] },
        grounding_mode: grounding,
        burst_size: next.burst,
        mode: next.mode,
      });
      setActiveSessionId(session.id);
      await router.push(`${basePath}/study/session/?id=${session.id}`);
    } catch {
      push("Could not start quiz", "error");
    } finally {
      setStarting(false);
    }
  }

  function resume(id: string) {
    setActiveSessionId(id);
    void router.push(`${basePath}/study/session/?id=${id}`);
  }

  if (status === "loading") return <Loader label="Loading quizzes" />;
  if (status === "error") return <ErrorState title="Quizzes unavailable" message="The API did not respond." />;
  if (!subjects.length) return <EmptyState title="No subjects" message="Create a subject before generating a quiz." />;

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg pb-xl" data-testid="quizzes">
      <header className="flex flex-col justify-between gap-md lg:flex-row lg:items-start">
        <div className="flex flex-col gap-xs">
          <h1 className="font-heading text-headline-lg text-foreground">Quizzes &amp; Assessments</h1>
          <p className="text-body-md text-text-muted">
            Generate and complete targeted assessments across your curriculum.
          </p>
        </div>
        <div className="grid w-full grid-cols-1 gap-sm sm:grid-cols-2 lg:w-auto">
          <Card className="flex min-w-0 items-center gap-sm p-sm lg:min-w-60">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-status-review-bg text-status-review">
              <Icon name="star" size="sm" />
            </span>
            <div>
              <div className="flex items-center gap-sm">
                <span className="font-heading text-headline-sm text-foreground">{goldCount ?? 0}</span>
                {/* BACKEND_GAP(quizzes-1) */}
                <Badge label={sample.retention} tone="review" />
              </div>
              <p className="text-label-sm text-text-muted">Mastered concepts · High-yield retained</p>
            </div>
          </Card>
          {/* BACKEND_GAP(quizzes-2) */}
          <Card className="flex min-w-0 items-center gap-sm p-sm lg:min-w-60">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle text-primary">
              <Icon name="analytics" size="sm" />
            </span>
            <div>
              <div className="flex items-center gap-sm">
                <span className="font-heading text-headline-sm text-foreground">{sample.readiness}</span>
                <Badge label={sample.readinessBadge} tone="stable" />
              </div>
              <p className="text-label-sm text-text-muted">{sample.readinessDetail}</p>
            </div>
          </Card>
        </div>
      </header>

      <Card className="flex flex-col justify-between gap-sm p-md sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-sm">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon name="play_arrow" size="sm" />
          </span>
          <div className="min-w-0 flex-1">
            {/* BACKEND_GAP(quizzes-3) */}
            <p className="truncate text-label-md font-semibold text-foreground">
              {openSession
                ? `${names.get(openSession.subject_id) ?? "Subject"} quiz · burst ${openSession.burst_size}`
                : sample.bannerTitle}
            </p>
            {openSession ? (
              <p className="text-body-sm text-text-muted">In progress</p>
            ) : (
              <ProgressBar value={sample.bannerPercent} label={`${sample.bannerPercent}% complete`} />
            )}
          </div>
        </div>
        <Button
          disabled={!openSession || starting}
          title={openSession ? undefined : "Coming soon"}
          className="disabled:opacity-100"
          onClick={() => openSession && resume(openSession.id)}
        >
          Resume
          <Icon name="arrow_forward" size="sm" />
        </Button>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex items-center gap-sm">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon name="auto_awesome" size="sm" />
          </span>
          <div>
            <h2 className="font-heading text-body-lg font-semibold text-foreground">Create a quiz</h2>
            <p className="text-label-sm text-text-muted">
              Generate targeted practice questions directly from your synced notebooks.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          <div className={fieldClass}>
            <Select
              label="Subject / Topic"
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setSourceId("");
              }}
              options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            />
          </div>
          <SegmentedControl
            label="Source"
            value={grounding}
            onChange={setGrounding}
            options={[
              { value: "notes", label: "My notes" },
              { value: "online", label: "Online material" },
            ]}
          />
          <div className={fieldClass}>
            <Select
              label="Material"
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              options={[
                { value: "", label: "All sources" },
                ...subjectSources.map((source) => ({ value: source.id, label: source.title })),
              ]}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase tracking-wide text-text-muted">Number of questions</span>
            <div className="flex flex-wrap gap-xs">
              {["5", "10", "20", "custom"].map((choice) => (
                <Button
                  key={choice}
                  variant="quiet"
                  size="sm"
                  className={countChoice === choice ? "bg-surface text-primary shadow-sm" : ""}
                  onClick={() => setCountChoice(choice)}
                >
                  {choice === "custom" ? "Custom" : choice}
                </Button>
              ))}
            </div>
            {countChoice === "custom" ? (
              <Input
                label="Custom count"
                type="number"
                min={1}
                max={50}
                value={customCount}
                onChange={(event) => setCustomCount(event.target.value)}
              />
            ) : null}
          </div>
          {/* BACKEND_GAP(quizzes-4) */}
          <div className="flex flex-col gap-xs">
            <span className="text-label-sm uppercase tracking-wide text-text-muted">Question types</span>
            <div className="flex flex-wrap gap-xs">
              <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                Multiple choice
              </Button>
              <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                Written answer
              </Button>
            </div>
          </div>
          <SegmentedControl
            className={mixClass}
            label="Focus"
            value={focus}
            onChange={setFocus}
            options={[
              { value: "weak", label: "Weak topics" },
              { value: "due", label: "Due for review" },
              { value: "all", label: "Everything" },
            ]}
          />
          {/* BACKEND_GAP(quizzes-5) */}
          <Slider label={sample.application} min={0} max={50} value={30} disabled title="Coming soon" />
        </div>
        <div className="flex flex-col items-start justify-between gap-sm sm:flex-row sm:items-center">
          {/* BACKEND_GAP(quizzes-6) */}
          <span className="inline-flex items-center gap-xs text-body-sm text-text-muted">
            <Icon name="timer" size="sm" />
            Estimated duration: ~{minutesFor(burst)} minutes
          </span>
          <div className="flex flex-wrap items-center gap-sm">
            <Button variant="quiet" disabled title="Coming soon" className="disabled:opacity-100">
              Customize
            </Button>
            <Button
              disabled={starting}
              onClick={() =>
                start({
                  subjectId,
                  sourceId,
                  mode: focus === "due" ? "review_due" : "practice",
                  burst,
                })
              }
            >
              <Icon name="bolt" size="sm" />
              {starting ? "Starting…" : "Generate & start"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-sm">
        <div className="flex flex-col justify-between gap-sm sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="font-heading text-headline-sm text-foreground">Recommended For Today</h2>
            <Badge label="Due for review" tone="weak" />
          </div>
          <span className="text-body-sm text-text-muted">{recommended.length} quizzes ready for practice</span>
        </div>
        <div className="grid grid-cols-1 gap-md lg:grid-cols-3">
          {recommended.map((subject, index) => {
            const due = dueBySubject[subject.id] ?? 0;
            const topics = topicsBySubject[subject.id] ?? [];
            const lines = topics.length ? topics.slice(0, 2) : sample.weak[index] ?? [];
            return (
              <Card key={subject.id} className="flex flex-col justify-between gap-md p-md">
                <div className="flex flex-col gap-sm">
                  <div className="flex items-center justify-between gap-sm">
                    <Badge label={subject.name} tone="neutral" />
                    <Badge label={due > 0 ? "Urgent review" : "Scheduled"} tone={due > 0 ? "weak" : "stable"} />
                  </div>
                  <h3 className="font-heading text-headline-sm text-foreground">{subject.name}</h3>
                  <p className="text-body-sm text-text-muted">
                    {due} due · ~{minutesFor(due || 10)} min · {due > 0 ? "due now" : "nothing due"}
                  </p>
                  <div className="grid grid-cols-1 gap-xs">
                    {lines.map((line) => (
                      <span key={line} className="inline-flex items-center gap-xs text-body-sm text-text-muted">
                        <Icon name={topics.length ? "menu_book" : "warning"} size="sm" />
                        {line}
                      </span>
                    ))}
                  </div>
                  {/* BACKEND_GAP(quizzes-7) */}
                  <p className="text-label-md text-foreground">Last score {sample.scores[index] ?? "—"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-sm">
                  <Button variant="secondary" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                    Preview scope
                  </Button>
                  <Button
                    size="sm"
                    disabled={starting}
                    onClick={() =>
                      start({
                        subjectId: subject.id,
                        mode: due > 0 ? "review_due" : "practice",
                        burst: due > 0 ? Math.min(10, due) : 10,
                      })
                    }
                  >
                    <Icon name="play_arrow" size="sm" />
                    Start
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* BACKEND_GAP(quizzes-8) */}
      <div className="flex flex-col gap-sm">
        <div className="flex flex-col justify-between gap-sm lg:flex-row lg:items-end">
          <div>
            <h2 className="font-heading text-headline-sm text-foreground">Recent Assessment Results</h2>
            <p className="text-body-sm text-text-muted">
              Inspect question-level reasoning paths, grading rubrics, and generated flashcard exports.
            </p>
          </div>
          <div className="flex flex-wrap gap-xs">
            {sample.filters.map((label, index) => (
              <FilterChip
                key={label}
                label={label}
                selected={index === 0}
                disabled
                title={index === 0 ? undefined : "Coming soon"}
                className="disabled:opacity-100"
              />
            ))}
          </div>
        </div>
        <Card className="flex flex-col gap-sm p-md">
          {sample.results.map((row) => (
            <div
              key={row.title}
              className="grid grid-cols-1 items-center gap-sm rounded-md bg-muted/40 p-md lg:grid-cols-[minmax(0,1.5fr)_7.5rem_6.5rem_8.5rem_7.5rem_8rem_auto]"
            >
              <div className="min-w-0">
                <p className="truncate text-label-md font-semibold text-foreground">{row.title}</p>
                <p className="mt-xs truncate text-body-sm text-text-muted">{row.subject}</p>
              </div>
              <span className="truncate text-body-sm text-text-muted">{row.when}</span>
              <span className="truncate text-body-sm text-text-muted">{row.questions}</span>
              <span className="truncate text-body-sm text-text-muted">{row.time}</span>
              <Badge label={row.score} tone={row.tone} />
              <span className="truncate text-body-sm text-text-muted">{row.concept}</span>
              <div className="flex gap-xs">
                <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                  Review
                </Button>
                <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                  Retake
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-sm pt-sm">
            <span className="text-body-sm text-text-muted">{sample.showing}</span>
            <div className="flex items-center gap-xs">
              <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                <Icon name="chevron_left" size="sm" />
              </Button>
              <span className="text-label-md text-text-muted">{sample.page}</span>
              <Button variant="quiet" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                <Icon name="chevron_right" size="sm" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
