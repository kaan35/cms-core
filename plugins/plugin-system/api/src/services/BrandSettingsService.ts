import type { IHookManager, ILogger, ISettingsService } from "@cms/core";
import { EVENTS } from "@cms/core";
import {
  type NavigationMenuItem,
  type UpdateSettingsInput,
  validateUpdateSettings,
} from "../domain/system.rules.js";

export class BrandSettingsService {
  private readonly settingsService: ISettingsService;
  private readonly hooks: IHookManager;
  private readonly logger: ILogger;

  constructor(settingsService: ISettingsService, hooks: IHookManager, logger: ILogger) {
    this.settingsService = settingsService;
    this.hooks = hooks;
    this.logger = logger;
  }

  async getSettings(): Promise<{
    adminTitle: string;
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
  }> {
    const s = await this.settingsService.getMany({
      "system.site.title": "CMS Core",
      "system.admin.title": "",
      "system.site.description": "Headless CMS Engine",
      "system.brand.color": "#3b82f6",
      "system.brand.font": "Inter",
      "system.brand.theme": "dark",
      "system.site.footerText": "",
      "system.navigation.header": [
        { id: "default-home", label: "Home", url: "/", type: "custom", external: false },
        { id: "default-blog", label: "Blog", url: "/blog", type: "blog", external: false },
      ] as NavigationMenuItem[],
      "system.navigation.footer": [] as NavigationMenuItem[],
      "system.auth.allowRegistration": true,
      "system.auth.sessionTimeoutMinutes": 1440,
    });

    const siteTitle = s["system.site.title"];
    const adminTitle = s["system.admin.title"] || siteTitle || "CMS Core";

    return {
      adminTitle,
      siteTitle,
      siteDescription: s["system.site.description"],
      brandColor: s["system.brand.color"],
      brandFont: s["system.brand.font"],
      primaryColor: s["system.brand.color"],
      fontFamily: s["system.brand.font"],
      defaultTheme: s["system.brand.theme"],
      footerText: s["system.site.footerText"],
      headerMenu: s["system.navigation.header"],
      footerMenu: s["system.navigation.footer"],
      allowRegistration: s["system.auth.allowRegistration"],
      sessionTimeoutMinutes: s["system.auth.sessionTimeoutMinutes"],
    };
  }

  async updateSettings(input: unknown | UpdateSettingsInput, actorId?: string) {
    const validated = validateUpdateSettings(input);
    const updates: Promise<void>[] = [];

    if (validated.adminTitle !== undefined) {
      updates.push(this.settingsService.set("system.admin.title", validated.adminTitle));
    }
    if (validated.siteTitle !== undefined) {
      updates.push(this.settingsService.set("system.site.title", validated.siteTitle));
    }
    if (validated.siteDescription !== undefined) {
      updates.push(this.settingsService.set("system.site.description", validated.siteDescription));
    }
    if (validated.brandColor !== undefined) {
      updates.push(this.settingsService.set("system.brand.color", validated.brandColor));
    }
    if (validated.primaryColor !== undefined) {
      updates.push(this.settingsService.set("system.brand.color", validated.primaryColor));
    }
    if (validated.brandFont !== undefined) {
      updates.push(this.settingsService.set("system.brand.font", validated.brandFont));
    }
    if (validated.fontFamily !== undefined) {
      updates.push(this.settingsService.set("system.brand.font", validated.fontFamily));
    }
    if (validated.defaultTheme !== undefined) {
      updates.push(this.settingsService.set("system.brand.theme", validated.defaultTheme));
    }
    if (validated.footerText !== undefined) {
      updates.push(this.settingsService.set("system.site.footerText", validated.footerText));
    }
    if (validated.headerMenu !== undefined) {
      updates.push(this.settingsService.set("system.navigation.header", validated.headerMenu));
    }
    if (validated.footerMenu !== undefined) {
      updates.push(this.settingsService.set("system.navigation.footer", validated.footerMenu));
    }
    if (validated.allowRegistration !== undefined) {
      updates.push(
        this.settingsService.set("system.auth.allowRegistration", validated.allowRegistration),
      );
    }
    if (validated.sessionTimeoutMinutes !== undefined) {
      updates.push(
        this.settingsService.set(
          "system.auth.sessionTimeoutMinutes",
          validated.sessionTimeoutMinutes,
        ),
      );
    }

    if (updates.length > 0) {
      await Promise.all(updates);
    }

    const current = await this.getSettings();
    await this.hooks.emit(EVENTS.SYSTEM.SETTINGS_UPDATED, { ...current, actorId });
    this.logger.info("System settings updated", { actorId });

    return current;
  }
}
