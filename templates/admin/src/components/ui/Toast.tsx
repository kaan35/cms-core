"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  OctagonXIcon,
  TriangleAlertIcon,
  X,
} from "lucide-react";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

const DURATION = 4000;

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  onClose: (id: string) => void;
  showProgress?: boolean;
  duration?: number;
}

const TOAST_CONFIG: Record<
  ToastType,
  { Icon: React.ElementType; iconClass: string }
> = {
  error: {
    Icon: OctagonXIcon,
    iconClass: "text-destructive",
  },
  info: {
    Icon: InfoIcon,
    iconClass: "text-info",
  },
  success: {
    Icon: CircleCheckIcon,
    iconClass: "text-success",
  },
  warning: {
    Icon: TriangleAlertIcon,
    iconClass: "text-warning",
  },
};

const PROGRESS_COLORS: Record<ToastType, string> = {
  error: "bg-destructive",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
};

export function Toast({
  id,
  message,
  type,
  onClose,
  showProgress = true,
  duration = DURATION,
}: ToastProps) {
  const { Icon, iconClass } = TOAST_CONFIG[type];
  const progressColor = PROGRESS_COLORS[type];

  // aria-live: assertive for errors so screen readers interrupt; polite for others
  const ariaLive = type === "error" ? "assertive" : "polite";

  useEffect(() => {
    let timer: NodeJS.Timeout;
    let isPaused = false;
    let remainingTime = duration;
    let startTime = Date.now();

    const startTimer = () => {
      startTime = Date.now();
      timer = setTimeout(() => {
        if (!isPaused) {
          onClose(id);
        }
      }, remainingTime);
    };

    const pauseTimer = () => {
      if (!isPaused) {
        isPaused = true;
        clearTimeout(timer);
        remainingTime -= Date.now() - startTime;
      }
    };

    const resumeTimer = () => {
      if (isPaused) {
        isPaused = false;
        startTimer();
      }
    };

    const element = document.getElementById(`toast-${id}`);
    if (element) {
      element.addEventListener("mouseenter", pauseTimer);
      element.addEventListener("mouseleave", resumeTimer);
    }

    startTimer();

    return () => {
      clearTimeout(timer);
      if (element) {
        element.removeEventListener("mouseenter", pauseTimer);
        element.removeEventListener("mouseleave", resumeTimer);
      }
    };
  }, [id, onClose, duration]);

  return (
    <div
      id={`toast-${id}`}
      role="alert"
      aria-live={ariaLive}
      aria-atomic="true"
      className="relative flex items-start gap-3 min-w-[320px] max-w-md overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg animate-slideInRight hover:shadow-xl transition-shadow cursor-default"
    >
      {/* Content */}
      <div className="flex items-start gap-3 flex-1 p-4">
        <Icon
          className={`h-5 w-5 shrink-0 mt-0.5 ${iconClass}`}
          aria-hidden="true"
        />
        <p className="flex-1 text-sm font-medium leading-relaxed">{message}</p>
        <button
          onClick={() => onClose(id)}
          className="shrink-0 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div
          className={`absolute bottom-0 left-0 h-[2px] ${progressColor} opacity-60`}
          style={{
            animation: `toast-progress ${duration}ms linear forwards`,
          }}
        />
      )}
    </div>
  );
}
