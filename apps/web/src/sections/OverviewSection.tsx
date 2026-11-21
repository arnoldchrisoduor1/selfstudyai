import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { FilterChip } from "@self-study/ui/FilterChip";
import { Icon } from "@self-study/ui/Icon";
import { SearchInput } from "@self-study/ui/SearchInput";

import {
  getDailyActivity,
  getDashboard,
  getLearningSettings,
  listProfiles,
  listQuestions,
  listSubjects,
  type DailyActivity,
  type MasteryRow,
} from "@/lib/api-client";
import { basePath } from "@/lib/nav";
import {
  overviewPlaceholder,
  type OverviewDot,
  type OverviewSubjectSample,
} from "@/lib/placeholders/overview";

type RangeKey = "7" | "30" | "90";

interface ChartDay {
  label: string;
  points: number;
  questions: number;
  today: boolean;
}

interface LiveSubject {
  id: string;
  name: string;
  description: string | null;
}

interface LiveOverview {
  name: string;
  due: number;
  streak: number;
  answered: number;
  goal: number;
  retentionPct: number;
  weeklyPoints: number;
  weeklyDeltaPct: number | null;
  gold: number | null;
  subjects: LiveSubject[];
  days: ChartDay[];
  activity: DailyActivity[];
  weak: MasteryRow[];
}

const dotClass: Record<OverviewDot, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  review: "bg-status-review",
};

const barClass: Record<OverviewDot, string> = {
  primary: "bg-primary",
  secondary: "bg-secondary",
  review: "bg-status-review",
};

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function retentionAt(index: number, count: number, series: number[]): number {
  if (series.length === 0) return 90;
  if (count <= 1) return series[0];
  const position = (index / (count - 1)) * (series.length - 1);
  const left = Math.floor(position);
  const right = Math.min(series.length - 1, left + 1);
  const mix = position - left;
  return series[left] * (1 - mix) + series[right] * mix;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function dayLabel(date: Date, today: boolean): string {
  const label = date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return today ? `${label} (Today)` : label;
}

function buildDays(rows: DailyActivity[], count: number, today: Date): ChartDay[] {
  const byDate = new Map(rows.map((row) => [row.date, row]));
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(today, index - (count - 1));
    const key = iso(date);
    const row = byDate.get(key);
    const isToday = key === iso(today);
    return {
      label: dayLabel(date, isToday),
      points: row?.points_earned ?? 0,
      questions: row?.questions_answered ?? 0,
      today: isToday,
    };
  });
}

function sumPoints(rows: DailyActivity[], start: string, end: string): number {
  return rows.reduce((total, row) => {
    if (row.date < start || row.date > end) return total;
    return total + row.points_earned;
  }, 0);
}

