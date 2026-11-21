import Head from "next/head";
import { useRouter } from "next/router";

import { ErrorState } from "@self-study/ui/ErrorState";
import { Loader } from "@self-study/ui/Loader";

import { SourceDetailSection } from "@/sections/SourceDetailSection";

export default function SourceDetailPage() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";

  return (
    <>
      <Head>
        <title>Source · Self Study</title>
      </Head>
      {!router.isReady ? <Loader label="Loading" /> : null}
      {router.isReady && !id ? (
        <ErrorState title="Missing source" message="Open a source from the library." />
      ) : null}
      {router.isReady && id ? <SourceDetailSection sourceId={id} /> : null}
    </>
  );
}
