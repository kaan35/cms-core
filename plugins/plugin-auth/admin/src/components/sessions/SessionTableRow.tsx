"use client";

import { Badge, Button, TableCell, TableRow } from "@cms/admin-shell";
import { Trash2 } from "lucide-react";
import { formatDeviceName, getDeviceIcon, isSessionActive, type SessionItem } from "./sessionUtils";

interface SessionTableRowProps {
  session: SessionItem;
  isRevoking: boolean;
  onRequestRevoke: (id: string) => void;
}

export function SessionTableRow({ session, isRevoking, onRequestRevoke }: SessionTableRowProps) {
  const Icon = getDeviceIcon(session.userAgent);
  const active = isSessionActive(session);
  const isCurrent = Boolean(session.current || session.isCurrent);

  return (
    <TableRow className="text-xs">
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/60 text-muted-foreground">
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground truncate max-w-[220px]">
                {formatDeviceName(session.userAgent)}
              </span>
              {isCurrent && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary">
                  Current
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-muted-foreground">{session.ip || "—"}</TableCell>
      <TableCell>
        {active ? (
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
        <div>Created: {new Date(session.createdAt).toLocaleDateString()}</div>
        <div className="text-[10px] opacity-70">
          Expires: {new Date(session.expiresAt).toLocaleDateString()}
        </div>
      </TableCell>
      <TableCell className="text-right">
        {!isCurrent ? (
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
          <span className="text-[11px] text-muted-foreground italic">Current Session</span>
        )}
      </TableCell>
    </TableRow>
  );
}
