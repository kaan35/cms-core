import { api, toast, useApi, useSaveShortcut } from "@cms/admin-shell";
import type { NavigationMenuItem } from "@cms/plugin-system-api";
import * as React from "react";
import {
  createDefaultFooterMenu,
  createDefaultHeaderMenu,
  createPresetMenuItem,
  type EffectiveMenuItem,
  type PublishedPage,
  type SettingsResponse,
} from "./menuDefaults";

export type { EffectiveMenuItem, PublishedPage, SettingsResponse };

export function useNavigationMenu() {
  const { data, isLoading, mutate } = useApi<SettingsResponse>("/settings");
  const settings = data?.settings;

  const { data: rawPages } = useApi<{
    data?: PublishedPage[];
    items?: PublishedPage[];
  }>("/pages?status=published");

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
  const [selectedPageId, setSelectedPageId] = React.useState<string>("");
  const [selectedPresetRoute, setSelectedPresetRoute] = React.useState<string>("");

  React.useEffect(() => {
    if (settings) {
      setHeaderMenu(
        Array.isArray(settings.headerMenu) && settings.headerMenu.length > 0
          ? settings.headerMenu
          : createDefaultHeaderMenu([]),
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

  const getEffectiveItem = React.useCallback(
    (item: NavigationMenuItem): EffectiveMenuItem => {
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
      customLabel: false,
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

  const handleAddSelectedPreset = () => {
    if (!selectedPresetRoute) return;
    const presetItem = createPresetMenuItem(selectedPresetRoute);
    if (presetItem) {
      setCurrentMenu((prev) => [...prev, presetItem]);
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
      setHeaderMenu(createDefaultHeaderMenu(publishedPages));
    } else {
      setFooterMenu(createDefaultFooterMenu(publishedPages));
    }
    toast.success("Reset to default menu items");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await api.put<SettingsResponse>("/settings", {
        headerMenu,
        footerMenu,
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

  return {
    settings,
    publishedPages,
    isLoading,
    isSaving,
    activeLocation,
    setActiveLocation,
    headerMenu,
    footerMenu,
    currentMenu,
    selectedPageId,
    setSelectedPageId,
    selectedPresetRoute,
    setSelectedPresetRoute,
    getEffectiveItem,
    handleAddCustomLink,
    handleAddSelectedPage,
    handleAddSelectedPreset,
    handleUpdateItem,
    handleRemoveItem,
    handleMoveItem,
    handleResetDefaults,
    handleSave,
  };
}
