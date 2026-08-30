import { api, extractData, type SettingsDoc } from "@cms/client-sdk";
import type { PageDoc } from "@cms/plugin-pages-api";
import { Heart, Sparkles } from "lucide-react";
import Link from "next/link";

export async function Footer() {
  const [settingsRes, pagesRes] = await Promise.all([
    api.get<{ settings?: SettingsDoc } | SettingsDoc>("/settings").catch(() => null),
    api
      .get<{ data?: PageDoc[] } | PageDoc[]>("/pages", { params: { status: "published" } })
      .catch(() => []),
  ]);

  const settings =
    settingsRes && "settings" in settingsRes && settingsRes.settings
      ? settingsRes.settings
      : (settingsRes as SettingsDoc | null);

  const publishedPages = extractData<PageDoc>(pagesRes);

  const siteTitle = settings?.siteTitle || "CMS";
  const footerText = settings?.footerText || `© ${new Date().getFullYear()} All rights reserved.`;

  const rawFooterMenu = settings?.footerMenu;

  // Auto-sync page titles and slugs if customLabel is not explicitly true
  const footerMenu = Array.isArray(rawFooterMenu)
    ? rawFooterMenu.map((item) => {
        if (item.type === "page" && item.pageId) {
          const matchedPage = publishedPages.find((p) => p.id === item.pageId);
          if (matchedPage) {
            return {
              ...item,
              label: item.customLabel ? item.label : matchedPage.title,
              url: `/${matchedPage.slug.replace(/^\//, "")}`,
            };
          }
        }
        return item;
      })
    : [];

  return (
    <footer className="border-t border-border/80 bg-card/40 py-12 text-sm text-muted-foreground">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-semibold text-foreground">{siteTitle}</span>
            <span className="text-xs">{footerText}</span>
          </div>

          <div className="flex items-center gap-6 text-xs flex-wrap">
            {footerMenu.length > 0 ? (
              footerMenu.map((item) => {
                if (item.external) {
                  return (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-foreground transition-colors"
                    >
                      {item.label}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.id}
                    href={item.url}
                    className="hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                );
              })
            ) : (
              <>
                <Link href="/" className="hover:text-foreground transition-colors">
                  Home
                </Link>
                <Link href="/blog" className="hover:text-foreground transition-colors">
                  Blog
                </Link>
                <Link href="/sitemap.xml" className="hover:text-foreground transition-colors">
                  Sitemap
                </Link>
                <Link href="/robots.txt" className="hover:text-foreground transition-colors">
                  Robots
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Powered by</span>
            <span className="font-semibold text-foreground">CMS Core</span>
            <Heart className="size-3 text-red-500 fill-red-500" />
          </div>
        </div>
      </div>
    </footer>
  );
}
