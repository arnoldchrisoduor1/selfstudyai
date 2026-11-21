import Head from "next/head";
import { useRouter } from "next/router";

import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";

import { StudySessionSection } from "@/sections/StudySessionSection";

export default function StudySessionPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  return (
    <>
      <Head>
        <title>Study session</title>
      </Head>
      {!router.isReady ? <Loader label="Loading" /> : null}
      {router.isReady && !id ? (
        <ErrorState title="Missing session" message="Start a session from Study." />
      ) : null}
      {router.isReady && id ? <StudySessionSection sessionId={id} /> : null}
    </>
  );
}
