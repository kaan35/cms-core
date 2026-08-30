"use client";

import { Button, Skeleton } from "@cms/admin-shell";
import { Compass, Layers, Menu, RotateCcw, Save } from "lucide-react";
import { AddMenuItemPanel } from "./navigation/AddMenuItemPanel";
import { MenuItemCard } from "./navigation/MenuItemCard";
import { NavigationPreview } from "./navigation/NavigationPreview";
import { useNavigationMenu } from "./navigation/useNavigationMenu";

export function NavigationManager() {
  const {
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
  } = useNavigationMenu();

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
      <NavigationPreview
        siteTitle={settings?.siteTitle}
        activeLocation={activeLocation}
        items={currentMenu}
        getEffectiveItem={getEffectiveItem}
      />

      {/* Add Menu Items 2-Column Panel */}
      <AddMenuItemPanel
        publishedPages={publishedPages}
        selectedPageId={selectedPageId}
        onSelectPageId={setSelectedPageId}
        onAddSelectedPage={handleAddSelectedPage}
        selectedPresetRoute={selectedPresetRoute}
        onSelectPresetRoute={setSelectedPresetRoute}
        onAddSelectedPreset={handleAddSelectedPreset}
        onAddCustomLink={handleAddCustomLink}
      />

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
          currentMenu.map((rawItem, index) => (
            <MenuItemCard
              key={rawItem.id}
              item={getEffectiveItem(rawItem)}
              index={index}
              totalItems={currentMenu.length}
              publishedPages={publishedPages}
              onMoveItem={handleMoveItem}
              onRemoveItem={handleRemoveItem}
              onUpdateItem={handleUpdateItem}
            />
          ))
        )}
      </div>
    </div>
  );
}
