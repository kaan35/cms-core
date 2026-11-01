"use client";

import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  formatDateTime,
  formatIp,
  toast,
} from "@cms/admin-shell";
import { Check, Copy, Globe, Mail, User } from "lucide-react";
import * as React from "react";
import type { FormSubmissionItem } from "../types.js";

export interface SubmissionDetailDialogProps {
  submission: FormSubmissionItem | null;
  formTitle?: string | undefined;
  onClose: () => void;
}

export function SubmissionDetailDialog({
  submission,
  formTitle,
  onClose,
}: SubmissionDetailDialogProps) {
  const [copiedJson, setCopiedJson] = React.useState(false);

  const handleCopyJson = () => {
    if (!submission) return;
    navigator.clipboard.writeText(JSON.stringify(submission.data, null, 2));
    setCopiedJson(true);
    toast.success("Submission data copied to clipboard");
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const selectedEmail = React.useMemo(() => {
    if (!submission?.data) return null;
    const entries = Object.entries(submission.data);
    const emailEntry = entries.find(
      ([k, v]) => k.toLowerCase().includes("email") || (typeof v === "string" && v.includes("@")),
    );
    return emailEntry ? String(emailEntry[1]) : null;
  }, [submission]);

  return (
    <Dialog open={submission !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        {submission && (
          <>
            <DialogHeader className="pr-12">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0 font-semibold text-sm">
                  <User className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-foreground">
                    Submission Details
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Received on {formatDateTime(submission.createdAt)}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="space-y-5">
              {/* Submitted Fields */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Form Response Data
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(submission.data || {}).map(([key, val]) => {
                    const label = key.replace(/[_-]/g, " ");
                    const isLongText =
                      typeof val === "string" && (val.length > 50 || val.includes("\n"));
                    const isEmail = typeof val === "string" && val.includes("@");

                    if (isLongText) {
                      return (
                        <div
                          key={key}
                          className="sm:col-span-2 rounded-xl border border-border/70 bg-muted/20 p-3.5 space-y-1.5"
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                            {label}
                          </span>
                          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed select-text">
                            {String(val)}
                          </p>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-1"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                          {label}
                        </span>
                        <div>
                          {val === null || val === undefined ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : typeof val === "boolean" ? (
                            <Badge variant={val ? "secondary" : "outline"} className="text-[11px]">
                              {val ? "Yes" : "No"}
                            </Badge>
                          ) : isEmail ? (
                            <a
                              href={`mailto:${String(val)}`}
                              className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1.5 break-all"
                            >
                              <Mail className="size-3.5 shrink-0" />
                              <span>{String(val)}</span>
                            </a>
                          ) : (
                            <span className="text-xs font-medium text-foreground select-text wrap-break-word">
                              {String(val)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Technical Audit Metadata */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Audit & Origin
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      IP Address
                    </span>
                    <span className="font-mono text-xs text-foreground font-medium block">
                      {formatIp(submission.ip)}
                    </span>
                  </div>
                  <div className="rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider block">
                      Submission ID
                    </span>
                    <span
                      className="font-mono text-[11px] text-muted-foreground block truncate select-all"
                      title={submission.id}
                    >
                      {submission.id}
                    </span>
                  </div>
                  {submission.userAgent && (
                    <div className="sm:col-span-2 rounded-lg bg-muted/20 border border-border/50 p-2.5 space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider flex items-center gap-1.5">
                        <Globe className="size-3 text-muted-foreground" />
                        <span>User Agent</span>
                      </span>
                      <p className="font-mono text-[11px] text-muted-foreground leading-relaxed break-all select-text">
                        {submission.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </DialogBody>

            {/* Footer */}
            <DialogFooter className="sm:justify-between">
              <div>
                {selectedEmail && (
                  <a
                    href={`mailto:${selectedEmail}?subject=Regarding your submission to ${formTitle || "Form"}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 px-3 py-1.5 text-xs font-medium transition-colors shadow-2xs"
                  >
                    <Mail className="size-3.5" />
                    <span>Reply via Email</span>
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyJson}
                  iconStart={copiedJson ? <Check className="text-emerald-500" /> : <Copy />}
                >
                  {copiedJson ? "Copied JSON!" : "Copy JSON"}
                </Button>
                <DialogClose render={<Button variant="default" size="sm" />}>Close</DialogClose>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
