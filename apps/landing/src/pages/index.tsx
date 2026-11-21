import Head from "next/head";

import { LandingFooter } from "@/components/LandingFooter";
import { LandingHeader } from "@/components/LandingHeader";
import { StructuredData } from "@/components/StructuredData";
import { DownloadCtaSection } from "@/sections/DownloadCtaSection";
import { FaqSection } from "@/sections/FaqSection";
import { FeatureHighlightsSection } from "@/sections/FeatureHighlightsSection";
import { HeroSection } from "@/sections/HeroSection";
import { HowItWorksSection } from "@/sections/HowItWorksSection";
import { LocalFirstSection } from "@/sections/LocalFirstSection";
import { PricingSection } from "@/sections/PricingSection";
import { ProductPreviewSection } from "@/sections/ProductPreviewSection";
import { absoluteUrl, defaultDescription, siteName } from "@/lib/site";

export default function HomePage() {
  const title = `${siteName} — local-first study from your sources`;
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={defaultDescription} />
        <link rel="canonical" href={absoluteUrl("/")} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={defaultDescription} />
        <meta property="og:url" content={absoluteUrl("/")} />
        <meta property="og:site_name" content={siteName} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={defaultDescription} />
      </Head>
      <StructuredData />
      <LandingHeader />
      <main data-testid="landing-home">
        <HeroSection />
        <HowItWorksSection />
        <FeatureHighlightsSection />
        <ProductPreviewSection />
        <LocalFirstSection />
        <PricingSection />
        <FaqSection />
        <DownloadCtaSection />
      </main>
      <LandingFooter />
    </>
  );
}