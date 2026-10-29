"use client";

import {
  api,
  Badge,
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatDateTime,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Code2,
  Copy,
  Cpu,
  GitBranch,
  Globe,
  History,
  Key,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Terminal,
  Workflow,
} from "lucide-react";
import * as React from "react";
import type { ApiTokenItem } from "./ApiTokensList";

export interface TokenDetailDialogProps {
  token: ApiTokenItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActivityLogItem {
  id: string;
  event?: string;
  action?: string;
  status?: "success" | "access_denied" | "error";
  actorType?: string;
  tokenId?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  timestamp?: string;
}

function ActivityStatusBadge({
  status,
  requiredScope,
  error,
}: {
  status: "success" | "access_denied" | "error";
  requiredScope?: string | undefined;
  error?: string | undefined;
}) {
  if (status === "access_denied") {
    const tooltipText = requiredScope
      ? `Missing required scope: ${requiredScope}`
      : error || "Access denied";
    return (
      <Tooltip content={tooltipText} side="top">
        <Badge
          variant="outline"
          className="text-[10px] gap-1 font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 cursor-help shrink-0"
        >
          <ShieldAlert className="size-2.5" />
          Denied
        </Badge>
      </Tooltip>
    );
  }

  if (status === "error") {
    const tooltipText = error || "Tool or API execution error";
    return (
      <Tooltip content={tooltipText} side="top">
        <Badge
          variant="outline"
          className="text-[10px] gap-1 font-mono font-medium bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 cursor-help shrink-0"
        >
          <AlertCircle className="size-2.5" />
          Error
        </Badge>
      </Tooltip>
    );
  }

  return (
    <Badge
      variant="outline"
      className="text-[10px] gap-1 font-mono font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shrink-0"
    >
      <CheckCircle2 className="size-2.5" />
      Success
    </Badge>
  );
}

export function TokenDetailDialog({ token, open, onOpenChange }: TokenDetailDialogProps) {
  const [mainTab, setMainTab] = React.useState<"setup" | "activity">("setup");
  const [revealedToken, setRevealedToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [copiedConfig, setCopiedConfig] = React.useState(false);
  const [activeIntegrationTab, setActiveIntegrationTab] = React.useState("antigravity");

  // Reset tab and state on modal open/close
  React.useEffect(() => {
    if (!open || !token) {
      setRevealedToken(null);
      setLoadError(null);
      setIsLoading(false);
      setMainTab("setup");
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    api
      .get<{ token: string; rawToken?: string }>(`/auth/tokens/${token.id}/reveal`)
      .then((res) => {
        if (!isMounted) return;
        const raw = res.token || res.rawToken;
        if (!raw) {
          throw new Error("Server returned an empty token response");
        }
        setRevealedToken(raw);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to decrypt raw token";
        setLoadError(msg);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, token]);

  // Fetch token audit trail only when the dialog is open, token exists, and Activity tab is active
  const activityUrl =
    open && token?.id && mainTab === "activity"
      ? `/api/audit-log?tokenId=${encodeURIComponent(token.id)}&limit=20`
      : null;

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    mutate: refreshActivity,
  } = useApi<
    | {
        data?: ActivityLogItem[];
        logs?: ActivityLogItem[];
      }
    | ActivityLogItem[]
  >(activityUrl);

  const activityLogs: ActivityLogItem[] = React.useMemo(() => {
    if (Array.isArray(activityData)) return activityData;
    if (Array.isArray(activityData?.data)) return activityData.data;
    if (Array.isArray(activityData?.logs)) return activityData.logs;
    return [];
  }, [activityData]);

  const copyToClipboard = async (
    text: string,
    onSuccessState: (val: boolean) => void,
    successToast: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccessState(true);
      toast.success(successToast);
      setTimeout(() => onSuccessState(false), 2500);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const apiOrigin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace(":3002", ":3001")
      : "http://localhost:3001";

  // Configuration templates for popular AI agents
  const configs: Record<string, { filename: string; text: string; copyLabel: string }> =
    React.useMemo(() => {
      const tok = revealedToken || token?.tokenPrefix || "cms_token_••••";
      return {
        antigravity: {
          filename: "~/.gemini/config/mcp_config.json",
          copyLabel: "Copy Antigravity JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        cursor: {
          filename: ".cursor/mcp.json",
          copyLabel: "Copy Cursor JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        copilot: {
          filename: "~/.copilot/mcp-config.json",
          copyLabel: "Copy Copilot JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  type: "http",
                  url: `${apiOrigin}/api/mcp`,
                  tools: ["*"],
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        codex: {
          filename: "OpenAI Custom GPT Action / HTTP Header",
          copyLabel: "Copy Codex Headers",
          text: [
            "# Authentication Method: Bearer Token",
            `Authorization: Bearer ${tok}`,
            "",
            "# Streamable MCP Endpoint:",
            `${apiOrigin}/api/mcp`,
            "",
            "# Base Endpoint:",
            `${apiOrigin}/api`,
            "",
            "# cURL Example:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/mcp`,
          ].join("\n"),
        },
        claude: {
          filename: "claude_desktop_config.json",
          copyLabel: "Copy Claude JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        windsurf: {
          filename: "~/.codeium/windsurf/mcp_config.json",
          copyLabel: "Copy Windsurf JSON",
          text: JSON.stringify(
            {
              mcpServers: {
                cms: {
                  url: `${apiOrigin}/api/mcp`,
                  headers: {
                    Authorization: `Bearer ${tok}`,
                  },
                },
              },
            },
            null,
            2,
          ),
        },
        rest: {
          filename: "cURL / HTTP Request",
          copyLabel: "Copy cURL Snippet",
          text: [
            "# Streamable MCP Endpoint:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/mcp`,
            "",
            "# Health Check:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/health`,
            "",
            "# List Published Blog Posts:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/blog/posts`,
            "",
            "# Query Pages:",
            `curl -H "Authorization: Bearer ${tok}" ${apiOrigin}/api/pages`,
          ].join("\n"),
        },
      };
    }, [revealedToken, token, apiOrigin]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {/* Fixed Header */}
        <DialogHeader>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Key className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-sm font-semibold truncate">
                  {token?.name || "Token Details"}
                </DialogTitle>
                {token?.revokedAt ? (
                  <Badge
                    variant="destructive"
                    className="text-[10px] px-1.5 py-0 bg-destructive/15 text-destructive border-destructive/30 shrink-0"
                  >
                    Revoked
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shrink-0"
                  >
                    Active
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 truncate">
                Authenticated key configuration, activity audit & 1-click AI IDE setup.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <DialogBody>
          {token?.revokedAt && (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <span>Status: Revoked</span>
                    <Badge
                      variant="destructive"
                      className="text-[10px] px-1.5 py-0 bg-destructive/20 text-destructive border-destructive/30"
                    >
                      Revoked
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-destructive/90">
                    This token was revoked on{" "}
                    <span className="font-semibold">{formatDateTime(token.revokedAt)}</span>
                    {token.revokeReason ? (
                      <>
                        {" "}
                        &bull; Reason:{" "}
                        <span className="font-mono font-medium">{token.revokeReason}</span>
                      </>
                    ) : null}
                    . Requests made with this key will fail authentication.
                  </p>
                </div>
              </div>
            </div>
          )}
          <Tabs
            value={mainTab}
            onValueChange={(v) => setMainTab(v as "setup" | "activity")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="setup" className="gap-1.5 text-xs">
                <Bot className="size-3.5" />
                <span>Setup &amp; Integration</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 text-xs">
                <History className="size-3.5" />
                <span>Recent Activity</span>
              </TabsTrigger>
            </TabsList>

            {/* Setup & Integration Tab */}
            <TabsContent value="setup" className="mt-0 space-y-4">
              {isLoading ? (
                <div className="space-y-3 py-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                  <div className="pt-2 space-y-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-28 w-full rounded-lg" />
                  </div>
                </div>
              ) : loadError ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertTriangle className="size-4 shrink-0" />
                    <span>Failed to decrypt token</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-destructive/90">{loadError}</p>
                </div>
              ) : (
                <>
                  {/* Raw Token Row */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground block">
                        Decrypted Raw Token (Bearer Secret):
                      </label>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        AES-256-GCM Secure Vault
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={revealedToken || ""}
                        className="flex-1 px-3 py-1.5 text-xs font-mono bg-muted/70 rounded-lg border border-border/80 text-foreground select-all outline-none truncate"
                        onFocus={(e) => e.target.select()}
                      />
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        onClick={() =>
                          revealedToken &&
                          copyToClipboard(
                            revealedToken,
                            setCopiedToken,
                            "Decrypted token copied to clipboard!",
                          )
                        }
                        iconStart={
                          copiedToken ? (
                            <Check className="text-white" />
                          ) : (
                            <Copy className="size-3.5" />
                          )
                        }
                      >
                        {copiedToken ? "Copied" : "Copy Token"}
                      </Button>
                    </div>
                  </div>

                  {/* Scopes Summary */}
                  {token?.scopes && token.scopes.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground block">
                        Granted Permissions / Scopes:
                      </label>
                      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/60">
                        {token.scopes.includes("*") ? (
                          <Badge variant="default" className="text-[10px] px-2 py-0.5 font-normal">
                            Full Access (*)
                          </Badge>
                        ) : (
                          token.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0.5 font-mono text-muted-foreground"
                            >
                              {scope}
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Agent Configuration Tabs */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Bot className="size-3.5 text-primary" />
                        <span>1-Click AI Agent &amp; IDE Setup</span>
                      </span>
                      <span className="text-[11px] text-muted-foreground font-medium">
                        Pre-filled with decrypted key
                      </span>
                    </div>

                    <Tabs
                      value={activeIntegrationTab}
                      onValueChange={setActiveIntegrationTab}
                      className="w-full space-y-2.5"
                    >
                      <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 p-1 h-auto gap-0.5">
                        <TabsTrigger
                          value="antigravity"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Sparkles className="size-2.5 text-primary shrink-0" />
                          <span className="truncate">Antigravity</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="cursor"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Code2 className="size-2.5 text-blue-500 shrink-0" />
                          <span className="truncate">Cursor</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="copilot"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <GitBranch className="size-2.5 text-purple-500 shrink-0" />
                          <span className="truncate">Copilot</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="codex"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Cpu className="size-2.5 text-emerald-500 shrink-0" />
                          <span className="truncate">Codex</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="claude"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Terminal className="size-2.5 text-amber-500 shrink-0" />
                          <span className="truncate">Claude</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="windsurf"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Workflow className="size-2.5 text-cyan-500 shrink-0" />
                          <span className="truncate">Windsurf</span>
                        </TabsTrigger>
                        <TabsTrigger
                          value="rest"
                          className="text-[11px] py-1 px-1 flex items-center justify-center gap-1"
                        >
                          <Globe className="size-2.5 text-muted-foreground shrink-0" />
                          <span className="truncate">cURL</span>
                        </TabsTrigger>
                      </TabsList>

                      {/* Configuration Snippet for Active Agent */}
                      {Object.entries(configs).map(([key, config]) => (
                        <TabsContent key={key} value={key} className="space-y-1.5 mt-1">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span className="truncate max-w-85">
                              Target: <code className="text-foreground">{config.filename}</code>
                            </span>
                            <Button
                              type="button"
                              variant={key === "antigravity" ? "default" : "outline"}
                              size="xs"
                              onClick={() =>
                                copyToClipboard(
                                  config.text,
                                  setCopiedConfig,
                                  `${config.copyLabel} successfully copied!`,
                                )
                              }
                              iconStart={
                                copiedConfig ? (
                                  <Check
                                    className={
                                      key === "antigravity" ? "text-white" : "text-emerald-500"
                                    }
                                  />
                                ) : (
                                  <Copy className="size-3" />
                                )
                              }
                            >
                              {copiedConfig ? "Copied!" : config.copyLabel}
                            </Button>
                          </div>
                          <pre className="p-2.5 bg-muted/80 rounded-lg font-mono text-[11px] leading-relaxed text-foreground/90 border border-border/80 shadow-2xs max-h-40 overflow-x-auto whitespace-pre">
                            {config.text}
                          </pre>
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>
                </>
              )}
            </TabsContent>

            {/* Recent Activity Tab */}
            <TabsContent value="activity" className="mt-0 space-y-3">
              {activityLoading ? (
                <div className="space-y-2 py-1">
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ) : activityError ? (
                <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-semibold">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Failed to load token activity</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-destructive/90">
                    {activityError instanceof Error
                      ? activityError.message
                      : typeof activityError === "string"
                        ? activityError
                        : "Failed to load activity logs for this token."}
                  </p>
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void refreshActivity();
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              ) : activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-dashed border-border/70 bg-muted/20 text-center space-y-2">
                  <div className="p-2.5 rounded-full bg-muted/60 text-muted-foreground/40">
                    <History className="size-6" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-foreground">
                      No activity recorded yet
                    </p>
                    <p className="text-[11px] text-muted-foreground max-w-sm">
                      This token has not executed any MCP tools or API requests yet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header with count & refresh button */}
                  <div className="flex items-center justify-between pb-1 border-b border-border/50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        Recent Tool &amp; API Calls
                      </span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                        {activityLogs.length}
                      </Badge>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        void refreshActivity();
                      }}
                      disabled={activityLoading}
                      className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <RefreshCw className={cn("size-3", activityLoading && "animate-spin")} />
                      <span>Refresh</span>
                    </Button>
                  </div>

                  {/* Activity log items list */}
                  <div className="space-y-1.5 max-h-85 overflow-y-auto pr-1">
                    {activityLogs.map((logItem) => {
                      const mcpTool =
                        (logItem.data?.["toolName"] as string | undefined) ||
                        (logItem.data?.["tool"] as string | undefined);
                      const displayAction = mcpTool
                        ? mcpTool.startsWith("mcp:")
                          ? mcpTool
                          : `mcp:${mcpTool}`
                        : logItem.event || logItem.action || "api.request";

                      const rawStatus =
                        logItem.status ||
                        (logItem.data?.["status"] as string | undefined) ||
                        "success";
                      const itemStatus: "success" | "access_denied" | "error" =
                        rawStatus === "access_denied" || rawStatus === "error"
                          ? rawStatus
                          : "success";

                      const requiredScope =
                        (logItem.data?.["requiredScope"] as string | undefined) ||
                        (logItem.data?.["requiredPermission"] as string | undefined);

                      const errorMsg =
                        (logItem.data?.["error"] as string | undefined) ||
                        (logItem.data?.["errorMessage"] as string | undefined);

                      const durationMs =
                        typeof logItem.data?.["durationMs"] === "number"
                          ? logItem.data["durationMs"]
                          : undefined;

                      const timestamp = logItem.createdAt || logItem.timestamp;

                      return (
                        <div
                          key={logItem.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
                        >
                          {/* Left: Tool/Event badge */}
                          <div className="flex items-center gap-2 min-w-0">
                            <Badge
                              variant="outline"
                              className="text-[11px] font-mono gap-1.5 py-0.5 px-2 bg-background border-border/80 shrink-0 font-medium"
                            >
                              <Bot className="size-3 text-primary shrink-0" />
                              <span className="truncate max-w-44 sm:max-w-64">{displayAction}</span>
                            </Badge>
                          </div>

                          {/* Right: Status badge, duration, timestamp */}
                          <div className="flex items-center gap-2 shrink-0">
                            {durationMs !== undefined && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] font-mono px-1.5 py-0 text-muted-foreground bg-muted/80 font-normal shrink-0"
                              >
                                {durationMs}ms
                              </Badge>
                            )}
                            <ActivityStatusBadge
                              status={itemStatus}
                              requiredScope={requiredScope}
                              error={errorMsg}
                            />
                            <span className="text-[11px] text-muted-foreground whitespace-nowrap font-mono pl-1">
                              {formatDateTime(timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogBody>

        {/* Sticky Footer */}
        <DialogFooter>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="w-full sm:w-24"
            iconStart={<Check className="size-3.5" />}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
