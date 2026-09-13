import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function BlogModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-blog" moduleName="Blog">
      {children}
    </PluginGuard>
  );
}
