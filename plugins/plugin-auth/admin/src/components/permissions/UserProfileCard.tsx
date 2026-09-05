"use client";

import { InputField, InputSelectField } from "@cms/admin-shell";
import { Lock, Mail, User } from "lucide-react";
import * as React from "react";

interface UserProfileCardProps {
  isNew: boolean;
  email: string;
  name: string;
  password: string;
  role: string;
  rolesData: Array<{ id: string; name: string; permissions: string[] }>;
  onEmailChange: (email: string) => void;
  onNameChange: (name: string) => void;
  onPasswordChange: (password: string) => void;
  onRoleChange: (role: string) => void;
}

export function UserProfileCard({
  isNew,
  email,
  name,
  password,
  role,
  rolesData,
  onEmailChange,
  onNameChange,
  onPasswordChange,
  onRoleChange,
}: UserProfileCardProps) {
  const roleOptions = React.useMemo(() => {
    const base = [
      { value: "admin", label: "Administrator" },
      { value: "editor", label: "Editor" },
      { value: "user", label: "User" },
    ];
    const custom = (rolesData || [])
      .filter((r) => !["admin", "editor", "user"].includes(r.name))
      .map((r) => ({ value: r.name, label: r.name }));
    return [...base, ...custom];
  }, [rolesData]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-2xs space-y-4">
      <div className="pb-3 border-b border-border/60">
        <h2 className="text-sm font-semibold text-foreground">Account Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Basic identity and authentication credentials
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Email Address"
          type="email"
          placeholder="user@example.com"
          iconStart={<Mail className="size-4" />}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
          className="text-xs"
        />

        <InputField
          label="Full Name"
          type="text"
          placeholder="John Doe"
          iconStart={<User className="size-4" />}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="text-xs"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <InputField
          label="Password"
          type="password"
          placeholder={isNew ? "Enter secure password" : "••••••••"}
          iconStart={<Lock className="size-4" />}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required={isNew}
          hint={!isNew ? "(Leave blank to keep unchanged)" : undefined}
          className="text-xs"
        />

        <InputSelectField
          label="Role Template"
          value={role}
          onValueChange={(val) => onRoleChange(val)}
          options={roleOptions}
        />
      </div>
    </div>
  );
}
