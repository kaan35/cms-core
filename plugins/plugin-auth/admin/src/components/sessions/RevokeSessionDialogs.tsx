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
} from "@cms/admin-shell";
import { ShieldAlert, Trash2, X } from "lucide-react";

interface RevokeSessionDialogsProps {
  sessionToRevoke: string | null;
  onCloseRevokeModal: () => void;
  onConfirmRevoke: () => void;
  revokeAllModalOpen: boolean;
  onOpenChangeRevokeAll: (open: boolean) => void;
  onConfirmRevokeAll: () => void;
  isRevokingAll: boolean;
}

export function RevokeSessionDialogs({
  sessionToRevoke,
  onCloseRevokeModal,
  onConfirmRevoke,
  revokeAllModalOpen,
  onOpenChangeRevokeAll,
  onConfirmRevokeAll,
  isRevokingAll,
}: RevokeSessionDialogsProps) {
  return (
    <>
      {/* AlertDialog: Single Session Revoke */}
      <AlertDialog
        open={Boolean(sessionToRevoke)}
        onOpenChange={(open) => {
          if (!open) onCloseRevokeModal();
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
            <AlertDialogCancel className="h-8 text-xs gap-1.5" onClick={onCloseRevokeModal}>
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onConfirmRevoke} className="gap-1.5">
              <Trash2 className="size-3.5" />
              <span>Terminate Session</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog: Revoke All Other Sessions */}
      <AlertDialog open={revokeAllModalOpen} onOpenChange={onOpenChangeRevokeAll}>
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
            <AlertDialogCancel
              className="h-8 text-xs gap-1.5"
              onClick={() => onOpenChangeRevokeAll(false)}
            >
              <X className="size-3.5" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isRevokingAll}
              onClick={onConfirmRevokeAll}
              className="gap-1.5"
            >
              <ShieldAlert className="size-3.5" />
              <span>{isRevokingAll ? "Revoking..." : "Sign Out All Other Devices"}</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
