import Head from "next/head";
import Link from "next/link";

import { LandingFooter } from "@/components/LandingFooter";
import { LandingHeader } from "@/components/LandingHeader";
import { absoluteUrl, siteName } from "@/lib/site";

export default function PrivacyPage() {
  const title = `Privacy — ${siteName}`;
  const description = "Placeholder privacy policy for the Self Study marketing site.";

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={absoluteUrl("/privacy/")} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={absoluteUrl("/privacy/")} />
        <meta name="robots" content="noindex" />
      </Head>
      <LandingHeader />
      <main className="mx-auto max-w-[1200px] px-md py-3xl">
        <h1 className="font-heading text-3xl font-semibold text-foreground">Privacy policy (placeholder)</h1>
        <p className="mt-md text-base text-muted-foreground">
          This page is a scaffold—not legal advice. A full policy will describe what the API and apps store (SQLite or
          Postgres), optional cloud sync, credits usage events, and contact details once reviewed.
        </p>
        <Link href="/" className="mt-lg inline-flex min-h-11 items-center text-base font-semibold text-primary">
          Back to home
        </Link>
      </main>
      <LandingFooter />
    </>
  );
}