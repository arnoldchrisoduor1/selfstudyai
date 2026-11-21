import { useEffect, useState } from "react";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { Icon } from "@self-study/ui/Icon";
import { Loader } from "@self-study/ui/Loader";
import { useToast } from "@self-study/ui/useToast";

import { ProvidersPanel } from "@/components/ProvidersPanel";
import {
  getCreditsBalance,
  getCreditsLedger,
  getQuestionSettings,
  listProviders,
  updateQuestionSettings,
  type CreditsLedgerEntry,
  type QuestionSettings,
} from "@/lib/api-client";
import { settingsPlaceholder } from "@/lib/placeholders/settings";

type Mode = "local" | "byo" | "cloud";

const MODES: { id: Mode; title: string; badge: string; detail: string; icon: string }[] = [
  {
    id: "local",
    title: "Local model",
    badge: "Available",
    detail: "Runs on device. Private and offline. Uses your computer's local resources.",
    icon: "computer",
  },
  {
    id: "byo",
    title: "Cloud AI (my own key)",
    badge: "Custom API",
    detail: "Custom endpoint. Bring your own key. Connect your personal API key.",
    icon: "key",
  },
  {
    id: "cloud",
    title: "Cloud AI (app credits)",
    badge: "Managed",
    detail: "Managed service. Zero setup. High-speed cloud processing powered by app credits.",
    icon: "cloud",
  },
];

function modeFromKind(kind: string | undefined): Mode {
  if (kind === "cloud") return "cloud";
  if (kind === "openai_compatible") return "byo";
  return "local";
}

