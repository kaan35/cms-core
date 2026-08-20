"use client";

import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger } from "@cms/admin-shell";
import { AuditLogTable } from "./AuditLogTable";
import { FeatureFlagsTable } from "./FeatureFlagsTable";
import { SettingsEditor } from "./SettingsEditor";

export function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="System Settings"
        description="Configure global CMS parameters, branding, feature flags, and system audit history."
      />

      <Tabs defaultValue="settings" className="w-full space-y-6">
        <TabsList>
          <TabsTrigger value="settings">General Settings</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SettingsEditor />
        </TabsContent>

        <TabsContent value="flags">
          <FeatureFlagsTable />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
