"use client";

import {
  api,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { Key, RefreshCw, ShieldAlert } from "lucide-react";
import * as React from "react";
import { RevokeSessionDialogs } from "./sessions/RevokeSessionDialogs";
import { SessionTableRow } from "./sessions/SessionTableRow";
import type { SessionItem } from "./sessions/sessionUtils";

export type { SessionItem } from "./sessions/sessionUtils";

export function SessionsList() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ sessions: SessionItem[] } | SessionItem[]>("/auth/sessions");

  const [revokingId, setRevokingId] = React.useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = React.useState<string | null>(null);
  const [revokeAllModalOpen, setRevokeAllModalOpen] = React.useState(false);
  const [isRevokingAll, setIsRevokingAll] = React.useState(false);

  const sessions: SessionItem[] = Array.isArray(rawData)
    ? rawData
    : Array.isArray(rawData?.sessions)
      ? rawData.sessions
      : [];

  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;
    const id = sessionToRevoke;
    setRevokingId(id);
    setSessionToRevoke(null);
    try {
      await api.delete(`/auth/sessions/${id}`);
      toast.success("Session terminated successfully!");
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke session";
      toast.error(msg);
    } finally {
      setRevokingId(null);
    }
  };

  const handleConfirmRevokeAllOther = async () => {
    setIsRevokingAll(true);
    try {
      await api.post("/auth/sessions/revoke-others");
      toast.success("All other sessions terminated successfully!");
      setRevokeAllModalOpen(false);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke other sessions";
      toast.error(msg);
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Active Sessions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your signed-in devices and active authentication tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>
          <Button
            variant="destructive"
            onClick={() => setRevokeAllModalOpen(true)}
            iconStart={<ShieldAlert />}
          >
            Revoke All Other Devices
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/70 border border-border/80 text-muted-foreground mb-3.5 shadow-2xs">
              <Key className="size-6 opacity-80" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">No active sessions</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              No authenticated device sessions were found for your account.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                <TableHead className="w-[35%]">Device & Browser</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created / Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <SessionTableRow
                  key={session.id}
                  session={session}
                  isRevoking={revokingId === session.id}
                  onRequestRevoke={setSessionToRevoke}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <RevokeSessionDialogs
        sessionToRevoke={sessionToRevoke}
        onCloseRevokeModal={() => setSessionToRevoke(null)}
        onConfirmRevoke={handleConfirmRevoke}
        revokeAllModalOpen={revokeAllModalOpen}
        onOpenChangeRevokeAll={setRevokeAllModalOpen}
        onConfirmRevokeAll={handleConfirmRevokeAllOther}
        isRevokingAll={isRevokingAll}
      />
    </div>
  );
}