export function AiModelsPanel() {
  const { push } = useToast();
  const [mode, setMode] = useState<Mode>("cloud");
  const [savedMode, setSavedMode] = useState<Mode>("cloud");
  const [questions, setQuestions] = useState<QuestionSettings | null>(null);
  const [grounding, setGrounding] = useState("notes");
  const [savedGrounding, setSavedGrounding] = useState("notes");
  const [credits, setCredits] = useState<string | null>(null);
  const [ledger, setLedger] = useState<CreditsLedgerEntry[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    Promise.allSettled([listProviders(), getQuestionSettings(), getCreditsBalance(), getCreditsLedger()]).then(
      ([providers, question, balance, entries]) => {
        if (!live) return;
        if (providers.status === "fulfilled" && providers.value[0]) {
          const next = modeFromKind(providers.value[0].kind);
          setMode(next);
          setSavedMode(next);
        }
        if (question.status === "fulfilled") {
          setQuestions(question.value);
          setGrounding(question.value.default_grounding_mode);
          setSavedGrounding(question.value.default_grounding_mode);
        }
        if (balance.status === "fulfilled") setCredits(String(balance.value.available));
        if (entries.status === "fulfilled") setLedger(entries.value);
        setLoading(false);
      },
    );
    return () => {
      live = false;
    };
  }, []);

  if (loading) return <Loader label="Loading model settings" />;

  const dirty = mode !== savedMode || grounding !== savedGrounding;
  const usage = ledger && ledger.length ? null : settingsPlaceholder.usage;

  async function save() {
    if (questions && grounding !== savedGrounding) {
      try {
        const next = await updateQuestionSettings({ ...questions, default_grounding_mode: grounding });
        setQuestions(next);
        setSavedGrounding(next.default_grounding_mode);
      } catch {
        push("Could not save question source", "error");
        return;
      }
    }
    if (mode !== savedMode) {
      push("Model card choice is not stored yet", "info");
      return;
    }
    push("Model preferences saved", "success");
  }

  return (
    <div className="flex min-w-0 flex-col gap-lg">
      <div>
        <h2 className="font-heading text-headline-sm text-foreground">AI Models &amp; Processing</h2>
        <p className="text-body-sm text-text-muted">Select how study questions, concept breakdowns, and flashcards are generated.</p>
      </div>
      <div className="grid grid-cols-1 gap-md md:grid-cols-3">
        {MODES.map((item) => {
          const on = item.id === mode;
          return (
            <Button
              key={item.id}
              type="button"
              variant="secondary"
              className={on ? "h-auto border-primary bg-primary-subtle" : "h-auto"}
              onClick={() => setMode(item.id)}
            >
              <span className="flex w-full flex-col items-start gap-xs text-left">
                <span className="flex w-full items-center justify-between">
                  <Icon name={item.icon} size="sm" />
                  <Badge label={on ? "Active" : item.badge} tone={on ? "stable" : "neutral"} />
                </span>
                <span className="text-label-md text-foreground">{item.title}</span>
                <span className="text-body-sm text-text-muted">{item.detail}</span>
                <span className="text-label-sm text-text-muted">{on ? "Currently selected" : "Select"}</span>
              </span>
            </Button>
          );
        })}
      </div>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex items-center justify-between gap-sm">
          <h3 className="font-heading text-headline-sm text-foreground">API Credentials &amp; Connection</h3>
          <Badge label="Stored on this device" tone="strong" />
        </div>
        {/* BACKEND_GAP(settings-5) */}
        <p className="text-body-sm text-text-muted">Managed gateway key. Stored with the provider record, not a browser keychain.</p>
        <div className="flex flex-wrap gap-sm">
          <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
            Show
          </Button>
          <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
            Change credentials
          </Button>
          <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
            Test ping
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <div className="flex flex-wrap items-end justify-between gap-md">
          <div>
            <div className="flex items-center gap-sm">
              <h3 className="font-heading text-headline-sm text-foreground">Available Cloud Credits</h3>
              <Badge label={settingsPlaceholder.creditPlan} tone="strong" />
            </div>
            <p className="font-heading text-headline-md text-foreground">{credits ?? settingsPlaceholder.credits} credits</p>
            {/* BACKEND_GAP(settings-6) */}
            <p className="text-body-sm text-text-muted">
              {credits ? "Live available balance." : settingsPlaceholder.creditReset}
            </p>
            <p className="text-body-sm text-text-muted">{settingsPlaceholder.creditDetail}</p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
              Auto-reload settings
            </Button>
            <Button disabled title="Coming soon" className="disabled:opacity-100">
              Buy credits
            </Button>
          </div>
        </div>
      </Card>

      <Card className="flex flex-col gap-md p-lg">
        <h3 className="font-heading text-headline-sm text-foreground">Question Source Default</h3>
        <p className="text-body-sm text-text-muted">Choose where the system pulls foundational material when creating new practice questions.</p>
        <div className="grid grid-cols-1 gap-md md:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            className={grounding === "notes" ? "h-auto border-primary bg-primary-subtle" : "h-auto"}
            onClick={() => setGrounding("notes")}
          >
            <span className="flex flex-col items-start gap-xs text-left">
              <span className="text-label-md text-foreground">My notes &amp; uploaded books</span>
              <span className="text-body-sm text-text-muted">Focus on syllabus and personal files.</span>
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            className={grounding === "online" ? "h-auto border-primary bg-primary-subtle" : "h-auto"}
            onClick={() => setGrounding("online")}
          >
            <span className="flex flex-col items-start gap-xs text-left">
              <span className="text-label-md text-foreground">Online reference materials</span>
              <span className="text-body-sm text-text-muted">Expands context with curated academic sources.</span>
            </span>
          </Button>
        </div>
      </Card>

      <Card className="flex min-w-0 flex-col gap-md p-lg">
        <div className="flex items-center justify-between gap-sm">
          <h3 className="font-heading text-headline-sm text-foreground">Recent credit usage</h3>
          {/* BACKEND_GAP(settings-7) */}
          <Button variant="secondary" size="sm" disabled title="Coming soon" className="disabled:opacity-100">
            Export CSV
          </Button>
        </div>
        <div className="min-w-0 overflow-x-auto">
          <div className="flex min-w-[32rem] flex-col gap-sm">
            <div className="grid grid-cols-4 gap-sm text-label-sm uppercase tracking-wide text-text-muted">
              <span>Date</span>
              <span>Task</span>
              <span>Details</span>
              <span>Credits</span>
            </div>
            {usage
              ? usage.map((row) => (
                  <div key={row.task} className="grid grid-cols-4 gap-sm text-body-sm">
                    <span className="text-text-muted">{row.date}</span>
                    <span className="text-foreground">{row.task}</span>
                    <span className="truncate text-text-muted">{row.detail}</span>
                    <span className={row.tone === "strong" ? "text-status-strong" : "text-foreground"}>{row.credits}</span>
                  </div>
                ))
              : ledger?.map((row) => (
                  <div key={row.id} className="grid grid-cols-4 gap-sm text-body-sm">
                    <span className="text-text-muted">
                      {new Date(row.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                    <span className="text-foreground">{row.kind}</span>
                    <span className="truncate text-text-muted">{row.reference ?? "—"}</span>
                    <span className={row.amount > 0 ? "text-status-strong" : "text-foreground"}>{row.amount}</span>
                  </div>
                ))}
          </div>
        </div>
      </Card>

      <Card className="flex flex-col items-start justify-between gap-sm p-md sm:flex-row sm:items-center">
        <p className="text-body-sm text-text-muted">
          {dirty ? "Unsaved model preferences." : "All model preferences are up to date."}
        </p>
        <div className="flex gap-sm">
          <Button
            variant="secondary"
            disabled={!dirty}
            onClick={() => {
              setMode(savedMode);
              setGrounding(savedGrounding);
            }}
          >
            Discard
          </Button>
          <Button disabled={!dirty} onClick={save}>
            <Icon name="check" size="sm" />
            Save changes
          </Button>
        </div>
      </Card>

      <ProvidersPanel />
    </div>
  );
}
