export const siteName = "Self Study";

export const siteOrigin = process.env.NEXT_PUBLIC_LANDING_ORIGIN ?? "http://127.0.0.1:3001";

export const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

export const defaultDescription =
  "Local-first study from your notes and books: ingest, search, AI questions, FSRS review, tests, and optional cloud sync with prepaid credits.";

export function absoluteUrl(path: string): string {
  const trimmed = path.startsWith("/") ? path : `/${path}`;
  const base = siteOrigin.replace(/\/$/, "");
  return `${base}${trimmed}`;
}