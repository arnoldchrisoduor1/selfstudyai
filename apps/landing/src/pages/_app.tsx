import type { AppProps } from "next/app";
import { Inter, JetBrains_Mono } from "next/font/google";

import { ToastProvider } from "@self-study/ui/ToastProvider";

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
  return (
    <div className={`${sans.variable} ${mono.variable} min-h-screen bg-background font-sans text-foreground`}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </div>
  );
}
