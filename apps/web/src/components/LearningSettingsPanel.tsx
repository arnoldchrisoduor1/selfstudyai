import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { SettingRow } from "@self-study/ui/SettingRow";
import { Toggle } from "@self-study/ui/Toggle";
import { useToast } from "@self-study/ui/useToast";

import {
  getLearningSettings,
  getPointsLedger,
  updateLearningSettings,
  type LearningSettings,
  type LearningSettingsPatch,
  type ResolvedLearningSettings,
} from "@/lib/api-client";

function draftFrom(resolved: ResolvedLearningSettings): LearningSettings {
  return resolved.settings;
}

export function LearningSettingsPanel() {
  const { push } = useToast();
  const [resolved, setResolved] = useState<ResolvedLearningSettings | null>(null);
  const [draft, setDraft] = useState<LearningSettings | null>(null);
  const [ledgerTotal, setLedgerTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLearningSettings(), getPointsLedger(20)])
      .then(([settings, ledger]) => {
        setResolved(settings);
        setDraft(draftFrom(settings));
        setLedgerTotal(ledger.reduce((sum, row) => sum + row.amount, 0));
      })
      .catch(() => push("Could not load learning settings", "error"))
      .finally(() => setLoading(false));
  }, [push]);

  if (loading || !draft || !resolved) return <Loader label="Loading learning settings" />;

  async function save() {
    if (!draft) return;
    const patch: LearningSettingsPatch = {
      desired_retention: draft.desired_retention,
      daily_goal: draft.daily_goal,
      new_questions_per_day: draft.new_questions_per_day,
      review_new_ratio: draft.review_new_ratio,
      timezone: draft.timezone,
      test_defaults: draft.test_defaults,
    };
    try {
      const next = await updateLearningSettings(patch);
      setResolved(next);
      setDraft(draftFrom(next));
      push("Learning settings saved", "success");
    } catch {
      push("Could not save learning settings", "error");
    }
  }

  const sources = resolved.sources;

  return (
    <div className="flex flex-col gap-lg" data-testid="learning-settings">
      <SettingRow
        label="Desired retention"
        source={sources.desired_retention}
        control={
          <Input
            label="Desired retention"
            type="number"
            step="0.01"
            data-testid="learning-retention"
            value={String(draft.desired_retention)}
            onChange={(event) =>
              setDraft({ ...draft, desired_retention: Number(event.target.value) || draft.desired_retention })
            }
          />
        }
      />
      <SettingRow
        label="Daily goal (questions)"
        source={sources.daily_goal}
        control={
          <Input
            label="Daily goal"
            type="number"
            data-testid="learning-daily-goal"
            value={String(draft.daily_goal)}
            onChange={(event) =>
              setDraft({ ...draft, daily_goal: Number(event.target.value) || draft.daily_goal })
            }
          />
        }
      />
      <SettingRow
        label="New questions per day"
        source={sources.new_questions_per_day}
        control={
          <Input
            label="New cap"
            type="number"
            data-testid="learning-new-cap"
            value={String(draft.new_questions_per_day)}
            onChange={(event) =>
              setDraft({
                ...draft,
                new_questions_per_day: Number(event.target.value) || draft.new_questions_per_day,
              })
            }
          />
        }
      />
      <SettingRow
        label="Review / new mix"
        source={sources.review_new_ratio}
        helper="Fraction of burst devoted to review when in mixed mode."
        control={
          <Input
            label="Mix ratio"
            type="number"
            step="0.05"
            data-testid="learning-mix-ratio"
            value={String(draft.review_new_ratio)}
            onChange={(event) =>
              setDraft({ ...draft, review_new_ratio: Number(event.target.value) || draft.review_new_ratio })
            }
          />
        }
      />
      <SettingRow
        label="Timezone"
        source={sources.timezone}
        control={
          <Input
            label="Timezone"
            data-testid="learning-timezone"
            value={draft.timezone}
            onChange={(event) => setDraft({ ...draft, timezone: event.target.value })}
          />
        }
      />
      {ledgerTotal !== null ? (
        <p className="text-base text-muted-foreground" data-testid="learning-ledger-sum">
          Recent ledger total: {ledgerTotal} points (last 20 entries)
        </p>
      ) : null}
      <h2 className="font-heading text-xl font-semibold">Test defaults</h2>
      <SettingRow
        label="Default question count"
        source={sources.test_defaults}
        control={
          <Input
            label="Question count"
            type="number"
            data-testid="learning-test-count"
            value={String(draft.test_defaults.question_count)}
            onChange={(event) =>
              setDraft({
                ...draft,
                test_defaults: {
                  ...draft.test_defaults,
                  question_count: Number(event.target.value) || draft.test_defaults.question_count,
                },
              })
            }
          />
        }
      />
      <SettingRow
        label="Focus mode default"
        source={sources.test_defaults}
        control={
          <Toggle
            label="Focus mode"
            data-testid="learning-focus-default"
            checked={draft.test_defaults.focus_mode}
            onCheckedChange={(checked) =>
              setDraft({
                ...draft,
                test_defaults: { ...draft.test_defaults, focus_mode: checked },
              })
            }
          />
        }
      />
      <Button onClick={save} data-testid="learning-save">
        Save learning settings
      </Button>
    </div>
  );
}