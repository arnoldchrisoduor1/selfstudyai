import Head from "next/head";

import { SubjectFormSection } from "@/sections/SubjectFormSection";

export default function EditSubjectPage() {
  return (
    <>
      <Head>
        <title>Edit subject</title>
      </Head>
      <SubjectFormSection mode="edit" />
    </>
  );
}
