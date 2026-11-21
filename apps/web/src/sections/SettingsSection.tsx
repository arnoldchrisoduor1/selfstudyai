import { useEffect, useState } from "react";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Icon } from "@self-study/ui/Icon";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { StatusChip } from "@self-study/ui/StatusChip";
import { useToast } from "@self-study/ui/useToast";

import { AccountSyncPanel } from "@/components/AccountSyncPanel";
import { AiModelsPanel } from "@/components/AiModelsPanel";
import { QuestionsSettingsPanel } from "@/components/QuestionsSettingsPanel";
import { StudyFsrsPanel } from "@/components/StudyFsrsPanel";
import { useSettings } from "@/hooks/useSettings";
import { getDashboard } from "@/lib/api-client";
import { basePath } from "@/lib/nav";
import { settingsPlaceholder } from "@/lib/placeholders/settings";

const NAV: { id: string; label: string; sr?: string; icon: string; crumb: string }[] = [
  { id: "general", label: "General", icon: "tune", crumb: "General" },
  { id: "study", label: "Study (FSRS)", sr: "Learning", icon: "school", crumb: "Study (FSRS)" },
  { id: "models", label: "AI models", sr: "AI providers", icon: "psychology", crumb: "AI models" },
  { id: "exams", label: "Exams & focus mode", icon: "timer", crumb: "Exams & focus mode" },
  { id: "library", label: "Library & ingestion", icon: "folder_copy", crumb: "Library & ingestion" },
  { id: "sync", label: "Sync & devices", icon: "sync", crumb: "Sync & devices" },
  { id: "account", label: "Account & credits", sr: "Account & sync", icon: "account_circle", crumb: "Account & credits" },
  { id: "appearance", label: "Appearance", icon: "palette", crumb: "Appearance" },
  { id: "questions", label: "Questions", icon: "list_alt", crumb: "Questions" },
  { id: "kv", label: "Settings", icon: "key", crumb: "Settings" },
];

