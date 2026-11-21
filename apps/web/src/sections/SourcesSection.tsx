import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { Badge } from "@self-study/ui/Badge";
import { Button } from "@self-study/ui/Button";
import { Card } from "@self-study/ui/Card";
import { Checkbox } from "@self-study/ui/Checkbox";
import { ErrorState } from "@self-study/ui/ErrorState";
import { FileDropzone } from "@self-study/ui/FileDropzone";
import { Icon } from "@self-study/ui/Icon";
import { PageHeader } from "@self-study/ui/PageHeader";
import { ProgressBar } from "@self-study/ui/ProgressBar";
import { SearchInput } from "@self-study/ui/SearchInput";
import { Select } from "@self-study/ui/Select";
import { useToast } from "@self-study/ui/useToast";

import {
  deleteSource,
  listQuestions,
  listSources,
  listSubjects,
  listTopics,
  reembedSource,
  searchChunks,
  syncPull,
  syncPush,
  uploadSource,
  type Source,
  type Subject,
} from "@/lib/api-client";
import { getDeviceId } from "@/lib/device-id";
import { basePath } from "@/lib/nav";
import { libraryPlaceholder } from "@/lib/placeholders/library";

const PAGE_SIZE = 6;

type FormatFilter = "all" | "pdf" | "epub" | "md" | "slides";

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

function formatLabel(source: Source): string {
  const ext = extension(source.file_name);
  if (ext === "pdf") return "PDF";
  if (ext === "epub") return "EPUB";
  if (ext === "md" || ext === "txt" || source.kind === "notes") return "Markdown";
  if (ext === "ppt" || ext === "pptx") return "Slides";
  return source.kind;
}

function matchesFormat(source: Source, format: FormatFilter): boolean {
  const ext = extension(source.file_name);
  if (format === "all") return true;
  if (format === "pdf") return ext === "pdf";
  if (format === "epub") return ext === "epub";
  if (format === "md") return ext === "md" || ext === "txt" || source.kind === "notes";
  return ext === "ppt" || ext === "pptx";
}

function parsedPercent(source: Source): number {
  if (source.status === "ready") return 100;
  if (source.status === "failed") return 0;
  return Math.max(0, Math.min(100, Math.round(source.progress)));
}

function statusBadge(source: Source): { label: string; tone: "strong" | "review" | "weak" } {
  if (source.status === "ready") return { label: "Ready", tone: "strong" };
  if (source.status === "failed") return { label: "Failed: retry", tone: "weak" };
  return { label: `Processing ${parsedPercent(source)}%`, tone: "review" };
}

