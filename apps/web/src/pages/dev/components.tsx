import Head from "next/head";

import { GallerySection } from "@/sections/GallerySection";

export default function ComponentsPage() {
  return (
    <>
      <Head>
        <title>Components</title>
      </Head>
      <GallerySection />
    </>
  );
}
