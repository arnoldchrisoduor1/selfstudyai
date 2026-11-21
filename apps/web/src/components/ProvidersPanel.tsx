import { useState } from "react";

import { Button } from "@self-study/ui/Button";
import { DataTable } from "@self-study/ui/DataTable";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { SecretInput } from "@self-study/ui/SecretInput";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import { useProviders } from "@/hooks/useProviders";
import { useAuth } from "@/hooks/useAuth";

export function ProvidersPanel() {
  const { push } = useToast();
  const { signedIn } = useAuth();
  const { providers, status, reload, create, update, remove, test, setDefault } = useProviders();
  const [name, setName] = useState("Mock");
  const [kind, setKind] = useState("mock");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [chatModel, setChatModel] = useState("mock-chat");
  const [embeddingModel, setEmbeddingModel] = useState("mock-embed");
  const [dims, setDims] = useState("32");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reembedWarning, setReembedWarning] = useState(false);

  if (status === "loading") return <Loader label="Loading providers" />;
  if (status === "error") {
    return <ErrorState title="Providers unavailable" message="The API did not respond." onRetry={reload} />;
  }

  async function save() {
    if (kind === "cloud") {
      push("Cloud AI is not available in this build", "info");
      return;
    }
    try {
      const payload = {
        name,
        kind,
        base_url: baseUrl || null,
        api_key: apiKey || null,
        chat_model: chatModel,
        embedding_model: embeddingModel,
        embedding_dimensions: Number(dims) || 32,
      };
      if (editingId) {
        const previous = providers.find((p) => p.id === editingId);
        await update(editingId, {
          name: payload.name,
          base_url: payload.base_url,
          api_key: payload.api_key,
          chat_model: payload.chat_model,
          embedding_model: payload.embedding_model,
          embedding_dimensions: payload.embedding_dimensions,
        });
        if (previous && previous.embedding_model !== payload.embedding_model) {
          setReembedWarning(true);
        }
      } else {
        await create(payload);
      }
      setApiKey("");
      setEditingId(null);
      reload();
      push("Provider saved", "success");
    } catch {
      push("Could not save provider", "error");
    }
  }

  return (
    <section className="flex flex-col gap-lg" data-testid="providers-section">
      {reembedWarning ? (
        <p className="text-base text-destructive" data-testid="reembed-warning">
          Embedding model changed. Sources may need re-embedding.
        </p>
      ) : null}
      <div className="grid gap-md md:grid-cols-2">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} data-testid="provider-name" />
        <Select
          label="Kind"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={[
            { value: "mock", label: "Mock" },
            { value: "ollama", label: "Ollama" },
            { value: "openai_compatible", label: "OpenAI compatible" },
            ...(signedIn ? [{ value: "cloud", label: "Cloud AI (credits)" }] : []),
          ]}
          data-testid="provider-kind"
        />
        <Input label="Base URL" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} data-testid="provider-base-url" />
        <SecretInput
          label="API key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          hint={editingId ? providers.find((p) => p.id === editingId)?.api_key_hint ?? undefined : undefined}
          data-testid="provider-api-key"
        />
        <Input label="Chat model" value={chatModel} onChange={(e) => setChatModel(e.target.value)} data-testid="provider-chat-model" />
        <Input
          label="Embedding model"
          value={embeddingModel}
          onChange={(e) => setEmbeddingModel(e.target.value)}
          data-testid="provider-embedding-model"
        />
        <Input label="Embedding dimensions" value={dims} onChange={(e) => setDims(e.target.value)} data-testid="provider-dims" />
      </div>
      {kind === "cloud" ? (
        <p className="text-sm text-muted-foreground" data-testid="cloud-provider-stub">
          Cloud AI uses account credits. Provider wiring is not enabled here.
        </p>
      ) : null}
      <Button onClick={save} data-testid="provider-save" disabled={kind === "cloud"}>
        {editingId ? "Update provider" : "Add provider"}
      </Button>
      {providers.length === 0 ? (
        <EmptyState title="No providers" message="Add a mock provider for local testing." />
      ) : (
        <DataTable
          rows={providers}
          getRowId={(row) => row.id}
          columns={[
            { key: "name", header: "Name", cell: (row) => row.name },
            { key: "kind", header: "Kind", cell: (row) => row.kind },
            {
              key: "key",
              header: "API key",
              cell: (row) => row.api_key_hint ?? (row.has_api_key ? "****" : "—"),
            },
            {
              key: "actions",
              header: "Actions",
              cell: (row) => (
                <div className="flex flex-wrap gap-sm">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditingId(row.id);
                      setName(row.name);
                      setKind(row.kind);
                      setBaseUrl(row.base_url ?? "");
                      setApiKey("");
                      setChatModel(row.chat_model);
                      setEmbeddingModel(row.embedding_model);
                      setDims(String(row.embedding_dimensions));
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    data-testid={`provider-test-${row.id}`}
                    onClick={async () => {
                      try {
                        const result = await test(row.id);
                        push(result.message, result.ok ? "success" : "error");
                      } catch {
                        push("Test failed", "error");
                      }
                    }}
                  >
                    Test
                  </Button>
                  <Button
                    variant="accent"
                    onClick={async () => {
                      try {
                        await setDefault(row.id);
                        push("Default provider set", "success");
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
                        await remove(row.id);
                        reload();
                      } catch {
                        push("Could not delete provider", "error");
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
    </section>
  );
}
