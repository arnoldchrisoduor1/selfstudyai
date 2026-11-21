import { useEffect, useState } from "react";

import { Button } from "@self-study/ui/Button";
import { EmptyState } from "@self-study/ui/EmptyState";
import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";
import { ResultCard } from "@self-study/ui/ResultCard";
import { SearchInput } from "@self-study/ui/SearchInput";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import { listSources, listSubjects, listTopics, searchChunks, type SearchHit, type Source, type Subject, type Topic } from "@/lib/api-client";

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={index} className="bg-accent/30">
        {part}
      </mark>
    ) : (
      <span key={index}>{part}</span>
    ),
  );
}

export function SearchSection() {
  const { push } = useToast();
  const [query, setQuery] = useState("");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    listSubjects()
      .then(setSubjects)
      .catch(() => push("Could not load subjects", "error"));
  }, [push]);

  useEffect(() => {
    listSources(subjectId || undefined)
      .then(setSources)
      .catch(() => push("Could not load sources", "error"));
  }, [push, subjectId]);

  useEffect(() => {
    if (!sourceId) {
      setTopics([]);
      return;
    }
    listTopics(sourceId)
      .then(setTopics)
      .catch(() => push("Could not load topics", "error"));
  }, [push, sourceId]);

  async function onSearch() {
    setStatus("loading");
    try {
      const rows = await searchChunks({
        query,
        subject_id: subjectId || undefined,
        source_id: sourceId || undefined,
        topic_id: topicId || undefined,
      });
      setHits(rows);
      setStatus("ready");
    } catch {
      setStatus("error");
      push("Search failed", "error");
    }
  }

  return (
    <section className="flex max-w-4xl flex-col gap-lg" data-testid="search-page">
      <h1 className="font-heading text-3xl font-semibold">Search</h1>
      <SearchInput
        label="Query"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        data-testid="search-query"
      />
      <div className="grid gap-md md:grid-cols-3">
        <Select
          label="Subject"
          value={subjectId}
          onChange={(event) => {
            setSubjectId(event.target.value);
            setSourceId("");
            setTopicId("");
          }}
          options={[{ value: "", label: "All subjects" }, ...subjects.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <Select
          label="Source"
          value={sourceId}
          onChange={(event) => {
            setSourceId(event.target.value);
            setTopicId("");
          }}
          options={[{ value: "", label: "All sources" }, ...sources.map((s) => ({ value: s.id, label: s.title }))]}
        />
        <Select
          label="Topic"
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
          options={[{ value: "", label: "All topics" }, ...topics.map((t) => ({ value: t.id, label: t.title }))]}
        />
      </div>
      <Button onClick={onSearch} data-testid="search-submit">
        Search
      </Button>
      {status === "loading" ? <Loader label="Searching" /> : null}
      {status === "error" ? (
        <ErrorState title="Search unavailable" message="The API did not respond." onRetry={onSearch} />
      ) : null}
      {status === "ready" && hits.length === 0 ? (
        <EmptyState title="No matches" message="Try another query or clear filters." />
      ) : null}
      {hits.map((hit) => (
        <ResultCard
          key={hit.chunk_id}
          sourceTitle={hit.source_title}
          topicTitle={hit.topic_title}
          pageRef={hit.page_ref}
          data-testid="search-result"
        >
          {highlight(hit.text, query)}
        </ResultCard>
      ))}
    </section>
  );
}
