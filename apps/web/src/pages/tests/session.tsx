import Head from "next/head";
import { useRouter } from "next/router";

import { ErrorState } from "@self-study/ui/ErrorState";

import { TestSessionSection } from "@/sections/TestSessionSection";

export default function TestSessionPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  return (
    <>
      <Head>
        <title>Test session</title>
      </Head>
      {!id ? (
        <ErrorState title="Missing test" message="Open a test from history." />
      ) : (
        <TestSessionSection testId={id} />
      )}
    </>
  );
}