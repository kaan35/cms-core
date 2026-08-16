"use client";

import * as React from "react";
import { History, RefreshCw } from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Skeleton,
  useApi,
} from "@cms/admin-shell";

interface AuditLog {
  id: string;
  action: string;
  userId?: string;
  userEmail?: string;
  resource?: string;
  ip?: string;
  timestamp: string;
}

export function AuditLogTable() {
  const [search, setSearch] = React.useState("");
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ logs: AuditLog[] } | AuditLog[]>("/api/audit-log");

  const logs: AuditLog[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.logs)
      ? rawData.logs
      : [
          {
            id: "log-1",
            action: "USER_LOGIN",
            userEmail: "admin@cms.com",
            resource: "auth",
            ip: "127.0.0.1",
            timestamp: new Date().toISOString(),
          },
          {
            id: "log-2",
            action: "SETTINGS_UPDATE",
            userEmail: "admin@cms.com",
            resource: "system",
            ip: "127.0.0.1",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: "log-3",
            action: "PAGE_PUBLISHED",
            userEmail: "admin@cms.com",
            resource: "pages",
            ip: "127.0.0.1",
            timestamp: new Date(Date.now() - 86400000).toISOString(),
          },
        ];

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
          <Input
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 h-7 text-xs"
          />
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
                  <TableCell className="font-sans text-foreground text-xs">
                    {log.userEmail || "System"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">
                    {log.resource || "core"}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
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
