import type { Metadata } from "next";
import { HeaderNav } from "@/components/header-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusTrade - campus student marketplace",
  description:
    "Buy, sell and donate within your college community. Verified student accounts only.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-surface focus:px-3 focus:py-2 focus:text-accent"
        >
          Skip to main content
        </a>
        <HeaderNav />
        {children}
        <footer className="border-t border-line bg-surface py-4 text-center text-sm text-ink-muted">
          CampusTrade - arrange payment and collection directly with the other student.
        </footer>
      </body>
    </html>
  );
}
