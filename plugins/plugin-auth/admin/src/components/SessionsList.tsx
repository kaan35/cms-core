"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  apiClient,
  Badge,
  Button,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  toast,
  useApi,
} from "@cms/admin-shell";
import { Globe, Key, Laptop, RefreshCw, ShieldAlert, Smartphone, Trash2, X } from "lucide-react";
import * as React from "react";

export interface SessionItem {
  id: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
  current?: boolean;
  isCurrent?: boolean;
  isActive?: boolean;
  expiresAt: string;
  createdAt: string;
  lastActiveAt?: string;
}

export function SessionsList() {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ sessions: SessionItem[] } | SessionItem[]>("/api/auth/sessions");

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
      await apiClient(`/api/auth/sessions/${id}`, { method: "DELETE" });
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
      await apiClient("/api/auth/sessions/revoke-others", { method: "POST" });
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

  const formatDeviceName = (ua = "") => {
    if (!ua) return "Unknown Device";
    let browser = "Web Browser";
    let os = "Desktop";

    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Safari/")) browser = "Safari";

    if (ua.includes("iPhone")) os = "iOS";
    else if (ua.includes("iPad")) os = "iPadOS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Linux")) os = "Linux";

    return `${browser} (${os})`;
  };

  const getDeviceIcon = (userAgent = "") => {
    const ua = userAgent.toLowerCase();
    if (ua.includes("mobile") || ua.includes("android") || ua.includes("iphone")) {
      return Smartphone;
    }
    if (ua.includes("mac") || ua.includes("windows") || ua.includes("linux")) {
      return Laptop;
    }
    return Globe;
  };

  const isSessionActive = (session: SessionItem) => {
    if (session.isActive !== undefined) return session.isActive;
    return new Date(session.expiresAt).getTime() > Date.now();
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Active Sessions</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your signed-in devices and active authentication tokens
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => mutate()}
            className="gap-1.5 text-xs h-8"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setRevokeAllModalOpen(true)}
            className="gap-1.5 text-xs h-8"
          >
            <ShieldAlert className="size-3.5" />
            <span>Revoke All Other Devices</span>
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center">
            <Key className="size-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-xs font-medium text-foreground">No active sessions</p>
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
              {sessions.map((session) => {
                const Icon = getDeviceIcon(session.userAgent);
                const active = isSessionActive(session);
                const isCurrent = Boolean(session.current || session.isCurrent);

                return (
                  <TableRow key={session.id} className="text-xs">
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
                              <Badge
                                variant="default"
                                className="text-[10px] px-1.5 py-0 bg-primary"
                              >
                                Current
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-muted-foreground">
                      {session.ip || "—"}
                    </TableCell>
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
                          disabled={revokingId === session.id}
                          onClick={() => setSessionToRevoke(session.id)}
                          className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Terminate Session"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">
                          Current Session
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* AlertDialog: Single Session Revoke */}
      <AlertDialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => {
          if (!open) setSessionToRevoke(null);
        }}
      >
        <AlertDialogContent>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-1">
            <Trash2 className="size-5" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminate Session</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to terminate this session? The device will be signed out
              immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSessionToRevoke(null)}>
              <X />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleConfirmRevoke}
              className="gap-1.5"
            >
              <Trash2 className="size-3.5" />
              <span>Terminate Session</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Revoke All Other Sessions */}
      <AlertDialog open={revokeAllModalOpen} onOpenChange={setRevokeAllModalOpen}>
        <AlertDialogContent>
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-1">
            <ShieldAlert className="size-5" />
          </div>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign Out All Other Devices</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out all other devices? All other active logins except
              your current session will be revoked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRevokeAllModalOpen(false)}>
              <X />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevokingAll}
              onClick={handleConfirmRevokeAllOther}
              className="gap-1.5"
            >
              <ShieldAlert className="size-3.5" />
              <span>{isRevokingAll ? "Revoking..." : "Sign Out All Other Devices"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
