"use client";

import { DialogDeleteConfirm } from "@cms/admin-shell";
import type { BlogPostListItem } from "./blogTypes";

interface BlogPostDeleteDialogProps {
  target: BlogPostListItem | null;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BlogPostDeleteDialog({
  target,
  isDeleting,
  onClose,
  onConfirm,
}: BlogPostDeleteDialogProps) {
  return (
    <DialogDeleteConfirm
      open={Boolean(target)}
      onClose={onClose}
      onConfirm={onConfirm}
      isDeleting={isDeleting}
      title="Delete Blog Post"
      itemTitle={target?.title}
      confirmLabel="Delete Post"
      description={
        target ? (
          <>
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-semibold">"{target.title}"</strong>? This action
            cannot be undone and will remove the post and its version history.
          </>
        ) : undefined
      }
    />
  );
}
