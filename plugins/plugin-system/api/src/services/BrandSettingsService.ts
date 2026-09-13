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
    const siteTitle = await this.settingsService.get<string>("system.site.title", "CMS Core");
    const adminTitle = await this.settingsService.get<string>("system.admin.title", siteTitle);
    const siteDescription = await this.settingsService.get<string>(
      "system.site.description",
      "Headless CMS Engine",
    );
    const brandColor = await this.settingsService.get<string>("system.brand.color", "#3b82f6");
    const brandFont = await this.settingsService.get<string>("system.brand.font", "Inter");
    const defaultTheme = await this.settingsService.get<string>("system.brand.theme", "dark");
    const footerText = await this.settingsService.get<string>("system.site.footerText", "");
    const headerMenu = await this.settingsService.get<NavigationMenuItem[]>(
      "system.navigation.header",
      [
        { id: "default-home", label: "Home", url: "/", type: "custom", external: false },
        { id: "default-blog", label: "Blog", url: "/blog", type: "blog", external: false },
      ],
    );
    const footerMenu = await this.settingsService.get<NavigationMenuItem[]>(
      "system.navigation.footer",
      [],
    );
    const allowRegistration = await this.settingsService.get<boolean>(
      "system.auth.allowRegistration",
      true,
    );
    const sessionTimeoutMinutes = await this.settingsService.get<number>(
      "system.auth.sessionTimeoutMinutes",
      1440,
    );

    return {
      adminTitle: adminTitle || siteTitle || "CMS Core",
      siteTitle,
      siteDescription,
      brandColor,
      brandFont,
      primaryColor: brandColor,
      fontFamily: brandFont,
      defaultTheme,
      footerText,
      headerMenu,
      footerMenu,
      allowRegistration,
      sessionTimeoutMinutes,
    };
  }

  async updateSettings(input: unknown | UpdateSettingsInput, actorId?: string) {
    const validated = validateUpdateSettings(input);

    if (validated.adminTitle !== undefined) {
      await this.settingsService.set("system.admin.title", validated.adminTitle);
    }
    if (validated.siteTitle !== undefined) {
      await this.settingsService.set("system.site.title", validated.siteTitle);
    }
    if (validated.siteDescription !== undefined) {
      await this.settingsService.set("system.site.description", validated.siteDescription);
    }
    if (validated.brandColor !== undefined) {
      await this.settingsService.set("system.brand.color", validated.brandColor);
    }
    if (validated.primaryColor !== undefined) {
      await this.settingsService.set("system.brand.color", validated.primaryColor);
    }
    if (validated.brandFont !== undefined) {
      await this.settingsService.set("system.brand.font", validated.brandFont);
    }
    if (validated.fontFamily !== undefined) {
      await this.settingsService.set("system.brand.font", validated.fontFamily);
    }
    if (validated.defaultTheme !== undefined) {
      await this.settingsService.set("system.brand.theme", validated.defaultTheme);
    }
    if (validated.footerText !== undefined) {
      await this.settingsService.set("system.site.footerText", validated.footerText);
    }
    if (validated.headerMenu !== undefined) {
      await this.settingsService.set("system.navigation.header", validated.headerMenu);
    }
    if (validated.footerMenu !== undefined) {
      await this.settingsService.set("system.navigation.footer", validated.footerMenu);
    }
    if (validated.allowRegistration !== undefined) {
      await this.settingsService.set("system.auth.allowRegistration", validated.allowRegistration);
    }
    if (validated.sessionTimeoutMinutes !== undefined) {
      await this.settingsService.set(
        "system.auth.sessionTimeoutMinutes",
        validated.sessionTimeoutMinutes,
      );
    }

    const current = await this.getSettings();
    await this.hooks.emit(EVENTS.SYSTEM.SETTINGS_UPDATED, { ...current, actorId });
    this.logger.info("System settings updated", { actorId });

    return current;
  }
}
