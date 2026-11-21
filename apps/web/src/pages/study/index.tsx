import Head from "next/head";

import { StudyHomeSection } from "@/sections/StudyHomeSection";

export default function StudyPage() {
  return (
    <>
      <Head>
        <title>Study</title>
      </Head>
      <StudyHomeSection />
    </>
  );
}
