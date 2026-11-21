export interface NavItem {
  href: string;
  label: string;
}

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export const navItems: NavItem[] = [
  { href: `${basePath}/overview/`, label: "Overview" },
  { href: `${basePath}/subjects/`, label: "Subjects" },
  { href: `${basePath}/sources/`, label: "Library" },
  { href: `${basePath}/quizzes/`, label: "Quizzes" },
  { href: `${basePath}/study/`, label: "Reviews" },
  { href: `${basePath}/tests/`, label: "Final Tests" },
  { href: `${basePath}/analytics/`, label: "Analytics" },
  { href: `${basePath}/settings/`, label: "Settings" },
  { href: `${basePath}/dev/components/`, label: "Components" },
];
