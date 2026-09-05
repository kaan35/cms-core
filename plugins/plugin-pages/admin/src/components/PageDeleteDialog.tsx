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
    <AlertDialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Page?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{target?.title}&quot;? This will remove the page
            and all of its blocks from the live site and system.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting} className="gap-1.5" onClick={onClose}>
            <X className="size-3.5" />
            Cancel
          </AlertDialogCancel>
          <Button
            variant="destructive"
            loading={isDeleting}
            iconStart={<Trash2 />}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting..." : "Delete Page"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
