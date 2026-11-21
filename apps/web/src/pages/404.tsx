import Head from "next/head";
import { useRouter } from "next/router";

import { Button } from "@self-study/ui/Button";
import { PageHeader } from "@self-study/ui/PageHeader";

import { LostShelf } from "@/components/LostShelf";
import { basePath } from "@/lib/nav";

export default function NotFoundPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Page not found · Self Study</title>
      </Head>
      <section className="flex w-full min-w-0 flex-col gap-lg" data-testid="not-found">
        <LostShelf />
        <PageHeader
          eyebrow="Note from the Self Study team"
          title="Page not found"
          description="We walked the shelves and the card box. This address was never filed. Your notes, reviews, and streak are still where you left them."
          actions={
            <>
              <Button onClick={() => router.push(`${basePath}/overview/`)}>Back to Overview</Button>
              <Button variant="secondary" onClick={() => router.back()}>
                Go back
              </Button>
            </>
          }
        />
        <p className="text-label-sm text-text-muted">— The Self Study team</p>
      </section>
    </>
  );
}
