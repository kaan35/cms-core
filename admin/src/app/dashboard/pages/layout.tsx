import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function PagesModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-pages" moduleName="Pages">
      {children}
    </PluginGuard>
  );
}