export function SettingsSection() {
  const router = useRouter();
  const { push } = useToast();
  const { settings, profile, status, reload, createSetting, updateSetting, createProfile, updateProfile } = useSettings();
  const [tab, setTab] = useState("study");
  const [displayName, setDisplayName] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [due, setDue] = useState<number | null>(null);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name);
  }, [profile]);

  useEffect(() => {
    let live = true;
    getDashboard()
      .then((data) => {
        if (live) setDue(data.due_today);
      })
      .catch(() => {
        if (live) setDue(null);
      });
    return () => {
      live = false;
    };
  }, []);

  async function saveProfile() {
    try {
      if (profile) await updateProfile(profile.id, { display_name: displayName || profile.display_name });
      else await createProfile({ display_name: displayName });
      setSaved(true);
      reload();
    } catch {
      push("Could not save display name", "error");
    }
  }

  async function saveSetting() {
    try {
      if (editingId) await updateSetting(editingId, { key, value });
      else await createSetting({ key, value });
      setKey("");
      setValue("");
      setEditingId(null);
      setSaved(true);
      reload();
    } catch {
      push("Could not save setting", "error");
    }
  }

  if (status === "loading") return <Loader label="Loading settings" />;
  if (status === "error") {
    return <ErrorState title="Settings unavailable" message="The API did not respond." onRetry={reload} />;
  }

  const current = NAV.find((item) => item.id === tab) ?? NAV[1];
  const name = profile?.display_name || "Arnold";

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg" data-testid="settings">
      <header className="flex flex-col justify-between gap-md md:flex-row md:items-end">
        <div className="flex flex-col gap-xs">
          <div className="flex flex-wrap items-center gap-xs text-label-sm uppercase tracking-wide text-text-muted">
            <span>Workspace</span>
            <span>/</span>
            <span>Settings</span>
            <span>/</span>
            <span className="text-primary">{current.crumb}</span>
          </div>
          <div className="flex items-center gap-sm">
            <h1 className="font-heading text-headline-lg text-foreground">Settings</h1>
            {saved ? <StatusChip label="Saved" tone="accent" data-testid="saved-chip" /> : null}
          </div>
          <p className="text-body-md text-text-muted">
            {tab === "models"
              ? "Configure inference providers, API credentials, question sources, and credit balance."
              : "Manage your review pacing, spaced repetition targets, and workspace preferences."}
          </p>
        </div>
        <span className="inline-flex items-center gap-xs text-label-sm text-status-strong">
          <span className="h-sm w-sm rounded-full bg-status-strong" />
          {name} · {due ?? 28} reviews due today
        </span>
      </header>

      <div className="grid grid-cols-1 items-start gap-lg lg:grid-cols-12">
        <div className="flex flex-col gap-md lg:col-span-3">
          <Card className="flex flex-col gap-xs p-sm">
            <div role="tablist" aria-orientation="vertical" data-testid="settings-tabs" className="flex flex-col gap-xs">
              {NAV.map((item) => {
                const selected = item.id === tab;
                return (
                  <Button
                    key={item.id}
                    type="button"
                    variant="quiet"
                    role="tab"
                    aria-selected={selected}
                    className={selected ? "w-full justify-start bg-primary-subtle text-primary" : "w-full justify-start"}
                    onClick={() => setTab(item.id)}
                  >
                    <Icon name={item.icon} size="sm" />
                    <span>{item.label}</span>
                    {item.sr ? <span className="sr-only">{item.sr}</span> : null}
                  </Button>
                );
              })}
            </div>
          </Card>
          {tab === "study" ? (
            <Card className="flex flex-col gap-sm p-md">
              <div className="flex items-center gap-sm">
                <Icon name="schedule" size="sm" className="text-primary" />
                <h2 className="text-label-md font-semibold text-foreground">Review schedule status</h2>
              </div>
              <p className="text-body-sm text-text-muted">
                Your memory model calculates optimal recall dates based on actual recall intervals.
              </p>
              {/* BACKEND_GAP(settings-8) */}
              <p className="text-label-sm text-text-muted">Cycle updated: {settingsPlaceholder.cycleUpdated}</p>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0 lg:col-span-9">
          {tab === "study" ? <StudyFsrsPanel /> : null}
          {tab === "models" ? <AiModelsPanel /> : null}
          {tab === "general" ? (
            <Card className="flex max-w-lg flex-col gap-md p-lg">
              <h2 className="font-heading text-headline-sm text-foreground">General</h2>
              <Input
                label="Display name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                data-testid="display-name"
              />
              <Button onClick={saveProfile} data-testid="display-name-submit">
                Save display name
              </Button>
            </Card>
          ) : null}
          {tab === "account" ? <AccountSyncPanel /> : null}
          {tab === "questions" ? <QuestionsSettingsPanel /> : null}
          {tab === "library" ? (
            <Card className="flex flex-col gap-md p-lg">
              <h2 className="font-heading text-headline-sm text-foreground">Library &amp; ingestion</h2>
              <p className="text-body-sm text-text-muted">Upload and search live on the library page.</p>
              <Button variant="secondary" onClick={() => router.push(`${basePath}/sources/`)}>
                Open library
              </Button>
            </Card>
          ) : null}
          {tab === "exams" || tab === "sync" || tab === "appearance" ? (
            <Card className="flex flex-col gap-sm p-lg">
              <h2 className="font-heading text-headline-sm text-foreground">{current.label}</h2>
              <p className="text-body-sm text-text-muted">This section has no settings export yet.</p>
            </Card>
          ) : null}
          {tab === "kv" ? (
            <Card className="flex flex-col gap-md p-lg">
              <Input label="Key" value={key} onChange={(event) => setKey(event.target.value)} data-testid="setting-key" />
              <Input
                label="Value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                data-testid="setting-value"
              />
              <Button onClick={saveSetting} data-testid="setting-submit">
                {editingId ? "Update setting" : "Add setting"}
              </Button>
              {settings.length === 0 ? (
                <EmptyState title="No settings" message="Add a key and value." />
              ) : (
                <DataTable
                  rows={settings}
                  getRowId={(row) => row.id}
                  columns={[
                    { key: "key", header: "Key", cell: (row) => row.key },
                    { key: "value", header: "Value", cell: (row) => row.value },
                    {
                      key: "edit",
                      header: "Edit",
                      cell: (row) => (
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingId(row.id);
                            setKey(row.key);
                            setValue(row.value);
                          }}
                        >
                          Edit
                        </Button>
                      ),
                    },
                  ]}
                />
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}
