import Head from "next/head";

import { QuizzesSection } from "@/sections/QuizzesSection";

export default function QuizzesPage() {
  return (
    <>
      <Head>
        <title>Quizzes · Self Study</title>
      </Head>
      <QuizzesSection />
    </>
  );
}
