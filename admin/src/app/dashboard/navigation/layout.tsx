import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function NavigationModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-pages" moduleName="Navigation">
      {children}
    </PluginGuard>
  );
}
