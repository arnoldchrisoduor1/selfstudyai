import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const roots = ["apps/web/src", "apps/landing/src", "packages/ui"];
const allowed = new Set([path.normalize("packages/ui/tokens.css")]);
const extensions = new Set([".tsx", ".ts", ".css"]);
const hex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/g;

const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === "node_modules") continue;
      walk(full);
      continue;
    }
    if (!extensions.has(path.extname(full))) continue;
    const rel = path.normalize(full);
    if (allowed.has(rel)) continue;
    const text = readFileSync(full, "utf8");
    const lines = text.split(/\r?\n/);
    lines.forEach((line, index) => {
      hex.lastIndex = 0;
      if (hex.test(line)) hits.push(`${rel}:${index + 1}: ${line.trim()}`);
    });
  }
}

for (const root of roots) walk(root);

if (hits.length > 0) {
  console.error("Hard-coded hex in components. Use packages/ui/tokens.css variables.");
  for (const hit of hits) console.error(hit);
  process.exit(1);
}

console.log("check-no-hex: ok");
