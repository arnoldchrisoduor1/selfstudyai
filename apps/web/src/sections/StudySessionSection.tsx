import { useCallback, useEffect, useMemo, useState } from "react";

import { AnswerEditor } from "@self-study/ui/AnswerEditor";
import { BurstProgress } from "@self-study/ui/BurstProgress";
import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FeedbackPanel } from "@self-study/ui/FeedbackPanel";
import { Loader } from "@self-study/ui/Loader";
import { OptionList } from "@self-study/ui/OptionList";
import { QuestionCard } from "@self-study/ui/QuestionCard";
import { useToast } from "@self-study/ui/useToast";

import {
  endSession,
  fetchBurst,
  flagQuestion,
  overrideGrade,
  submitAnswer,
  toggleGold,
  type AnswerResponse,
  type BurstResponse,
  type QuestionPublic,
} from "@/lib/api-client";
import { setActiveSessionId } from "@/lib/active-session";

export interface StudySessionSectionProps {
  sessionId: string;
}

export function StudySessionSection({ sessionId }: StudySessionSectionProps) {
  const { push } = useToast();

  useEffect(() => {
    setActiveSessionId(sessionId);
  }, [sessionId]);
  const [burst, setBurst] = useState<BurstResponse | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [selected, setSelected] = useState<string | null>(null);
  const [written, setWritten] = useState("");
  const [feedback, setFeedback] = useState<AnswerResponse | null>(null);
  const [summary, setSummary] = useState(false);
  const [localAnswered, setLocalAnswered] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const loadBurst = useCallback(() => {
    setStatus("loading");
    fetchBurst(sessionId)
      .then((next) => {
        setBurst(next);
        setLocalAnswered(next.answered_ids);
        setActiveId(null);
        setSelected(null);
        setWritten("");
        setFeedback(null);
        setSummary(false);
        setStartedAt(Date.now());
        setStatus("ready");
        if (next.partial_error) push(next.partial_error, "warning");
      })
      .catch(() => setStatus("error"));
  }, [sessionId, push]);

  useEffect(() => {
    loadBurst();
  }, [loadBurst]);

  const unanswered = useMemo(() => {
    if (!burst) return [] as QuestionPublic[];
    const answered = new Set(localAnswered);
    return burst.questions.filter((q) => !answered.has(q.id));
  }, [burst, localAnswered]);

  const current = useMemo(() => {
    if (!burst) return null;
    if (feedback && activeId) {
      return burst.questions.find((q) => q.id === activeId) ?? null;
    }
    return unanswered[0] ?? null;
  }, [burst, feedback, activeId, unanswered]);

  const answeredCount = localAnswered.length;

  async function onSubmit() {
    if (!current) return;
    try {
      const result = await submitAnswer(sessionId, {
        question_id: current.id,
        selected_option: current.kind === "mcq" ? selected ?? undefined : undefined,
        answer_text: current.kind === "written" ? written : undefined,
        time_taken_ms: Date.now() - startedAt,
      });
      setActiveId(current.id);
      setFeedback(result);
      setLocalAnswered((prev) => (prev.includes(current.id) ? prev : [...prev, current.id]));
    } catch {
      push("Could not submit answer", "error");
    }
  }

  async function onOverride() {
    if (!feedback) return;
    try {
      const attempt = await overrideGrade(sessionId, feedback.attempt.id, { verdict: "correct" });
      setFeedback({ ...feedback, attempt });
      push("Grade overridden", "success");
    } catch {
      push("Could not override grade", "error");
    }
  }

  function nextQuestion() {
    const total = burst?.questions.length ?? 0;
    const answered = localAnswered.length;
    setFeedback(null);
    setActiveId(null);
    setSelected(null);
    setWritten("");
    setStartedAt(Date.now());
    if (answered >= total) {
      setSummary(true);
    }
  }

  async function nextBurst() {
    loadBurst();
  }

  async function finish() {
    try {
      await endSession(sessionId);
      setActiveSessionId(null);
      push("Session ended", "success");
    } catch {
      push("Could not end session", "error");
    }
  }

  if (status === "loading") return <Loader label="Loading questions" />;
  if (status === "error") {
    return (
      <section data-testid="study-session">
        <ErrorState title="Session unavailable" message="Could not load the burst." onRetry={loadBurst} />
      </section>
    );
  }
  if (!burst) return null;

  if (summary) {
    return (
      <section className="flex max-w-3xl flex-col gap-lg" data-testid="burst-summary">
        <h1 className="font-heading text-3xl font-semibold">Burst complete</h1>
        <p className="text-muted-foreground">
          Finished burst {burst.burst_index + 1} with {burst.questions.length} questions.
        </p>
        <div className="flex flex-wrap gap-md">
          <Button onClick={nextBurst} data-testid="next-burst">
            Next burst
          </Button>
          <Button variant="secondary" onClick={finish} data-testid="end-session">
            End session
          </Button>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className="flex flex-col gap-md" data-testid="study-session">
        <EmptyState
          title="No questions"
          message="No due reviews or generation returned nothing for this burst."
          data-testid="empty-state"
        />
        <Button onClick={loadBurst} data-testid="retry-burst">
          Retry
        </Button>
      </section>
    );
  }

  const options = Array.isArray(current.options) ? current.options : [];

  return (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="study-session">
      <BurstProgress
        current={Math.min(answeredCount, burst.questions.length)}
        total={burst.questions.length}
        data-testid="burst-progress"
      />
      <QuestionCard
        stem={current.stem}
        kind={current.kind}
        cognitiveLevel={current.cognitive_level}
        grounding={current.grounding}
        data-testid="question-card"
      >
        {!feedback && current.kind === "mcq" ? (
          <OptionList
            options={options}
            value={selected}
            onChange={setSelected}
            data-testid="option-list"
          />
        ) : null}
        {!feedback && current.kind === "written" ? (
          <AnswerEditor
            value={written}
            onChange={(event) => setWritten(event.target.value)}
            data-testid="answer-editor"
          />
        ) : null}
      </QuestionCard>

      {!feedback ? (
        <Button
          onClick={onSubmit}
          data-testid="submit-answer"
          disabled={
            current.kind === "mcq" ? !selected : written.trim().length === 0
          }
        >
          Submit answer
        </Button>
      ) : (
        <>
          <FeedbackPanel
            score={feedback.attempt.score}
            verdict={feedback.attempt.verdict}
            corrections={feedback.attempt.feedback.corrections}
            additions={feedback.attempt.feedback.additions}
            missingPoints={feedback.attempt.feedback.missing_points}
            modelAnswer={
              feedback.attempt.feedback.model_answer ??
              feedback.question.model_answer ??
              feedback.question.explanation
            }
            citations={feedback.question.citations}
            lowConfidence={feedback.low_confidence}
            onOverride={
              feedback.attempt.graded_by !== "manual_override" ? onOverride : undefined
            }
            data-testid="feedback-panel"
          />
          <div className="flex flex-wrap gap-md">
            <Button
              variant="secondary"
              data-testid="flag-question"
              onClick={async () => {
                try {
                  await flagQuestion(current.id);
                  push("Question flagged", "warning");
                } catch {
                  push("Could not flag", "error");
                }
              }}
            >
              Flag
            </Button>
            <Button
              variant="secondary"
              data-testid="mark-gold"
              onClick={async () => {
                try {
                  await toggleGold(current.id, true);
                  push("Marked gold", "success");
                } catch {
                  push("Could not mark gold", "error");
                }
              }}
            >
              Mark gold
            </Button>
            <Button
              type="button"
              onClick={() => nextQuestion()}
              data-testid="next-question"
            >
              Continue
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
