import { cn } from "@self-study/ui/cn";

const MARK = [
  "...........qqq..........",
  "..........q...q.........",
  ".............q..........",
  "............q...........",
  "........................",
  "............q...........",
];

const SCENE = [
  ".bbb..bbb..xxx..bbb.bbb.",
  ".bpb..bpb..xxx..bpb.bpb.",
  ".bbb..bbb..xxx..bbb.bbb.",
  "hhhhhhhhhhhhhhhhhhhhhhhh",
  "........................",
  "..........kkkk..........",
  ".........kffffk.........",
  ".........kfefek.........",
  ".........kffffk.........",
  "..........ffff..........",
  "........cccccccc........",
  "........cc.dd.cc........",
  "........cccccccc........",
  ".........cccccc.........",
  ".........c....c.........",
  ".........c....c.........",
];

const PAINT: Record<string, string> = {
  q: "bg-primary",
  b: "bg-status-review",
  p: "bg-surface",
  h: "bg-secondary",
  k: "bg-text",
  f: "bg-primary-subtle",
  e: "bg-text",
  c: "bg-primary",
  d: "bg-status-weak",
  x: "bg-primary not-found-ghost",
};

function Pixels({ rows }: { rows: string[] }) {
  return (
    <div className="grid w-max [grid-template-columns:repeat(24,var(--space-sm))] md:[grid-template-columns:repeat(24,var(--space-md))]">
      {rows.join("").split("").map((cell, index) => (
        <span key={index} className={cn("relative aspect-square", PAINT[cell])}>
          {cell === "e" ? <span className="not-found-blink absolute inset-0 bg-primary-subtle" /> : null}
        </span>
      ))}
    </div>
  );
}

export function LostShelf() {
  return (
    <div
      className="w-max max-w-full overflow-hidden rounded-lg border border-border bg-surface-dim p-lg"
      role="img"
      aria-label="Pixel drawing of a student under a bookshelf. One book is missing."
      data-testid="not-found-art"
    >
      <style>{`
        @keyframes not-found-bob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(calc(var(--space-sm) * -1)); }
        }
        @keyframes not-found-blink {
          0%, 92%, 100% { opacity: 0; }
          94%, 97% { opacity: 1; }
        }
        @keyframes not-found-ghost {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.95; }
        }
        .not-found-bob { animation: not-found-bob 2.4s var(--ease-standard) infinite; }
        .not-found-blink { animation: not-found-blink 3.6s linear infinite; }
        .not-found-ghost { animation: not-found-ghost 2.8s var(--ease-standard) infinite; }
      `}</style>
      <div className="not-found-bob">
        <Pixels rows={MARK} />
      </div>
      <Pixels rows={SCENE} />
    </div>
  );
}
