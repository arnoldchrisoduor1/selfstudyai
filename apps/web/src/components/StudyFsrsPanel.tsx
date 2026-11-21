import { useEffect, useState } from "react";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { Icon } from "@self-study/ui/Icon";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { Slider } from "@self-study/ui/Slider";
import { Toggle } from "@self-study/ui/Toggle";
import { useToast } from "@self-study/ui/useToast";

import {
  getDashboard,
  getDueQueue,
  getLearningSettings,
  getPointsLedger,
  getQuestionSettings,
  listSubjects,
  updateLearningSettings,
  updateQuestionSettings,
  type LearningSettings,
  type QuestionSettings,
  type ResolvedLearningSettings,
  type Subject,
} from "@/lib/api-client";
import { settingsPlaceholder } from "@/lib/placeholders/settings";

const PRESETS = [
  {
    id: "standard",
    label: "Standard",
    retention: 0.9,
    hint: "Target 90% retention",
    detail: "Balanced daily reviews and steady long-term memory.",
  },
  {
    id: "crunch",
    label: "Exam crunch",
    retention: 0.94,
    hint: "Target 94% retention",
    detail: "Higher review frequency for imminent exam preparation.",
  },
  {
    id: "long",
    label: "Long-term",
    retention: 0.85,
    hint: "Target 85% retention",
    detail: "Lower daily card volume for relaxed, sustainable maintenance.",
  },
];

interface SubjectRow {
  subject: Subject;
  due: number | null;
  retention: number | null;
  custom: boolean;
}

