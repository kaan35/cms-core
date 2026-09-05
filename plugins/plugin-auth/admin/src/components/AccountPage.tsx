"use client";

import { PageHeader, Tabs, TabsContent, TabsList, TabsTrigger, useAuth } from "@cms/admin-shell";
import { Shield, User } from "lucide-react";
import * as React from "react";
import { PasswordCard } from "./account/PasswordCard";
import { ProfileCard } from "./account/ProfileCard";
import { ThemeCard } from "./account/ThemeCard";
import { SessionsList } from "./SessionsList";

export function AccountPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("profile");

  const roleName = user?.permissions?.includes("*") ? "Super Administrator" : "Workspace Member";

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in duration-300">
      <PageHeader
        title="Account Settings"
        description="Manage your profile identity, security credentials, active sessions, and appearance preferences."
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-sm grid-cols-2 p-1">
          <TabsTrigger value="profile" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <User className="size-4" />
            <span>Profile & Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="sessions" className="flex items-center gap-2 px-3.5 py-1.5 text-xs">
            <Shield className="size-4" />
            <span>Active Sessions</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Profile & Preferences */}
        <TabsContent value="profile" className="space-y-6">
          <ProfileCard user={user} roleName={roleName} />
          <ThemeCard />
          <PasswordCard user={user} />
        </TabsContent>

        {/* Tab 2: Active Sessions */}
        <TabsContent value="sessions">
          <SessionsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
