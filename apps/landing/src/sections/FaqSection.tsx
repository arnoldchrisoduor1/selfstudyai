import { FaqItem } from "@/components/FaqItem";
import { SectionHeading } from "@/components/SectionHeading";

const faqs = [
  {
    q: "Do I need an account?",
    a: "No. Subjects, sources, study, FSRS, and tests work against a local SQLite database. Accounts unlock sync, cloud export scope, and cloud AI credits.",
  },
  {
    q: "Where do my files go?",
    a: "Original uploads are stored under FILES_DIR on the API host (app data on desktop). Chunk text and embeddings stay in the database.",
  },
  {
    q: "How does cloud AI differ from my own API keys?",
    a: "Your keys power generation when you configure providers. Cloud AI uses platform keys on the server and spends prepaid credits—only when CLOUD_AI_API_KEY is configured and you are signed in.",
  },
  {
    q: "Can I pay with a card today?",
    a: "No. Phase 5 includes MockPaymentProvider and an admin credit adjust endpoint. Real Stripe or M-Pesa integration is documented as future work.",
  },
  {
    q: "What happens when two devices edit the same record?",
    a: "Editable entities use last-write-wins by version. Append-only tables merge by id. Review schedules recompute from merged review logs.",
  },
  {
    q: "Is there CI for releases?",
    a: "Not yet. Builds and tests are run manually per README. CI/CD is explicitly out of scope for Phase 5.",
  },
  {
    q: "Which desktop platforms are verified?",
    a: "Windows is the first target in Phase 5 planning. macOS and Linux configs exist but are marked unverified in project docs.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="py-3xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2xl px-md">
        <SectionHeading
          id="faq-title"
          eyebrow="FAQ"
          title="Common questions"
          description="Straight answers tied to implemented behavior—not a support SLA."
        />
        <div className="flex flex-col gap-sm">
          {faqs.map((item) => (
            <FaqItem key={item.q} question={item.q} answer={item.a} />
          ))}
        </div>
      </div>
    </section>
  );
}