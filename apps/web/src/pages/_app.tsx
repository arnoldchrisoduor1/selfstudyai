import type { AppProps } from "next/app";
import { Lexend, Source_Sans_3 } from "next/font/google";
import { useRouter } from "next/router";

import { AppShell } from "@self-study/ui/AppShell";
import { ToastProvider } from "@self-study/ui/ToastProvider";

import { NavIcon } from "@/components/NavIcon";
import { ShellTopBar } from "@/components/ShellTopBar";
import { basePath, navItems } from "@/lib/nav";
import "@/styles/globals.css";

const heading = Lexend({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const items = navItems.map((item) => ({
    ...item,
    icon: <NavIcon href={item.href} basePath={basePath} />,
    current: router.asPath.startsWith(item.href.slice(basePath.length)),
  }));

  return (
    <div className={`${heading.variable} ${body.variable} min-h-screen bg-background font-sans text-foreground`}>
      <ToastProvider>
        <AppShell title="Self Study" items={items} header={<ShellTopBar />}>
          <Component {...pageProps} />
        </AppShell>
      </ToastProvider>
    </div>
  );
}
