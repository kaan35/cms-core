"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const icons: Record<ToastType, React.ReactNode> = {
  error: <XCircle className="h-4 w-4 text-destructive" />,
  info: <Info className="h-4 w-4 text-info" />,
  success: <CheckCircle className="h-4 w-4 text-success" />,
  warning: <AlertTriangle className="h-4 w-4 text-warning" />,
};

export function Toast({
  message,
  type = "info",
  duration = 5000,
  onClose,
}: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 200);
  };

  const role = type === "error" ? "alert" : "status";
  const ariaLive = type === "error" ? "assertive" : "polite";

  return (
    <div
      role={role}
      aria-live={ariaLive}
      aria-atomic="true"
      className={cn(
        "relative max-w-sm rounded-lg border border-border bg-card p-4 shadow-lg transition-all duration-200 ease-out",
        isExiting ? "translate-x-10 opacity-0" : "translate-x-0 opacity-100",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5" aria-hidden="true">
          {icons[type]}
        </span>
        <p className="text-sm flex-1 leading-normal text-foreground font-medium pr-4">
          {message}
        </p>
        <button
          onClick={handleClose}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
