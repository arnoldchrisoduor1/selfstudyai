import Head from "next/head";

import { CreditsSection } from "@/sections/CreditsSection";

export default function CreditsPage() {
  return (
    <>
      <Head>
        <title>Credits · Self Study</title>
      </Head>
      <CreditsSection />
    </>
  );
}