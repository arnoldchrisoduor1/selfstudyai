import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

import { AnswerEditor } from "@self-study/ui/AnswerEditor";
import { Button } from "@self-study/ui/Button";
import { Countdown } from "@self-study/ui/Countdown";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FullscreenGate, type IntegrityEventKind } from "@self-study/ui/FullscreenGate";
import { IntegrityBanner } from "@self-study/ui/IntegrityBanner";
import { Loader } from "@self-study/ui/Loader";
import { OptionList } from "@self-study/ui/OptionList";
import { QuestionCard } from "@self-study/ui/QuestionCard";
import { useToast } from "@self-study/ui/useToast";

import {
  answerTest,
  expireTest,
  getTest,
  postIntegrityEvent,
  startTest,
  submitTest,
  type QuestionPublic,
  type TestConfig,
  type TestDetail,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export interface TestSessionSectionProps {
  testId: string;
}

function parseConfig(raw: Record<string, unknown>): TestConfig | null {
  return raw as unknown as TestConfig;
}

export function TestSessionSection({ testId }: TestSessionSectionProps) {
  const router = useRouter();
  const { push } = useToast();
  const [detail, setDetail] = useState<TestDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [written, setWritten] = useState("");
  const [answered, setAnswered] = useState<Set<string>>(new Set());
  const [focusLost, setFocusLost] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setStatus("loading");
    getTest(testId)
      .then(async (next) => {
        if (next.test.status === "pending") {
          const started = await startTest(testId);
          next = { ...next, test: started };
        }
        setDetail(next);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [testId]);

  useEffect(() => {
    load();
  }, [load]);

  const config = useMemo(
    () => (detail ? parseConfig(detail.test.config as Record<string, unknown>) : null),
    [detail],
  );

  const questions = detail?.questions ?? [];
  const current: QuestionPublic | undefined = questions[index];
  const focusMode = config?.focus_mode ?? false;
  const linear = config?.navigation === "linear";
  const blockPaste = focusMode;

  useEffect(() => {
    if (!blockPaste) return;
    const stop = (event: ClipboardEvent) => event.preventDefault();
    document.addEventListener("copy", stop);
    document.addEventListener("paste", stop);
    return () => {
      document.removeEventListener("copy", stop);
      document.removeEventListener("paste", stop);
    };
  }, [blockPaste]);

  async function reportIntegrity(kind: IntegrityEventKind) {
    setFocusLost(true);
    try {
      await postIntegrityEvent(testId, { kind });
    } catch {
      push("Could not log integrity event", "warning");
    }
  }

  async function onAnswer() {
    if (!current) return;
    setSubmitting(true);
    try {
      await answerTest(testId, {
        question_id: current.id,
        selected_option: selected ?? undefined,
        answer_text: written.trim() ? written : undefined,
      });
      setAnswered((prev) => new Set(prev).add(current.id));
      setSelected(null);
      setWritten("");
      if (linear) setIndex((i) => Math.min(i + 1, questions.length - 1));
    } catch (error) {
      push("Could not save answer", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function finish() {
    setSubmitting(true);
    try {
      await submitTest(testId);
      await router.push(`${basePath}/tests/results/?id=${testId}`);
    } catch {
      try {
        await expireTest(testId);
        await router.push(`${basePath}/tests/results/?id=${testId}`);
      } catch {
        push("Could not submit test", "error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") return <Loader label="Loading test" />;
  if (status === "error") {
    return <ErrorState title="Test unavailable" message="This test could not be loaded." onRetry={load} />;
  }
  if (!detail || !questions.length) {
    return <EmptyState title="No questions" message="This test has no questions." />;
  }

  const limit = detail.test.time_limit_s;
  const started = detail.test.started_at ? Date.parse(detail.test.started_at) : Date.now();
  const secondsRemaining =
    limit && limit > 0 ? Math.max(0, limit - Math.floor((Date.now() - started) / 1000)) : 0;

  const body = (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="test-session">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h1 className="font-heading text-3xl font-semibold">Test</h1>
        {limit ? <Countdown secondsRemaining={secondsRemaining} data-testid="test-countdown" /> : null}
      </div>
      <IntegrityBanner visible={focusLost} data-testid="integrity-banner" />
      {!linear ? (
        <SelectNav
          questions={questions}
          index={index}
          answered={answered}
          onPick={setIndex}
        />
      ) : (
        <p className="text-base text-muted-foreground">
          Question {index + 1} of {questions.length}
        </p>
      )}
      {current ? (
        <>
          <QuestionCard
            stem={current.stem}
            kind={current.kind}
            cognitiveLevel={current.cognitive_level}
            grounding={current.grounding}
            data-testid="test-question-card"
          />
          {current.options?.length ? (
            <OptionList
              options={current.options}
              value={selected}
              onChange={setSelected}
              data-testid="test-options"
            />
          ) : (
            <AnswerEditor
              value={written}
              onChange={(event) => setWritten(event.target.value)}
              data-testid="test-answer"
            />
          )}
          <div className="flex flex-wrap gap-md">
            <Button onClick={onAnswer} disabled={submitting} data-testid="test-submit-answer">
              Save answer
            </Button>
            <Button variant="secondary" onClick={finish} disabled={submitting} data-testid="test-finish">
              Submit test
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );

  return (
    <FullscreenGate active={focusMode} onEvent={reportIntegrity} data-testid="test-fullscreen-gate">
      {body}
    </FullscreenGate>
  );
}

function SelectNav({
  questions,
  index,
  answered,
  onPick,
}: {
  questions: QuestionPublic[];
  index: number;
  answered: Set<string>;
  onPick: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-sm" data-testid="test-nav">
      {questions.map((q, i) => (
        <Button
          key={q.id}
          variant={i === index ? "primary" : "secondary"}
          onClick={() => onPick(i)}
          data-testid="test-nav-item"
        >
          {i + 1}
          {answered.has(q.id) ? " ✓" : ""}
        </Button>
      ))}
    </div>
  );
}