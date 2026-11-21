import Head from "next/head";

import { OverviewSection } from "@/sections/OverviewSection";

export default function OverviewPage() {
  return (
    <>
      <Head>
        <title>Overview</title>
      </Head>
      <OverviewSection />
    </>
  );
}