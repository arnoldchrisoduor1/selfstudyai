import { Icon } from "@self-study/ui/Icon";

const names: Record<string, string> = {
  overview: "dashboard",
  subjects: "menu_book",
  sources: "folder_copy",
  quizzes: "quiz",
  study: "history_edu",
  tests: "assignment_turned_in",
  analytics: "analytics",
  settings: "settings",
  dev: "widgets",
};

export function NavIcon({ href, basePath }: { href: string; basePath: string }) {
  const path = href.slice(basePath.length).replace(/^\/|\/$/g, "");
  const name = names[path.split("/")[0] ?? ""] ?? "circle";
  return <Icon name={name} size="sm" />;
}
