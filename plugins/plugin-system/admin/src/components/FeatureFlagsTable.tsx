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
import { RefreshCw } from "lucide-react";

interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  category?: string;
}

export function FeatureFlagsTable() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ flags: FeatureFlag[] } | FeatureFlag[]>("/api/feature-flags");

  const flags: FeatureFlag[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.flags)
      ? rawData.flags
      : [
          {
            key: "enable_blog_comments",
            name: "Blog Comments",
            description: "Allow public users to submit comments on blog posts",
            enabled: false,
            category: "Content",
          },
          {
            key: "enable_two_factor_auth",
            name: "Two-Factor Auth (2FA)",
            description: "Require TOTP authentication for administrators",
            enabled: true,
            category: "Security",
          },
          {
            key: "enable_media_optimization",
            name: "Image Auto-Compression",
            description: "Convert uploaded images to WebP automatically",
            enabled: true,
            category: "Performance",
          },
          {
            key: "enable_activity_audit_trail",
            name: "Full Audit Logging",
            description: "Log all administrative write actions",
            enabled: true,
            category: "Compliance",
          },
        ];

  const handleToggle = async (flag: FeatureFlag, newChecked: boolean) => {
    try {
      await apiClient(`/api/feature-flags/${flag.key}`, {
        method: "PUT",
        body: { enabled: newChecked },
      });
      toast.success(`Feature '${flag.name}' ${newChecked ? "enabled" : "disabled"}.`);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle feature flag";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Feature Toggles</h2>
          <p className="text-xs text-muted-foreground">
            Turn specific platform features on or off safely
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => mutate()}
          className="gap-1.5 text-xs h-7"
        >
          <RefreshCw className="size-3" />
          <span>Refresh</span>
        </Button>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[30%]">Feature</TableHead>
                <TableHead className="w-[45%]">Description</TableHead>
                <TableHead className="w-[15%]">Category</TableHead>
                <TableHead className="w-[10%] text-right">Enabled</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flags.map((f) => (
                <TableRow key={f.key} className="text-xs">
                  <TableCell>
                    <div className="font-semibold text-foreground">{f.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{f.key}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {f.description || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {f.category || "General"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch checked={f.enabled} onCheckedChange={(val) => handleToggle(f, val)} />
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
