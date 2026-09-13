import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function FormsModuleLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-forms" moduleName="Forms & Submissions">
      {children}
    </PluginGuard>
  );
}
