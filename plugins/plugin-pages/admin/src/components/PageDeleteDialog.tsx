"use client";

import { DialogDeleteConfirm } from "@cms/admin-shell";
import type { PageListItem } from "../PageList";

interface PageDeleteDialogProps {
  target: PageListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PageDeleteDialog({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: PageDeleteDialogProps) {
  return (
    <DialogDeleteConfirm
      open={Boolean(target)}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete Page?"
      itemTitle={target?.title}
      confirmLabel="Delete Page"
      description={
        target ? (
          <>
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-semibold">"{target.title}"</strong>? This will
            remove the page and all of its blocks from the live site and system.
          </>
        ) : undefined
      }
    />
  );
}
