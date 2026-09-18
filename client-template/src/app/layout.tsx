import { BrandThemeSync } from "@/components/BrandThemeSync";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { getContrastForeground, getFontFamilyCss } from "@/lib/utils";
import { api, type SettingsDoc } from "@cms/client-sdk";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Roboto } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const roboto = Roboto({
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const settingsRes = await api
    .get<{ settings?: SettingsDoc } | SettingsDoc>("/settings")
    .catch(() => null);
  const settings =
    settingsRes && "settings" in settingsRes && settingsRes.settings
      ? settingsRes.settings
      : (settingsRes as SettingsDoc | null);
  const siteTitle = settings?.siteTitle || "CMS Platform";
  const siteDescription =
    settings?.siteDescription ||
    "Modern headless CMS platform powered by Next.js and React Server Components.";

  return {
    title: {
      default: siteTitle,
      template: `%s | ${siteTitle}`,
    },
    description: siteDescription,
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3003"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Feature flags & settings read during SSR
  const [flags, settingsRes] = await Promise.all([
    api.get<Record<string, boolean>>("/feature-flags").catch(() => ({})),
    api.get<{ settings?: SettingsDoc } | SettingsDoc>("/settings").catch(() => null),
  ]);

  const settings =
    settingsRes && "settings" in settingsRes && settingsRes.settings
      ? settingsRes.settings
      : (settingsRes as SettingsDoc | null);

  const enableScrollAnimations = (flags as Record<string, boolean>).scrollAnimations !== false;
  const defaultTheme = (settings?.defaultTheme as "dark" | "light" | "system") || "light";
  const primaryColor = settings?.primaryColor || settings?.brandColor || "#3b82f6";
  const foregroundColor = getContrastForeground(primaryColor);
  const fontFamily = settings?.fontFamily || settings?.brandFont || "Inter";
  const fontFamilyCss = getFontFamilyCss(fontFamily);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${roboto.variable} ${
        defaultTheme === "dark" ? "dark" : ""
      }`}
    >
      <head>
        <style
          id="brand-theme-styles"
          dangerouslySetInnerHTML={{
            __html: `
              :root, .dark {
                --primary: ${primaryColor} !important;
                --color-primary: ${primaryColor} !important;
                --primary-foreground: ${foregroundColor} !important;
                --color-primary-foreground: ${foregroundColor} !important;
                --ring: ${primaryColor} !important;
                --font-family: ${fontFamilyCss};
              }
              body {
                font-family: ${fontFamilyCss} !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('theme');
                const theme = stored || '${defaultTheme}';
                let isDark = theme === 'dark';
                if (theme === 'system') {
                  isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                }
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body
        className={`antialiased min-h-screen flex flex-col bg-background text-foreground ${
          enableScrollAnimations ? "scroll-smooth" : ""
        }`}
      >
        <BrandThemeSync
          primaryColor={primaryColor}
          foregroundColor={foregroundColor}
          fontFamilyCss={fontFamilyCss}
        />
        <ThemeProvider defaultTheme={defaultTheme}>
          <Header />
          <main className={`flex-1 ${enableScrollAnimations ? "scroll-animate" : ""}`}>
            {children}
          </main>
          <Footer />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
