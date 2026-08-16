"use client";

import {
  apiClient,
  Badge,
  Button,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { Plug, RefreshCw } from "lucide-react";

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
    description: "Audit logs, feature flags and site configuration",
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
};

const DEFAULT_PLUGINS: PluginApiItem[] = [
  { name: "plugin-auth", enabled: true },
  { name: "plugin-system", enabled: true },
  { name: "plugin-media", enabled: true },
  { name: "plugin-pages", enabled: true },
  { name: "plugin-blog", enabled: true },
  { name: "plugin-forms", enabled: true },
];

export function PluginManager() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ plugins?: PluginApiItem[]; data?: PluginApiItem[] } | PluginApiItem[]>(
    "/api/plugins",
  );

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

  const handleToggle = async (
    pluginKey: string,
    pluginLabel: string,
    isCore: boolean,
    newChecked: boolean,
  ) => {
    if (isCore) return;

    try {
      await apiClient(`/api/plugins/${pluginKey}`, {
        method: "PUT",
        body: { enabled: newChecked },
      });
      toast.success(`Plugin '${pluginLabel}' ${newChecked ? "enabled" : "disabled"}.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle plugin";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Plugins & Modules</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enable or disable modular CMS capabilities dynamically
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          iconStart={<RefreshCw />}
          className="text-xs h-8"
        >
          Refresh
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
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
                <TableHead className="w-[35%]">Plugin</TableHead>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead className="w-[15%]">Version</TableHead>
                <TableHead className="w-[10%] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plugins.map((p, idx) => (
                <TableRow key={p.key || p.rawName || `plugin-${idx}`} className="text-xs">
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                        <Plug className="size-3.5" />
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
  );
}
