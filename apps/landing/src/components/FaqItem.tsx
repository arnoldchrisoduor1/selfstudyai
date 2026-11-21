import { cn } from "@self-study/ui/cn";

export interface FaqItemProps {
  question: string;
  answer: string;
  className?: string;
}

export function FaqItem({ question, answer, className }: FaqItemProps) {
  return (
    <details className={cn("group rounded-md border border-border bg-card p-md", className)}>
      <summary className="cursor-pointer list-none font-semibold text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        {question}
      </summary>
      <p className="mt-sm text-base text-muted-foreground">{answer}</p>
    </details>
  );
}