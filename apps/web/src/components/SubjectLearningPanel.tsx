import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { SettingRow } from "@self-study/ui/SettingRow";
import { useToast } from "@self-study/ui/useToast";

import { getLearningSettings, updateLearningSettings, type ResolvedLearningSettings } from "@/lib/api-client";

export interface SubjectLearningPanelProps {
  subjectId: string;
}

export function SubjectLearningPanel({ subjectId }: SubjectLearningPanelProps) {
  const { push } = useToast();
  const [resolved, setResolved] = useState<ResolvedLearningSettings | null>(null);
  const [dailyGoal, setDailyGoal] = useState("");
  const [retention, setRetention] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!subjectId) return;
    getLearningSettings(subjectId)
      .then((settings) => {
        setResolved(settings);
        setDailyGoal(String(settings.settings.daily_goal));
        setRetention(String(settings.settings.desired_retention));
      })
      .catch(() => push("Could not load subject learning overrides", "error"))
      .finally(() => setLoading(false));
  }, [subjectId, push]);

  if (loading) return <Loader label="Loading learning overrides" />;
  if (!resolved) return null;

  async function save() {
    try {
      const next = await updateLearningSettings(
        {
          daily_goal: Number(dailyGoal) || resolved!.settings.daily_goal,
          desired_retention: Number(retention) || resolved!.settings.desired_retention,
        },
        subjectId,
      );
      setResolved(next);
      push("Subject learning overrides saved", "success");
    } catch {
      push("Could not save overrides", "error");
    }
  }

  return (
    <div className="flex flex-col gap-md rounded-md border border-border bg-card p-md" data-testid="subject-learning">
      <h2 className="font-heading text-xl font-semibold">Learning overrides</h2>
      <SettingRow
        label="Daily goal"
        source={resolved.sources.daily_goal}
        control={
          <Input
            label="Daily goal"
            type="number"
            data-testid="subject-learning-goal"
            value={dailyGoal}
            onChange={(event) => setDailyGoal(event.target.value)}
          />
        }
      />
      <SettingRow
        label="Desired retention"
        source={resolved.sources.desired_retention}
        control={
          <Input
            label="Retention"
            type="number"
            step="0.01"
            data-testid="subject-learning-retention"
            value={retention}
            onChange={(event) => setRetention(event.target.value)}
          />
        }
      />
      <Button onClick={save} data-testid="subject-learning-save">
        Save overrides
      </Button>
    </div>
  );
}