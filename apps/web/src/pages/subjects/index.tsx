import Head from "next/head";

import { SubjectsSection } from "@/sections/SubjectsSection";

export default function SubjectsPage() {
  return (
    <>
      <Head>
        <title>Subjects</title>
      </Head>
      <SubjectsSection />
    </>
  );
}
