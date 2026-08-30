"use client";

import { Check, Copy, Terminal } from "lucide-react";
import * as React from "react";

export interface CodeTab {
  label: string;
  language: string;
  code: string;
}

export interface CodeShowcaseBlockData {
  type: "code_showcase";
  title?: string;
  subtitle?: string;
  tabs?: CodeTab[];
}

export function CodeShowcaseBlock({ data }: { data: CodeShowcaseBlockData }) {
  const tabs =
    Array.isArray(data.tabs) && data.tabs.length > 0
      ? data.tabs
      : [
          {
            label: "cURL",
            language: "bash",
            code: `curl -X GET "https://api.example.com/pages/contact-us" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`,
          },
        ];

  const [activeTabIndex, setActiveTabIndex] = React.useState(0);
  const [hasCopied, setHasCopied] = React.useState(false);

  const activeTab = tabs[activeTabIndex] || tabs[0];

  const handleCopy = () => {
    if (!activeTab) return;
    navigator.clipboard.writeText(activeTab.code);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <section className="w-full py-12 md:py-16">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        {(data.title || data.subtitle) && (
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
            {data.title && (
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {data.title}
              </h2>
            )}
            {data.subtitle && <p className="text-muted-foreground text-sm">{data.subtitle}</p>}
          </div>
        )}

        <div className="rounded-3xl border border-border/80 bg-zinc-950/90 shadow-2xl overflow-hidden backdrop-blur-xl">
          {/* Terminal Window Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="h-4 w-[1px] bg-zinc-800 mx-2" />
              <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                <Terminal className="size-3.5 text-primary" />
                <span>terminal</span>
              </div>
            </div>

            {/* Language Tabs */}
            <div className="flex items-center gap-1 bg-zinc-950/60 p-1 rounded-xl border border-zinc-800/80">
              {tabs.map((tab, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveTabIndex(idx)}
                  className={`px-3 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    activeTabIndex === idx
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-700/60 transition-colors cursor-pointer"
            >
              {hasCopied ? (
                <>
                  <Check className="size-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="size-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-6 overflow-x-auto font-mono text-xs sm:text-sm text-zinc-200 leading-relaxed">
            <pre className="grid grid-cols-[auto_1fr] gap-x-4">
              {activeTab?.code.split("\n").map((line, lineNum) => (
                <React.Fragment key={lineNum}>
                  <span className="text-zinc-600 select-none text-right font-mono pr-2 border-r border-zinc-800/80">
                    {lineNum + 1}
                  </span>
                  <span className="text-zinc-200 font-mono whitespace-pre-wrap">{line}</span>
                </React.Fragment>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
