"use client";

import { DialogDeleteConfirm } from "@cms/admin-shell";
import type { FormListItem } from "./formTypes";

interface FormDeleteDialogProps {
  target: FormListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function FormDeleteDialog({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: FormDeleteDialogProps) {
  return (
    <DialogDeleteConfirm
      open={Boolean(target)}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete Form Definition"
      itemTitle={target?.title}
      confirmLabel="Delete Form"
      description={
        target ? (
          <>
            Are you sure you want to delete form{" "}
            <strong className="text-foreground font-semibold">"{target.title}"</strong>? All
            associated fields and captured submissions will be permanently deleted.
          </>
        ) : undefined
      }
    />
  );
}
