import { AlertTriangle, ArrowLeft, Trash, X } from "lucide-react";
import React from "react";
import { Button } from "./Button";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Content Container */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-zinc-900/90 p-6 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex gap-4">
          <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white leading-none">{title}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">{message}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3 border-t border-white/5 pt-4">
          <Button icon={ArrowLeft} variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button
            variant="danger"
            icon={Trash}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
