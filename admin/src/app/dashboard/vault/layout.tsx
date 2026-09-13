import { PluginGuard } from "@cms/admin-shell";
import * as React from "react";

export default function VaultLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginGuard pluginId="plugin-vault" moduleName="Password Vault">
      {children}
    </PluginGuard>
  );
}
