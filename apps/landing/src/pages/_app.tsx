import type { AppProps } from "next/app";
import { Lexend, Source_Sans_3 } from "next/font/google";

import { ToastProvider } from "@self-study/ui/ToastProvider";

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
  return (
    <div className={`${heading.variable} ${body.variable} min-h-screen bg-background font-sans text-foreground`}>
      <ToastProvider>
        <Component {...pageProps} />
      </ToastProvider>
    </div>
  );
}
