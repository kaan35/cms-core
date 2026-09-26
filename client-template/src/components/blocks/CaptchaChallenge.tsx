"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import type { CaptchaResponse } from "./useFormSubmit";

interface CaptchaChallengeProps {
  captchaData: CaptchaResponse | undefined;
  captchaAnswer: string;
  onAnswerChange: (val: string) => void;
  refreshCaptcha: () => void;
  isLoading: boolean;
}

export function CaptchaChallenge({
  captchaData,
  captchaAnswer,
  onAnswerChange,
  refreshCaptcha,
  isLoading,
}: CaptchaChallengeProps) {
  return (
    <div className="rounded-xl border border-border/80 bg-zinc-50/70 dark:bg-zinc-950/40 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <Label htmlFor="captchaAnswer" className="font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          <span>Security Verification</span>
        </Label>
        <button
          type="button"
          onClick={refreshCaptcha}
          disabled={isLoading}
          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 text-[11px] font-medium cursor-pointer"
          title="Refresh verification challenge"
        >
          <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Anti-Scraping / Anti-Copy Challenge Display */}
      <div
        className="select-none flex items-center justify-center cursor-not-allowed"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
          msUserSelect: "none",
        }}
        aria-label="Captcha security challenge"
      >
        {captchaData?.question ? (
          (() => {
            const isCode = captchaData.question.startsWith("Enter code:");
            const text = isCode
              ? captchaData.question.replace(/^Enter code:\s*/i, "")
              : captchaData.question.replace(/\*/g, "×");

            if (isCode) {
              return (
                <div className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100/80 dark:border-primary/20 shadow-xs">
                  {text.split("").map((char, idx) => (
                    <span
                      key={idx}
                      className="size-8 sm:size-9 flex items-center justify-center rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200/90 dark:border-blue-500/30 text-primary dark:text-blue-400 font-mono font-bold text-base shadow-xs select-none"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              );
            }

            return (
              <div className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100/80 dark:border-primary/20 font-mono font-bold text-sm text-primary dark:text-blue-400 shadow-xs select-none">
                <span>Calculate: {text} = ?</span>
              </div>
            );
          })()
        ) : (
          <div className="w-full flex items-center justify-center py-3 px-4 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground gap-2">
            <Loader2 className="size-3.5 animate-spin text-primary" />
            <span>Loading challenge...</span>
          </div>
        )}
      </div>

      <Input
        id="captchaAnswer"
        name="captchaAnswer"
        type="text"
        required
        autoComplete="off"
        placeholder={
          captchaData?.question?.startsWith("Enter code:")
            ? "Enter the code shown above..."
            : "Enter the calculated result..."
        }
        value={captchaAnswer}
        onChange={(e) => onAnswerChange(e.target.value)}
      />
    </div>
  );
}
