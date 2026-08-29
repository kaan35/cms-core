"use client";

import {
  apiClient,
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
  useApi,
  useSaveShortcut,
} from "@cms/admin-shell";
import type { NavigationMenuItem } from "@cms/plugin-system-api";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Compass,
  ExternalLink,
  Flame,
  Globe,
  Home,
  Layers,
  Mail,
  Menu,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Star,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import * as React from "react";

const AVAILABLE_ICONS = [
  { id: "none", label: "No Icon", icon: null },
  { id: "Home", label: "Home", icon: Home },
  { id: "BookOpen", label: "Blog / Book", icon: BookOpen },
  { id: "Mail", label: "Contact / Mail", icon: Mail },
  { id: "Sparkles", label: "Sparkles", icon: Sparkles },
  { id: "Star", label: "Star", icon: Star },
  { id: "Flame", label: "Flame / Hot", icon: Flame },
  { id: "Compass", label: "Compass", icon: Compass },
  { id: "Shield", label: "Shield", icon: Shield },
  { id: "User", label: "User", icon: User },
  { id: "Globe", label: "Globe", icon: Globe },
];

function getIconComponent(iconName?: string) {
  if (!iconName || iconName === "none") return null;
  const match = AVAILABLE_ICONS.find((i) => i.id === iconName);
  return match ? match.icon : null;
}

