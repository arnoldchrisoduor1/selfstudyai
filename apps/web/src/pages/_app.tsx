import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { AppShell } from "@self-study/ui/AppShell";
import { ToastProvider } from "@self-study/ui/ToastProvider";

import { NavIcon } from "@/components/NavIcon";
import { ShellTopBar } from "@/components/ShellTopBar";
import { getDashboard } from "@/lib/api-client";
import { basePath, navItems } from "@/lib/nav";
import "@/styles/globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-loaded",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [due, setDue] = useState<number | null>(null);
  const path = router.asPath.split("?")[0] ?? "";
  const currentHref = navItems
    .map((item) => item.href)
    .filter((href) => path === href || path.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    let live = true;
    getDashboard()
      .then((data) => {
        if (live) setDue(data.due_today);
      })
      .catch(() => {
        if (live) setDue(null);
      });
    return () => {
      live = false;
    };
  }, [path]);

  const items = navItems.map((item) => ({
    ...item,
    icon: <NavIcon href={item.href} basePath={basePath} />,
    current: item.href === currentHref,
    badge: item.href.endsWith("/study/") && due !== null && due > 0 ? String(due) : undefined,
  }));

  return (
    <div className={`${sans.variable} ${mono.variable} min-h-screen bg-background font-sans text-foreground`}>
      <ToastProvider>
        <AppShell title="Self-Study AI" items={items} header={<ShellTopBar />}>
          <Component {...pageProps} />
        </AppShell>
      </ToastProvider>
    </div>
  );
}
