"use client";

import { Toast, ToastType } from "@/components/ui/Toast";
import React, { createContext, useCallback, useContext, useState } from "react";

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ShowToastOptions {
  message: string;
  type?: ToastType;
}

interface ToastContextType {
  /**
   * Display a toast notification
   *
   * @example
   * ```tsx
   * // Success message
   * showToast({ message: "User created successfully", type: "success" });
   *
   * // Error message
   * showToast({ message: "Failed to save", type: "error" });
   *
   * // Warning message
   * showToast({ message: "Email is required", type: "warning" });
   *
   * // Info message (default)
   * showToast({ message: "Processing your request..." });
   *
   * // With dynamic message
   * showToast({ message: err.message || "An error occurred", type: "error" });
   * ```
   */
  showToast: (options: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    ({ message, type = "info" }: ShowToastOptions) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Top Right, Stacked */}
      <div className="fixed top-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto animate-slideInRight"
          >
            <Toast
              message={toast.message}
              type={toast.type}
              onClose={() => removeToast(toast.id)}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
