import Head from "next/head";

import { TestHistorySection } from "@/sections/TestHistorySection";

export default function TestHistoryPage() {
  return (
    <>
      <Head>
        <title>Final Tests · Self Study</title>
      </Head>
      <TestHistorySection />
    </>
  );
}