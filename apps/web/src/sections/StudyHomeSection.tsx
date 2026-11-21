import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import {
  createSession,
  getDueQueue,
  getQuestionSettings,
  listOpenSessions,
  listSources,
  listSubjects,
  listTopics,
  type Source,
  type StudySession,
  type Subject,
  type Topic,
} from "@/lib/api-client";
import { setActiveSessionId } from "@/lib/active-session";
import { basePath } from "@/lib/nav";

export function StudyHomeSection() {
  const router = useRouter();
  const { push } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [openSessions, setOpenSessions] = useState<StudySession[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [grounding, setGrounding] = useState("notes");
  const [studyMode, setStudyMode] = useState("practice");
  const [dueCount, setDueCount] = useState(0);
  const [burstSize, setBurstSize] = useState("4");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    Promise.all([listSubjects(), getQuestionSettings()])
      .then(([rows, settings]) => {
        setSubjects(rows);
        setBurstSize(String(settings.default_burst_size));
        setGrounding(settings.default_grounding_mode);
        if (rows[0]) setSubjectId(rows[0].id);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
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
    getDueQueue(subjectId)
      .then((items) => setDueCount(items.length))
      .catch(() => setDueCount(0));
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

  async function start() {
    if (!subjectId) return;
    setStarting(true);
    try {
      const session = await createSession({
        subject_id: subjectId,
        scope: {
          source_ids: sourceId ? [sourceId] : [],
          topic_ids: topicId ? [topicId] : [],
        },
        grounding_mode: grounding,
        burst_size: Number(burstSize) || 4,
        mode: studyMode,
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

  if (status === "loading") return <Loader label="Loading study" />;
  if (status === "error") {
    return <ErrorState title="Study unavailable" message="The API did not respond." />;
  }
  if (!subjects.length) {
    return <EmptyState title="No subjects" message="Create a subject before studying." />;
  }

  return (
    <section className="flex max-w-3xl flex-col gap-lg" data-testid="study-home">
      <h1 className="font-heading text-3xl font-semibold">Study</h1>
      <Select
        label="Subject"
        data-testid="study-subject"
        value={subjectId}
        onChange={(event) => setSubjectId(event.target.value)}
        options={subjects.map((s) => ({ value: s.id, label: s.name }))}
      />
      <Select
        label="Source (optional)"
        data-testid="study-source"
        value={sourceId}
        onChange={(event) => setSourceId(event.target.value)}
        options={[{ value: "", label: "All sources" }, ...sources.map((s) => ({ value: s.id, label: s.title }))]}
      />
      <Select
        label="Topic (optional)"
        data-testid="study-topic"
        value={topicId}
        onChange={(event) => setTopicId(event.target.value)}
        options={[{ value: "", label: "All topics" }, ...topics.map((t) => ({ value: t.id, label: t.title }))]}
      />
      <SegmentedControl
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
        label="Study mode"
        data-testid="study-mode"
        value={studyMode}
        onChange={setStudyMode}
        options={[
          { value: "practice", label: "Practice" },
          { value: "review_due", label: dueCount ? `Review due (${dueCount})` : "Review due" },
          { value: "mixed", label: "Mixed" },
        ]}
      />
      <Select
        label="Burst size"
        data-testid="study-burst-size"
        value={burstSize}
        onChange={(event) => setBurstSize(event.target.value)}
        options={[2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
      />
      <Button onClick={start} disabled={starting} data-testid="study-start">
        {starting ? "Starting…" : "Start session"}
      </Button>
      {openSessions.length ? (
        <div className="flex flex-col gap-sm">
          <h2 className="font-heading text-xl font-semibold">Resume</h2>
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
    </section>
  );
}
