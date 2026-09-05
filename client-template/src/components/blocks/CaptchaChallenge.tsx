"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, RefreshCw } from "lucide-react";
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
    <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-3">
      <div className="flex items-center justify-between text-xs">
        <Label htmlFor="captchaAnswer" className="font-semibold text-foreground">
          Security Verification
        </Label>
        <button
          type="button"
          onClick={refreshCaptcha}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-[11px] cursor-pointer"
          title="Refresh verification challenge"
        >
          <RefreshCw className={`size-3 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Anti-Scraping / Anti-Copy Challenge Display */}
      <div
        className="select-none font-mono font-bold text-sm tracking-wider text-primary bg-background/90 px-4 py-3 rounded-xl border border-border/80 flex items-center justify-center cursor-not-allowed shadow-inner"
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
                <div className="flex items-center gap-2 tracking-[0.25em] text-base font-black uppercase text-blue-400 bg-blue-950/40 px-5 py-2 rounded-lg border border-blue-500/30">
                  {text.split("").map((char, idx) => (
                    <span
                      key={idx}
                      className="inline-block transform hover:scale-110 transition-transform"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              );
            }

            return <span>What is {text} ?</span>;
          })()
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" />
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
