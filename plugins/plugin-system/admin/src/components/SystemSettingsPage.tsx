"use client";

import * as React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@cms/admin-shell";
import { SettingsEditor } from "./SettingsEditor";
import { FeatureFlagsTable } from "./FeatureFlagsTable";
import { AuditLogTable } from "./AuditLogTable";

export function SystemSettingsPage() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="mb-4">
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
