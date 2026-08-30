"use client";

import { CheckCircle2, RefreshCw, Shield, Sparkles } from "lucide-react";
import * as React from "react";

export interface InteractiveDemoBlockData {
  type: "interactive_demo";
  title?: string;
  description?: string;
  widgetType?: "turnstile" | "counter" | "pricing_calculator";
}

export function InteractiveDemoBlock({ data }: { data: InteractiveDemoBlockData }) {
  const [num1, setNum1] = React.useState(12);
  const [num2, setNum2] = React.useState(8);
  const [userInput, setUserInput] = React.useState("");
  const [isVerified, setIsVerified] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  const resetChallenge = () => {
    setNum1(Math.floor(Math.random() * 20) + 1);
    setNum2(Math.floor(Math.random() * 10) + 1);
    setUserInput("");
    setIsVerified(false);
    setHasError(false);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const answer = parseInt(userInput.trim(), 10);
    if (answer === num1 + num2) {
      setIsVerified(true);
      setHasError(false);
    } else {
      setHasError(true);
      setIsVerified(false);
    }
  };

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6">
        <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-10 shadow-lg text-center space-y-6">
          <div className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 mx-auto">
            <Shield className="size-6" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
              {data.title || "Interactive Security Verification"}
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground">
              {data.description ||
                "Live demo widget showcasing client-side interactive validation."}
            </p>
          </div>

          <div className="max-w-xs mx-auto rounded-2xl border border-border/80 bg-muted/40 p-5 shadow-xs space-y-4">
            {isVerified ? (
              <div className="py-4 space-y-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mx-auto border border-emerald-500/20">
                  <CheckCircle2 className="size-6" />
                </div>
                <div className="text-sm font-bold text-foreground">Verification Complete</div>
                <p className="text-xs text-muted-foreground">
                  Human verification solved successfully.
                </p>
                <button
                  type="button"
                  onClick={resetChallenge}
                  className="text-xs text-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="size-3" />
                  Try another challenge
                </button>
              </div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-primary" />
                    Live Challenge
                  </span>
                  <button
                    type="button"
                    onClick={resetChallenge}
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Refresh numbers"
                  >
                    <RefreshCw className="size-3" />
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-background border border-border/80 text-base font-bold font-mono tracking-widest text-primary flex items-center justify-center gap-2">
                  <span>{num1}</span>
                  <span>+</span>
                  <span>{num2}</span>
                  <span>=</span>
                  <span className="text-muted-foreground">?</span>
                </div>

                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Enter answer"
                    value={userInput}
                    onChange={(e) => {
                      setUserInput(e.target.value);
                      if (hasError) setHasError(false);
                    }}
                    className={`w-full h-9 px-3 rounded-xl border bg-background text-sm font-mono text-center focus:outline-hidden focus:ring-2 ${
                      hasError
                        ? "border-destructive focus:ring-destructive/30"
                        : "border-border focus:ring-primary/30"
                    }`}
                  />
                  {hasError && (
                    <p className="text-[11px] text-destructive font-medium">
                      Incorrect sum. Please try again!
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!userInput}
                  className="w-full h-9 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  Verify Answer
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
