import Head from "next/head";
import Link from "next/link";

import { LandingFooter } from "@/components/LandingFooter";
import { LandingHeader } from "@/components/LandingHeader";
import { absoluteUrl, siteName } from "@/lib/site";

export default function TermsPage() {
  const title = `Terms — ${siteName}`;
  const description = "Placeholder terms of use for the Self Study marketing site.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={absoluteUrl("/terms/")} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={absoluteUrl("/terms/")} />
        <meta name="robots" content="noindex" />
      </Head>
      <LandingHeader />
      <main className="mx-auto max-w-[1200px] px-md py-3xl">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Terms of use (placeholder)</h1>
        <p className="mt-md text-base text-muted-foreground">
          This page is a scaffold—not legal advice. Final terms will cover acceptable use of cloud AI credits, account
          deletion, and limitations of the learning tools once reviewed.
        </p>
        <Link href="/" className="mt-lg inline-flex min-h-11 items-center text-base font-semibold text-primary">
          Back to home
        </Link>
      </main>
      <LandingFooter />
    </>
  );
}