interface SettingsResponse {
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

export function NavigationManager() {
  const { data, isLoading, mutate } = useApi<SettingsResponse>("/api/settings");
  const settings = data?.settings;

  const { data: rawPages } = useApi<{
    data?: Array<{ id: string; title: string; slug: string; status: string }>;
    items?: Array<{ id: string; title: string; slug: string; status: string }>;
  }>("/api/pages?status=published");

  const publishedPages = React.useMemo(() => {
    if (!rawPages) return [];
    if (Array.isArray(rawPages.data)) return rawPages.data;
    if (Array.isArray(rawPages.items)) return rawPages.items;
    return [];
  }, [rawPages]);

  const [activeLocation, setActiveLocation] = React.useState<"header" | "footer">("header");
  const [headerMenu, setHeaderMenu] = React.useState<NavigationMenuItem[]>([]);
  const [footerMenu, setFooterMenu] = React.useState<NavigationMenuItem[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);

  // Initialize menus from settings
  React.useEffect(() => {
    if (settings) {
      setHeaderMenu(
        Array.isArray(settings.headerMenu) && settings.headerMenu.length > 0
          ? settings.headerMenu
          : [
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
            ],
      );
      setFooterMenu(
        Array.isArray(settings.footerMenu) && settings.footerMenu.length > 0
          ? settings.footerMenu
          : [],
      );
    }
  }, [settings]);

  const currentMenu = activeLocation === "header" ? headerMenu : footerMenu;
  const setCurrentMenu = activeLocation === "header" ? setHeaderMenu : setFooterMenu;

  const [selectedPageId, setSelectedPageId] = React.useState<string>("");
  const [selectedPresetRoute, setSelectedPresetRoute] = React.useState<string>("");

  // Helper to get effective item label & url with dynamic page sync
  const getEffectiveItem = React.useCallback(
    (item: NavigationMenuItem) => {
      if (item.type === "page" && item.pageId) {
        const matched = publishedPages.find((p) => p.id === item.pageId);
        if (matched) {
          return {
            ...item,
            label: item.customLabel ? item.label : matched.title,
            url: `/${matched.slug.replace(/^\//, "")}`,
            pageTitle: matched.title,
            isSynced: !item.customLabel,
          };
        }
      }
      return {
        ...item,
        pageTitle: undefined,
        isSynced: false,
      };
    },
    [publishedPages],
  );

  // Add Handlers
  const handleAddCustomLink = () => {
    const newItem: NavigationMenuItem = {
      id: crypto.randomUUID(),
      label: "New Link",
      url: "/",
      type: "custom",
      style: "link",
      external: false,
    };
    setCurrentMenu((prev) => [...prev, newItem]);
  };

  const handleAddPage = (page: { id: string; title: string; slug: string }) => {
    const newItem: NavigationMenuItem = {
      id: crypto.randomUUID(),
      label: page.title,
      url: `/${page.slug.replace(/^\//, "")}`,
      type: "page",
      pageId: page.id,
      customLabel: false, // Default to auto-sync with page title!
      style: "link",
      external: false,
    };
    setCurrentMenu((prev) => [...prev, newItem]);
  };

  const handleAddSelectedPage = () => {
    if (!selectedPageId) return;
    const page = publishedPages.find((p) => p.id === selectedPageId);
    if (!page) return;
    handleAddPage(page);
    setSelectedPageId("");
    toast.success(`Added "${page.title}" to menu (auto-sync enabled)`);
  };

  const handleAddBlog = () => {
    const newItem: NavigationMenuItem = {
      id: crypto.randomUUID(),
      label: "Blog",
      url: "/blog",
      type: "blog",
      icon: "BookOpen",
      style: "link",
      external: false,
    };
    setCurrentMenu((prev) => [...prev, newItem]);
  };

  const handleAddSelectedPreset = () => {
    if (!selectedPresetRoute) return;

    if (selectedPresetRoute === "/blog") {
      handleAddBlog();
    } else if (selectedPresetRoute === "/") {
      const newItem: NavigationMenuItem = {
        id: crypto.randomUUID(),
        label: "Home",
        url: "/",
        type: "custom",
        icon: "Home",
        style: "link",
        external: false,
      };
      setCurrentMenu((prev) => [...prev, newItem]);
    } else if (selectedPresetRoute === "/dashboard") {
      const newItem: NavigationMenuItem = {
        id: crypto.randomUUID(),
        label: "Admin Portal",
        url: "/dashboard",
        type: "custom",
        icon: "Compass",
        style: "link",
        external: true,
      };
      setCurrentMenu((prev) => [...prev, newItem]);
    }

    setSelectedPresetRoute("");
    toast.success("Added route to menu");
  };

  const handleUpdateItem = (id: string, patch: Partial<NavigationMenuItem>) => {
    setCurrentMenu((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleRemoveItem = (id: string) => {
    setCurrentMenu((prev) => prev.filter((item) => item.id !== id));
  };

  const handleMoveItem = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentMenu.length) return;
    const updated = [...currentMenu];
    const temp = updated[index];
    const target = updated[targetIndex];
    if (temp && target) {
      updated[index] = target;
      updated[targetIndex] = temp;
      setCurrentMenu(updated);
    }
  };

  const handleResetDefaults = () => {
    if (activeLocation === "header") {
      const defaultHeader: NavigationMenuItem[] = [
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
      setHeaderMenu(defaultHeader);
    } else {
      const defaultFooter: NavigationMenuItem[] = [
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
      setFooterMenu(defaultFooter);
    }
    toast.success("Reset to default menu items");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await apiClient<SettingsResponse>("/api/settings", {
        method: "PUT",
        body: {
          headerMenu,
          footerMenu,
        },
      });

      await mutate(updated, false);
      toast.success("Navigation menus saved successfully!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving navigation settings");
    } finally {
      setIsSaving(false);
    }
  };

  useSaveShortcut(handleSave);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Navigation Menu Manager
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure header links, CTA buttons, badges, dynamic page sync, and footer menus.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={handleResetDefaults}
            iconStart={<RotateCcw />}
          >
            Reset Defaults
          </Button>

          <Button
            type="button"
            onClick={handleSave}
            loading={isSaving}
            iconStart={<Save />}
            shortcut="save"
          >
            Save Navigation
          </Button>
        </div>
      </div>

      {/* Menu Location Switcher Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl border border-border/80 bg-muted/40 max-w-md">
        <button
          type="button"
          onClick={() => setActiveLocation("header")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeLocation === "header"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Menu className="size-3.5" />
          <span>Header Navigation ({headerMenu.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveLocation("footer")}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeLocation === "footer"
              ? "bg-card text-foreground shadow-xs border border-border/80"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="size-3.5" />
          <span>Footer Navigation ({footerMenu.length})</span>
        </button>
      </div>

      {/* Live Visual Preview Mockup */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="size-3 text-primary" />
            Live {activeLocation === "header" ? "Header" : "Footer"} Preview
          </span>
          <span className="text-[10px] text-muted-foreground">Dynamic page-title synced</span>
        </div>

        <div className="rounded-xl border border-border/70 bg-background/90 p-4 flex flex-wrap items-center justify-between gap-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground font-black text-xs">
              <Sparkles className="size-3.5" />
            </div>
            <span className="font-bold text-sm text-foreground">
              {settings?.siteTitle || "Site Name"}
            </span>
          </div>

          <nav className="flex items-center gap-4 flex-wrap text-xs font-medium">
            {currentMenu.length === 0 ? (
              <span className="text-xs text-muted-foreground italic">No links in this menu.</span>
            ) : (
              currentMenu.map((rawItem) => {
                const item = getEffectiveItem(rawItem);
                const IconComp = getIconComponent(item.icon);
                const isBtn = item.style === "button";
                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 transition-all ${
                      isBtn
                        ? "bg-primary text-primary-foreground font-semibold px-3 py-1.5 rounded-lg shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {IconComp && <IconComp className="size-3.5 shrink-0" />}
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`text-[9.5px] font-bold px-2.5 py-1 rounded-full tracking-wide inline-flex items-center justify-center leading-none ml-1 ${
                          isBtn
                            ? "bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30"
                            : "bg-primary/15 text-primary border border-primary/25"
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                    {item.external && <ExternalLink className="size-2.5 opacity-60 ml-0.5" />}
                  </div>
                );
              })
            )}
          </nav>
        </div>
      </div>

      {/* Add Menu Items 2-Column Panel */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Plus className="size-3.5 text-primary" />
            Add Menu Items
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddCustomLink}
            iconStart={<Plus />}
          >
            Custom Link
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* Column 1: Add CMS Page */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium">
              Add Published CMS Page (Auto-Synced)
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPageId}
                onValueChange={(val) => setSelectedPageId(val || "")}
                disabled={publishedPages.length === 0}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue
                    placeholder={
                      publishedPages.length === 0
                        ? "No published pages available"
                        : "Select a page to add..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {publishedPages.map((page) => (
                    <SelectItem key={page.id} value={page.id}>
                      {page.title} (/{page.slug})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedPageId}
                onClick={handleAddSelectedPage}
              >
                Add Page
              </Button>
            </div>
          </div>

          {/* Column 2: Add Preset System Route */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground font-medium">
              Add Preset System Route
            </Label>
            <div className="flex items-center gap-2">
              <Select
                value={selectedPresetRoute}
                onValueChange={(val) => setSelectedPresetRoute(val || "")}
              >
                <SelectTrigger className="h-8 text-xs flex-1">
                  <SelectValue placeholder="Select a preset route..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/blog">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-3.5 text-primary" />
                      <span>Blog (/blog)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="/">
                    <div className="flex items-center gap-2">
                      <Home className="size-3.5 text-primary" />
                      <span>Home (/)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="/dashboard">
                    <div className="flex items-center gap-2">
                      <Compass className="size-3.5 text-primary" />
                      <span>Admin Portal (/dashboard)</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedPresetRoute}
                onClick={handleAddSelectedPreset}
              >
                Add Route
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Menu Item Cards List */}
      <div className="space-y-3">
        {currentMenu.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center space-y-2">
            <Compass className="size-6 text-muted-foreground mx-auto opacity-50" />
            <div className="text-sm font-semibold text-foreground">Menu is empty</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Use the toolbar above or click &quot;Reset Defaults&quot; to populate standard menu
              links.
            </p>
          </div>
        ) : (
          currentMenu.map((rawItem, index) => {
            const item = getEffectiveItem(rawItem);
            const isButton = item.style === "button";
            const isPageType = item.type === "page";

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/80 bg-card p-4 shadow-2xs space-y-3.5 transition-all"
              >
                {/* Item Header & Controls */}
                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        title="Move Up"
                        disabled={index === 0}
                        onClick={() => handleMoveItem(index, "up")}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowUp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Move Down"
                        disabled={index === currentMenu.length - 1}
                        onClick={() => handleMoveItem(index, "down")}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-20 cursor-pointer"
                      >
                        <ArrowDown className="size-3.5" />
                      </button>
                    </div>

                    <span className="text-xs font-mono text-muted-foreground">#{index + 1}</span>

                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-2 uppercase font-semibold"
                    >
                      {item.type === "page"
                        ? "CMS Page"
                        : item.type === "blog"
                          ? "Blog"
                          : "Custom Link"}
                    </Badge>

                    {isPageType && (
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          !item.customLabel
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground border border-border/70"
                        }`}
                      >
                        {!item.customLabel ? (
                          <>
                            <RefreshCw className="size-2.5 animate-spin" />
                            <span>Auto-Synced with Page</span>
                          </>
                        ) : (
                          <span>Custom Title Override</span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      title="Delete Item"
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>

                {/* Field Inputs Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Label */}
                  <div className="md:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] text-muted-foreground">
                        Menu Title / Label *
                      </Label>
                      {isPageType && (
                        <button
                          type="button"
                          onClick={() => {
                            if (!item.customLabel) {
                              handleUpdateItem(item.id, {
                                customLabel: true,
                                label: item.label,
                              });
                            } else {
                              const matched = publishedPages.find((p) => p.id === item.pageId);
                              handleUpdateItem(item.id, {
                                customLabel: false,
                                label: matched ? matched.title : item.label,
                              });
                            }
                          }}
                          className="text-[10px] text-primary hover:underline cursor-pointer"
                        >
                          {!item.customLabel ? "Customize title" : "↺ Auto-sync with page"}
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="e.g. Home, Contact Us, Pricing"
                      value={item.label}
                      onChange={(e) =>
                        handleUpdateItem(item.id, {
                          label: e.target.value,
                          customLabel: isPageType ? true : undefined,
                        })
                      }
                      className="h-8 text-xs font-medium"
                    />
                  </div>

                  {/* URL / Page selector */}
                  <div className="md:col-span-5 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Target URL / Route *
                    </Label>
                    {item.type === "page" && publishedPages.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <Select
                          value={item.pageId || ""}
                          onValueChange={(pId) => {
                            const found = publishedPages.find((p) => p.id === pId);
                            if (found) {
                              handleUpdateItem(item.id, {
                                pageId: found.id,
                                url: `/${found.slug.replace(/^\//, "")}`,
                                ...(!item.customLabel ? { label: found.title } : {}),
                              });
                            }
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Select linked page" />
                          </SelectTrigger>
                          <SelectContent>
                            {publishedPages.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.title} (/{p.slug})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <Input
                        placeholder="e.g. /about, /blog, https://..."
                        value={item.url}
                        onChange={(e) => handleUpdateItem(item.id, { url: e.target.value })}
                        className="h-8 text-xs font-mono"
                      />
                    )}
                  </div>

                  {/* Icon Selector */}
                  <div className="md:col-span-3 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Icon</Label>
                    <Select
                      value={item.icon || "none"}
                      onValueChange={(val) =>
                        handleUpdateItem(item.id, {
                          icon: !val || val === "none" ? undefined : val,
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_ICONS.map((ico) => {
                          const IcoComponent = ico.icon;
                          return (
                            <SelectItem key={ico.id} value={ico.id}>
                              <div className="flex items-center gap-2">
                                {IcoComponent && <IcoComponent className="size-3.5 text-primary" />}
                                <span>{ico.label}</span>
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Secondary Row: Appearance Styling (Button/Badge/External) */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50 text-xs">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Style: Link vs Button */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Style:</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { style: "link" })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                          !isButton
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Standard Link
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateItem(item.id, { style: "button" })}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                          isButton
                            ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        CTA Button
                      </button>
                    </div>

                    {/* Badge */}
                    <div className="flex items-center gap-1.5">
                      <Tag className="size-3 text-muted-foreground" />
                      <span className="text-[11px] text-muted-foreground font-medium">Badge:</span>
                      <input
                        type="text"
                        placeholder="e.g. New, Pro"
                        value={item.badge || ""}
                        onChange={(e) =>
                          handleUpdateItem(item.id, { badge: e.target.value || undefined })
                        }
                        className="h-6 w-20 px-2 rounded-md border border-border bg-background text-[11px] focus:outline-hidden focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>

                  {/* External target */}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.external || false}
                      onChange={(e) => handleUpdateItem(item.id, { external: e.target.checked })}
                      className="size-3.5 rounded border-border"
                    />
                    <span className="text-[11px] flex items-center gap-1">
                      Open in new tab <ExternalLink className="size-3 opacity-60" />
                    </span>
                  </label>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
