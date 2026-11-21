import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { SecretInput } from "@self-study/ui/SecretInput";
import { SegmentedControl } from "@self-study/ui/SegmentedControl";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import {
  createWebSearchProvider,
  deleteWebSearchProvider,
  getQuestionSettings,
  listWebSearchProviders,
  setDefaultWebSearchProvider,
  testWebSearchProvider,
  updateQuestionSettings,
  type QuestionSettings,
  type WebSearchProvider,
} from "@/lib/api-client";

export function QuestionsSettingsPanel() {
  const { push } = useToast();
  const [settings, setSettings] = useState<QuestionSettings | null>(null);
  const [providers, setProviders] = useState<WebSearchProvider[]>([]);
  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("mock");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);

  function reload() {
    setLoading(true);
    Promise.all([getQuestionSettings(), listWebSearchProviders()])
      .then(([nextSettings, nextProviders]) => {
        setSettings(nextSettings);
        setProviders(nextProviders);
      })
      .catch(() => push("Could not load question settings", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !settings) return <Loader label="Loading question settings" />;

  return (
    <div className="flex flex-col gap-lg" data-testid="questions-settings">
      <Select
        label="Default burst size"
        data-testid="settings-burst-size"
        value={String(settings.default_burst_size)}
        onChange={(event) =>
          setSettings({ ...settings, default_burst_size: Number(event.target.value) })
        }
        options={[2, 3, 4, 5, 6, 8].map((n) => ({ value: String(n), label: String(n) }))}
      />
      <SegmentedControl
        label="Default grounding"
        data-testid="settings-grounding"
        value={settings.default_grounding_mode}
        onChange={(value) => setSettings({ ...settings, default_grounding_mode: value })}
        options={[
          { value: "notes", label: "Notes" },
          { value: "online", label: "Online" },
        ]}
      />
      <div className="grid gap-md sm:grid-cols-2">
        {(["recall", "understand", "apply", "analyze"] as const).map((key) => (
          <Input
            key={key}
            label={`${key} %`}
            type="number"
            data-testid={`mix-${key}`}
            value={String(settings.cognitive_mix[key])}
            onChange={(event) =>
              setSettings({
                ...settings,
                cognitive_mix: {
                  ...settings.cognitive_mix,
                  [key]: Number(event.target.value),
                },
              })
            }
          />
        ))}
      </div>
      <Button
        data-testid="settings-questions-save"
        onClick={async () => {
          try {
            const saved = await updateQuestionSettings(settings);
            setSettings(saved);
            push("Question settings saved", "success");
          } catch {
            push("Could not save question settings", "error");
          }
        }}
      >
        Save question settings
      </Button>

      <h2 className="font-heading text-xl font-semibold">Web search providers</h2>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} data-testid="web-name" />
      <Input
        label="Endpoint"
        value={endpoint}
        onChange={(event) => setEndpoint(event.target.value)}
        data-testid="web-endpoint"
      />
      <SecretInput
        label="API key"
        value={apiKey}
        onChange={(event) => setApiKey(event.target.value)}
        data-testid="web-api-key"
      />
      <Button
        data-testid="web-save"
        onClick={async () => {
          try {
            await createWebSearchProvider({
              name,
              endpoint,
              api_key: apiKey || null,
            });
            setName("");
            setApiKey("");
            reload();
          } catch {
            push("Could not create provider", "error");
          }
        }}
      >
        Add provider
      </Button>
      {!providers.length ? (
        <EmptyState title="No web search providers" message="Add a mock endpoint for local use." />
      ) : (
        <DataTable
          rows={providers}
          getRowId={(row) => row.id}
          columns={[
            { key: "name", header: "Name", cell: (row) => row.name },
            { key: "endpoint", header: "Endpoint", cell: (row) => row.endpoint },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <div className="flex flex-wrap gap-sm">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        const result = await testWebSearchProvider(row.id);
                        push(result.message, result.ok ? "success" : "error");
                      } catch {
                        push("Test failed", "error");
                      }
                    }}
                  >
                    Test
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await setDefaultWebSearchProvider(row.id);
                        push("Default web search set", "success");
                      } catch {
                        push("Could not set default", "error");
                      }
                    }}
                  >
                    Default
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        await deleteWebSearchProvider(row.id);
                        reload();
                      } catch {
                        push("Could not delete", "error");
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
