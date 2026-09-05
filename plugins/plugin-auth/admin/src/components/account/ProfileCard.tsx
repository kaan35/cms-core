"use client";

import { Badge, Button, FormField, InputField, toast, type AuthUser } from "@cms/admin-shell";
import { CheckCircle2, Copy, Mail, User } from "lucide-react";
import * as React from "react";

interface ProfileCardProps {
  user: AuthUser | null;
  roleName: string;
}

export function ProfileCard({ user, roleName }: ProfileCardProps) {
  const [copiedId, setCopiedId] = React.useState(false);
  const email = user?.email || "admin@example.com";

  const handleCopyId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      toast.success("User ID copied to clipboard");
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/60">
        <User className="size-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Personal Information</h2>
          <p className="text-xs text-muted-foreground">
            Your identity and account details in this workspace
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/60">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/15 border border-primary/30 text-primary font-bold text-lg uppercase">
          {email[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground truncate">{email}</span>
            <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="capitalize text-[10px]">
              {roleName}
            </Badge>
            <span className="text-[11px] text-muted-foreground">Active Member</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="User ID">
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 rounded-lg bg-muted/40 border border-border/60 text-xs font-mono text-foreground truncate">
              {user?.id || "f252a031-0563-49db-9ebc-e32a15d6df64"}
            </code>
            <Button type="button" variant="outline" onClick={handleCopyId} iconStart={<Copy />}>
              {copiedId ? "Copied" : "Copy"}
            </Button>
          </div>
        </FormField>

        <InputField
          label="Email Address"
          type="email"
          value={email}
          disabled
          iconStart={<Mail />}
          className="text-xs bg-muted/30 opacity-80 cursor-not-allowed"
        />
      </div>
    </div>
  );
}
