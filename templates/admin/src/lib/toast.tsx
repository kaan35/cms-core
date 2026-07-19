"use client";

import { Toast, type ToastType } from "@/components/ui/Toast";
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

export interface ToastConfig {
  duration?: number;
  maxToasts?: number;
  showProgress?: boolean;
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
   * ```
   */
  showToast: (options: ShowToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({
  children,
  config = {},
}: {
  children: React.ReactNode;
  config?: ToastConfig;
}) {
  const { duration = 4000, maxToasts = 3, showProgress = true } = config;
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    ({ message, type = "info" }: ShowToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => {
        // Max visible toasts (stack behavior)
        const newToasts = [{ id, message, type }, ...prev];
        return newToasts.slice(0, maxToasts);
      });
    },
    [maxToasts],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container - Top Right, Stacked */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast, index) => (
          <div
            key={toast.id}
            className="pointer-events-auto"
            style={{
              opacity: 1 - index * 0.2,
              transform: `scale(${1 - index * 0.05}) translateY(${index * -8}px)`,
              transition: "all 0.2s ease-out",
              zIndex: 100 - index,
            }}
          >
            <Toast
              id={toast.id}
              message={toast.message}
              type={toast.type}
              onClose={removeToast}
              showProgress={showProgress}
              duration={duration}
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
