"use client";

import {
  Badge,
  Button,
  cn,
  formatDate,
  formatRelativeTime,
  TableCell,
  TableRow,
} from "@cms/admin-shell";
import { Trash2 } from "lucide-react";
import { formatDeviceName, getDeviceIcon, isSessionActive, type SessionItem } from "./sessionUtils";

interface SessionTableRowProps {
  session: SessionItem;
  isRevoking: boolean;
  onRequestRevoke: (id: string) => void;
  showRevokeAction?: boolean;
}

export function SessionTableRow({
  session,
  isRevoking,
  onRequestRevoke,
  showRevokeAction = true,
}: SessionTableRowProps) {
  const Icon = getDeviceIcon(session.userAgent);
  const active = isSessionActive(session);
  const isCurrent = Boolean(session.current || session.isCurrent);
  const isRevoked = session.status === "revoked";

  return (
    <TableRow
      className={cn(
        "text-xs transition-colors",
        isCurrent
          ? "bg-primary/[0.04] dark:bg-primary/[0.08] hover:bg-primary/[0.07] border-l-2 border-l-primary"
          : "hover:bg-muted/40",
      )}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg border",
              isCurrent
                ? "bg-primary/10 border-primary/30 text-primary ring-2 ring-primary/20 shadow-2xs"
                : "bg-muted/60 border-border/60 text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate max-w-55">
                {formatDeviceName(session.userAgent)}
              </span>
              {isCurrent && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30 px-2 py-0.5 gap-1.5 shadow-2xs"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  This Device (Current Session)
                </Badge>
              )}
            </div>
            {isCurrent && (
              <span className="text-[11px] text-muted-foreground block mt-0.5 font-normal">
                Your current active browser session
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{session.ip || "—"}</TableCell>
      <TableCell>
        {isRevoked ? (
          <div className="flex items-center gap-1.5 text-amber-500 font-medium">
            <span className="size-1.5 rounded-full bg-amber-500" />
            <span>
              Revoked
              {session.revokeReason ? (
                <span className="text-[10px] text-muted-foreground ml-1">
                  ({session.revokeReason.replace(/_/g, " ")})
                </span>
              ) : null}
            </span>
          </div>
        ) : isCurrent && active ? (
          <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Now (This Device)</span>
          </div>
        ) : active ? (
          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            <span>Expired</span>
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-[11px]">
        <div>Created: {formatDate(session.createdAt)}</div>
        {session.lastActiveAt && (
          <div className="text-[10px] text-foreground/80">
            Last active: {formatRelativeTime(session.lastActiveAt)}
            {typeof session.refreshCount === "number" && (
              <span className="opacity-75">
                {" "}
                ({session.refreshCount} {session.refreshCount === 1 ? "refresh" : "refreshes"})
              </span>
            )}
          </div>
        )}
        <div className="text-[10px] opacity-70">Expires: {formatDate(session.expiresAt)}</div>
      </TableCell>
      <TableCell className="text-right">
        {isCurrent ? (
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-medium text-primary bg-primary/10 border border-primary/20">
            Current Session
          </span>
        ) : active && showRevokeAction ? (
          <Button
            variant="ghost"
            size="icon"
            disabled={isRevoking}
            onClick={() => onRequestRevoke(session.id)}
            className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Terminate Session"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
