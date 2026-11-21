import Head from "next/head";

import { TestBuilderSection } from "@/sections/TestBuilderSection";

export default function TestBuilderPage() {
  return (
    <>
      <Head>
        <title>New test</title>
      </Head>
      <TestBuilderSection />
    </>
  );
}