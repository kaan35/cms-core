"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatDateTime,
} from "@cms/admin-shell";
import {
  Bot,
  Check,
  Clock,
  Copy,
  FileCode,
  FileJson,
  Key,
  Layers,
  Server,
  User,
} from "lucide-react";
import * as React from "react";

export interface ApiAuditItem {
  id: string;
  event?: string;
  action?: string;
  actorId?: string;
  actorType?: "user" | "agent" | "system";
  tokenId?: string;
  tokenName?: string;
  tokenPrefix?: string;
  userId?: string;
  userEmail?: string;
  resource?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  timestamp?: string;
}

export interface AuditLogDetailDialogProps {
  log: ApiAuditItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditLogDetailDialog({ log, open, onOpenChange }: AuditLogDetailDialogProps) {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const eventName = log.event || log.action || "SYSTEM_EVENT";
  const resourceName = log.event ? log.event.split(".")[0] || "system" : log.resource || "system";
  const timestamp = log.createdAt || log.timestamp || new Date().toISOString();

  // Extract MCP specifics if available
  const isMcp =
    eventName === "mcp.tool_executed" ||
    log.actorType === "agent" ||
    Boolean(log.data?.["toolName"] || log.data?.["tool"]);

  const mcpToolName =
    (log.data?.["toolName"] as string | undefined) || (log.data?.["tool"] as string | undefined);
  const mcpDurationMs = log.data?.["durationMs"] as number | undefined;
  const mcpStatus = (log.data?.["status"] as string | undefined) || "success";
  const mcpParams =
    (log.data?.["params"] as Record<string, unknown> | undefined) ||
    (log.data?.["arguments"] as Record<string, unknown> | undefined);

  const tokenName = log.tokenName || (log.data?.["tokenName"] as string | undefined);
  const tokenPrefix = log.tokenPrefix || (log.data?.["tokenPrefix"] as string | undefined);
  const rawTokenId = log.tokenId || (log.data?.["tokenId"] as string | undefined);
  const cleanTokenId = rawTokenId?.startsWith("api-token:")
    ? rawTokenId.replace("api-token:", "")
    : rawTokenId;

  // Other payload data
  const payloadData = log.data ?? {};
  const hasPayload = Object.keys(payloadData).length > 0;

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API unavailable
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 flex flex-col max-h-[85vh] overflow-hidden">
        <DialogHeader className="p-5 pb-4 pr-12 border-b border-border/60 shrink-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isMcp && mcpToolName ? (
              <Badge
                variant="outline"
                className="font-mono text-xs gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
              >
                <Bot className="size-3" />
                mcp:{mcpToolName}
              </Badge>
            ) : (
              <Badge variant="outline" className="font-mono text-xs">
                {eventName}
              </Badge>
            )}

            <Badge variant="secondary" className="text-xs">
              {resourceName}
            </Badge>

            {isMcp && (
              <Badge
                variant={mcpStatus === "success" ? "outline" : "destructive"}
                className="text-[10px] uppercase font-mono"
              >
                {mcpStatus}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base font-semibold">Audit Log Details</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Clock className="size-3" />
            {formatDateTime(timestamp)}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex-1 overflow-y-auto overflow-x-hidden p-5 space-y-5">
          {/* Actor & Execution Context Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Actor Card */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                {log.actorType === "agent" ? (
                  <>
                    <Bot className="size-3.5 text-purple-500" />
                    AI Agent Actor
                  </>
                ) : log.userEmail ? (
                  <>
                    <User className="size-3.5 text-blue-500" />
                    User Actor
                  </>
                ) : (
                  <>
                    <Server className="size-3.5 text-zinc-500" />
                    System Actor
                  </>
                )}
              </span>

              {log.actorType === "agent" ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                    >
                      Autonomous Agent
                    </Badge>
                    {tokenName && (
                      <span className="text-xs font-semibold text-foreground">{tokenName}</span>
                    )}
                  </div>

                  {tokenPrefix && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground">
                      <Key className="size-3 text-muted-foreground shrink-0" />
                      <span>{tokenPrefix}</span>
                    </div>
                  )}

                  {log.userEmail && (
                    <p className="text-[11px] text-muted-foreground">
                      Authorized by: <span className="text-foreground">{log.userEmail}</span>
                    </p>
                  )}

                  {cleanTokenId && (
                    <p className="text-[10px] font-mono text-muted-foreground break-all">
                      Token ID: {cleanTokenId}
                    </p>
                  )}
                </div>
              ) : log.userEmail ? (
                <div className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground">{log.userEmail}</p>
                  {log.actorId && (
                    <p className="text-[10px] font-mono text-muted-foreground break-all">
                      ID: {log.actorId}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Automated System Process</p>
              )}
            </div>

            {/* Performance & Execution Card */}
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Layers className="size-3.5 text-primary" />
                Execution Metrics
              </span>

              <div className="space-y-1">
                {typeof mcpDurationMs === "number" ? (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Duration:</span>
                    <Badge variant="outline" className="font-mono text-[11px] font-semibold">
                      {mcpDurationMs} ms
                    </Badge>
                  </div>
                ) : null}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Resource:</span>
                  <span className="font-mono text-[11px] text-foreground">{resourceName}</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Record ID:</span>
                  <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[120px]">
                    {log.id}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* MCP Tool Parameters (if MCP) */}
          {isMcp && mcpParams && Object.keys(mcpParams).length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileCode className="size-3.5 text-purple-500" />
                  Tool Arguments & Parameters
                </span>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {Object.keys(mcpParams).length} argument(s)
                </span>
              </div>
              <div className="rounded-xl border border-border/70 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 overflow-x-auto shadow-inner">
                <pre className="text-[11px] leading-relaxed">
                  {JSON.stringify(mcpParams, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Full Payload / Data Inspector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <FileJson className="size-3.5 text-primary" />
                Event Payload & Metadata
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleCopyJson}
                iconStart={
                  copied ? (
                    <Check className="size-3 text-emerald-500" />
                  ) : (
                    <Copy className="size-3" />
                  )
                }
                className="h-6 text-[11px]"
              >
                {copied ? "Copied" : "Copy JSON"}
              </Button>
            </div>

            {hasPayload ? (
              <div className="rounded-xl border border-border/70 bg-zinc-950 p-3 font-mono text-xs text-zinc-200 overflow-x-auto shadow-inner max-h-56">
                <pre className="text-[11px] leading-relaxed">
                  {JSON.stringify(payloadData, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/10 p-4 text-center">
                <p className="text-xs text-muted-foreground">No additional payload attached.</p>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="p-4 px-6 border-t border-border/60 bg-muted/40 shrink-0 sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            iconStart={
              copied ? (
                <Check className="size-3.5 text-emerald-500" />
              ) : (
                <Copy className="size-3.5" />
              )
            }
          >
            {copied ? "Copied to Clipboard" : "Copy Raw JSON"}
          </Button>
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
