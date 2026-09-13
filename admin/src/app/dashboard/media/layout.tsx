import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function MediaModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-media" moduleName="Media Library">
      {children}
    </PluginGuard>
  );
}
