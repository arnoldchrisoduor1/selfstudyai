import { absoluteUrl, defaultDescription, siteName } from "@/lib/site";

export function StructuredData() {
  const payload = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteName,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Windows, Web",
    description: defaultDescription,
    url: absoluteUrl("/"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Local use is free. Cloud AI uses prepaid credits when signed in.",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  );
}