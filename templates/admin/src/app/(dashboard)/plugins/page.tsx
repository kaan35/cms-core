"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { SkeletonStatCards, SkeletonTable } from "@/components/ui/Skeleton";
import { StatCard } from "@/components/ui/StatCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { CheckCircle2, Plug, Power, RefreshCw, XCircle } from "lucide-react";
import { useState } from "react";

interface Plugin {
  _id: string;
  name: string;
  displayName: string;
  version: string;
  description: string;
  isEnabled: boolean;
}

export default function PluginsPage() {
  const { showToast } = useToast();
  // Only for per-row UI loading state — not used in the path
  const [togglingPluginId, setTogglingPluginId] = useState<string | null>(null);

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery<{
    plugins: Plugin[];
  }>("/plugins");

  const plugins: Plugin[] = data?.plugins ?? [];

  // path is a function → trigger(plugin._id) injects the ID at call time,
  // same idea as trigger(formData) in blog/[id]/page.tsx but for path params.
  const { trigger: togglePlugin } = useApiMutation<{ message: string }, string>(
    {
      method: "PUT",
      onError: (err: Error) => {
        showToast({
          message: err.message || "Failed to toggle plugin",
          type: "error",
        });
        setTogglingPluginId(null);
      },
      onSuccess: (result) => {
        showToast({
          message: result?.message || "Plugin toggled successfully",
          type: "success",
        });
        refetch();
        setTogglingPluginId(null);
      },
      path: (id) => `/plugins/${id}/toggle`,
    },
  );

  const handleToggle = async (plugin: Plugin) => {
    setTogglingPluginId(plugin._id);
    await togglePlugin(plugin._id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Plug}
        accent="primary"
        title="Plugins"
        description="Manage installed plugins and system modules"
        actions={
          <Button
            variant="secondary"
            onClick={() => refetch()}
            isDisabled={isRefreshing}
            isLoading={isRefreshing}
            icon={RefreshCw}
            aria-label="Refresh"
          />
        }
      />

      <ErrorMessage error={error} fallback="Failed to load plugins" />

      {/* Info Card */}
      <Card
        title="Runtime Plugin Management"
        description="Plugin changes are applied immediately without server restart."
      >
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">How it works:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Toggle plugins on/off using the buttons below</li>
            <li>Changes are applied instantly in memory</li>
            <li>New routes will be available immediately</li>
            <li>Note: Full plugin registration requires restart</li>
          </ul>
        </div>
      </Card>

      {/* Plugins Table */}
      {isLoading || isRefreshing ? (
        <SkeletonTable rows={4} columns={4} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plugin Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plugins.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="p-0">
                  <EmptyState
                    icon={Plug}
                    title="No plugins found"
                    description="Registered plugins will show up here once seeded."
                    className="border-0 rounded-none"
                  />
                </TableCell>
              </TableRow>
            ) : (
              plugins.map((plugin) => (
                <TableRow key={plugin._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plug className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {plugin.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {plugin.name}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-md">
                    {plugin.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm font-mono">
                    v{plugin.version}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end items-center gap-3">
                      <Badge variant={plugin.isEnabled ? "success" : "neutral"}>
                        {plugin.isEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <Button
                        size="sm"
                        variant={plugin.isEnabled ? "danger" : "primary"}
                        onClick={() => handleToggle(plugin)}
                        isDisabled={togglingPluginId === plugin._id}
                        icon={Power}
                      >
                        {togglingPluginId === plugin._id
                          ? "..."
                          : plugin.isEnabled
                            ? "Disable"
                            : "Enable"}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}

      {/* Statistics */}
      {isLoading || isRefreshing ? (
        <SkeletonStatCards count={3} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Plugins"
            value={plugins.length}
            icon={Plug}
            accent="primary"
          />
          <StatCard
            label="Enabled"
            value={plugins.filter((p) => p.isEnabled).length}
            icon={CheckCircle2}
            accent="teal"
          />
          <StatCard
            label="Disabled"
            value={plugins.filter((p) => !p.isEnabled).length}
            icon={XCircle}
            accent="neutral"
          />
        </div>
      )}
    </div>
  );
}
