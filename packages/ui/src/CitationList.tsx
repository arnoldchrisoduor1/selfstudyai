import { cn } from "./cn";

export interface CitationListProps {
  citations: {
    type?: string;
    chunk_ids?: string[];
    url?: string;
    excerpt?: string;
  };
  className?: string;
  "data-testid"?: string;
}

export function CitationList({ citations, className, ...props }: CitationListProps) {
  const isOnline = citations.type === "online" || Boolean(citations.url);
  return (
    <div data-testid={props["data-testid"]} className={cn("flex flex-col gap-sm text-sm", className)}>
      <span className="font-semibold text-foreground">Citations</span>
      {isOnline ? (
        <div className="text-muted-foreground">
          <p className="break-all text-foreground">{citations.url}</p>
          <p>{citations.excerpt}</p>
        </div>
      ) : (
        <ul className="list-disc pl-md text-muted-foreground">
          {(citations.chunk_ids ?? []).map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
