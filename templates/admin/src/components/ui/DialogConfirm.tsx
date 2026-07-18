"use client";

import {
  AlertTriangle,
  Check,
  Info,
  LucideIcon,
  Trash2,
  X,
} from "lucide-react";
import React from "react";
import { Button } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./Dialog";

export interface DialogConfirmProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  // Customization props to support various confirmation scenarios (e.g., active/passive, publish, delete)
  variant?: "default" | "destructive" | "warning";
  icon?: LucideIcon;
  confirmIcon?: LucideIcon;
}

const variantStyles = {
  default: {
    btnVariant: "primary" as const,
    defaultConfirmIcon: Check,
    defaultIcon: Info,
    iconBg: "border-primary/30 bg-primary/10 text-primary",
  },
  destructive: {
    btnVariant: "danger" as const,
    defaultConfirmIcon: Trash2,
    defaultIcon: AlertTriangle,
    iconBg: "border-destructive/30 bg-destructive/10 text-destructive",
  },
  warning: {
    btnVariant: "primary" as const,
    defaultConfirmIcon: Check,
    defaultIcon: AlertTriangle,
    iconBg: "border-warning/30 bg-warning/10 text-warning",
  },
};

export const DialogConfirm: React.FC<DialogConfirmProps> = ({
  isOpen,
  title = "Are you sure?",
  message,
  confirmText = "Continue",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  variant = "default",
  icon: CustomIcon,
  confirmIcon: CustomConfirmIcon,
}) => {
  const styles = variantStyles[variant];
  const Icon = CustomIcon || styles.defaultIcon;
  const ConfirmIcon = CustomConfirmIcon || styles.defaultConfirmIcon;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent showCloseButton={true} className="max-w-md">
        <DialogHeader className="flex-row items-start gap-4 space-y-0 text-left">
          <div
            className={`h-10 w-10 rounded-md border flex items-center justify-center shrink-0 ${styles.iconBg}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <DialogTitle className="text-base font-semibold leading-tight tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter>
          <Button variant="ghost" icon={X} onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant={styles.btnVariant}
            icon={ConfirmIcon}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
