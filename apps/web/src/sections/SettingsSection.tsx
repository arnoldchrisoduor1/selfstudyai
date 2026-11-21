import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { StatusChip } from "@self-study/ui/StatusChip";
import { Tabs } from "@self-study/ui/Tabs";
import { useToast } from "@self-study/ui/useToast";

import { useSettings } from "@/hooks/useSettings";
import { ProvidersPanel } from "@/components/ProvidersPanel";
import { LearningSettingsPanel } from "@/components/LearningSettingsPanel";
import { QuestionsSettingsPanel } from "@/components/QuestionsSettingsPanel";
import { AccountSyncPanel } from "@/components/AccountSyncPanel";

export function SettingsSection() {
  const { push } = useToast();
  const { settings, profile, status, reload, createSetting, updateSetting, createProfile, updateProfile } =
    useSettings();
  const [tab, setTab] = useState("profile");
  const [displayName, setDisplayName] = useState("");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name);
  }, [profile]);

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

  return (
    <section className="flex max-w-3xl flex-col gap-lg">
      <div className="flex items-center gap-md">
        <h1 className="font-heading text-3xl font-semibold">Settings</h1>
        {saved ? <StatusChip label="Saved" tone="accent" data-testid="saved-chip" /> : null}
      </div>
      <Tabs
        value={tab}
        onChange={setTab}
        data-testid="settings-tabs"
        items={[
          { id: "profile", label: "Profile" },
          { id: "settings", label: "Settings" },
          { id: "account", label: "Account & sync" },
          { id: "providers", label: "AI providers" },
          { id: "questions", label: "Questions" },
          { id: "learning", label: "Learning" },
        ]}
      />
      {tab === "profile" ? (
        <>
          <Input
            label="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            data-testid="display-name"
          />
          <Button onClick={saveProfile} data-testid="display-name-submit">
            Save display name
          </Button>
        </>
      ) : null}
      {tab === "settings" ? (
        <>
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
        </>
      ) : null}
      {tab === "account" ? <AccountSyncPanel /> : null}
      {tab === "providers" ? <ProvidersPanel /> : null}
      {tab === "questions" ? <QuestionsSettingsPanel /> : null}
      {tab === "learning" ? <LearningSettingsPanel /> : null}
    </section>
  );
}
