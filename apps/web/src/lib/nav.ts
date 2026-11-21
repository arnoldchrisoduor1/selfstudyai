export interface NavItem {
  href: string;
  label: string;
}

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const navItems: NavItem[] = [
  { href: `${basePath}/overview/`, label: "Overview" },
  { href: `${basePath}/subjects/`, label: "Subjects" },
  { href: `${basePath}/sources/`, label: "Sources" },
  { href: `${basePath}/study/`, label: "Study" },
  { href: `${basePath}/tests/`, label: "Tests" },
  { href: `${basePath}/questions/`, label: "Questions" },
  { href: `${basePath}/questions/gold/`, label: "Gold" },
  { href: `${basePath}/search/`, label: "Search" },
  { href: `${basePath}/credits/`, label: "Credits" },
  { href: `${basePath}/settings/`, label: "Settings" },
  { href: `${basePath}/dev/components/`, label: "Components" },
];
