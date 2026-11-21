import Head from "next/head";

import { SettingsSection } from "@/sections/SettingsSection";

export default function SettingsPage() {
  return (
    <>
      <Head>
        <title>Settings · Self Study</title>
      </Head>
      <SettingsSection />
    </>
  );
}
