"use client";

import { DialogConfirm } from "@cms/admin-shell";
import { ShieldAlert, Trash2 } from "lucide-react";

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
      <DialogConfirm
        open={Boolean(sessionToRevoke)}
        onClose={onCloseRevokeModal}
        onConfirm={onConfirmRevoke}
        title="Terminate Session"
        description="Are you sure you want to terminate this session? The device will be signed out immediately."
        confirmLabel="Terminate Session"
        confirmIcon={<Trash2 />}
        confirmVariant="destructive"
      />

      <DialogConfirm
        open={revokeAllModalOpen}
        onClose={() => onOpenChangeRevokeAll(false)}
        onConfirm={onConfirmRevokeAll}
        title="Sign Out All Other Devices"
        description="Are you sure you want to sign out all other devices? All other active logins except your current session will be revoked."
        confirmLabel={isRevokingAll ? "Revoking..." : "Sign Out All Other Devices"}
        confirmIcon={<ShieldAlert />}
        confirmVariant="destructive"
        isLoading={isRevokingAll}
      />
    </>
  );
}
