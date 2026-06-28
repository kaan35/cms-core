"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Loading } from "@/components/ui/Loading";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/Table";
import { useApiMutation, useApiQuery } from "@/hooks/useApi";
import { useToast } from "@/lib/toast";
import { Plug, Power, RefreshCw } from "lucide-react";
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

  const { data, error, isLoading, isRefreshing, refetch } = useApiQuery<{ plugins: Plugin[] }>(
    "/plugins",
  );

  const plugins: Plugin[] = data?.plugins ?? [];

  // path is a function → trigger(plugin._id) injects the ID at call time,
  // same idea as trigger(formData) in blog/[id]/page.tsx but for path params.
  const { trigger: togglePlugin } = useApiMutation<{ message: string }, string>({
    path: (id) => `/plugins/${id}/toggle`,
    method: "PUT",
    onSuccess: (result) => {
      showToast({ message: result?.message || "Plugin toggled successfully", type: "success" });
      refetch();
      setTogglingPluginId(null);
    },
    onError: (err: Error) => {
      showToast({ message: err.message || "Failed to toggle plugin", type: "error" });
      setTogglingPluginId(null);
    },
  });

  const handleToggle = async (plugin: Plugin) => {
    setTogglingPluginId(plugin._id);
    await togglePlugin(plugin._id); // ← trigger(id), tıpkı trigger(formData) gibi
  };

  if (isLoading) {
    return <Loading isFullScreen />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plugins</h1>
          <p className="text-sm text-zinc-400">Manage installed plugins and system modules</p>
        </div>

        <Button
          variant="secondary"
          onClick={() => refetch()}
          isDisabled={isRefreshing}
          isLoading={isRefreshing}
          icon={RefreshCw}
        />
      </div>

      <ErrorMessage error={error} fallback="Failed to load plugins" />

      {/* Info Card */}
      <Card
        title="✨ Runtime Plugin Management"
        description="Plugin changes are applied immediately without server restart."
      >
        <div className="text-sm text-zinc-400">
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
      <Table>
        <TableHeader>
          <TableRow>
            <TableCell isHeader>Plugin Name</TableCell>
            <TableCell isHeader>Description</TableCell>
            <TableCell isHeader>Version</TableCell>
            <TableCell isHeader className="text-right">
              Status
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody>
          {plugins.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-12 text-zinc-500">
                <Plug className="h-10 w-10 text-zinc-700 mx-auto mb-2" />
                No plugins found.
              </TableCell>
            </TableRow>
          ) : (
            plugins.map((plugin) => (
              <TableRow key={plugin._id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                      <Plug className="h-4 w-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{plugin.displayName}</div>
                      <div className="text-xs text-zinc-500 font-mono">{plugin.name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400 text-sm max-w-md">
                  {plugin.description || "—"}
                </TableCell>
                <TableCell className="text-zinc-400 text-sm font-mono">v{plugin.version}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end items-center gap-3">
                    {plugin.isEnabled ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
                        Disabled
                      </span>
                    )}
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

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-6">
          <div className="text-sm text-zinc-400 mb-1">Total Plugins</div>
          <div className="text-3xl font-bold text-white">{plugins.length}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-6">
          <div className="text-sm text-zinc-400 mb-1">Enabled</div>
          <div className="text-3xl font-bold text-emerald-400">
            {plugins.filter((p) => p.isEnabled).length}
          </div>
        </div>
        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-6">
          <div className="text-sm text-zinc-400 mb-1">Disabled</div>
          <div className="text-3xl font-bold text-zinc-400">
            {plugins.filter((p) => !p.isEnabled).length}
          </div>
        </div>
      </div>
    </div>
  );
}
