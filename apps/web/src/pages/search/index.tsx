import Head from "next/head";

import { SearchSection } from "@/sections/SearchSection";

export default function SearchPage() {
  return (
    <>
      <Head>
        <title>Search · Self Study</title>
      </Head>
      <SearchSection />
    </>
  );
}
