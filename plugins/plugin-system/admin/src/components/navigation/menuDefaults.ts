import type { NavigationMenuItem } from "@cms/plugin-system-api";

export interface SettingsResponse {
  settings: {
    siteTitle: string;
    siteDescription: string;
    brandColor: string;
    brandFont: string;
    primaryColor: string;
    fontFamily: string;
    defaultTheme: string;
    footerText: string;
    headerMenu: NavigationMenuItem[];
    footerMenu: NavigationMenuItem[];
    allowRegistration: boolean;
    sessionTimeoutMinutes: number;
  };
}

export interface PublishedPage {
  id: string;
  title: string;
  slug: string;
  status: string;
}

export interface EffectiveMenuItem extends NavigationMenuItem {
  pageTitle?: string | undefined;
  isSynced: boolean;
}

export function createDefaultHeaderMenu(
  publishedPages: PublishedPage[] = [],
): NavigationMenuItem[] {
  return [
    {
      id: crypto.randomUUID(),
      label: "Home",
      url: "/",
      type: "custom",
      style: "link",
      icon: "Home",
    },
    {
      id: crypto.randomUUID(),
      label: "Blog",
      url: "/blog",
      type: "blog",
      style: "link",
      icon: "BookOpen",
    },
    ...publishedPages.map((p) => ({
      id: crypto.randomUUID(),
      label: p.title,
      url: `/${p.slug.replace(/^\//, "")}`,
      type: "page" as const,
      pageId: p.id,
      customLabel: false,
      style: "link" as const,
      external: false,
    })),
  ];
}

export function createDefaultFooterMenu(
  publishedPages: PublishedPage[] = [],
): NavigationMenuItem[] {
  return [
    { id: crypto.randomUUID(), label: "Home", url: "/", type: "custom", style: "link" },
    { id: crypto.randomUUID(), label: "Blog", url: "/blog", type: "blog", style: "link" },
    ...publishedPages.map((p) => ({
      id: crypto.randomUUID(),
      label: p.title,
      url: `/${p.slug.replace(/^\//, "")}`,
      type: "page" as const,
      pageId: p.id,
      customLabel: false,
      style: "link" as const,
      external: false,
    })),
  ];
}

export function createPresetMenuItem(route: string): NavigationMenuItem | null {
  if (route === "/blog") {
    return {
      id: crypto.randomUUID(),
      label: "Blog",
      url: "/blog",
      type: "blog",
      icon: "BookOpen",
      style: "link",
      external: false,
    };
  }
  if (route === "/") {
    return {
      id: crypto.randomUUID(),
      label: "Home",
      url: "/",
      type: "custom",
      icon: "Home",
      style: "link",
      external: false,
    };
  }
  if (route === "/dashboard") {
    return {
      id: crypto.randomUUID(),
      label: "Admin Portal",
      url: "/dashboard",
      type: "custom",
      icon: "Compass",
      style: "link",
      external: true,
    };
  }
  return null;
}
