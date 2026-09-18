import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "@/styles/globals.css";

// The Vietnamese subset is kept because projects built from this base target Vietnamese
// content, and a font without it renders diacritics from a fallback at a different weight.
const sans = Inter({
  variable: "--font-sans-family",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const mono = JetBrains_Mono({
  variable: "--font-mono-family",
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Text Share",
  description:
    "Share text, JSON, XML, HTML or Markdown as a link — in the URL itself, or as a short link with an expiry.",
};

// Runs before first paint so a returning visitor's dark theme does not flash light. The class
// on <html> is what styles/theme.css keys its palettes off.
const THEME_SCRIPT = `try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme:dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The theme script below adds `dark` to this element before React hydrates, so its class
    // is meant to differ from the server's. Suppression applies to this element only.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
