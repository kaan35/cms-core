"use client";

import { Trash2, X } from "lucide-react";
import * as React from "react";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export interface DialogConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: React.ReactNode;
  description: React.ReactNode;
  confirmLabel?: string | undefined;
  cancelLabel?: string | undefined;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | undefined;
  confirmIcon?: React.ReactNode | undefined;
  isLoading?: boolean | undefined;
}

/**
 * Standardized confirmation modal dialog using Alert Dialog semantics.
 */
export function DialogConfirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  confirmIcon,
  isLoading = false,
}: DialogConfirmProps) {
  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && onClose()}>
      <AlertDialogContent className="max-w-md p-5 rounded-2xl bg-card border-border/80 shadow-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-sm font-semibold text-foreground">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 border-t border-border/60 pt-3">
          <AlertDialogCancel disabled={isLoading} className="gap-1.5" onClick={onClose}>
            <X className="size-3.5" />
            {cancelLabel}
          </AlertDialogCancel>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            loading={isLoading}
            iconStart={confirmIcon}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export interface DialogDeleteConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean | undefined;
  title?: string | undefined;
  itemTitle?: string | undefined;
  description?: React.ReactNode | undefined;
  confirmLabel?: string | undefined;
}

/**
 * Pre-configured destructive deletion confirmation modal dialog.
 */
export function DialogDeleteConfirm({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
  title = "Delete Item",
  itemTitle,
  description,
  confirmLabel = "Delete",
}: DialogDeleteConfirmProps) {
  const defaultDesc = itemTitle ? (
    <>
      Are you sure you want to delete{" "}
      <strong className="text-foreground font-semibold">"{itemTitle}"</strong>? This action cannot
      be undone and will permanently remove this resource.
    </>
  ) : (
    "Are you sure you want to proceed? This action cannot be undone."
  );

  return (
    <DialogConfirm
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description || defaultDesc}
      confirmLabel={confirmLabel}
      confirmVariant="destructive"
      confirmIcon={<Trash2 className="size-3.5" />}
      isLoading={isDeleting}
    />
  );
}