function formatAdded(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function updatedLabel(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 60) return `Updated ${minutes} mins ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `Updated ${hours}h ago`;
  return `Updated ${formatAdded(iso)}`;
}

export function SourcesSection() {
  const router = useRouter();
  const { push } = useToast();
  const sample = libraryPlaceholder;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [cardsBySource, setCardsBySource] = useState<Record<string, number>>({});
  const [concepts, setConcepts] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [format, setFormat] = useState<FormatFilter>("all");
  const [query, setQuery] = useState("");
  const [searchInside, setSearchInside] = useState(false);
  const [hitSourceIds, setHitSourceIds] = useState<Set<string> | null>(null);
  const [layout, setLayout] = useState<"table" | "grid">("table");
  const [page, setPage] = useState(0);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!router.isReady) return;
    const raw = router.query.q;
    const next = Array.isArray(raw) ? raw[0] : raw;
    if (!next) return;
    setQuery(next);
    setSearchInside(true);
  }, [router.isReady, router.query.q]);

  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([listSources(), listSubjects(), listQuestions({})]).then(
      async (results) => {
        if (cancelled) return;
        const [sourceResult, subjectResult, questionResult] = results;
        if (sourceResult.status === "rejected" || subjectResult.status === "rejected") {
          setStatus("error");
          return;
        }
        const nextSources = sourceResult.value;
        const nextSubjects = subjectResult.value;
        const counts: Record<string, number> = {};
        if (questionResult.status === "fulfilled") {
          for (const question of questionResult.value) {
            if (!question.source_id) continue;
            counts[question.source_id] = (counts[question.source_id] ?? 0) + 1;
          }
        }
        const topicLists = await Promise.allSettled(nextSources.map((source) => listTopics(source.id)));
        if (cancelled) return;
        const topicCount = topicLists.reduce(
          (sum, result) => sum + (result.status === "fulfilled" ? result.value.length : 0),
          0,
        );
        setSources(nextSources);
        setSubjects(nextSubjects);
        setCardsBySource(counts);
        setConcepts(topicLists.some((result) => result.status === "fulfilled") ? topicCount : null);
        setUploadSubjectId((current) => current || nextSubjects[0]?.id || "");
        setStatus("ready");
      },
    );
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    if (!sources.some((source) => source.status === "pending" || source.status === "processing")) return;
    const timer = window.setInterval(() => setReloadKey((value) => value + 1), 4000);
    return () => window.clearInterval(timer);
  }, [sources]);

  useEffect(() => {
    if (!searchInside || query.trim().length < 2) {
      setHitSourceIds(null);
      return;
    }
    let cancelled = false;
    searchChunks({ query: query.trim(), limit: 50 })
      .then((hits) => {
        if (!cancelled) setHitSourceIds(new Set(hits.map((hit) => hit.source_id)));
      })
      .catch(() => {
        if (!cancelled) setHitSourceIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [query, searchInside]);

  const subjectName = useMemo(() => {
    const map = new Map(subjects.map((subject) => [subject.id, subject.name]));
    return (id: string) => map.get(id) ?? "Subject";
  }, [subjects]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return [...sources]
      .filter((source) => (subjectFilter === "all" ? true : source.subject_id === subjectFilter))
      .filter((source) => matchesFormat(source, format))
      .filter((source) => {
        if (searchInside && hitSourceIds) return hitSourceIds.has(source.id);
        if (!needle) return true;
        const haystack = `${source.title} ${source.file_name} ${subjectName(source.subject_id)}`.toLowerCase();
        return haystack.includes(needle);
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [format, hitSourceIds, query, searchInside, sources, subjectFilter, subjectName]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const featured = filtered.slice(0, 3);
  const cardTotal = Object.values(cardsBySource).reduce((sum, count) => sum + count, 0);
  const newest = sources.reduce<string | null>((best, source) => {
    if (!best || source.updated_at > best) return source.updated_at;
    return best;
  }, null);

  const breakdown = subjects
    .map((subject) => {
      const files = sources.filter((source) => source.subject_id === subject.id);
      const cards = files.reduce((sum, source) => sum + (cardsBySource[source.id] ?? 0), 0);
      return { id: subject.id, name: subject.name, files: files.length, cards };
    })
    .filter((row) => row.files > 0);
  const maxCards = Math.max(1, ...breakdown.map((row) => row.cards));

  async function onFile(file: File) {
    if (!uploadSubjectId) {
      push("Pick a subject first", "warning");
      return;
    }
    try {
      await uploadSource({ subjectId: uploadSubjectId, file });
      push("Upload started", "success");
      setReloadKey((value) => value + 1);
    } catch {
      push("Upload failed", "error");
    }
  }

  async function remove(id: string) {
    try {
      await deleteSource(id);
      setMenuId(null);
      setReloadKey((value) => value + 1);
    } catch {
      push("Could not delete source", "error");
    }
  }

  async function retry(id: string) {
    try {
      await reembedSource(id);
      setReloadKey((value) => value + 1);
    } catch {
      push("Could not retry source", "error");
    }
  }

  if (status === "error") {
    return <ErrorState title="Library unavailable" message="The API did not respond." onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return (
    <section className="flex w-full min-w-0 flex-col gap-lg" data-testid="sources-page">
      <p className="text-label-sm text-text-muted">
        Workspace / Library
        {newest ? <span className="ml-sm">{updatedLabel(newest)}</span> : null}
      </p>
      <PageHeader
        title="Course Material & Library"
        description="All uploaded course syllabi, textbooks, research papers, and notes organized by subject."
        actions={
          <Button onClick={() => document.getElementById("library-upload")?.scrollIntoView({ block: "center" })}>
            <Icon name="upload_file" size="sm" />
            Upload New Material
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 min-[1018px]:grid-cols-4">
        <Card className="rounded-lg p-md shadow-sm">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">Files</p>
          <p className="mt-sm text-headline-md font-bold text-foreground">{sources.length}</p>
          <p className="mt-xs text-label-sm text-text-muted">Stored in workspace</p>
        </Card>
        <Card className="rounded-lg p-md shadow-sm">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">Cards</p>
          <p className="mt-sm text-headline-md font-bold text-foreground">{cardTotal.toLocaleString("en-US")}</p>
          <p className="mt-xs text-label-sm text-text-muted">Generated across {subjects.length} subjects</p>
        </Card>
        <Card className="rounded-lg p-md shadow-sm">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">Concepts</p>
          <p className="mt-sm text-headline-md font-bold text-foreground">{concepts ?? 0}</p>
          <p className="mt-xs text-label-sm text-text-muted">Extracted from materials</p>
        </Card>
        {/* BACKEND_GAP(library-1) */}
        <Card className="rounded-lg p-md shadow-sm">
          <p className="text-label-sm font-semibold uppercase tracking-wide text-text-muted">Storage</p>
          <p className="mt-sm text-headline-md font-bold text-foreground">{sample.storage}</p>
          <p className="mt-xs text-label-sm text-text-muted">{sample.storageDetail}</p>
        </Card>
      </div>

      <div>
        <div className="mb-sm flex items-center justify-between gap-sm">
          <h2 className="text-headline-sm font-bold text-foreground">Core Curriculum Textbooks</h2>
          <span className="text-label-sm text-text-muted">{featured.length} primary reference works</span>
        </div>
        <div className="grid grid-cols-1 gap-md md:grid-cols-3">
          {featured.map((source) => (
            <Card key={source.id} className="rounded-lg p-md shadow-sm">
              <div className="flex items-center justify-between gap-sm">
                <Badge label={subjectName(source.subject_id)} tone="stable" className="rounded-md" />
                <span className="text-label-sm font-semibold text-primary">{parsedPercent(source)}% Parsed</span>
              </div>
              <h3 className="mt-sm truncate text-body-md font-bold text-foreground">{source.title}</h3>
              <p className="truncate text-label-sm text-text-muted">{source.file_name}</p>
              <div className="mt-sm flex items-center justify-between text-label-sm text-text-muted">
                <span>{cardsBySource[source.id] ?? 0} cards</span>
                <Link className="font-semibold text-primary" href={`${basePath}/sources/detail/?id=${source.id}`}>
                  Read
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card id="library-upload" className="rounded-lg border-dashed p-lg shadow-sm">
        <div className="flex flex-col gap-md">
          <Select
            label="Upload into subject"
            value={uploadSubjectId}
            onChange={(event) => setUploadSubjectId(event.target.value)}
            options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
            data-testid="sources-subject"
          />
          <FileDropzone
            label="Add material"
            hint={sample.uploadHint}
            accept=".md,.txt,.pdf,.epub"
            onFile={onFile}
            disabled={!uploadSubjectId}
            data-testid="sources-upload"
          />
          <div className="flex flex-wrap items-center gap-sm">
            {/* BACKEND_GAP(library-2) */}
            <Button variant="secondary" disabled title="Coming soon" className="disabled:opacity-100">
              Import from URL
            </Button>
          </div>
        </div>
      </Card>

      <Card className="min-w-0 rounded-lg p-md shadow-sm">
        <div className="flex min-w-0 flex-col gap-sm lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <SearchInput
              label="Filter documents, topics, authors"
              labelHidden
              value={query}
              placeholder="Filter documents, topics, authors..."
              data-testid="library-query"
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
            />
          </div>
          <Checkbox
            label="Search inside documents"
            data-testid="library-search-inside"
            checked={searchInside}
            onChange={(event) => setSearchInside(event.target.checked)}
          />
          <Select
            label="Subject"
            value={subjectFilter}
            onChange={(event) => {
              setSubjectFilter(event.target.value);
              setPage(0);
            }}
            options={[{ value: "all", label: `All Subjects (${subjects.length})` }, ...subjects.map((subject) => ({ value: subject.id, label: subject.name }))]}
          />
          <Select
            label="Format"
            value={format}
            onChange={(event) => {
              setFormat(event.target.value as FormatFilter);
              setPage(0);
            }}
            options={[
              { value: "all", label: "All Formats" },
              { value: "pdf", label: "PDF Documents" },
              { value: "epub", label: "EPUB Books" },
              { value: "md", label: "Markdown Notes" },
              { value: "slides", label: "Slide Decks" },
            ]}
          />
          <div className="flex items-center gap-xs">
            <Button variant={layout === "table" ? "secondary" : "quiet"} className="min-h-11 min-w-11 px-sm" aria-pressed={layout === "table"} onClick={() => setLayout("table")}>
              <Icon name="table_rows" size="sm" />
              <span className="sr-only">Table</span>
            </Button>
            <Button variant={layout === "grid" ? "secondary" : "quiet"} className="min-h-11 min-w-11 px-sm" aria-pressed={layout === "grid"} onClick={() => setLayout("grid")}>
              <Icon name="grid_view" size="sm" />
              <span className="sr-only">Grid</span>
            </Button>
          </div>
        </div>
        <div className="mt-sm flex flex-wrap items-center justify-between gap-sm text-label-sm text-text-muted">
          <span>
            Corpus view: {filtered.length} active readings · Sorted by ingestion date
          </span>
          <Button variant="quiet" className="min-h-11 px-sm" onClick={() => void router.push(`${basePath}/settings/`)}>
            Configure FSRS thresholds
          </Button>
        </div>

        {layout === "grid" ? (
          <div className="mt-md grid grid-cols-1 gap-md md:grid-cols-2">
            {pageRows.map((source) => (
              <DocumentRow
                key={source.id}
                source={source}
                subject={subjectName(source.subject_id)}
                cards={cardsBySource[source.id] ?? 0}
                menuOpen={menuId === source.id}
                onMenu={() => setMenuId((current) => (current === source.id ? null : source.id))}
                onDelete={() => void remove(source.id)}
                onRetry={() => void retry(source.id)}
              />
            ))}
          </div>
        ) : (
          <div className="mt-md flex min-w-0 flex-col">
            {pageRows.map((source) => (
              <DocumentRow
                key={source.id}
                source={source}
                subject={subjectName(source.subject_id)}
                cards={cardsBySource[source.id] ?? 0}
                menuOpen={menuId === source.id}
                onMenu={() => setMenuId((current) => (current === source.id ? null : source.id))}
                onDelete={() => void remove(source.id)}
                onRetry={() => void retry(source.id)}
              />
            ))}
          </div>
        )}
        {pageRows.length === 0 ? (
          <p className="mt-md text-body-sm text-text-muted">No documents match these filters.</p>
        ) : null}

        <div className="mt-md flex flex-wrap items-center justify-between gap-sm text-label-sm text-text-muted">
          <span>
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}-{Math.min(filtered.length, safePage * PAGE_SIZE + PAGE_SIZE)} of {filtered.length} documents
            {/* BACKEND_GAP(library-3) */}
            {" · "}
            {sample.fsrsFooter}
          </span>
          <div className="flex items-center gap-xs">
            <Button variant="quiet" className="min-h-11 min-w-11 px-sm" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}>
              <Icon name="chevron_left" size="sm" />
              <span className="sr-only">Previous page</span>
            </Button>
            <span className="text-body-sm text-foreground">{safePage + 1}</span>
            <Button variant="quiet" className="min-h-11 min-w-11 px-sm" disabled={safePage >= pageCount - 1} onClick={() => setPage((value) => value + 1)}>
              <Icon name="chevron_right" size="sm" />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-lg min-[1018px]:grid-cols-2">
        <Card className="rounded-lg p-md shadow-sm">
          <div className="flex items-center justify-between gap-sm">
            <h2 className="text-headline-sm font-bold text-foreground">Subjects breakdown</h2>
            <span className="text-label-sm text-text-muted">{breakdown.length} Subjects</span>
          </div>
          <div className="mt-md flex flex-col gap-sm">
            {breakdown.map((row) => (
              <div key={row.id}>
                <div className="flex items-center justify-between text-body-sm">
                  <span className="font-semibold text-foreground">{row.name}</span>
                  <span className="text-text-muted">
                    {row.files} files · {row.cards} cards
                  </span>
                </div>
                <div className="mt-xs h-sm overflow-hidden rounded-full bg-surface-dim">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(row.cards / maxCards) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Button variant="quiet" className="mt-md w-full" onClick={() => void router.push(`${basePath}/subjects/new/`)}>
            <Icon name="add" size="sm" />
            Register new subject
          </Button>
        </Card>
        <Card className="rounded-lg p-md shadow-sm">
          <div className="flex items-center justify-between gap-sm">
            <h2 className="text-headline-sm font-bold text-foreground">Backup & sync</h2>
            {/* BACKEND_GAP(library-4) */}
            <Badge label="Up to date" tone="strong" className="rounded-md" />
          </div>
          <p className="mt-sm text-body-sm text-text-muted">{sample.backupBody}</p>
          <p className="mt-sm text-body-sm text-foreground">Not synced yet</p>
          <p className="text-label-sm text-text-muted">All {sources.length} documents and card decks indexed</p>
          {/* BACKEND_GAP(library-4) */}
          <p className="mt-sm text-body-sm font-semibold text-foreground">{sample.encryption}</p>
          <p className="text-label-sm text-text-muted">{sample.encryptionDetail}</p>
          <p className="mt-sm text-body-sm font-semibold text-foreground">{sample.devices}</p>
          <p className="text-label-sm text-text-muted">{sample.devicesDetail}</p>
          <Button
            variant="secondary"
            className="mt-md"
            onClick={() => {
              const deviceId = getDeviceId();
              void syncPush({ device_id: deviceId, records: [] })
                .then(() => syncPull({ device_id: deviceId, limit: 100 }))
                .then(() => push("Synced", "success"))
                .catch(() => push("Sign in to sync", "error"));
            }}
          >
            <Icon name="sync" size="sm" />
            Sync now
          </Button>
        </Card>
      </div>
    </section>
  );
}

function DocumentRow({
  source,
  subject,
  cards,
  menuOpen,
  onMenu,
  onDelete,
  onRetry,
}: {
  source: Source;
  subject: string;
  cards: number;
  menuOpen: boolean;
  onMenu: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  const badge = statusBadge(source);
  return (
    <div className="flex min-w-0 flex-col gap-sm border-b border-border py-sm md:flex-row md:items-center">
      <div className="min-w-0 flex-1">
        <Link className="block truncate text-body-sm font-semibold text-foreground" href={`${basePath}/sources/detail/?id=${source.id}`}>
          {source.title}
        </Link>
        <p className="truncate text-label-sm text-text-muted">{source.file_name}</p>
      </div>
      <span className="w-36 truncate text-body-sm text-text-muted">{subject}</span>
      {/* BACKEND_GAP(library-5) file size is not on Source */}
      <span className="w-28 text-label-sm text-text-muted">{formatLabel(source)}</span>
      <div className="w-36">
        <Badge label={badge.label} tone={badge.tone} className="rounded-md" />
        {source.status === "processing" || source.status === "pending" ? (
          <ProgressBar className="mt-xs" value={parsedPercent(source)} />
        ) : null}
        {source.status === "failed" ? (
          <Button variant="quiet" className="mt-xs min-h-11 px-sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
      <span className="w-20 text-body-sm text-foreground">{cards} cards</span>
      <span className="w-28 text-label-sm text-text-muted">{formatAdded(source.created_at)}</span>
      <div className="relative">
        <Button variant="quiet" className="min-h-11 min-w-11 px-sm" aria-expanded={menuOpen} onClick={onMenu}>
          <Icon name="more_vert" size="sm" />
          <span className="sr-only">Document options</span>
        </Button>
        {menuOpen ? (
          <div className="absolute right-0 z-dropdown flex min-w-32 flex-col rounded-md border border-border bg-surface p-xs shadow-md">
            <Button variant="quiet-destructive" className="min-h-11 justify-start px-sm" onClick={onDelete} data-testid={`source-delete-${source.id}`}>
              Delete
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
