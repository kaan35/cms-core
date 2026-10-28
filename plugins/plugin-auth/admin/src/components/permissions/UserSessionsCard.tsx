"use client";

import {
  api,
  Button,
  DialogConfirm,
  Skeleton,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  useApi,
} from "@cms/admin-shell";
import { History, Key, Laptop, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import * as React from "react";
import { SessionTableRow } from "../sessions/SessionTableRow";
import { isSessionActive, type SessionItem } from "../sessions/sessionUtils";

export interface UserSessionsCardProps {
  userId: string;
  userEmail: string;
}

export function UserSessionsCard({ userId, userEmail }: UserSessionsCardProps) {
  const {
    data: rawData,
    isLoading,
    mutate,
  } = useApi<{ sessions: SessionItem[] } | SessionItem[]>(
    userId ? `/users/${userId}/sessions` : null,
  );

  const [sessionToRevoke, setSessionToRevoke] = React.useState<string | null>(null);
  const [isRevoking, setIsRevoking] = React.useState(false);
  const [revokeAllModalOpen, setRevokeAllModalOpen] = React.useState(false);
  const [isRevokingAll, setIsRevokingAll] = React.useState(false);

  const sessions: SessionItem[] = React.useMemo(() => {
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData?.sessions)) return rawData.sessions;
    return [];
  }, [rawData]);

  const activeSessions = React.useMemo(() => {
    return sessions.filter((s) => isSessionActive(s) && s.status !== "revoked");
  }, [sessions]);

  const historySessions = React.useMemo(() => {
    return sessions.filter((s) => !isSessionActive(s) || s.status === "revoked");
  }, [sessions]);

  const handleConfirmRevoke = async () => {
    if (!sessionToRevoke) return;
    const sessionId = sessionToRevoke;
    setIsRevoking(true);
    try {
      await api.delete(`/users/${userId}/sessions/${sessionId}`);
      toast.success("User session terminated successfully");
      setSessionToRevoke(null);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to terminate user session";
      toast.error(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleConfirmRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      await api.post(`/users/${userId}/sessions/revoke-all`);
      toast.success("All sessions terminated for this user");
      setRevokeAllModalOpen(false);
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke all user sessions";
      toast.error(msg);
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Laptop className="size-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              User Sessions & Device History
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signed-in devices and authentication lifecycle history for{" "}
            <span className="font-medium text-foreground">{userEmail || "user"}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="xs" onClick={() => mutate()} iconStart={<RefreshCw />}>
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="xs"
            disabled={activeSessions.length === 0 || isRevokingAll}
            onClick={() => setRevokeAllModalOpen(true)}
            iconStart={<ShieldAlert />}
          >
            Terminate All Sessions
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Laptop className="size-3.5" />
            <span>Active Sessions ({activeSessions.length})</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-3.5" />
            <span>Session History ({historySessions.length})</span>
          </TabsTrigger>
        </TabsList>

        {/* Active Sessions Panel */}
        <TabsContent value="active">
          <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : activeSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 py-12 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/70 border border-border/80 text-muted-foreground mb-2.5 shadow-2xs">
                  <Key className="size-5 opacity-80" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">No active sessions</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  This user currently has no active device sessions.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="w-[35%]">Device & Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Activity & Lifetime</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeSessions.map((session) => (
                    <SessionTableRow
                      key={session.id}
                      session={session}
                      isRevoking={isRevoking && sessionToRevoke === session.id}
                      onRequestRevoke={(id) => setSessionToRevoke(id)}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        {/* History Panel */}
        <TabsContent value="history">
          <div className="rounded-xl border border-border/60 bg-muted/10 overflow-hidden">
            {isLoading ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : historySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 py-12 text-center">
                <div className="flex size-10 items-center justify-center rounded-xl bg-muted/70 border border-border/80 text-muted-foreground mb-2.5 shadow-2xs">
                  <History className="size-5 opacity-80" />
                </div>
                <h4 className="text-xs font-semibold text-foreground">No session history</h4>
                <p className="text-[11px] text-muted-foreground mt-1 max-w-xs mx-auto leading-relaxed">
                  No previous or terminated sessions found for this user.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40 text-[11px]">
                    <TableHead className="w-[35%]">Device & Browser</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Status / Reason</TableHead>
                    <TableHead>Activity & Lifetime</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historySessions.map((session) => (
                    <SessionTableRow
                      key={session.id}
                      session={session}
                      isRevoking={false}
                      onRequestRevoke={() => {}}
                      showRevokeAction={false}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialogs */}
      <DialogConfirm
        open={Boolean(sessionToRevoke)}
        onClose={() => setSessionToRevoke(null)}
        onConfirm={handleConfirmRevoke}
        title="Terminate User Session"
        description="Are you sure you want to terminate this user session? The user's device will be signed out immediately."
        confirmLabel="Terminate Session"
        confirmIcon={<Trash2 />}
        confirmVariant="destructive"
        isLoading={isRevoking}
      />

      <DialogConfirm
        open={revokeAllModalOpen}
        onClose={() => setRevokeAllModalOpen(false)}
        onConfirm={handleConfirmRevokeAll}
        title="Terminate All User Sessions"
        description={`Are you sure you want to terminate all active sessions for ${userEmail || "this user"}? They will be signed out from all devices.`}
        confirmLabel="Terminate All Sessions"
        confirmIcon={<ShieldAlert />}
        confirmVariant="destructive"
        isLoading={isRevokingAll}
      />
    </div>
  );
}
