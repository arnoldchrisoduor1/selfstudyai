import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Select } from "@self-study/ui/Select";
import { Toggle } from "@self-study/ui/Toggle";
import { useToast } from "@self-study/ui/useToast";

import {
  createTest,
  startTest,
  getLearningSettings,
  getQuestionSettings,
  listSources,
  listSubjects,
  listTopics,
  type Subject,
  type TestConfig,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";

export function TestBuilderSection() {
  const router = useRouter();
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [questionCount, setQuestionCount] = useState("5");
  const [passMark, setPassMark] = useState("0.7");
  const [timeLimit, setTimeLimit] = useState("1800");
  const [focusMode, setFocusMode] = useState(false);
  const [useExisting, setUseExisting] = useState(true);
  const [includeGold, setIncludeGold] = useState(true);
  const [feedback, setFeedback] = useState("end");
  const [navigation, setNavigation] = useState("free");
  const [mcqPct, setMcqPct] = useState("50");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listSubjects(), getLearningSettings(), getQuestionSettings()])
      .then(([rows, learning, questions]) => {
        setSubjects(rows);
        const defs = learning.settings.test_defaults;
        if (rows[0]) setSubjectId(rows[0].id);
        setQuestionCount(String(defs.question_count));
        setPassMark(String(defs.pass_mark));
        setTimeLimit(defs.time_limit_s ? String(defs.time_limit_s) : "");
        setFocusMode(defs.focus_mode);
        setIncludeGold(defs.include_gold);
        setFeedback(defs.feedback_timing);
        setNavigation(defs.navigation);
        setMcqPct(String(defs.kind_mcq_pct));
        void questions;
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(() => {
    if (!subjectId) return;
    listSources(subjectId).catch(() => undefined);
  }, [subjectId]);

  const [sourceOptions, setSourceOptions] = useState<{ value: string; label: string }[]>([]);
  const [topicOptions, setTopicOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (!subjectId) return;
    listSources(subjectId).then((sources) =>
      setSourceOptions(sources.map((s) => ({ value: s.id, label: s.title }))),
    );
  }, [subjectId]);

  useEffect(() => {
    if (!sourceId) {
      setTopicOptions([]);
      setTopicId("");
      return;
    }
    listTopics(sourceId).then((topics) =>
      setTopicOptions(topics.map((t) => ({ value: t.id, label: t.title }))),
    );
  }, [sourceId]);

  async function submit() {
    if (!subjectId) return;
    setSaving(true);
    const cognitive = await getQuestionSettings().then((s) => s.cognitive_mix);
    const config: TestConfig = {
      subject_id: subjectId,
      source_ids: sourceId ? [sourceId] : [],
      topic_ids: topicId ? [topicId] : [],
      question_count: Number(questionCount) || 5,
      time_limit_s: timeLimit ? Number(timeLimit) : null,
      kinds: { mcq_pct: Number(mcqPct) || 50, written_pct: 100 - (Number(mcqPct) || 50) },
      cognitive_mix: cognitive,
      include_gold: includeGold,
      use_existing: useExisting,
      pass_mark: Number(passMark) || 0.7,
      feedback_timing: feedback,
      navigation,
      focus_mode: focusMode,
    };
    try {
      const test = await createTest(config);
      await startAndGo(test.id);
    } catch {
      push("Could not create test", "error");
    } finally {
      setSaving(false);
    }
  }

  async function startAndGo(id: string) {
    try {
      await startTest(id);
    } catch {
      push("Test created but could not start", "warning");
    }
    await router.push(`${basePath}/tests/session/?id=${id}`);
  }

  if (status === "loading") return <Loader label="Loading test builder" />;
  if (status === "error") return <ErrorState title="Builder unavailable" message="The API did not respond." />;
  if (!subjects.length) return <EmptyState title="No subjects" message="Create a subject first." />;

  return (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="test-builder">
      <h1 className="font-heading text-3xl font-semibold">New test</h1>
      <Select
        label="Subject"
        data-testid="test-subject"
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Select
        label="Source (optional)"
        data-testid="test-source"
        value={sourceId}
        onChange={(event) => setSourceId(event.target.value)}
        options={[{ value: "", label: "All sources" }, ...sourceOptions]}
      />
      <Select
        label="Topic (optional)"
        data-testid="test-topic"
        value={topicId}
        onChange={(event) => setTopicId(event.target.value)}
        options={[{ value: "", label: "All topics" }, ...topicOptions]}
      />
      <Input
        label="Question count"
        type="number"
        data-testid="test-count"
        value={questionCount}
        onChange={(event) => setQuestionCount(event.target.value)}
      />
      <Input
        label="Pass mark (0–1)"
        type="number"
        step="0.05"
        data-testid="test-pass"
        value={passMark}
        onChange={(event) => setPassMark(event.target.value)}
      />
      <Input
        label="Time limit (seconds)"
        type="number"
        data-testid="test-time-limit"
        value={timeLimit}
        onChange={(event) => setTimeLimit(event.target.value)}
      />
      <Input
        label="MCQ %"
        type="number"
        data-testid="test-mcq-pct"
        value={mcqPct}
        onChange={(event) => setMcqPct(event.target.value)}
      />
      <Select
        label="Feedback timing"
        data-testid="test-feedback"
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        options={[
          { value: "end", label: "End" },
          { value: "immediate", label: "Immediate" },
        ]}
      />
      <Select
        label="Navigation"
        data-testid="test-navigation"
        value={navigation}
        onChange={(event) => setNavigation(event.target.value)}
        options={[
          { value: "free", label: "Free" },
          { value: "linear", label: "Linear" },
        ]}
      />
      <Toggle
        label="Use existing question pool"
        data-testid="test-use-existing"
        checked={useExisting}
        onCheckedChange={setUseExisting}
      />
      <Toggle
        label="Include gold questions"
        data-testid="test-include-gold"
        checked={includeGold}
        onCheckedChange={setIncludeGold}
      />
      <Toggle label="Focus mode" data-testid="test-focus" checked={focusMode} onCheckedChange={setFocusMode} />
      <Button onClick={submit} disabled={saving} data-testid="test-create">
        {saving ? "Creating…" : "Create and start"}
      </Button>
    </section>
  );
}