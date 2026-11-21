import Head from "next/head";

import { QuestionBankSection } from "@/sections/QuestionBankSection";

export default function QuestionsPage() {
  return (
    <>
      <Head>
        <title>Question bank</title>
      </Head>
      <QuestionBankSection />
    </>
  );
}
