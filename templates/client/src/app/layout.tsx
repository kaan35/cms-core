import { getInternalApiUrl } from "@/lib/config";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Headless CMS Client",
  description: "A pluggable headless CMS client website",
};

interface PageLink {
  title: string;
  slug: string;
}

interface Settings {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
}

async function getPages(): Promise<PageLink[]> {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/pages`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.pages || [];
  } catch (err) {
    console.error("Failed to fetch client layout pages navigation:", err);
    return [
      { title: "Ana Sayfa", slug: "home" },
      { title: "Hakkımızda", slug: "about" },
      { title: "İletişim", slug: "contact" },
    ];
  }
}

async function getSettings(): Promise<Settings> {
  const API_BASE = getInternalApiUrl();
  try {
    const res = await fetch(`${API_BASE}/settings`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to fetch settings");
    const data = await res.json();
    return (
      data.settings || {
        brandName: "ModularCMS",
        primaryColor: "#8b5cf6",
        secondaryColor: "#4f46e5",
      }
    );
  } catch (err) {
    console.error("Failed to fetch site settings:", err);
    return {
      brandName: "ModularCMS",
      primaryColor: "#8b5cf6",
      secondaryColor: "#4f46e5",
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [pages, settings] = await Promise.all([getPages(), getSettings()]);

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
          :root {
            --primary: ${settings.primaryColor};
            --primary-hover: ${settings.secondaryColor};
          }
        `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {/* Navigation Header */}
        <header className="sticky top-0 z-40 border-b border-card-border bg-header-bg backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link
              href="/"
              className="font-extrabold text-xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500"
            >
              {settings.brandName}
            </Link>

            <nav className="flex items-center gap-6">
              {pages.map((p) => {
                const href = p.slug === "home" ? "/" : `/${p.slug}`;
                return (
                  <Link
                    key={p.slug}
                    href={href}
                    className="text-sm font-semibold text-muted hover:text-foreground cursor-pointer transition duration-150"
                  >
                    {p.title}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Dynamic Pages Content */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* Footer */}
        <footer className="border-t border-card-border bg-background py-8 text-center text-xs text-muted">
          <div className="max-w-6xl mx-auto px-6">
            <p>
              &copy; {new Date().getFullYear()} {settings.brandName}. Built with Fastify, MongoDB, &
              Next.js.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
