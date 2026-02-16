import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "NT Craft Planner",
  description: "Quest material calculator with recursive crafting",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="app-header">
          <h1>NT Craft Planner</h1>
          <nav>
            <Link href="/">Viewer</Link>
            <Link href="/admin">Admin</Link>
            <Link href="/admin/list">Admin List</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
