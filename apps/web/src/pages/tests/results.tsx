import Head from "next/head";
import { useRouter } from "next/router";

import { ErrorState } from "@self-study/ui/ErrorState";

import { TestResultsSection } from "@/sections/TestResultsSection";

export default function TestResultsPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  return (
    <>
      <Head>
        <title>Test results</title>
      </Head>
      {!id ? (
        <ErrorState title="Missing test" message="Open results from history." />
      ) : (
        <TestResultsSection testId={id} />
      )}
    </>
  );
}