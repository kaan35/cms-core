"use client";

import * as React from "react";
import {
  api,
  Badge,
  Button,
  InputSearchField,
  PageHeader,
  Skeleton,
  StatCard,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import { Blocks, CheckCircle2, Plug, Puzzle, RefreshCw } from "lucide-react";

interface PluginApiItem {
  id?: string;
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  isCore?: boolean;
}

const PLUGIN_METADATA: Record<
  string,
  { label: string; description: string; version: string; isCore: boolean }
> = {
  "plugin-auth": {
    label: "Authentication & RBAC",
    description: "JWT session auth, users, roles and permission matrices",
    version: "0.1.0",
    isCore: true,
  },
  "plugin-system": {
    label: "System Settings",
    description: "Audit logs and site configuration",
    version: "0.1.0",
    isCore: true,
  },
  "plugin-pages": {
    label: "Pages & Blocks",
    description: "Structured template pages and custom layouts",
    version: "0.1.0",
    isCore: false,
  },
  "plugin-blog": {
    label: "Blog Posts",
    description: "Articles, drafts and author management",
    version: "0.1.0",
    isCore: false,
  },
  "plugin-media": {
    label: "Media Library",
    description: "MinIO S3 storage integration and assets",
    version: "0.1.0",
    isCore: false,
  },
  "plugin-forms": {
    label: "Forms & Submissions",
    description: "Custom lead forms and response collection",
    version: "0.1.0",
    isCore: false,
  },
  "plugin-vault": {
    label: "Password Vault",
    description: "Encrypted credential storage, secrets vault and password generator",
    version: "0.1.0",
    isCore: false,
  },
  "plugin-mcp": {
    label: "Model Context Protocol (MCP)",
    description: "Streamable HTTP & stdio tools for AI assistants (Cursor, Claude, Copilot)",
    version: "0.1.0",
    isCore: false,
  },
};

const DEFAULT_PLUGINS: PluginApiItem[] = [
  { name: "plugin-auth", enabled: true },
  { name: "plugin-system", enabled: true },
  { name: "plugin-media", enabled: true },
  { name: "plugin-pages", enabled: true },
  { name: "plugin-blog", enabled: true },
  { name: "plugin-forms", enabled: true },
  { name: "plugin-vault", enabled: true },
  { name: "plugin-mcp", enabled: true },
];

export function PluginManager() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ plugins?: PluginApiItem[]; data?: PluginApiItem[] } | PluginApiItem[]>("/plugins");

  const rawList: PluginApiItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.plugins)
      ? rawData.plugins
      : Array.isArray(rawData?.data)
        ? rawData.data
        : DEFAULT_PLUGINS;

  // Merge database plugins with known metadata
  const plugins = rawList.map((p) => {
    const pluginKey = p.name || p.id || "";
    const meta = PLUGIN_METADATA[pluginKey];
    return {
      key: pluginKey,
      name: meta?.label || p.name || pluginKey,
      rawName: pluginKey,
      version: p.version || meta?.version || "0.1.0",
      description: p.description || meta?.description || "—",
      enabled: p.enabled ?? true,
      isCore: p.isCore ?? meta?.isCore ?? false,
    };
  });

  const [search, setSearch] = React.useState("");

  const enabledCount = React.useMemo(() => {
    return plugins.filter((p) => p.enabled).length;
  }, [plugins]);

  const coreCount = React.useMemo(() => {
    return plugins.filter((p) => p.isCore).length;
  }, [plugins]);

  const filteredPlugins = React.useMemo(() => {
    if (!search.trim()) return plugins;
    const q = search.toLowerCase();
    return plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q),
    );
  }, [plugins, search]);

  const handleToggle = async (
    pluginKey: string,
    pluginLabel: string,
    isCore: boolean,
    newChecked: boolean,
  ) => {
    if (isCore) return;

    try {
      await api.put(`/plugins/${pluginKey}`, { enabled: newChecked });
      toast.success(`Plugin '${pluginLabel}' ${newChecked ? "enabled" : "disabled"}.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle plugin";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Unified PageHeader */}
      <PageHeader
        title="Plugins & Modules"
        description="Enable or disable modular CMS capabilities dynamically"
      />

      {/* KPI Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Plugins"
          value={plugins.length}
          description="Registered system capabilities"
          icon={Puzzle}
        />
        <StatCard
          title="Active Modules"
          value={enabledCount}
          description="Currently enabled and mounted"
          icon={CheckCircle2}
        />
        <StatCard
          title="Core Plugins"
          value={coreCount}
          description="Essential platform modules"
          icon={Blocks}
        />
      </div>

      {/* Table Section */}
      <div className="space-y-4">
        {/* Unified Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <InputSearchField
            placeholder="Search plugins by name or description..."
            value={search}
            onSearchChange={setSearch}
            containerClassName="w-full sm:max-w-sm"
            className="bg-card w-full"
          />
          <div className="flex items-center gap-2">
            <Tooltip content="Refresh plugins">
              <Button
                variant="outline"
                size="icon"
                onClick={() => mutate()}
                iconStart={<RefreshCw />}
                disabled={isLoading}
              />
            </Tooltip>
          </div>
        </div>

        {/* Table Card */}
        <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                  <TableHead className="w-[35%] font-semibold">Plugin</TableHead>
                  <TableHead className="w-[40%] font-semibold">Description</TableHead>
                  <TableHead className="w-[15%] font-semibold">Version</TableHead>
                  <TableHead className="w-[10%] text-right font-semibold">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlugins.map((p, idx) => (
                  <TableRow
                    key={p.key || p.rawName || `plugin-${idx}`}
                    className="text-xs hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                          <Plug className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{p.name}</span>
                            {p.isCore && (
                              <Badge variant="secondary" className="text-[10px] py-0 h-4">
                                Core
                              </Badge>
                            )}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground">
                            {p.rawName}
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px]">
                      {p.description}
                    </TableCell>

                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      v{p.version}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Switch
                          checked={p.enabled}
                          disabled={p.isCore}
                          onCheckedChange={(val) => handleToggle(p.rawName, p.name, p.isCore, val)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