function Meter({ value, tone }: { value: number; tone: OverviewDot }) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="h-sm w-full overflow-hidden rounded-full bg-surface-dim">
      <div className={`h-full rounded-full ${barClass[tone]}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function DayRing({ pct }: { pct: number }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, pct)) / 100);
  return (
    <div className="relative h-logo w-logo shrink-0">
      <svg viewBox="0 0 32 32" className="h-logo w-logo -rotate-90">
        <circle cx="16" cy="16" r={radius} fill="none" className="stroke-border" strokeWidth="3" />
        <circle
          cx="16"
          cy="16"
          r={radius}
          fill="none"
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-label-sm font-bold text-foreground">
        {Math.round(pct)}%
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  suffix,
  delta,
  deltaTone = "primary",
  detail,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: ReactNode;
  deltaTone?: "primary" | "review";
  detail: string;
}) {
  return (
    <Card className="flex min-w-0 flex-col justify-between rounded-card p-md shadow-sm">
      <div>
        <span className="truncate text-label-sm font-semibold uppercase tracking-wide text-text-muted">{label}</span>
        <div className="mt-xs flex items-baseline gap-xs">
          <span className="truncate text-headline-md font-bold leading-none text-foreground">{value}</span>
          {suffix ? <span className="text-body-sm text-text-muted">{suffix}</span> : null}
        </div>
      </div>
      <div className="mt-sm border-t border-border pt-xs">
        {delta ? (
          <div
            className={`flex items-center gap-xs truncate text-label-sm font-semibold leading-tight ${
              deltaTone === "review" ? "text-status-review" : "text-primary"
            }`}
          >
            {delta}
          </div>
        ) : null}
        <p className="mt-xs truncate text-label-sm leading-tight text-text-muted">{detail}</p>
      </div>
    </Card>
  );
}

function SoonButton({
  children,
  variant = "secondary",
  className,
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "quiet";
  className?: string;
}) {
  return (
    <Button variant={variant} className={className} disabled title="Coming soon">
      {children}
    </Button>
  );
}

function PointsChart({ days, retention }: { days: ChartDay[]; retention: number[] }) {
  const width = 700;
  const height = 160;
  const baseline = 150;
  const ceiling = Math.max(100, ...days.map((day) => day.points), 1);
  const slot = width / Math.max(days.length, 1);
  const bars = days.map((day, index) => {
    const barHeight = Math.max(4, (day.points / ceiling) * (baseline - 16));
    return {
      ...day,
      x: slot * index + slot / 2 - 16,
      y: baseline - barHeight,
      height: barHeight,
    };
  });
  const points = days.map((day, index) => {
    const value = retentionAt(index, days.length, retention);
    const y = baseline - ((Math.max(70, Math.min(100, value)) - 70) / 30) * (baseline - 16);
    return { x: slot * index + slot / 2, y };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const area =
    points.length > 0
      ? `${line} L${points[points.length - 1].x} ${baseline} L${points[0].x} ${baseline} Z`
      : "";
  const peak = bars.reduce((best, bar) => (bar.points > best.points ? bar : best), bars[0]);
  const ticks = [ceiling, Math.round(ceiling * 0.66), Math.round(ceiling * 0.33), 0];

  return (
    <div className="flex min-w-0 flex-col gap-sm">
      <div className="flex min-w-0 items-stretch gap-sm">
        <div className="flex shrink-0 flex-col justify-between py-xs text-right text-label-sm text-text-subtle">
          {ticks.map((tick) => (
            <span key={tick}>{formatCount(tick)}</span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full overflow-visible">
            {[16, 60, 104].map((y) => (
              <line
                key={y}
                x1="0"
                x2={width}
                y1={y}
                y2={y}
                className="stroke-border"
                strokeDasharray="3 3"
              />
            ))}
            <line x1="0" x2={width} y1={baseline} y2={baseline} className="stroke-border" />
            {bars.map((bar) => (
              <rect
                key={bar.label}
                x={bar.x}
                y={bar.y}
                width="32"
                height={bar.height}
                rx="4"
                fill={bar.today ? "rgb(var(--color-primary-rgb) / 0.15)" : "rgb(var(--color-primary-rgb) / 0.45)"}
                stroke={bar.today ? "var(--color-primary)" : "none"}
                strokeDasharray={bar.today ? "3 3" : undefined}
              />
            ))}
            {area ? <path d={area} fill="rgb(var(--color-primary-rgb) / 0.12)" /> : null}
            {line ? (
              <path d={line} fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
            ) : null}
          </svg>
          {peak ? (
            <div
              className="pointer-events-none absolute top-0 flex -translate-x-1/2 flex-col items-center rounded-card border border-border bg-foreground px-sm py-xs text-background shadow-md"
              style={{ left: `${(peak.x / width) * 100}%` }}
            >
              <span className="whitespace-nowrap text-label-sm font-semibold">
                {peak.label}: {formatCount(peak.points)} pts
              </span>
              <span className="whitespace-nowrap text-label-sm text-background/70">
                {peak.questions} questions answered
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col justify-between py-xs text-label-sm text-text-subtle">
          <span>100%</span>
          <span>90%</span>
          <span>80%</span>
          <span>70%</span>
        </div>
      </div>
      <div
        className="grid gap-xs text-center text-label-sm leading-tight text-text-muted"
        style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 1)}, minmax(0, 1fr))` }}
      >
        {days.map((day) => (
          <span key={day.label} className={day.today ? "font-bold text-primary" : undefined}>
            {day.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function OverviewSection() {
  const router = useRouter();
  const [live, setLive] = useState<LiveOverview | null>(null);
  const [range, setRange] = useState<RangeKey>("7");
  const [ask, setAsk] = useState("");
  const sample = overviewPlaceholder;

  useEffect(() => {
    let cancelled = false;
    const today = new Date();
    const from = iso(addDays(today, -89));
    Promise.allSettled([
      getDashboard(),
      listProfiles(),
      getLearningSettings(),
      getDailyActivity(from, iso(today)),
      listSubjects(),
      listQuestions({ gold: true }),
    ]).then((results) => {
      if (cancelled) return;
      const [dashboard, profiles, settings, activity, subjects, gold] = results;
      const rows = activity.status === "fulfilled" ? activity.value : [];
      const dash = dashboard.status === "fulfilled" ? dashboard.value : null;
      const thisStart = iso(addDays(today, -6));
      const prevStart = iso(addDays(today, -13));
      const prevEnd = iso(addDays(today, -7));
      const weekly = sumPoints(rows, thisStart, iso(today));
      const previous = sumPoints(rows, prevStart, prevEnd);
      const profile = profiles.status === "fulfilled" ? profiles.value[0] : undefined;
      setLive({
        name: profile?.display_name || sample.name,
        due: dash?.due_today ?? 0,
        streak: dash?.streak.current ?? 0,
        answered: dash?.today.answered ?? 0,
        goal: dash?.today.goal ?? 0,
        retentionPct:
          settings.status === "fulfilled"
            ? Math.round(settings.value.settings.desired_retention * 100)
            : 90,
        weeklyPoints: weekly,
        weeklyDeltaPct: previous > 0 ? Math.round(((weekly - previous) / previous) * 100) : null,
        gold: gold.status === "fulfilled" ? gold.value.length : null,
        subjects:
          subjects.status === "fulfilled"
            ? subjects.value.map((subject) => ({
                id: subject.id,
                name: subject.name,
                description: subject.description,
              }))
            : [],
        days: buildDays(rows, 7, today),
        activity: rows,
        weak: dash?.weakest_topics ?? [],
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sample.name]);

  const chartDays = useMemo(() => {
    if (!live) return buildDays([], 7, new Date());
    if (range === "7") return live.days;
    const count = range === "30" ? 30 : 90;
    return buildDays(live.activity, count, new Date());
  }, [live, range]);

  const retention = sample.retention;
  const name = live?.name ?? sample.name;
  const due = live?.due ?? 0;
  const streak = live?.streak ?? 0;
  const answered = live?.answered ?? 0;
  const goal = live?.goal ?? 0;
  const todayPct = goal > 0 ? Math.round((answered / goal) * 100) : 0;
  const subjectCount = live ? live.subjects.length : sample.scheduledSubjects;
  const studyCards: { id?: string; name: string; sample: OverviewSubjectSample }[] = live?.subjects.length
    ? live.subjects.map((subject, index) => ({
        id: subject.id,
        name: subject.name,
        sample: {
          ...sample.subjects[index % sample.subjects.length],
          chapter: subject.description || sample.subjects[index % sample.subjects.length].chapter,
        },
      }))
    : sample.subjects.map((subject) => ({
        name: subject.name,
        sample: subject,
      }));

  function onAsk(event: FormEvent) {
    event.preventDefault();
    const query = ask.trim();
    void router.push(query ? `${basePath}/sources/?q=${encodeURIComponent(query)}` : `${basePath}/sources/`);
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg" data-testid="overview">
      <div className="flex min-w-0 flex-col justify-between gap-md md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-headline-md font-bold leading-tight text-foreground">
            {greeting(new Date())}, {name}
          </h1>
          <p className="mt-xs text-body-md text-text-muted">
            You have <strong className="font-semibold text-foreground">{due} cards</strong> scheduled across{" "}
            {/* BACKEND_GAP(overview-13) due queue has no subject id, so this is the subject list length. */}
            <strong className="font-semibold text-foreground">{subjectCount} subjects</strong> today.
          </p>
        </div>
        <Card className="flex shrink-0 items-center gap-md rounded-card px-md py-sm shadow-sm">
          <div className="flex items-center gap-sm">
            <span className="inline-flex h-logo w-logo items-center justify-center rounded-md border border-status-review-border bg-status-review-bg text-status-review">
              <Icon name="local_fire_department" size="sm" />
            </span>
            <span className="flex flex-col">
              <span className="text-body-md font-bold leading-tight text-foreground">{streak}-day streak</span>
              <span className="text-label-sm leading-tight text-text-muted">Active consistency</span>
            </span>
          </div>
          <span className="h-logo w-px bg-border" />
          <div className="flex items-center gap-sm">
            <DayRing pct={todayPct} />
            <span className="flex flex-col">
              <span className="text-body-md font-bold leading-tight text-foreground">
                {answered}/{goal}
              </span>
              <span className="text-label-sm leading-tight text-text-muted">Cards today</span>
            </span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-md md:grid-cols-2 min-[949px]:grid-cols-5">
        {/* BACKEND_GAP(overview-1) */}
        <Metric
          label="Knowledge Score"
          value={String(sample.knowledgeScore)}
          suffix={`/ ${sample.knowledgeScale}`}
          delta={
            <>
              <Icon name="arrow_upward" size="sm" />
              <span>{sample.knowledgeDelta}</span>
            </>
          }
          detail="Calculated across all subjects"
        />
        <Metric
          label="Reviews Due"
          value={String(due)}
          delta={<span>{live?.retentionPct ?? 90}% target</span>}
          detail={
            // BACKEND_GAP(overview-2)
            sample.estimatedMinutes
          }
        />
        {/* BACKEND_GAP(overview-3) */}
        <Metric
          label="Questions Mastered"
          value={sample.mastered}
          delta={
            <>
              <Icon name="trending_up" size="sm" />
              <span>{sample.masteredDelta}</span>
            </>
          }
          detail={sample.masteredStability}
        />
        <Metric
          label="Weekly Points"
          value={formatCount(live?.weeklyPoints ?? 0)}
          deltaTone="review"
          delta={
            <>
              <Icon name="bolt" size="sm" />
              <span>
                {live?.weeklyDeltaPct == null ? "0% vs last week" : `${live.weeklyDeltaPct > 0 ? "+" : ""}${live.weeklyDeltaPct}% vs last week`}
              </span>
            </>
          }
          detail="Earned across active sessions"
        />
        <Metric
          label="Gold Questions"
          value={live?.gold == null ? String(sample.goldCount) : String(live.gold)}
          deltaTone="review"
          delta={
            <>
              <Icon name="star" size="sm" />
              {/* BACKEND_GAP(overview-4) */}
              <span>{sample.goldDelta}</span>
            </>
          }
          detail="Mastered high-yield concepts"
        />
      </div>

      <div className="grid grid-cols-1 gap-lg min-[949px]:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-md min-[949px]:col-span-8">
          <div className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <h2 className="text-headline-sm font-bold text-foreground">Continue studying</h2>
              <Badge label={`${studyCards.length} active`} />
            </div>
            <Button variant="quiet" className="min-h-11 px-sm" onClick={() => router.push(`${basePath}/subjects/`)}>
              All subjects
              <Icon name="chevron_right" size="sm" />
            </Button>
          </div>
          {studyCards.map((card) => (
            <Card key={card.id ?? card.name} className="rounded-card p-md shadow-sm">
              <div className="flex flex-col justify-between gap-sm md:flex-row md:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-sm">
                    <span className={`h-sm w-sm shrink-0 rounded-full ${dotClass[card.sample.dot]}`} />
                    <h3 className="text-body-lg font-bold text-foreground">{card.name}</h3>
                    {/* BACKEND_GAP(overview-5) */}
                    <Badge
                      label={card.sample.tag}
                      tone={card.sample.tagTone === "primary" ? "stable" : "neutral"}
                      className="rounded-md"
                    />
                  </div>
                  <p className="mt-xs truncate text-body-sm text-text-muted">{card.sample.chapter}</p>
                </div>
                {/* BACKEND_GAP(overview-6) */}
                <SoonButton variant="secondary" className="min-h-8 shrink-0 px-sm py-0 text-body-sm disabled:opacity-100 max-md:min-h-11">
                  Resume
                  <Icon name="arrow_forward" size="sm" />
                </SoonButton>
              </div>
              <div className="mt-sm space-y-xs border-t border-border pt-sm">
                <div className="flex items-center justify-between text-label-sm">
                  <span className="font-medium text-text-muted">Syllabus Completion</span>
                  <span className="font-bold text-foreground">{card.sample.completion}%</span>
                </div>
                <Meter value={card.sample.completion} tone={card.sample.bar} />
                <div className="flex flex-col justify-between gap-xs text-label-sm text-text-muted md:flex-row md:items-center">
                  <div className="flex flex-wrap items-center gap-md">
                    <span className="inline-flex items-center gap-xs">
                      <Icon name="style" size="sm" />
                      {card.sample.flashcards}
                    </span>
                    <span className="inline-flex items-center gap-xs">
                      <Icon name="description" size="sm" />
                      {card.sample.notes}
                    </span>
                  </div>
                  <span>{card.sample.studied}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex min-w-0 flex-col gap-md min-[949px]:col-span-4">
          {/* BACKEND_GAP(overview-7) */}
          <Card className="rounded-card border-primary-border bg-primary-subtle p-md shadow-sm">
            <div className="flex items-center justify-between text-label-sm font-semibold uppercase tracking-wide text-primary">
              <span>Next recommended batch</span>
              <span>2.5 min</span>
            </div>
            <h3 className="mt-sm text-headline-sm font-bold text-foreground">{sample.burstTitle}</h3>
            <p className="mt-xs text-body-sm text-text-muted">{sample.burstBody}</p>
            <SoonButton variant="primary" className="mt-sm min-h-8 w-full px-sm py-0 text-body-sm disabled:opacity-100 max-md:min-h-11">
              <Icon name="bolt" size="sm" />
              {sample.burstLabel}
            </SoonButton>
            <p className="mt-sm flex items-center justify-center gap-xs text-label-sm text-text-muted">
              <Icon name="star" size="sm" className="text-status-review" />
              {sample.burstNote}
            </p>
          </Card>

          {/* BACKEND_GAP(overview-8) */}
          <Card className="rounded-card p-md shadow-sm">
            <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">
              Queued by retention decay
            </p>
            <div className="mt-sm flex flex-col gap-xs">
              {sample.queue.map((row) => (
                <div key={row.name} className="flex items-center justify-between gap-sm rounded-md p-sm">
                  <div className="flex min-w-0 items-center gap-sm">
                    <span className={`h-sm w-sm shrink-0 rounded-full ${dotClass[row.dot]}`} />
                    <span className="min-w-0">
                      <span className="block truncate text-body-sm font-semibold text-foreground">{row.name}</span>
                      <span className="block text-label-sm text-text-muted">{row.stability}</span>
                    </span>
                  </div>
                  <span className="flex items-center gap-sm">
                    {row.overdue ? <Badge label={row.overdue} tone="weak" className="rounded-md" /> : null}
                    <span className="text-body-md font-bold text-foreground">{row.count}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-sm border-t border-border pt-sm">
              <Button
                variant="secondary"
                className="min-h-8 w-full px-sm py-0 text-body-sm max-md:min-h-11"
                onClick={() => router.push(`${basePath}/study/?mode=review_due`)}
              >
                <Icon name="play_arrow" size="sm" />
                Review all {due} due cards
              </Button>
            </div>
          </Card>

          {/* BACKEND_GAP(overview-9) */}
          <Card className="rounded-card p-md shadow-sm">
            <div className="flex items-center justify-between gap-sm">
              <span className="inline-flex items-center gap-xs text-label-sm font-semibold uppercase tracking-wide text-text-muted">
                <Icon name="assignment_turned_in" size="sm" className="text-primary" />
                Upcoming Final Test
              </span>
              <Badge label={sample.upcomingWhen} tone="stable" className="rounded-md" />
            </div>
            <div className="mt-sm flex items-baseline justify-between gap-sm">
              <h3 className="text-body-md font-bold text-foreground">{sample.upcomingTitle}</h3>
              <span className="text-body-md font-bold text-primary">{sample.upcomingReadiness}%</span>
            </div>
            <p className="mt-xs text-label-sm text-text-muted">{sample.upcomingTarget}</p>
            <div className="mt-sm">
              <Meter value={sample.upcomingReadiness} tone="primary" />
            </div>
            <div className="mt-sm flex items-center justify-between text-label-sm">
              <span className="text-text-muted">{sample.upcomingReadiness}% readiness</span>
              <SoonButton variant="quiet" className="min-h-11 px-sm disabled:opacity-100">
                Configure test
                <Icon name="chevron_right" size="sm" />
              </SoonButton>
            </div>
          </Card>
        </div>
      </div>

      <Card className="min-w-0 rounded-card p-lg shadow-sm">
        <div className="flex flex-col justify-between gap-sm md:flex-row md:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-sm">
              <h2 className="text-headline-sm font-bold text-foreground">Knowledge Progress & Points Earned</h2>
              <Badge label="FSRS" />
            </div>
            <p className="mt-xs text-body-sm text-text-muted">
              Memory index retention tracking vs daily question volume
            </p>
          </div>
          <div className="flex flex-wrap gap-xs rounded-md border border-border bg-surface-dim p-xs">
            {(["7", "30", "90"] as RangeKey[]).map((key) => (
              <FilterChip
                key={key}
                label={`${key}d`}
                selected={range === key}
                onClick={() => setRange(key)}
                className="min-h-11 rounded-md px-sm"
              />
            ))}
          </div>
        </div>
        <div className="mt-md overflow-x-auto">
          {/* BACKEND_GAP(overview-10) retention line is the design sample; bars are daily points. */}
          <div style={{ minWidth: chartDays.length > 7 ? chartDays.length * 48 : undefined }}>
            <PointsChart days={chartDays} retention={retention} />
          </div>
        </div>
        <div className="mt-sm flex flex-wrap items-center gap-md text-label-sm text-text-muted">
          <span className="inline-flex items-center gap-xs">
            <span className="h-sm w-sm rounded-sm bg-primary" />
            Daily points
          </span>
          <span className="inline-flex items-center gap-xs">
            <span className="h-px w-md bg-primary" />
            FSRS Retention ({live?.retentionPct ?? 90}%)
          </span>
          {chartDays.some((day) => day.today) ? (
            <span className="inline-flex items-center gap-xs rounded-md border border-primary-border bg-primary-subtle px-sm py-xs font-semibold text-primary">
              <span className="h-sm w-sm rounded-full bg-primary" />
              Today (in progress)
            </span>
          ) : null}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-lg min-[949px]:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-md">
          <Card className="rounded-card p-md shadow-sm">
            <div className="flex items-center justify-between gap-sm">
              <div className="flex items-center gap-sm">
                <span className="inline-flex h-logo w-logo items-center justify-center rounded-md bg-primary-subtle text-primary">
                  <Icon name="chat" size="sm" />
                </span>
                <h3 className="text-body-md font-bold text-foreground">Ask your notes</h3>
              </div>
              <span className="text-label-sm text-text-muted">Semantic search</span>
            </div>
            <form className="mt-sm flex items-end gap-sm" onSubmit={onAsk}>
              <div className="min-w-0 flex-1">
                <SearchInput
                  label="Ask a question about your notes"
                  labelHidden
                  value={ask}
                  placeholder="Ask a question about your notes…"
                  onChange={(event) => setAsk(event.target.value)}
                />
              </div>
              <Button type="submit" variant="secondary" className="shrink-0">
                <Icon name="search" size="sm" />
                Search
              </Button>
            </form>
          </Card>

          {/* BACKEND_GAP(overview-11) */}
          <Card className="rounded-card p-md shadow-sm">
            <div className="flex items-center justify-between gap-sm">
              <div className="flex items-center gap-sm">
                <h2 className="text-headline-sm font-bold text-foreground">Recent activity</h2>
                <Icon name="history" size="sm" className="text-text-subtle" />
              </div>
              <span className="text-label-sm text-text-muted">Synced with vault</span>
            </div>
            <div className="mt-md flex flex-col gap-md">
              {sample.activity.map((row) => (
                <div key={row.title} className="flex items-start gap-sm">
                  <span
                    className={`inline-flex h-logo w-logo shrink-0 items-center justify-center rounded-md border ${
                      row.iconTone === "review"
                        ? "border-status-review-border bg-status-review-bg text-status-review"
                        : "border-primary-border bg-primary-subtle text-primary"
                    }`}
                  >
                    <Icon name={row.icon} size="sm" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-sm">
                      <span className="min-w-0 truncate text-body-sm font-semibold text-foreground">{row.title}</span>
                      <span className="shrink-0 text-label-sm text-text-muted">{row.when}</span>
                    </div>
                    <p className="text-label-sm text-text-muted">
                      {row.detail}{" "}
                      {row.emphasis ? <strong className="font-semibold text-primary">{row.emphasis}</strong> : null}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="min-w-0 rounded-card p-md shadow-sm">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="text-headline-sm font-bold text-foreground">Weak topics</h2>
            <Badge label="Needs attention" tone="review" className="rounded-md" />
            <span className="text-label-sm text-text-muted">Pre-test review</span>
          </div>
          <p className="mt-xs text-body-sm text-text-muted">Gaps identified before upcoming final tests</p>
          <div className="mt-md flex flex-col gap-md">
            {(live && live.weak.length > 0 ? live.weak : null)?.map((topic) => (
              <div key={topic.id} className="flex items-start justify-between gap-sm border-b border-border pb-sm">
                <div className="min-w-0">
                  <p className="text-body-md font-semibold text-foreground">{topic.label}</p>
                  <p className="text-label-sm text-text-muted">{topic.kind}</p>
                  <Badge
                    className="mt-xs rounded-md"
                    tone={topic.recent_accuracy < 0.6 ? "weak" : "review"}
                    label={`${Math.round(topic.recent_accuracy * 100)}% Accuracy`}
                  />
                </div>
                {/* BACKEND_GAP(overview-12) */}
                <SoonButton variant="secondary" className="shrink-0 disabled:opacity-100">
                  Practice
                </SoonButton>
              </div>
            )) ??
              sample.weak.map((topic) => (
                <div key={topic.title} className="flex items-start justify-between gap-sm border-b border-border pb-sm">
                  <div className="min-w-0">
                    <p className="text-body-md font-semibold text-foreground">{topic.title}</p>
                    <p className="text-label-sm text-text-muted">{topic.subject}</p>
                    {/* BACKEND_GAP(overview-12) */}
                    <Badge className="mt-xs rounded-md" tone={topic.tone} label={topic.accuracy} />
                  </div>
                  <SoonButton variant="secondary" className="shrink-0 disabled:opacity-100">
                    Practice
                  </SoonButton>
                </div>
              ))}
          </div>
          <p className="mt-sm text-right text-label-sm text-text-muted">
            {live && live.weak.length > 0
              ? `${live.weak.length} topics flagged`
              : `${sample.weak.length} topics flagged`}
          </p>
          <p className="text-right text-label-sm text-text-subtle">Calculated from recent quiz responses</p>
        </Card>
      </div>
    </section>
  );
}
