import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  overview: (
    <path
      d="M3.5 10.5 10 4l6.5 6.5M5 9v6.5h3.5V12h3v3.5H15V9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  subjects: (
    <path
      d="M4 5.5h5.5v5.5H4V5.5Zm6.5 0H16v5.5h-5.5V5.5ZM4 12h5.5v5.5H4V12Zm6.5 0H16v5.5h-5.5V12Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  sources: (
    <path
      d="M6 4.5h8.5A1.5 1.5 0 0 1 16 6v11.5H6.5A1.5 1.5 0 0 1 5 16V5.5A1 1 0 0 1 6 4.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  study: (
    <>
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 6.5V10l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  tests: (
    <path
      d="M7 4.5h6l3 3V15.5H7V4.5Zm6 0v3h3M8.5 10h5M8.5 13h3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  questions: (
    <path
      d="M10 14.5h.01M7.5 7.75A2.75 2.75 0 0 1 10 5.5a2.5 2.5 0 0 1 2.5 2.5c0 1.5-2.5 2-2.5 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  gold: (
    <path
      d="m10 3.5 1.7 3.45 3.8.55-2.75 2.68.65 3.8L10 12.2l-3.4 1.78.65-3.8L4.5 7.5l3.8-.55L10 3.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
  search: (
    <path
      d="m14 14-2.5-2.5m1-3.25a4.25 4.25 0 1 1-8.5 0 4.25 4.25 0 0 1 8.5 0Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  credits: (
    <path
      d="M10 4.5v11M7.5 7.5c.6-1 1.5-1.5 2.5-1.5 1.7 0 3 1 3 2.5S11.7 11 10 11s-3 1-3 2.5 1.3 2.5 3 2.5c1 0 1.9-.5 2.5-1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  ),
  settings: (
    <path
      d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7-2.5-.9-2.1 1.1-2-2-1.1L14.1 3.9 12 3l-2.1.9-2.1-.9-1.1 2.1-2 .9.9 2.1L3 10l.9 2.1-.9 2 2 1.1 1.1 2.1L10 17l2.1-.9 2.1.9 1.1-2.1 2-.9-.9-2.1L17 10Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
  ),
  components: (
    <path
      d="M4.5 7.5 10 4l5.5 3.5v5L10 16l-5.5-3.5v-5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  ),
};

const byHrefSuffix: Record<string, keyof typeof paths> = {
  "/overview/": "overview",
  "/subjects/": "subjects",
  "/sources/": "sources",
  "/study/": "study",
  "/tests/": "tests",
  "/questions/": "questions",
  "/questions/gold/": "gold",
  "/search/": "search",
  "/credits/": "credits",
  "/settings/": "settings",
  "/dev/components/": "components",
};

export interface NavIconProps {
  href: string;
  basePath?: string;
}

export function NavIcon({ href, basePath = "" }: NavIconProps) {
  const path = href.startsWith(basePath) ? href.slice(basePath.length) : href;
  const key = byHrefSuffix[path] ?? byHrefSuffix[`/${path.replace(/^\//, "")}`];
  const content = (key && paths[key]) || paths.components;

  return (
    <svg viewBox="0 0 20 20" fill="none" width="20" height="20" aria-hidden="true">
      {content}
    </svg>
  );
}
