"use client";

import {
  Badge,
  Button,
  formatDateTime,
  InputSearchField,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useApi,
} from "@cms/admin-shell";
import { History, RefreshCw } from "lucide-react";
import * as React from "react";

interface AuditLog {
  id: string;
  action: string;
  userId?: string | undefined;
  userEmail?: string | undefined;
  resource?: string | undefined;
  ip?: string | undefined;
  timestamp: string;
}

interface ApiAuditItem {
  id: string;
  event?: string;
  action?: string;
  actorId?: string;
  userId?: string;
  userEmail?: string;
  resource?: string;
  data?: Record<string, unknown>;
  createdAt?: string;
  timestamp?: string;
}

interface AuditLogResponse {
  data?: ApiAuditItem[];
  logs?: ApiAuditItem[];
  total?: number;
}

export function AuditLogTable() {
  const [search, setSearch] = React.useState("");
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<AuditLogResponse | ApiAuditItem[]>("/api/audit-log");

  const rawList: ApiAuditItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.data)
      ? rawData.data
      : Array.isArray(rawData?.logs)
        ? rawData.logs
        : [];

  const logs: AuditLog[] = rawList.map((item) => {
    const actionName = item.event || item.action || "SYSTEM_EVENT";
    const resourceName = item.event
      ? item.event.split(".")[0] || "system"
      : item.resource || "system";
    const userDisplay =
      item.userEmail ||
      (item.data?.["userEmail"] as string | undefined) ||
      (item.actorId
        ? item.actorId.length > 12
          ? `${item.actorId.slice(0, 8)}...`
          : item.actorId
        : "System");
    const timeValue = item.createdAt || item.timestamp || new Date().toISOString();

    return {
      id: item.id,
      action: actionName,
      userEmail: userDisplay,
      userId: item.actorId || item.userId,
      resource: resourceName,
      timestamp: timeValue,
    };
  });

  const filteredLogs = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.userEmail && l.userEmail.toLowerCase().includes(search.toLowerCase())) ||
      (l.resource && l.resource.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Audit Log Trail</h2>
          <p className="text-xs text-muted-foreground">
            Immutable history of administrative actions and changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InputSearchField
            placeholder="Search logs..."
            value={search}
            onSearchChange={setSearch}
            containerClassName="w-56"
            className="h-8 text-xs"
          />
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center">
            <History className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground">No audit entries found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[25%]">Action</TableHead>
                <TableHead className="w-[30%]">User</TableHead>
                <TableHead className="w-[20%]">Resource</TableHead>
                <TableHead className="w-[25%] text-right">Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} className="text-xs font-mono">
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="font-sans text-foreground text-xs"
                    title={log.userId || log.userEmail}
                  >
                    {log.userEmail || "System"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {log.resource || "core"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-[11px]">
                    {formatDateTime(log.timestamp)}
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
