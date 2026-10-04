import { api, extractData, type PageDoc, type SettingsDoc } from "@cms/client-sdk";
import {
  BookOpen,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Home,
  Mail,
  Shield,
  Sparkles,
  Star,
  User,
} from "lucide-react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Home,
  BookOpen,
  Mail,
  Sparkles,
  Star,
  Flame,
  Compass,
  Shield,
  User,
  Globe,
};

export async function Header() {
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
  const rawMenuItems =
    Array.isArray(settings?.headerMenu) && settings.headerMenu.length > 0
      ? settings.headerMenu
      : [
          { id: "default-home", label: "Home", url: "/", type: "custom" as const, external: false },
          {
            id: "default-blog",
            label: "Blog",
            url: "/blog",
            type: "blog" as const,
            external: false,
          },
        ];

  // Dynamic Sync: If a page is bound and customLabel is not set, sync with current page title and slug
  const menuItems = rawMenuItems.map((item) => {
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
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground hover:opacity-90 transition-opacity"
        >
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-sm">
            <Sparkles className="size-4" />
          </div>
          <span>{siteTitle}</span>
        </Link>

        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-5 text-sm font-medium">
            {menuItems.map((item) => {
              const isButton = item.style === "button";
              const IconComp = item.icon ? ICON_MAP[item.icon] : null;

              const content = (
                <>
                  {IconComp && <IconComp className="size-4 shrink-0" />}
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide inline-flex items-center justify-center leading-none ml-1 ${
                        isButton
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/10 text-primary border border-primary/20"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.external && <ExternalLink className="size-3 opacity-60 ml-0.5" />}
                </>
              );

              const linkClasses = isButton
                ? "inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 cursor-pointer"
                : "text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5";

              if (item.external) {
                return (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={linkClasses}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <Link key={item.id} href={item.url} className={linkClasses}>
                  {content}
                </Link>
              );
            })}
          </nav>

          <div className="pl-2 border-l border-border/60">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
