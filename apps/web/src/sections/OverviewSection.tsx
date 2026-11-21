import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Heatmap } from "@self-study/ui/Heatmap";
import { Loader } from "@self-study/ui/Loader";
import { ProgressRing } from "@self-study/ui/ProgressRing";
import { StatCard } from "@self-study/ui/StatCard";
import { StatusChip } from "@self-study/ui/StatusChip";
import { Tabs } from "@self-study/ui/Tabs";
import { TrendChart } from "@self-study/ui/TrendChart";

import { Reveal } from "@/components/Reveal";
import { useCountUp } from "@/hooks/useCountUp";
import { getActiveSessionId } from "@/lib/active-session";
import { getDashboard, type Dashboard } from "@/lib/api-client";
import { basePath } from "@/lib/nav";

function PointsIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 4.5v11M7.5 7.5c.6-1 1.5-1.5 2.5-1.5 1.7 0 3 1 3 2.5S11.7 11 10 11s-3 1-3 2.5 1.3 2.5 3 2.5c1 0 1.9-.5 2.5-1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LevelIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="m10 3.5 1.7 3.45 3.8.55-2.75 2.68.65 3.8L10 12.2l-3.4 1.78.65-3.8L4.5 7.5l3.8-.55L10 3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StreakIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10.5 3c.5 2.5-1 4-1 6 0 1.2.8 2 2 2 2.2 0 3.5-2.4 2.8-5 .8 1 1.7 2.6 1.7 4.2A5 5 0 1 1 6.2 6.8C7.4 5.2 9 3.8 10.5 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DueIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function OverviewReady({ data }: { data: Dashboard }) {
  const router = useRouter();
  const points = useCountUp(data.total_points);
  const streak = useCountUp(data.streak.current);
  const due = useCountUp(data.due_today);
  const level = useCountUp(data.level);
  const [activeSessionId, setActive] = useState<string | null>(null);
  const [panel, setPanel] = useState("activity");
  useEffect(() => {
    setActive(getActiveSessionId());
  }, []);
  const studyLabel = activeSessionId ? "Continue studying" : "Start studying";
  const studyHref = activeSessionId
    ? `${basePath}/study/session/?id=${activeSessionId}`
    : data.due_today > 0
      ? `${basePath}/study/?mode=review_due`
      : `${basePath}/study/`;

  const goalPct =
    data.today.goal > 0 ? Math.round((data.today.answered / data.today.goal) * 100) : 0;

  const statusLine =
    data.due_today > 0
      ? `${data.due_today} card${data.due_today === 1 ? "" : "s"} due today`
      : data.today.goal_met
        ? "Daily goal met"
        : `${data.today.answered} of ${data.today.goal} toward today's goal`;

  return (
    <section className="flex w-full flex-col gap-lg" data-testid="overview">
      <Reveal>
        <div className="relative overflow-hidden rounded-lg border border-primary/30 bg-card">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/10 to-transparent"
          />
          <div className="relative flex flex-col gap-md p-lg sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-xs">
              <p className="text-sm font-medium uppercase tracking-wide text-primary">Dashboard</p>
              <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground">
                Overview
              </h1>
              <p className="max-w-md text-base text-muted-foreground">{statusLine}</p>
            </div>
            <Button
              data-testid={activeSessionId ? "overview-continue-study" : "overview-start-study"}
              className="shrink-0"
              onClick={() => router.push(studyHref)}
            >
              {studyLabel}
            </Button>
          </div>
        </div>
      </Reveal>

      <div className="grid gap-md sm:grid-cols-2 lg:grid-cols-4">
        <Reveal delayMs={40}>
          <StatCard
            label="Points"
            value={String(points)}
            tone="primary"
            icon={<PointsIcon />}
            data-testid="overview-points"
          />
        </Reveal>
        <Reveal delayMs={80}>
          <StatCard
            label="Level"
            value={String(level)}
            hint={`${Math.round(data.level_progress * 100)}% to next`}
            tone="primary"
            icon={<LevelIcon />}
            data-testid="overview-level"
          />
        </Reveal>
        <Reveal delayMs={120}>
          <StatCard
            label="Streak"
            value={String(streak)}
            hint={`Best: ${data.streak.longest}`}
            tone="accent"
            icon={<StreakIcon />}
            data-testid="overview-streak"
          />
        </Reveal>
        <Reveal delayMs={160}>
          <StatCard
            label="Due today"
            value={String(due)}
            tone={data.due_today > 0 ? "primary" : "default"}
            icon={<DueIcon />}
            data-testid="overview-due"
          />
        </Reveal>
      </div>

      <Reveal delayMs={200}>
        <div className="relative flex flex-col gap-lg overflow-hidden rounded-lg border border-primary/30 bg-card p-lg sm:flex-row sm:items-center">
          <ProgressRing
            value={goalPct}
            label={`Today ${data.today.answered}/${data.today.goal}`}
            data-testid="overview-goal-ring"
          />
          <div className="flex min-w-0 flex-1 flex-col gap-sm">
            <h2 className="font-heading text-xl font-semibold text-foreground">Today's goal</h2>
            <p className="text-base text-muted-foreground">
              {data.today.points_earned} points earned today
              {data.today.goal_met ? " · goal complete" : ""}.
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
                style={{ width: `${goalPct}%` }}
              />
            </div>
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={240}>
        <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card shadow-md shadow-primary/5">
          <div className="flex flex-col gap-md border-b border-border px-lg py-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">Insights</h2>
              <p className="text-sm text-muted-foreground">Activity, trends, and recent tests</p>
            </div>
            <Tabs
              className="w-full sm:w-[22rem]"
              data-testid="overview-tabs"
              value={panel}
              onChange={setPanel}
              items={[
                { id: "activity", label: "Activity" },
                { id: "trends", label: "Trends" },
                { id: "history", label: "History" },
              ]}
            />
          </div>
          <div key={panel} className="p-lg motion-safe:animate-[reveal-up_360ms_ease-out_both]">
            {panel === "activity" ? (
              <div className="relative overflow-hidden rounded-lg border border-primary/30 p-md">
              <Heatmap
                days={data.heatmap.map((day) => ({
                  date: day.date,
                  questions_answered: day.questions_answered,
                  goal_met: day.goal_met,
                }))}
                data-testid="overview-heatmap"
              />
              </div>
            ) : null}
            {panel === "trends" ? (
              <div className="grid gap-lg lg:grid-cols-2">
                <div className="relative overflow-hidden rounded-lg border border-primary/30 p-md">
                <TrendChart
                  embedded
                  tone="accent"
                  label="Accuracy trend"
                  points={data.accuracy_trend}
                  data-testid="overview-accuracy"
                />
                </div>
                <div className="relative overflow-hidden rounded-lg border border-primary/30 p-md">
                <TrendChart
                  embedded
                  tone="primary"
                  label="Points trend"
                  points={data.points_trend}
                  data-testid="overview-points-trend"
                />
                </div>
              </div>
            ) : null}
            {panel === "history" ? (
              <div className="relative flex flex-col gap-lg overflow-hidden rounded-lg border border-primary/30 p-md">
                {data.weakest_topics.length ? (
                  <div className="flex flex-col gap-sm">
                    <h3 className="font-heading text-base font-semibold">Weakest topics</h3>
                    <DataTable
                      embedded
                      rows={data.weakest_topics}
                      getRowId={(row) => row.id}
                      columns={[
                        { key: "label", header: "Topic", cell: (row) => row.label },
                        {
                          key: "accuracy",
                          header: "Accuracy",
                          cell: (row) => (
                            <span className="tabular-nums">{Math.round(row.recent_accuracy * 100)}%</span>
                          ),
                        },
                        { key: "due", header: "Due", align: "right", cell: (row) => String(row.due_count) },
                      ]}
                    />
                  </div>
                ) : null}
                {data.recent_tests.length ? (
                  <DataTable
                    embedded
                    caption="Recent tests"
                    rows={data.recent_tests}
                    getRowId={(row) => row.id}
                    columns={[
                      {
                        key: "status",
                        header: "Status",
                        cell: (row) => (
                          <StatusChip
                            label={row.status}
                            tone={row.status === "submitted" ? "accent" : "neutral"}
                            className="min-h-0 rounded-full px-2 py-0.5 text-xs"
                          />
                        ),
                      },
                      {
                        key: "score",
                        header: "Score",
                        cell: (row) => {
                          const pct = row.score === null ? 0 : Math.round(row.score * 100);
                          return (
                            <span className="flex items-center gap-sm">
                              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                                <span
                                  className="block h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-700"
                                  style={{ width: `${pct}%` }}
                                />
                              </span>
                              <span className="tabular-nums text-sm">
                                {row.score === null ? "—" : `${pct}%`}
                              </span>
                            </span>
                          );
                        },
                      },
                      {
                        key: "integrity",
                        header: "Integrity",
                        cell: (row) => row.integrity_status,
                      },
                      {
                        key: "open",
                        header: "",
                        align: "right",
                        cell: (row) => (
                          <Button
                            size="sm"
                            onClick={() => router.push(`${basePath}/tests/results/?id=${row.id}`)}
                          >
                            Results
                          </Button>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <EmptyState title="No tests yet" message="Create a test from the Tests page." />
                )}
              </div>
            ) : null}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function OverviewSection() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  function reload() {
    setStatus("loading");
    getDashboard()
      .then((dashboard) => {
        setData(dashboard);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }

  useEffect(() => {
    reload();
  }, []);

  if (status === "loading") return <Loader label="Loading overview" />;
  if (status === "error") {
    return <ErrorState title="Overview unavailable" message="The API did not respond." onRetry={reload} />;
  }
  if (!data) {
    return <EmptyState title="No dashboard data" message="Try again later." />;
  }

  return <OverviewReady data={data} />;
}
