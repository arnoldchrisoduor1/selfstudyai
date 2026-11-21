import { useMemo, useState } from "react";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Input } from "@self-study/ui/Input";
import { Loader } from "@self-study/ui/Loader";
import { StatusChip } from "@self-study/ui/StatusChip";
import { Toggle } from "@self-study/ui/Toggle";
import { useToast } from "@self-study/ui/useToast";

import { useSource } from "@/hooks/useSources";
import { useTopics } from "@/hooks/useTopics";
import { reembedSource } from "@/lib/api-client";

export interface SourceDetailSectionProps {
  sourceId: string;
}

export function SourceDetailSection({ sourceId }: SourceDetailSectionProps) {
  const { push } = useToast();
  const { source, status: sourceStatus, reload: reloadSource } = useSource(sourceId);
  const { topics, chunks, status, reload, patchTopic } = useTopics(sourceId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => topics.find((topic) => topic.id === selectedId) ?? topics[0] ?? null,
    [selectedId, topics],
  );
  const topicChunks = chunks.filter((chunk) => chunk.topic_id === selected?.id);

  if (sourceStatus === "loading" || status === "loading") return <Loader label="Loading source" />;
  if (sourceStatus === "error" || status === "error" || !source) {
    return (
      <ErrorState
        title="Source unavailable"
        message="The API did not respond."
        onRetry={() => {
          reloadSource();
          reload();
        }}
      />
    );
  }

  return (
    <section className="flex max-w-4xl flex-col gap-lg" data-testid="source-detail-page">
      <div className="flex flex-wrap items-center gap-md">
        <h1 className="font-heading text-3xl font-semibold">{source.title}</h1>
        <StatusChip label={source.status} tone={source.status === "failed" ? "danger" : "accent"} />
        <Badge label={source.kind} />
      </div>
      {source.needs_reembed ? (
        <div className="flex flex-wrap items-center gap-md">
          <p className="text-base text-muted-foreground">Embedding model changed. Re-embed this source.</p>
          <Button
            data-testid="reembed-button"
            onClick={async () => {
              try {
                await reembedSource(source.id);
                push("Re-embed started", "success");
                reloadSource();
              } catch {
                push("Re-embed failed", "error");
              }
            }}
          >
            Re-embed
          </Button>
        </div>
      ) : null}
      {topics.length === 0 ? (
        <EmptyState title="No topics yet" message="Wait for ingestion to finish." />
      ) : (
        <div className="grid gap-lg md:grid-cols-2">
          <div className="flex flex-col gap-md">
            <h2 className="font-heading text-xl font-semibold">Topics</h2>
            {topics.map((topic) => (
              <div key={topic.id} className="flex flex-col gap-sm border-b border-border py-sm">
                <Button
                  variant={selected?.id === topic.id ? "primary" : "secondary"}
                  onClick={() => setSelectedId(topic.id)}
                >
                  {topic.title}
                </Button>
                <Input
                  label="Title"
                  defaultValue={topic.title}
                  data-testid={`topic-title-${topic.id}`}
                  onBlur={async (event) => {
                    if (event.target.value === topic.title) return;
                    try {
                      await patchTopic(topic.id, { title: event.target.value });
                      reload();
                    } catch {
                      push("Could not rename topic", "error");
                    }
                  }}
                />
                <Input
                  label="Position"
                  type="number"
                  defaultValue={String(topic.position)}
                  data-testid={`topic-position-${topic.id}`}
                  onBlur={async (event) => {
                    const next = Number(event.target.value);
                    if (next === topic.position) return;
                    try {
                      await patchTopic(topic.id, { position: next });
                      reload();
                    } catch {
                      push("Could not reorder topic", "error");
                    }
                  }}
                />
                <Toggle
                  label="Core topic"
                  checked={topic.is_core}
                  data-testid={`topic-core-${topic.id}`}
                  onCheckedChange={async (checked) => {
                    try {
                      await patchTopic(topic.id, { is_core: checked });
                      reload();
                    } catch {
                      push("Could not update core flag", "error");
                    }
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-md">
            <h2 className="font-heading text-xl font-semibold">Chunks</h2>
            {topicChunks.length === 0 ? (
              <EmptyState title="No chunks" message="Pick another topic." />
            ) : (
              topicChunks.map((chunk) => (
                <article key={chunk.id} className="border-b border-border py-sm" data-testid="chunk-preview">
                  {chunk.page_ref ? (
                    <p className="text-sm text-muted-foreground">{chunk.page_ref}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap text-base">{chunk.text}</p>
                </article>
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
