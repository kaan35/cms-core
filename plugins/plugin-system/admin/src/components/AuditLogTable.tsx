"use client";

import {
  Badge,
  Button,
  cn,
  formatDateTime,
  InputSearchField,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  useApi,
} from "@cms/admin-shell";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  History,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import * as React from "react";
import { AuditLogDetailDialog, type ApiAuditItem } from "./AuditLogDetailDialog";

interface AuditLogRow {
  id: string;
  action: string;
  userId?: string | undefined;
  userEmail?: string | undefined;
  tokenName?: string | undefined;
  tokenPrefix?: string | undefined;
  resource?: string | undefined;
  ip?: string | undefined;
  timestamp: string;
  actorType?: "user" | "agent" | "system" | undefined;
  tokenId?: string | undefined;
  mcpToolName?: string | undefined;
  status?: "success" | "access_denied" | "error" | undefined;
  requiredScope?: string | undefined;
  error?: string | undefined;
  raw: ApiAuditItem;
}

interface AuditLogResponse {
  data?: ApiAuditItem[];
  logs?: ApiAuditItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
}

function StatusBadge({ log }: { log: AuditLogRow }) {
  const status = log.status || "success";

  if (status === "access_denied") {
    const tooltipText = log.requiredScope
      ? `Missing permission: ${log.requiredScope}`
      : log.error || "Access Denied";
    return (
      <Tooltip content={tooltipText}>
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
    const tooltipText = log.error || "Execution error";
    return (
      <Tooltip content={tooltipText}>
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

export function AuditLogTable() {
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [search, setSearch] = React.useState("");
  const [actorType, setActorType] = React.useState<string>("all");
  const [status, setStatus] = React.useState<string>("all");
  const [selectedLog, setSelectedLog] = React.useState<ApiAuditItem | null>(null);
  const [detailModalOpen, setDetailModalOpen] = React.useState(false);

  // Construct URL with server-side pagination, filters & search
  const apiUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(limit));
    if (actorType !== "all") {
      params.set("actorType", actorType);
    }
    if (status !== "all") {
      params.set("status", status);
    }
    if (search.trim()) {
      params.set("search", search.trim());
      if (typeof window !== "undefined") {
        try {
          const clientTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (clientTz) {
            params.set("tz", clientTz);
          }
        } catch {
          // Fallback gracefully
        }
      }
    }
    return `/api/audit-log?${params.toString()}`;
  }, [page, limit, search, actorType, status]);

  const { data: rawData, isLoading, mutate } = useApi<AuditLogResponse>(apiUrl);

  const rawList: ApiAuditItem[] = Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData?.logs)
      ? rawData.logs
      : Array.isArray(rawData)
        ? (rawData as ApiAuditItem[])
        : [];

  const totalCount = rawData?.meta?.total ?? rawData?.total ?? rawList.length;
  const totalPages = rawData?.meta?.totalPages ?? Math.max(1, Math.ceil(totalCount / limit));

  const logs: AuditLogRow[] = rawList.map((item) => {
    const actionName = item.event || item.action || "SYSTEM_EVENT";
    const resourceName = item.event
      ? item.event.split(".")[0] || "system"
      : item.resource || "system";

    const mcpTool =
      (item.data?.["toolName"] as string | undefined) ||
      (item.data?.["tool"] as string | undefined);

    const isAgent =
      item.actorType === "agent" || actionName === "mcp.tool_executed" || Boolean(mcpTool);

    const tokenName = item.tokenName || (item.data?.["tokenName"] as string | undefined);
    const tokenPrefix = item.tokenPrefix || (item.data?.["tokenPrefix"] as string | undefined);

    let userDisplay: string;
    if (isAgent) {
      if (tokenName) {
        userDisplay = tokenName;
      } else if (tokenPrefix) {
        userDisplay = tokenPrefix;
      } else if (item.tokenId) {
        const cleanId = String(item.tokenId).replace("api-token:", "");
        userDisplay = `Token (${cleanId.slice(0, 8)}...)`;
      } else {
        userDisplay = "AI Agent";
      }
    } else {
      userDisplay =
        item.userEmail ||
        (item.data?.["userEmail"] as string | undefined) ||
        (item.actorId
          ? item.actorId.length > 12
            ? `${item.actorId.slice(0, 8)}...`
            : item.actorId
          : "System");
    }

    const timeValue = item.createdAt || item.timestamp || new Date().toISOString();

    const rawStatus = item.status || (item.data?.["status"] as string | undefined) || "success";
    const rowStatus: "success" | "access_denied" | "error" =
      rawStatus === "access_denied" || rawStatus === "error" ? rawStatus : "success";

    const requiredScope =
      (item.data?.["requiredScope"] as string | undefined) ||
      (item.data?.["requiredPermission"] as string | undefined);

    const errorMsg =
      (item.data?.["error"] as string | undefined) ||
      (item.data?.["errorMessage"] as string | undefined);

    return {
      id: item.id,
      action: actionName,
      userEmail: userDisplay,
      userId: item.actorId || item.userId,
      tokenName: tokenName || undefined,
      tokenPrefix: tokenPrefix || undefined,
      resource: resourceName,
      timestamp: timeValue,
      actorType: isAgent ? "agent" : item.actorType,
      tokenId: item.tokenId,
      mcpToolName: mcpTool,
      status: rowStatus,
      requiredScope,
      error: errorMsg,
      raw: item,
    };
  });

  const isFiltered = actorType !== "all" || status !== "all" || search.trim() !== "";

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to page 1 on search change
  };

  const handleActorTypeChange = (val: string) => {
    setActorType(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setStatus(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setActorType("all");
    setStatus("all");
    setSearch("");
    setPage(1);
  };

  const handleOpenDetail = (log: ApiAuditItem) => {
    setSelectedLog(log);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Top Header & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Audit Log Trail</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable history of administrative actions, security events, and AI agent executions.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <InputSearchField
            placeholder="Search logs (action, actor, tool)..."
            value={search}
            onSearchChange={handleSearchChange}
            containerClassName="w-48 sm:w-56"
            className="h-8 text-xs"
          />

          {/* Actor Type Dropdown Selector */}
          <div className="w-32">
            <Select
              value={actorType}
              onValueChange={(val) => {
                if (val !== null && val !== undefined) {
                  handleActorTypeChange(String(val));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs min-w-32 w-full">
                <SelectValue placeholder="All Actors">
                  {(val: unknown) => {
                    switch (val) {
                      case "agent":
                        return "AI Agents";
                      case "user":
                        return "Users Only";
                      case "system":
                        return "System";
                      default:
                        return "All Actors";
                    }
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actors</SelectItem>
                <SelectItem value="agent">AI Agents</SelectItem>
                <SelectItem value="user">Users Only</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Dropdown Selector */}
          <div className="w-36">
            <Select
              value={status}
              onValueChange={(val) => {
                if (val !== null && val !== undefined) {
                  handleStatusChange(String(val));
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs min-w-36 w-full">
                <SelectValue placeholder="All Statuses">
                  {(val: unknown) => {
                    switch (val) {
                      case "success":
                        return "Success";
                      case "access_denied":
                        return "Access Denied";
                      case "error":
                        return "Error";
                      default:
                        return "All Statuses";
                    }
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="access_denied">Access Denied</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Filters Button */}
          {isFiltered && (
            <Tooltip content="Reset all filters">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
              >
                <RotateCcw className="size-3 mr-1" />
                Reset
              </Button>
            </Tooltip>
          )}

          <Tooltip content="Refresh audit logs">
            <Button
              variant="outline"
              size="icon"
              onClick={() => mutate()}
              className="size-8 shrink-0"
              aria-label="Refresh audit logs"
            >
              <RefreshCw className="size-3.5" />
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <History className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground">No audit entries found</p>
            {isFiltered ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  No logs match the current filter criteria.
                </p>
                <Button
                  variant="outline"
                  size="xs"
                  onClick={handleResetFilters}
                  className="text-xs"
                >
                  <RotateCcw className="size-3 mr-1" />
                  Reset Filters
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[26%]">Action</TableHead>
                <TableHead className="w-[14%]">Status</TableHead>
                <TableHead className="w-[24%]">Actor</TableHead>
                <TableHead className="w-[14%]">Resource</TableHead>
                <TableHead className="w-[16%] text-right">Timestamp</TableHead>
                <TableHead className="w-[6%] text-center">View</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow
                  key={log.id}
                  className="text-xs font-mono cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleOpenDetail(log.raw)}
                >
                  <TableCell>
                    {log.mcpToolName ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25"
                        >
                          <Bot className="size-2.5" />
                          mcp:{log.mcpToolName}
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        {log.action}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge log={log} />
                  </TableCell>
                  <TableCell
                    className="font-sans text-foreground text-xs"
                    title={
                      log.tokenName
                        ? `${log.tokenName} (${log.tokenPrefix || log.tokenId || ""})`
                        : log.userId || log.userEmail
                    }
                  >
                    {log.actorType === "agent" ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge
                          variant="secondary"
                          className="text-[9px] gap-1 px-1.5 py-0.5 bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 shrink-0 font-medium"
                        >
                          <Bot className="size-2.5" />
                          Agent
                        </Badge>
                        <span className="font-medium text-foreground text-xs truncate max-w-40">
                          {log.tokenName || log.userEmail}
                        </span>
                        {log.tokenPrefix && !log.tokenName && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {log.tokenPrefix}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="truncate max-w-44 block">{log.userEmail || "System"}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    <Badge
                      variant="outline"
                      className="text-[10px] text-muted-foreground font-sans"
                    >
                      {log.resource || "core"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-[11px]">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <Tooltip content="View audit log details">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground hover:text-foreground mx-auto"
                        onClick={() => handleOpenDetail(log.raw)}
                        aria-label="View audit details"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination & Rows Per Page Footer */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/20 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing{" "}
                <strong className="font-semibold text-foreground">
                  {totalCount === 0 ? 0 : (page - 1) * limit + 1}
                </strong>{" "}
                to{" "}
                <strong className="font-semibold text-foreground">
                  {Math.min(page * limit, totalCount)}
                </strong>{" "}
                of <strong className="font-semibold text-foreground">{totalCount}</strong> logs
              </span>
              <div className="flex items-center gap-1 border-l border-border/60 pl-3">
                <span className="text-[11px]">Per page:</span>
                {[25, 50, 100].map((size) => (
                  <Button
                    key={size}
                    variant={limit === size ? "secondary" : "ghost"}
                    size="xs"
                    className={cn(
                      "h-6 px-2 text-[11px]",
                      limit === size &&
                        "font-semibold text-foreground bg-muted border border-border/80 shadow-2xs",
                    )}
                    onClick={() => {
                      setLimit(size);
                      setPage(1);
                    }}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs mr-1">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(1)}
                disabled={page <= 1}
                title="First Page"
                aria-label="First page"
              >
                <ChevronsLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                title="Previous Page"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                title="Next Page"
                aria-label="Next page"
              >
                <ChevronRight className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                title="Last Page"
                aria-label="Last page"
              >
                <ChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AuditLogDetailDialog
        log={selectedLog}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
      />
    </div>
  );
}
