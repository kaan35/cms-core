"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
} from "@cms/admin-shell";
import { Trash2, X } from "lucide-react";
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
    <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold text-foreground">
            Delete Blog Post
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Are you sure you want to delete{" "}
            <strong className="text-foreground font-semibold">"{target?.title}"</strong>? This
            action cannot be undone and will remove the post and its version history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
          <AlertDialogCancel disabled={isDeleting} className="gap-1.5">
            <X className="size-3.5" />
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={onConfirm}
            loading={isDeleting}
            iconStart={<Trash2 />}
          >
            {isDeleting ? "Deleting..." : "Delete Post"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