function presetId(retention: number): string | null {
  return PRESETS.find((preset) => Math.abs(preset.retention - retention) < 0.006)?.id ?? null;
}

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function StudyFsrsPanel() {
  const { push } = useToast();
  const [resolved, setResolved] = useState<ResolvedLearningSettings | null>(null);
  const [draft, setDraft] = useState<LearningSettings | null>(null);
  const [questions, setQuestions] = useState<QuestionSettings | null>(null);
  const [burst, setBurst] = useState("4");
  const [rows, setRows] = useState<SubjectRow[] | null>(null);
  const [dueToday, setDueToday] = useState<number | null>(null);
  const [ledgerTotal, setLedgerTotal] = useState<number | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    let live = true;
    Promise.allSettled([
      getLearningSettings(),
      getQuestionSettings(),
      listSubjects(),
      getDashboard(),
      getPointsLedger(20),
    ]).then(async ([learning, question, subjectRows, dashboard, ledger]) => {
      if (!live) return;
      if (learning.status === "fulfilled") {
        setResolved(learning.value);
        setDraft(learning.value.settings);
      }
      if (question.status === "fulfilled") {
        setQuestions(question.value);
        setBurst(String(question.value.default_burst_size));
      }
      if (dashboard.status === "fulfilled") setDueToday(dashboard.value.due_today);
      if (ledger.status === "fulfilled") {
        setLedgerTotal(ledger.value.reduce((sum, row) => sum + row.amount, 0));
      }
      const subjects = subjectRows.status === "fulfilled" ? subjectRows.value : [];
      const detail = await Promise.all(
        subjects.map(async (subject) => {
          const [settings, due] = await Promise.allSettled([
            getLearningSettings(subject.id),
            getDueQueue(subject.id),
          ]);
          return {
            subject,
            due: due.status === "fulfilled" ? due.value.length : null,
            retention: settings.status === "fulfilled" ? settings.value.settings.desired_retention : null,
            custom: settings.status === "fulfilled" && settings.value.sources.desired_retention === "subject",
          };
        }),
      );
      if (live) {
        setRows(detail);
        setLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  if (loading || !draft) return <Loader label="Loading study settings" />;

  const selected = presetId(draft.desired_retention);
  const selectedPreset = PRESETS.find((preset) => preset.id === selected);

  function edit(next: LearningSettings) {
    setDraft(next);
    setDirty(true);
  }

  async function save() {
    if (!draft) return;
    try {
      const next = await updateLearningSettings({
        desired_retention: draft.desired_retention,
        daily_goal: draft.daily_goal,
        new_questions_per_day: draft.new_questions_per_day,
        review_new_ratio: draft.review_new_ratio,
        timezone: draft.timezone,
        test_defaults: draft.test_defaults,
      });
      setResolved(next);
      setDraft(next.settings);
      if (questions) {
        const saved = await updateQuestionSettings({
          ...questions,
          default_burst_size: Number(burst) || questions.default_burst_size,
        });
        setQuestions(saved);
        setBurst(String(saved.default_burst_size));
      }
      setDirty(false);
      push("Learning settings saved", "success");
    } catch {
      push("Could not save learning settings", "error");
    }
  }

  function discard() {
    if (resolved) setDraft(resolved.settings);
    if (questions) setBurst(String(questions.default_burst_size));
    setDirty(false);
  }

  const subjectCount = rows?.length ?? 0;

  return (
    <div className="flex min-w-0 flex-col gap-lg" data-testid="learning-settings">
      <div>
        <h2 className="font-heading text-headline-sm text-foreground">Study &amp; Repetition (FSRS)</h2>
        <p className="text-body-sm text-text-muted">Fine-tune retention rates, daily workload caps, and scheduling behavior.</p>
      </div>

      <Card className="flex flex-col gap-md p-lg">
        <p className="text-label-md font-semibold text-foreground">Repetition Preset</p>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {PRESETS.map((preset) => {
            const on = preset.id === selected;
            return (
              <Button
                key={preset.id}
                type="button"
                variant="secondary"
                className={on ? "h-auto border-primary bg-primary-subtle" : "h-auto"}
                onClick={() => edit({ ...draft, desired_retention: preset.retention })}
              >
                <span className="flex w-full flex-col items-start gap-xs text-left">
                  <span className="flex w-full items-center justify-between gap-sm">
                    <span className="text-label-md text-foreground">{preset.label}</span>
                    <span
                      className={
                        on
                          ? "h-sm w-sm rounded-full border-2 border-primary bg-primary"
                          : "h-sm w-sm rounded-full border-2 border-border"
                      }
                    />
                  </span>
                  <Badge label={preset.hint} tone={on ? "stable" : "neutral"} />
                  <span className="text-body-sm text-text-muted">{preset.detail}</span>
                </span>
              </Button>
            );
          })}
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex items-start justify-between gap-md">
          <div>
            <h3 className="font-heading text-headline-sm text-foreground">Target Retention Rate</h3>
            <p className="text-body-sm text-text-muted">The probability you successfully remember a card when it appears for review.</p>
          </div>
          <p className="font-heading text-headline-sm text-primary">
            {pct(draft.desired_retention)}
            {selectedPreset ? ` (${selectedPreset.label})` : ""}
          </p>
        </div>
        <Slider
          label="Target retention"
          min={0.8}
          max={0.97}
          step={0.01}
          value={draft.desired_retention}
          data-testid="learning-retention"
          onChange={(event) => edit({ ...draft, desired_retention: Number(event.target.value) })}
        />
        <div className="flex justify-between text-label-sm text-text-muted">
          <span>80% (Fewer reviews)</span>
          <span>90% (Recommended)</span>
          <span>97% (High mastery)</span>
        </div>
        <div className="flex items-start gap-sm rounded-md bg-primary-subtle p-md text-body-sm text-text-muted">
          <Icon name="info" size="sm" className="text-primary" />
          <p>
            Estimated daily volume: {dueToday ?? "—"} cards due now across {subjectCount} subjects.
            {/* BACKEND_GAP(settings-1) */} {settingsPlaceholder.volumeNote}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <h3 className="font-heading text-headline-sm text-foreground">Daily Limits</h3>
        <p className="text-body-sm text-text-muted">Configure pacing caps to preserve memory consolidation and prevent study fatigue.</p>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          <Input
            label="New cards per day"
            type="number"
            data-testid="learning-new-cap"
            value={String(draft.new_questions_per_day)}
            onChange={(event) =>
              edit({ ...draft, new_questions_per_day: Number(event.target.value) || draft.new_questions_per_day })
            }
          />
          <Input
            label="Max reviews per day"
            type="number"
            data-testid="learning-daily-goal"
            value={String(draft.daily_goal)}
            onChange={(event) => edit({ ...draft, daily_goal: Number(event.target.value) || draft.daily_goal })}
          />
          <Input
            label="Burst size"
            type="number"
            value={burst}
            onChange={(event) => {
              setBurst(event.target.value);
              setDirty(true);
            }}
          />
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex items-center justify-between gap-md">
          <div>
            <h3 className="font-heading text-headline-sm text-foreground">Advanced parameters</h3>
            {/* BACKEND_GAP(settings-2) */}
            <p className="text-body-sm text-text-muted">{settingsPlaceholder.weightsNote}</p>
          </div>
          <Button variant="quiet" onClick={() => setAdvanced((open) => !open)}>
            {settingsPlaceholder.weightsCount}
            <Icon name={advanced ? "expand_less" : "expand_more"} size="sm" />
          </Button>
        </div>
        {advanced ? (
          <div className="grid grid-cols-1 gap-md md:grid-cols-2">
            <Input
              label="Review / new mix"
              type="number"
              step="0.05"
              data-testid="learning-mix-ratio"
              value={String(draft.review_new_ratio)}
              onChange={(event) => edit({ ...draft, review_new_ratio: Number(event.target.value) || draft.review_new_ratio })}
            />
            <Input
              label="Timezone"
              data-testid="learning-timezone"
              value={draft.timezone}
              onChange={(event) => edit({ ...draft, timezone: event.target.value })}
            />
            <Input
              label="Default question count"
              type="number"
              data-testid="learning-test-count"
              value={String(draft.test_defaults.question_count)}
              onChange={(event) =>
                edit({
                  ...draft,
                  test_defaults: {
                    ...draft.test_defaults,
                    question_count: Number(event.target.value) || draft.test_defaults.question_count,
                  },
                })
              }
            />
            <Toggle
              label="Focus mode default"
              data-testid="learning-focus-default"
              checked={draft.test_defaults.focus_mode}
              onCheckedChange={(checked) =>
                edit({ ...draft, test_defaults: { ...draft.test_defaults, focus_mode: checked } })
              }
            />
            {ledgerTotal !== null ? (
              <p className="text-body-sm text-text-muted" data-testid="learning-ledger-sum">
                Recent ledger total: {ledgerTotal} points (last 20 entries)
              </p>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="flex min-w-0 flex-col gap-md p-lg">
        <div className="flex items-center justify-between gap-md">
          <div>
            <h3 className="font-heading text-headline-sm text-foreground">Per-subject overrides</h3>
            <p className="text-body-sm text-text-muted">Set custom target retention and intervals for individual subjects.</p>
          </div>
          <Badge label={`${subjectCount} active subjects`} tone="neutral" />
        </div>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-[36rem] flex-col gap-sm">
            <div className="grid grid-cols-[minmax(0,1.6fr)_8rem_6rem_7rem_auto] gap-sm text-label-sm uppercase tracking-wide text-text-muted">
              <span>Subject</span>
              <span>Retention target</span>
              <span>Max interval</span>
              <span>Use custom settings</span>
              <span>Actions</span>
            </div>
            {(rows && rows.length ? rows : []).map((row) => (
              <div
                key={row.subject.id}
                className="grid grid-cols-[minmax(0,1.6fr)_8rem_6rem_7rem_auto] items-center gap-sm"
              >
                <div className="min-w-0">
                  <p className="truncate text-label-md font-semibold text-foreground">{row.subject.name}</p>
                  <p className="truncate text-body-sm text-text-muted">
                    {row.due != null ? `${row.due} cards due today` : "Due count unavailable"}
                    {row.subject.description ? ` · ${row.subject.description}` : ""}
                  </p>
                </div>
                <span className="text-body-sm text-foreground">{row.retention == null ? "—" : pct(row.retention)}</span>
                {/* BACKEND_GAP(settings-3) */}
                <span className="text-body-sm text-text-muted">—</span>
                <Toggle
                  label="Use custom settings"
                  className="[&>span:last-child]:sr-only"
                  checked={row.custom}
                  onCheckedChange={() => undefined}
                />
                {/* BACKEND_GAP(settings-4) */}
                <Button variant="secondary" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                  Edit
                </Button>
              </div>
            ))}
            {!rows?.length
              ? settingsPlaceholder.sampleSubjects.map((row) => (
                  <div
                    key={row.name}
                    className="grid grid-cols-[minmax(0,1.6fr)_8rem_6rem_7rem_auto] items-center gap-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-label-md font-semibold text-foreground">{row.name}</p>
                      <p className="truncate text-body-sm text-text-muted">{row.meta}</p>
                      {row.exam ? <Badge label={row.exam} tone="review" /> : null}
                    </div>
                    <span className="text-body-sm text-foreground">{row.retention}</span>
                    <span className="text-body-sm text-text-muted">{row.interval}</span>
                    <Toggle
                      label="Use custom settings"
                      className="[&>span:last-child]:sr-only"
                      checked={row.custom}
                      onCheckedChange={() => undefined}
                    />
                    <Button variant="secondary" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
                      Edit
                    </Button>
                  </div>
                ))
              : null}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-sm p-md sm:flex-row sm:items-center">
        <p className="text-body-sm text-text-muted">
          {dirty ? "Unsaved changes to study settings." : "Study settings match what is saved."}
        </p>
        <div className="flex gap-sm">
          <Button variant="secondary" onClick={discard} disabled={!dirty}>
            Discard
          </Button>
          <Button onClick={save} disabled={!dirty} data-testid="learning-save">
            <Icon name="check" size="sm" />
            Save changes
          </Button>
        </div>
      </Card>
    </div>
  );
}
