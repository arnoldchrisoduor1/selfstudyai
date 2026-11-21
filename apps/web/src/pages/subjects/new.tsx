import Head from "next/head";

import { SubjectFormSection } from "@/sections/SubjectFormSection";

export default function NewSubjectPage() {
  return (
    <>
      <Head>
        <title>New subject</title>
      </Head>
      <SubjectFormSection mode="create" />
    </>
  );
}
