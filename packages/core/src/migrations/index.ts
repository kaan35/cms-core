import type { Migration } from "../types/plugin.js";
import { migration as cmsRedirectsMigration } from "./202608150001_cms_redirects_from_index.js";
import { migration as cmsSettingsMigration } from "./202608150002_cms_settings_key_index.js";

export { runMigrations } from "./runner.js";

export const coreMigrations: Migration[] = [cmsRedirectsMigration, cmsSettingsMigration];
